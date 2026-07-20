<#
.SYNOPSIS
    Sur DC02, installe DFS, prepare les dossiers partages locaux, cree le groupe
    de replication SharedData avec DC01, monte le namespace domain-based
    \\lab.local\Public avec les deux DC comme cibles, depose le fichier
    Welcome.txt dans le partage replique et cree une GPO qui l'ouvre a chaque
    ouverture de session.

.DESCRIPTION
    Ce script est le dernier a s'executer sur DC02. Il finalise l'infrastructure
    DFS domain-based apres que DC02 ait fini d'etre promu. Tout est idempotent.

    Contenu de Welcome.txt :
      - message de bienvenue
      - lien LinkedIn

    Fichier Welcome.txt place dans C:\SharedData sur DC02, DFS-R le replique
    automatiquement vers DC01. Vu qu'il faut quelques minutes pour que le
    premier sync se fasse, le fichier est aussi copie directement sur DC01 par
    partage SMB pour etre immediatement disponible.
#>

$ErrorActionPreference = "Stop"
Import-Module ActiveDirectory
Import-Module GroupPolicy

$DomainName = "lab.local"
$SharedPath = "C:\SharedData"
$RootPath   = "C:\DFSRoots\Public"
$RgName     = "SharedData-Replication"
$FolderName = "SharedData"
$NsPath     = "\\$DomainName\Public"

# ---------------------------------------------------------------------------
# Installation des roles DFS sur DC02
# ---------------------------------------------------------------------------
Write-Host "==> Installation des roles DFS sur DC02"
foreach ($feature in "FS-DFS-Namespace", "FS-DFS-Replication") {
    if (-not (Get-WindowsFeature -Name $feature).Installed) {
        Install-WindowsFeature -Name $feature -IncludeManagementTools | Out-Null
        Write-Host "    Installe : $feature"
    } else {
        Write-Host "    Deja present : $feature"
    }
}

# ---------------------------------------------------------------------------
# Dossiers locaux + partages SMB sur DC02
# ---------------------------------------------------------------------------
Write-Host "==> Preparation des dossiers locaux sur DC02"
foreach ($p in $SharedPath, $RootPath) {
    if (-not (Test-Path $p)) {
        New-Item -Path $p -ItemType Directory -Force | Out-Null
        Write-Host "    Cree : $p"
    }
}

if (-not (Get-SmbShare -Name "SharedData" -ErrorAction SilentlyContinue)) {
    New-SmbShare -Name         "SharedData" `
                 -Path         $SharedPath `
                 -FullAccess   "LAB\Domain Admins" `
                 -ChangeAccess "LAB\Domain Users" | Out-Null
    Write-Host "    Partage cree : \\DC02\SharedData"
}

if (-not (Get-SmbShare -Name "Public" -ErrorAction SilentlyContinue)) {
    New-SmbShare -Name         "Public" `
                 -Path         $RootPath `
                 -FullAccess   "LAB\Domain Admins" `
                 -ReadAccess   "LAB\Domain Users" | Out-Null
    Write-Host "    Partage cree : \\DC02\Public"
}

# ---------------------------------------------------------------------------
# Groupe de replication DFS entre DC01 et DC02
# ---------------------------------------------------------------------------
Write-Host "==> Configuration du groupe de replication $RgName"

# Note : les cmdlets DFSR interrogent AD, mais Add-* et Set-* peuvent aussi
# ouvrir une RPC vers les membres. Sur un lab, ces appels peuvent renvoyer
# "The network path was not found" alors que la config est deja en place.
# On enveloppe donc dans try/catch pour rendre l'ensemble idempotent :
# si la config est deja OK, on continue sans faire de bruit.

if (-not (Get-DfsReplicationGroup -GroupName $RgName -DomainName $DomainName -ErrorAction SilentlyContinue)) {
    New-DfsReplicationGroup -GroupName $RgName `
                            -Description "Replication du dossier SharedData entre DC01 et DC02" | Out-Null
    Write-Host "    Groupe de replication cree : $RgName"
} else {
    Write-Host "    Groupe de replication deja present : $RgName"
}

if (-not (Get-DfsReplicatedFolder -GroupName $RgName -FolderName $FolderName -DomainName $DomainName -ErrorAction SilentlyContinue)) {
    New-DfsReplicatedFolder -GroupName $RgName -FolderName $FolderName | Out-Null
    Write-Host "    Dossier replique declare : $FolderName"
} else {
    Write-Host "    Dossier replique deja declare : $FolderName"
}

foreach ($member in "DC01", "DC02") {
    try {
        Add-DfsrMember -GroupName $RgName -ComputerName $member -ErrorAction Stop | Out-Null
        Write-Host "    Membre ajoute : $member"
    } catch {
        $msg = $_.Exception.Message.Split("`n")[0].Trim()
        Write-Host "    Membre $member : $msg (probablement deja present)"
    }
}

# Configurer les chemins locaux sur chaque membre. DC01 est primaire (source).
foreach ($m in @(
    @{ Name = "DC01"; Primary = $true },
    @{ Name = "DC02"; Primary = $false }
)) {
    try {
        $params = @{
            GroupName     = $RgName
            FolderName    = $FolderName
            ComputerName  = $m.Name
            ContentPath   = $SharedPath
            Force         = $true
            ErrorAction   = "Stop"
        }
        if ($m.Primary) { $params.PrimaryMember = $true }
        Set-DfsrMembership @params | Out-Null
        Write-Host "    Membership $($m.Name) configuree$(if($m.Primary){' (source)'})"
    } catch {
        Write-Host "    Set-DfsrMembership $($m.Name) : $($_.Exception.Message.Split("`n")[0].Trim()) (probablement deja configure)"
    }
}

# Connexion bidirectionnelle DC01 <-> DC02
try {
    Add-DfsrConnection -GroupName               $RgName `
                       -SourceComputerName      "DC01" `
                       -DestinationComputerName "DC02" `
                       -ErrorAction Stop | Out-Null
    Write-Host "    Connexion de replication DC01 <-> DC02 creee"
} catch {
    Write-Host "    Connexion DC01 <-> DC02 : $($_.Exception.Message.Split("`n")[0].Trim()) (probablement deja presente)"
}

Write-Host "==> Replication configuree. Premier sync par DFS-R en cours (peut prendre plusieurs minutes)."

# ---------------------------------------------------------------------------
# Namespace DFS domain-based \\lab.local\Public
# ---------------------------------------------------------------------------
Write-Host "==> Creation du namespace domain-based $NsPath"

if (-not (Get-DfsnRoot -Path $NsPath -ErrorAction SilentlyContinue)) {
    New-DfsnRoot -Path       $NsPath `
                 -TargetPath "\\DC01.$DomainName\Public" `
                 -Type       DomainV2 | Out-Null
    Write-Host "    Namespace cree : $NsPath (cible DC01)"
}

if (-not (Get-DfsnRootTarget -Path $NsPath -TargetPath "\\DC02.$DomainName\Public" -ErrorAction SilentlyContinue)) {
    New-DfsnRootTarget -Path       $NsPath `
                       -TargetPath "\\DC02.$DomainName\Public" | Out-Null
    Write-Host "    Cible ajoutee au namespace : DC02"
}

$folderPath = "$NsPath\Files"
if (-not (Get-DfsnFolder -Path $folderPath -ErrorAction SilentlyContinue)) {
    New-DfsnFolder -Path       $folderPath `
                   -TargetPath "\\DC01.$DomainName\SharedData" | Out-Null
    Write-Host "    Dossier DFS cree : $folderPath (cible DC01)"
}

if (-not (Get-DfsnFolderTarget -Path $folderPath -TargetPath "\\DC02.$DomainName\SharedData" -ErrorAction SilentlyContinue)) {
    New-DfsnFolderTarget -Path       $folderPath `
                         -TargetPath "\\DC02.$DomainName\SharedData" | Out-Null
    Write-Host "    Cible ajoutee au dossier DFS : DC02"
}

# ---------------------------------------------------------------------------
# Fichier Welcome.txt dans le partage replique
# ---------------------------------------------------------------------------
Write-Host "==> Depot du fichier Welcome.txt"

$welcomeContent = @"
Bienvenue a tous et a toutes !

N'hesitez pas a me suivre sur LinkedIn :
https://www.linkedin.com/in/leandre-senechal

--- Lab Active Directory securise ---
"@

$welcomeLocal = Join-Path $SharedPath "Welcome.txt"
$welcomeContent | Out-File -FilePath $welcomeLocal -Encoding UTF8 -Force
Write-Host "    Ecrit sur DC02 : $welcomeLocal"

# Copie de courtoisie vers DC01 pour disponibilite immediate (avant premier sync DFS-R)
try {
    $welcomeRemote = "\\DC01.$DomainName\SharedData\Welcome.txt"
    Copy-Item -Path $welcomeLocal -Destination $welcomeRemote -Force
    Write-Host "    Copie initiale sur DC01 : $welcomeRemote"
} catch {
    Write-Warning "    Copie initiale sur DC01 impossible ($($_.Exception.Message)) - le sync DFS-R s'en chargera."
}

# ---------------------------------------------------------------------------
# GPO pour ouvrir Welcome.txt a chaque login utilisateur
# ---------------------------------------------------------------------------
Write-Host "==> Creation de la GPO d'ouverture automatique du message d'accueil"

$gpoName  = "SEC - Message d'accueil au login"
$DomainDN = (Get-ADDomain).DistinguishedName

if (-not (Get-GPO -Name $gpoName -ErrorAction SilentlyContinue)) {
    New-GPO -Name $gpoName | Out-Null
    New-GPLink -Name $gpoName -Target $DomainDN -LinkEnabled Yes | Out-Null
    Write-Host "    GPO creee et liee : $gpoName"
}

# Cle Run cote utilisateur : ouvre Welcome.txt depuis le namespace DFS
Set-GPRegistryValue -Name      $gpoName `
                    -Key       "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" `
                    -ValueName "ShowWelcome" `
                    -Type      String `
                    -Value     "notepad.exe \\$DomainName\Public\Files\Welcome.txt" | Out-Null

Write-Host "    Cle Run configuree : Welcome.txt s'ouvrira a chaque login domaine."

Write-Host "==> Forcage de la replication AD"
gpupdate /force | Out-Null

Write-Host "==> DFS + Welcome termines."
