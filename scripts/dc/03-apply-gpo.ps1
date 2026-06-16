<#
.SYNOPSIS
    Applique un socle de durcissement par GPO et politique de domaine.

.DESCRIPTION
    Script idempotent. Chaque GPO est creee si absente, liee a la racine du domaine,
    puis configuree par valeurs de registre. La politique de mot de passe et de
    verrouillage est posee directement sur la politique de domaine par defaut.

    Les choix de durcissement et leur justification (vecteurs d'attaque contres,
    references ANSSI et CIS) sont documentes dans docs/gpo-hardening.md.

.NOTES
    Les valeurs de registre utilisees sont celles des modeles d'administration
    Microsoft. Aucune valeur inventee.
#>

$ErrorActionPreference = "Stop"
Import-Module ActiveDirectory
Import-Module GroupPolicy

$DomainDN = (Get-ADDomain).DistinguishedName

# ---------------------------------------------------------------------------
# Politique de mot de passe et de verrouillage (politique de domaine par defaut)
# ---------------------------------------------------------------------------
Write-Host "==> Politique de mot de passe et de verrouillage"
Set-ADDefaultDomainPasswordPolicy `
    -Identity                  "lab.local" `
    -MinPasswordLength         14 `
    -ComplexityEnabled         $true `
    -PasswordHistoryCount      24 `
    -MinPasswordAge            "1.00:00:00" `
    -MaxPasswordAge            "90.00:00:00" `
    -LockoutThreshold          5 `
    -LockoutDuration           "00:15:00" `
    -LockoutObservationWindow  "00:15:00"
Write-Host "    Longueur minimale 14, verrouillage a 5 tentatives, historique 24."

# ---------------------------------------------------------------------------
# Fonction utilitaire : creer et lier une GPO si absente
# ---------------------------------------------------------------------------
function New-LabGPO {
    param([string]$Name)
    $gpo = Get-GPO -Name $Name -ErrorAction SilentlyContinue
    if (-not $gpo) {
        $gpo = New-GPO -Name $Name
        New-GPLink -Name $Name -Target $DomainDN -LinkEnabled Yes | Out-Null
        Write-Host "    GPO creee et liee : $Name"
    } else {
        Write-Host "    GPO existante : $Name"
    }
}

# ---------------------------------------------------------------------------
# GPO 1 : desactivation de LLMNR (contre l'empoisonnement de resolution de noms)
# ---------------------------------------------------------------------------
Write-Host "==> GPO durcissement"
$g = "SEC - Desactivation LLMNR"
New-LabGPO -Name $g
Set-GPRegistryValue -Name $g `
    -Key       "HKLM\Software\Policies\Microsoft\Windows NT\DNSClient" `
    -ValueName "EnableMulticast" `
    -Type      DWord -Value 0 | Out-Null

# ---------------------------------------------------------------------------
# GPO 2 : desactivation de SMBv1 (cote serveur)
# ---------------------------------------------------------------------------
$g = "SEC - Desactivation SMBv1"
New-LabGPO -Name $g
Set-GPRegistryValue -Name $g `
    -Key       "HKLM\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters" `
    -ValueName "SMB1" `
    -Type      DWord -Value 0 | Out-Null

# ---------------------------------------------------------------------------
# GPO 3 : exigence de signature LDAP cote serveur (contre le relais LDAP)
# ---------------------------------------------------------------------------
$g = "SEC - Signature LDAP requise"
New-LabGPO -Name $g
Set-GPRegistryValue -Name $g `
    -Key       "HKLM\SYSTEM\CurrentControlSet\Services\NTDS\Parameters" `
    -ValueName "LDAPServerIntegrity" `
    -Type      DWord -Value 2 | Out-Null

# ---------------------------------------------------------------------------
# GPO 4 : restriction de l'enumeration anonyme
# ---------------------------------------------------------------------------
$g = "SEC - Restriction enumeration anonyme"
New-LabGPO -Name $g
Set-GPRegistryValue -Name $g `
    -Key       "HKLM\SYSTEM\CurrentControlSet\Control\Lsa" `
    -ValueName "RestrictAnonymous" `
    -Type      DWord -Value 1 | Out-Null
Set-GPRegistryValue -Name $g `
    -Key       "HKLM\SYSTEM\CurrentControlSet\Control\Lsa" `
    -ValueName "RestrictAnonymousSAM" `
    -Type      DWord -Value 1 | Out-Null

# ---------------------------------------------------------------------------
# GPO 5 : desactivation du compte invite par strategie de registre
# ---------------------------------------------------------------------------
$g = "SEC - Durcissement ouverture de session"
New-LabGPO -Name $g
# Ne pas afficher le dernier nom d'utilisateur connecte
Set-GPRegistryValue -Name $g `
    -Key       "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" `
    -ValueName "DontDisplayLastUserName" `
    -Type      DWord -Value 1 | Out-Null

Write-Host "==> Durcissement applique. Forcage de la replication des GPO."
gpupdate /force | Out-Null
Write-Host "==> Termine."
