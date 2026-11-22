<#
.SYNOPSIS
    Promeut DC02 comme controleur de domaine additionnel dans la foret lab.local.
    Le reboot post-promotion est gere par le provisioner vagrant-reload declare
    dans le Vagrantfile.

.NOTES
    Utilise les identifiants par defaut de la box gusztavvargadr pour le compte
    LAB\Administrator (mot de passe "vagrant"). Adapter si la box change.
#>

$ErrorActionPreference = "Stop"

$DomainName = "lab.local"

Write-Host "==> Verification du role de la machine"
$domainRole = (Get-CimInstance Win32_ComputerSystem).DomainRole
if ($domainRole -eq 4 -or $domainRole -eq 5) {
    Write-Host "    La machine est deja controleur de domaine, promotion ignoree."
    exit 0
}

Write-Host "==> Promotion en controleur de domaine additionnel pour $DomainName"
Import-Module ADDSDeployment

$domainCred = New-Object System.Management.Automation.PSCredential(
    "LAB\Administrator",
    (ConvertTo-SecureString "vagrant" -AsPlainText -Force)
)
$dsrmPassword = ConvertTo-SecureString "DSRM-L@b-2025!Restore" -AsPlainText -Force

Install-ADDSDomainController `
    -DomainName                    $DomainName `
    -Credential                    $domainCred `
    -SafeModeAdministratorPassword $dsrmPassword `
    -InstallDns                    `
    -NoRebootOnCompletion          `
    -Force

Write-Host "==> Promotion terminee. Reboot gere par Vagrant (reload)."
