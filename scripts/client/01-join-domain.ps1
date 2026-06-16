<#
.SYNOPSIS
    Pointe le DNS du poste client vers le controleur de domaine puis joint la machine
    au domaine lab.local.

.DESCRIPTION
    Script idempotent. Si la machine est deja membre du domaine, il ne fait rien.
    Le DNS est positionne sur l'interface du reseau host-only (192.168.56.0/24),
    car la resolution du domaine depend du serveur DNS porte par le controleur.

.NOTES
    Le redemarrage final est gere par le provisioner vagrant-reload.
#>

$ErrorActionPreference = "Stop"

$DomainName = "lab.local"
$DcIp       = "192.168.56.10"

# ---------------------------------------------------------------------------
# Sortie anticipee si la machine est deja jointe au domaine
# ---------------------------------------------------------------------------
$cs = Get-CimInstance Win32_ComputerSystem
if ($cs.PartOfDomain) {
    Write-Host "==> Machine deja membre du domaine $($cs.Domain), rien a faire."
    exit 0
}

# ---------------------------------------------------------------------------
# Pointage DNS sur l'interface host-only
# ---------------------------------------------------------------------------
Write-Host "==> Recherche de l'interface en 192.168.56.x"
$ip = Get-NetIPAddress -AddressFamily IPv4 |
      Where-Object { $_.IPAddress -like "192.168.56.*" } |
      Select-Object -First 1

if (-not $ip) {
    throw "Aucune interface en 192.168.56.x trouvee. Verifier le reseau host-only."
}

Write-Host "    Interface trouvee (index $($ip.InterfaceIndex)). Pointage DNS vers $DcIp"
Set-DnsClientServerAddress -InterfaceIndex $ip.InterfaceIndex -ServerAddresses $DcIp

# Petite attente pour laisser le DNS repondre
Start-Sleep -Seconds 5

# ---------------------------------------------------------------------------
# Jonction au domaine
# ---------------------------------------------------------------------------
Write-Host "==> Jonction au domaine $DomainName"
$securePwd = ConvertTo-SecureString "vagrant" -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential("LAB\vagrant", $securePwd)

# Remarque : le compte Administrateur du domaine est cree avec le mot de passe par
# defaut de la box gusztavvargadr (vagrant). Adapter si la box change.
$adminPwd = ConvertTo-SecureString "vagrant" -AsPlainText -Force
$adminCred = New-Object System.Management.Automation.PSCredential("LAB\Administrator", $adminPwd)

Add-Computer -DomainName $DomainName -Credential $adminCred -Force

Write-Host "==> Jonction reussie. Redemarrage gere par Vagrant (reload)."
