<#
.SYNOPSIS
    Installe le role AD DS et promeut le serveur en controleur de domaine de la foret lab.local.

.DESCRIPTION
    Script idempotent. Il verifie l'etat de la machine avant chaque action :
      - si le role AD DS est deja installe, il ne le reinstalle pas
      - si la machine est deja controleur de domaine, il ne relance pas la promotion

    La promotion utilise -NoRebootOnCompletion. Le redemarrage est gere par le
    provisioner vagrant-reload declare dans le Vagrantfile, pour un controle propre.

.NOTES
    Les mots de passe ci-dessous sont des valeurs de laboratoire. Ne jamais les
    reutiliser en production. Voir docs/troubleshooting.md.
#>

$ErrorActionPreference = "Stop"

$DomainName     = "lab.local"
$NetbiosName    = "LAB"
$ForestMode     = "WinThreshold"   # niveau fonctionnel 2016, valide jusqu'a Server 2022
$DsrmPassword   = ConvertTo-SecureString "DSRM-L@b-2025!Restore" -AsPlainText -Force

Write-Host "==> Verification du role AD DS"
$addsInstalled = (Get-WindowsFeature -Name AD-Domain-Services).Installed
if ($addsInstalled) {
    Write-Host "    Role AD DS deja present, installation ignoree."
}
else {
    Write-Host "    Installation du role AD DS et des outils de gestion"
    Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools | Out-Null
}

Write-Host "==> Verification du role de la machine (controleur de domaine ?)"
# DomainRole : 4 = Backup DC, 5 = Primary DC
$domainRole = (Get-CimInstance Win32_ComputerSystem).DomainRole
if ($domainRole -eq 4 -or $domainRole -eq 5) {
    Write-Host "    La machine est deja controleur de domaine, promotion ignoree."
    exit 0
}

Write-Host "==> Promotion en controleur de domaine pour la foret $DomainName"
Import-Module ADDSDeployment

Install-ADDSForest `
    -DomainName                    $DomainName `
    -DomainNetbiosName             $NetbiosName `
    -ForestMode                    $ForestMode `
    -DomainMode                    $ForestMode `
    -SafeModeAdministratorPassword $DsrmPassword `
    -InstallDns `
    -CreateDnsDelegation:$false `
    -NoRebootOnCompletion `
    -Force

Write-Host "==> Promotion terminee. Redemarrage gere par Vagrant (reload)."
