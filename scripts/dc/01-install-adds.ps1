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

# ---------------------------------------------------------------------------
# Carte NAT Vagrant exclue du DNS
# ---------------------------------------------------------------------------
# Chaque VM Vagrant recoit la meme adresse NAT (10.0.2.15). Si le controleur
# l'enregistre dans le DNS du domaine, les clients et les autres DC qui le
# cherchent se connectent a eux-memes : echec de jonction au domaine et erreur
# de replication "The target principal name is incorrect".
Write-Host "==> Exclusion de la carte NAT de l'enregistrement DNS"
Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -like "10.0.2.*" } |
    ForEach-Object {
        Set-DnsClient -InterfaceIndex $_.InterfaceIndex -RegisterThisConnectionsAddress $false
        # IPv6 coupe sur la carte NAT : VirtualBox 7.2 y distribue un prefixe
        # fd17:625c:f037:2::/64 identique sur toutes les VM, qui fait echouer la
        # promotion d'un DC additionnel (ldap connect error 81).
        $natName = (Get-NetAdapter -InterfaceIndex $_.InterfaceIndex).Name
        Disable-NetAdapterBinding -Name $natName -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue
        Write-Host "    Interface $($_.InterfaceIndex) ($($_.IPAddress)) exclue."
    }

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
