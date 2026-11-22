<#
.SYNOPSIS
    Installe le role AD DS sur DC02 (sans promotion) et pointe le DNS vers DC01
    pour que la promotion suivante trouve la foret lab.local.
#>

$ErrorActionPreference = "Stop"

$Dc01Ip = "192.168.56.10"

Write-Host "==> Recherche de l'interface en 192.168.56.x"
$ip = Get-NetIPAddress -AddressFamily IPv4 |
      Where-Object { $_.IPAddress -like "192.168.56.*" } |
      Select-Object -First 1

if (-not $ip) {
    throw "Aucune interface en 192.168.56.x trouvee. Verifier le reseau host-only."
}

Write-Host "    Interface index $($ip.InterfaceIndex). Pointage DNS vers $Dc01Ip"
Set-DnsClientServerAddress -InterfaceIndex $ip.InterfaceIndex -ServerAddresses $Dc01Ip

# La carte NAT Vagrant (10.0.2.15, identique sur toutes les VM) ne doit pas
# s'enregistrer dans le DNS : sinon DC01 se connecte a lui-meme en croyant
# joindre DC02 et la replication echoue ("The target principal name is incorrect").
Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -like "10.0.2.*" } |
    ForEach-Object {
        Set-DnsClient -InterfaceIndex $_.InterfaceIndex -RegisterThisConnectionsAddress $false
        Write-Host "    Carte NAT (index $($_.InterfaceIndex)) exclue de l'enregistrement DNS."
    }
Start-Sleep -Seconds 5

Write-Host "==> Verification du role AD DS"
if ((Get-WindowsFeature -Name AD-Domain-Services).Installed) {
    Write-Host "    Role AD DS deja present."
} else {
    Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools | Out-Null
    Write-Host "    Role AD DS installe."
}
