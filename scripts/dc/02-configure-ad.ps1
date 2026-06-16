<#
.SYNOPSIS
    Configure l'annuaire apres promotion : forwarder DNS, structure d'OU, groupes,
    comptes utilisateurs importes depuis un fichier CSV.

.DESCRIPTION
    Script idempotent. Chaque objet est cree uniquement s'il n'existe pas deja.
    La structure d'OU suit une logique de separation par fonction, base de toute
    delegation d'administration et de tout ciblage de GPO. Voir docs/ou-design.md.

.NOTES
    Le CSV source est attendu dans C:\vagrant\data\users.csv (monte par Vagrant).
#>

$ErrorActionPreference = "Stop"
Import-Module ActiveDirectory

$DomainDN  = (Get-ADDomain).DistinguishedName   # ex : DC=lab,DC=local
$RootOuName = "LAB"

# ---------------------------------------------------------------------------
# Forwarder DNS vers un resolveur public pour la resolution externe
# ---------------------------------------------------------------------------
Write-Host "==> Configuration du forwarder DNS"
try {
    $existing = (Get-DnsServerForwarder).IPAddress
    if ($existing -notcontains "1.1.1.1") {
        Add-DnsServerForwarder -IPAddress "1.1.1.1" -PassThru | Out-Null
        Write-Host "    Forwarder 1.1.1.1 ajoute."
    } else {
        Write-Host "    Forwarder deja present."
    }
} catch {
    Write-Warning "    Forwarder DNS non configure : $($_.Exception.Message)"
}

# ---------------------------------------------------------------------------
# Fonction utilitaire : creer une OU si absente
# ---------------------------------------------------------------------------
function New-LabOU {
    param(
        [string]$Name,
        [string]$Path
    )
    $dn = "OU=$Name,$Path"
    if (-not (Get-ADOrganizationalUnit -Filter "Name -eq '$Name'" -SearchBase $Path -SearchScope OneLevel -ErrorAction SilentlyContinue)) {
        New-ADOrganizationalUnit -Name $Name -Path $Path -ProtectedFromAccidentalDeletion $true
        Write-Host "    OU creee : $dn"
    } else {
        Write-Host "    OU existante : $dn"
    }
    return $dn
}

# ---------------------------------------------------------------------------
# Structure d'OU
# ---------------------------------------------------------------------------
Write-Host "==> Creation de la structure d'OU"
$RootDN = New-LabOU -Name $RootOuName -Path $DomainDN

$OuServers   = New-LabOU -Name "Servers"        -Path $RootDN
$OuWks       = New-LabOU -Name "Workstations"   -Path $RootDN
$OuGroups    = New-LabOU -Name "Groups"         -Path $RootDN
$OuSvc       = New-LabOU -Name "ServiceAccounts"-Path $RootDN
$OuUsers     = New-LabOU -Name "Users"          -Path $RootDN

$OuUsersIT   = New-LabOU -Name "IT"         -Path $OuUsers
$OuUsersFin  = New-LabOU -Name "Finance"    -Path $OuUsers
$OuUsersOps  = New-LabOU -Name "Operations" -Path $OuUsers

# Table de correspondance departement -> OU cible
$DeptToOu = @{
    "IT"         = $OuUsersIT
    "Finance"    = $OuUsersFin
    "Operations" = $OuUsersOps
}

# ---------------------------------------------------------------------------
# Groupes de securite par departement
# ---------------------------------------------------------------------------
Write-Host "==> Creation des groupes de securite"
foreach ($grp in @("GS-IT", "GS-Finance", "GS-Operations")) {
    if (-not (Get-ADGroup -Filter "Name -eq '$grp'" -ErrorAction SilentlyContinue)) {
        New-ADGroup -Name $grp -GroupScope Global -GroupCategory Security -Path $OuGroups
        Write-Host "    Groupe cree : $grp"
    } else {
        Write-Host "    Groupe existant : $grp"
    }
}

# ---------------------------------------------------------------------------
# Import des utilisateurs depuis le CSV
# ---------------------------------------------------------------------------
$CsvPath = "C:\vagrant\data\users.csv"
Write-Host "==> Import des utilisateurs depuis $CsvPath"

if (-not (Test-Path $CsvPath)) {
    Write-Warning "    Fichier CSV introuvable, etape ignoree."
    return
}

$DefaultPassword = ConvertTo-SecureString "User-L@b-2025!" -AsPlainText -Force
$users = Import-Csv -Path $CsvPath

foreach ($u in $users) {
    $sam = $u.SamAccountName
    if (Get-ADUser -Filter "SamAccountName -eq '$sam'" -ErrorAction SilentlyContinue) {
        Write-Host "    Utilisateur existant : $sam"
        continue
    }

    $targetOu = $DeptToOu[$u.Department]
    if (-not $targetOu) {
        Write-Warning "    Departement inconnu pour $sam ($($u.Department)), utilisateur ignore."
        continue
    }

    New-ADUser `
        -Name              "$($u.FirstName) $($u.LastName)" `
        -GivenName         $u.FirstName `
        -Surname           $u.LastName `
        -SamAccountName    $sam `
        -UserPrincipalName "$sam@lab.local" `
        -Title             $u.JobTitle `
        -Department        $u.Department `
        -Path              $targetOu `
        -AccountPassword   $DefaultPassword `
        -ChangePasswordAtLogon $true `
        -Enabled           $true

    # Ajout au groupe de securite du departement
    $grpName = "GS-$($u.Department)"
    try {
        Add-ADGroupMember -Identity $grpName -Members $sam
    } catch {
        Write-Warning "    Ajout au groupe $grpName echoue pour $sam : $($_.Exception.Message)"
    }

    Write-Host "    Utilisateur cree : $sam dans $($u.Department)"
}

Write-Host "==> Configuration de l'annuaire terminee."
