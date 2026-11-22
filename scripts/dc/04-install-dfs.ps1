<#
.SYNOPSIS
    Installe les roles DFS (Namespaces + Replication) sur DC01 et prepare les
    dossiers partages qui serviront de racine namespace (\\lab.local\Public) et
    de dossier replique (SharedData) vers DC02.

.DESCRIPTION
    Script idempotent. Cree :
      - le dossier local C:\SharedData partage en SharedData (contenu replique)
      - le dossier local C:\DFSRoots\Public partage en Public (racine namespace)
    Les permissions sont limitees aux comptes du domaine LAB.

    La configuration de la replication et du namespace domain-based est faite
    depuis DC02 apres sa promotion, une fois que les deux DC existent.
#>

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Installation des roles DFS
# ---------------------------------------------------------------------------
Write-Host "==> Installation des roles DFS Namespaces + Replication"
foreach ($feature in "FS-DFS-Namespace", "FS-DFS-Replication") {
    $installed = (Get-WindowsFeature -Name $feature).Installed
    if ($installed) {
        Write-Host "    Deja installe : $feature"
    } else {
        Install-WindowsFeature -Name $feature -IncludeManagementTools | Out-Null
        Write-Host "    Installe : $feature"
    }
}

# ---------------------------------------------------------------------------
# Dossier local repliquable (contenu partage entre les deux DC)
# ---------------------------------------------------------------------------
$sharedPath = "C:\SharedData"
Write-Host "==> Preparation du dossier replique local $sharedPath"
if (-not (Test-Path $sharedPath)) {
    New-Item -Path $sharedPath -ItemType Directory -Force | Out-Null
}

if (-not (Get-SmbShare -Name "SharedData" -ErrorAction SilentlyContinue)) {
    New-SmbShare -Name          "SharedData" `
                 -Path          $sharedPath `
                 -FullAccess    "LAB\Domain Admins" `
                 -ChangeAccess  "LAB\Domain Users" | Out-Null
    Write-Host "    Partage SMB cree : \\DC01\SharedData"
} else {
    Write-Host "    Partage SMB deja present : \\DC01\SharedData"
}

# ---------------------------------------------------------------------------
# Racine du namespace domain-based (\\lab.local\Public)
# ---------------------------------------------------------------------------
$rootPath = "C:\DFSRoots\Public"
Write-Host "==> Preparation de la racine namespace $rootPath"
if (-not (Test-Path $rootPath)) {
    New-Item -Path $rootPath -ItemType Directory -Force | Out-Null
}

if (-not (Get-SmbShare -Name "Public" -ErrorAction SilentlyContinue)) {
    New-SmbShare -Name         "Public" `
                 -Path         $rootPath `
                 -FullAccess   "LAB\Domain Admins" `
                 -ReadAccess   "LAB\Domain Users" | Out-Null
    Write-Host "    Partage SMB cree : \\DC01\Public"
} else {
    Write-Host "    Partage SMB deja present : \\DC01\Public"
}

Write-Host "==> DFS installe sur DC01. La configuration namespace + replication sera faite depuis DC02."
