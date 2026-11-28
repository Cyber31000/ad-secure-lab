<#
.SYNOPSIS
    Tableau de bord web du lab : sert index.html et une petite API JSON qui
    interroge DC01 par WinRM (Invoke-Command).

.DESCRIPTION
    Le serveur tourne sur la machine hote et n'ecoute que sur localhost.
    Les commandes AD (Get-ADUser, Get-GPO, Get-WinEvent...) s'executent sur
    le controleur de domaine, rien n'est a installer sur l'hote.

    Routes :
      GET  /              la page
      GET  /api/users     comptes de OU=Users,OU=LAB
      GET  /api/dcs       controleurs et metadonnees de replication
      GET  /api/gpo       GPO et strategie de mots de passe du domaine
      GET  /api/alerts    evenements Security des 7 derniers jours sur DC01
      POST /api/unlock    {"sam":"l.petit"} -> Unlock-ADAccount

    Le POST exige le jeton anti-CSRF injecte dans la page et une origine
    http://localhost:<port>. Chaque deverrouillage est journalise dans la
    console et dans dashboard-audit.log.

.PARAMETER DomainController
    Adresse du DC interroge. Par defaut DC01 (192.168.56.10).

.PARAMETER Credential
    Compte du domaine utilise pour les requetes. Demande au demarrage si absent.

.PARAMETER Demo
    Sert des donnees fictives, sans contacter le lab. Pratique pour tester la page.

.EXAMPLE
    .\tools\dashboard\Start-Dashboard.ps1
    .\tools\dashboard\Start-Dashboard.ps1 -Demo
#>
[CmdletBinding()]
param(
    [string]       $DomainController = "192.168.56.10",
    [int]          $Port = 8080,
    [pscredential] $Credential,
    [switch]       $Demo
)

$ErrorActionPreference = "Stop"
$Root      = $PSScriptRoot
$AuditLog  = Join-Path $Root "dashboard-audit.log"
$Origin    = "http://localhost:$Port"
$Utf8      = New-Object System.Text.UTF8Encoding($false)

# Jeton anti-CSRF, nouveau a chaque demarrage
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$CsrfToken = [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")

# ---------------------------------------------------------------------------
# Requetes executees sur le DC. Chacune renvoie une chaine JSON.
# ---------------------------------------------------------------------------
$Remote = @{}

$Remote.users = {
    $base = (Get-ADDomain).DistinguishedName
    $list = Get-ADUser -Filter * -SearchBase "OU=Users,OU=LAB,$base" `
        -Properties Department, Title, LastLogonDate, LockedOut, lockoutTime, BadLogonCount, Enabled |
        Sort-Object Surname | ForEach-Object {
            [ordered]@{
                sam         = $_.SamAccountName
                givenName   = $_.GivenName
                surname     = $_.Surname
                department  = $_.Department
                title       = $_.Title
                ou          = ($_.DistinguishedName -replace '^CN=[^,]+,', '')
                enabled     = [bool]$_.Enabled
                lockedOut   = [bool]$_.LockedOut
                lockoutTime = $(if ($_.lockoutTime -gt 0) { [DateTime]::FromFileTimeUtc($_.lockoutTime).ToString("o") } else { $null })
                lastLogon   = $(if ($_.LastLogonDate) { $_.LastLogonDate.ToUniversalTime().ToString("o") } else { $null })
                badLogons   = [int]$_.BadLogonCount
            }
        }
    ConvertTo-Json -InputObject @($list) -Depth 4 -Compress
}

$Remote.unlock = {
    param($Sam)
    $base = (Get-ADDomain).DistinguishedName
    $user = Get-ADUser -Identity $Sam
    # Seuls les comptes de OU=Users,OU=LAB peuvent etre deverrouilles ici
    if ($user.DistinguishedName -notlike "*,OU=Users,OU=LAB,$base") {
        throw "Compte hors de OU=Users,OU=LAB"
    }
    Unlock-ADAccount -Identity $user
    $after = Get-ADUser -Identity $user -Properties LockedOut
    ConvertTo-Json -Compress -InputObject ([ordered]@{ sam = $after.SamAccountName; lockedOut = [bool]$after.LockedOut })
}

$Remote.dcs = {
    $dcs = @(Get-ADDomainController -Filter * | Sort-Object Name)
    $out = foreach ($dc in $dcs) {
        $repl = @()
        $reachable = $true
        try {
            $repl = @(Get-ADReplicationPartnerMetadata -Target $dc.HostName -Partition * -ErrorAction Stop | ForEach-Object {
                [ordered]@{
                    source      = ($_.Partner -replace '^CN=NTDS Settings,CN=([^,]+),.*$', '$1')
                    partition   = $_.Partition
                    lastSuccess = $(if ($_.LastReplicationSuccess) { $_.LastReplicationSuccess.ToUniversalTime().ToString("o") } else { $null })
                    lastAttempt = $(if ($_.LastReplicationAttempt) { $_.LastReplicationAttempt.ToUniversalTime().ToString("o") } else { $null })
                    result      = [int]$_.LastReplicationResult
                    failures    = [int]$_.ConsecutiveReplicationFailures
                }
            })
        } catch { $reachable = $false }
        [ordered]@{
            name      = $dc.Name
            ip        = $dc.IPv4Address
            site      = $dc.Site
            gc        = [bool]$dc.IsGlobalCatalog
            fsmo      = @($dc.OperationMasterRoles | ForEach-Object { "$_" })
            reachable = $reachable
            inbound   = $repl
        }
    }
    ConvertTo-Json -InputObject @($out) -Depth 5 -Compress
}

$Remote.gpo = {
    $base  = (Get-ADDomain).DistinguishedName
    $links = @((Get-GPInheritance -Target $base).GpoLinks | ForEach-Object { $_.DisplayName })
    $gpos  = Get-GPO -All | Sort-Object DisplayName | ForEach-Object {
        [ordered]@{
            name     = $_.DisplayName
            comment  = $_.Description
            status   = "$($_.GpoStatus)"
            modified = $_.ModificationTime.ToUniversalTime().ToString("o")
            linked   = $links -contains $_.DisplayName
        }
    }
    $p = Get-ADDefaultDomainPasswordPolicy
    ConvertTo-Json -Depth 4 -Compress -InputObject ([ordered]@{
        policy = [ordered]@{
            minLength       = $p.MinPasswordLength
            complexity      = [bool]$p.ComplexityEnabled
            maxAgeDays      = [int]$p.MaxPasswordAge.TotalDays
            lockoutThreshold = $p.LockoutThreshold
            lockoutMinutes  = [int]$p.LockoutDuration.TotalMinutes
        }
        gpos = @($gpos)
    })
}

$Remote.alerts = {
    # 4740 verrouillage, 4767 deverrouillage, 4771 pre-auth Kerberos refusee,
    # 4625 echec d'ouverture, 4720/4726 compte cree/supprime,
    # 4728/4732/4756 ajout a un groupe de securite
    $ids = 4740, 4767, 4771, 4625, 4720, 4726, 4728, 4732, 4756
    $events = @(Get-WinEvent -MaxEvents 200 -ErrorAction SilentlyContinue -FilterHashtable @{
        LogName = "Security"; Id = $ids; StartTime = (Get-Date).AddDays(-7)
    })
    $out = foreach ($e in $events) {
        $d = @{}
        foreach ($n in ([xml]$e.ToXml()).Event.EventData.Data) { $d[$n.Name] = $n.'#text' }
        # Les comptes machine (NOM$) font du bruit en 4771/4625
        if ($d.TargetUserName -like '*$' -and $e.Id -in 4771, 4625) { continue }
        [ordered]@{
            id      = $e.Id
            time    = $e.TimeCreated.ToUniversalTime().ToString("o")
            dc      = $env:COMPUTERNAME
            target  = $d.TargetUserName
            subject = $d.SubjectUserName
            member  = $(if ($d.MemberName) { $d.MemberName -replace '^CN=([^,]+),.*$', '$1' } else { $null })
            caller  = $(if ($e.Id -eq 4740) { $d.TargetDomainName } else { $d.IpAddress })
            status  = $d.Status
        }
    }
    ConvertTo-Json -InputObject @($out) -Depth 3 -Compress
}

# ---------------------------------------------------------------------------
# Donnees fictives pour -Demo (meme forme que les vraies)
# ---------------------------------------------------------------------------
$DemoState = @{ locked = @{ "l.petit" = $true } }
function Get-DemoJson([string]$Name, $Arg) {
    $now = [DateTime]::UtcNow
    $iso = { param($m) $now.AddMinutes(-$m).ToString("o") }
    switch ($Name) {
        "users" {
            $csv = Import-Csv (Join-Path $Root "..\..\data\users.csv")
            $i = 0
            $list = foreach ($u in $csv) {
                $i++
                $locked = [bool]$DemoState.locked[$u.SamAccountName]
                [ordered]@{
                    sam = $u.SamAccountName; givenName = $u.FirstName; surname = $u.LastName
                    department = $u.Department; title = $u.JobTitle
                    ou = "OU=$($u.Department),OU=Users,OU=LAB,DC=lab,DC=local"
                    enabled = $true; lockedOut = $locked
                    lockoutTime = $(if ($locked) { & $iso 2 } else { $null })
                    lastLogon = & $iso (17 * $i * $i); badLogons = $(if ($locked) { 5 } else { 0 })
                }
            }
            return ConvertTo-Json -InputObject @($list) -Depth 4 -Compress
        }
        "unlock" {
            $DemoState.locked[$Arg] = $false
            return ConvertTo-Json -Compress -InputObject ([ordered]@{ sam = $Arg; lockedOut = $false })
        }
        "dcs" {
            $parts = "DC=lab,DC=local", "CN=Configuration,DC=lab,DC=local", "CN=Schema,CN=Configuration,DC=lab,DC=local"
            $mk = { param($src, $m) foreach ($p in $parts) { [ordered]@{ source = $src; partition = $p; lastSuccess = & $iso $m; lastAttempt = & $iso $m; result = 0; failures = 0 } } }
            $list = @(
                [ordered]@{ name = "DC01"; ip = "192.168.56.10"; site = "Default-First-Site-Name"; gc = $true
                            fsmo = @("SchemaMaster", "DomainNamingMaster", "PDCEmulator", "RIDMaster", "InfrastructureMaster")
                            reachable = $true; inbound = @(& $mk "DC02" 6) }
                [ordered]@{ name = "DC02"; ip = "192.168.56.11"; site = "Default-First-Site-Name"; gc = $true
                            fsmo = @(); reachable = $true; inbound = @(& $mk "DC01" 4) }
            )
            return ConvertTo-Json -InputObject $list -Depth 5 -Compress
        }
        "gpo" {
            $names = "SEC - Desactivation LLMNR", "SEC - Desactivation SMBv1", "SEC - Signature LDAP requise",
                     "SEC - Restriction enumeration anonyme", "SEC - Durcissement ouverture de session",
                     "Default Domain Policy", "Default Domain Controllers Policy"
            $gpos = foreach ($n in $names) {
                [ordered]@{ name = $n; comment = $null; status = "AllSettingsEnabled"; modified = & $iso 8000; linked = ($n -ne "Default Domain Controllers Policy") }
            }
            return ConvertTo-Json -Depth 4 -Compress -InputObject ([ordered]@{
                policy = [ordered]@{ minLength = 14; complexity = $true; maxAgeDays = 90; lockoutThreshold = 5; lockoutMinutes = 15 }
                gpos   = @($gpos)
            })
        }
        "alerts" {
            $list = @(
                [ordered]@{ id = 4740; time = & $iso 2; dc = "DC01"; target = "l.petit"; subject = "DC01$"; caller = "CLI01" }
                [ordered]@{ id = 4771; time = & $iso 3; dc = "DC01"; target = "l.petit"; status = "0x18"; caller = "::ffff:192.168.56.20" }
                [ordered]@{ id = 4771; time = & $iso 1100; dc = "DC01"; target = "e.durand"; status = "0x18"; caller = "::ffff:192.168.56.20" }
                [ordered]@{ id = 4728; time = & $iso 1900; dc = "DC01"; target = "GS-IT"; subject = "Administrator"; member = "Thomas Garnier" }
            )
            foreach ($sam in @($DemoState.locked.Keys)) {
                if (-not $DemoState.locked[$sam]) {
                    $list = @([ordered]@{ id = 4767; time = & $iso 0; dc = "DC01"; target = $sam; subject = "Administrator" }) + $list
                }
            }
            return ConvertTo-Json -InputObject $list -Depth 3 -Compress
        }
    }
}

# ---------------------------------------------------------------------------
# Session WinRM vers le DC, recreee si elle tombe
# ---------------------------------------------------------------------------
$script:Session = $null
function Invoke-Dc([string]$Name, $Arg) {
    if ($Demo) { return Get-DemoJson $Name $Arg }
    if (-not $script:Session -or $script:Session.State -ne "Opened") {
        if ($script:Session) { Remove-PSSession $script:Session -ErrorAction SilentlyContinue }
        $script:Session = New-PSSession -ComputerName $DomainController -Credential $Credential
    }
    $argList = @()
    if ($null -ne $Arg) { $argList = @($Arg) }
    return Invoke-Command -Session $script:Session -ScriptBlock $Remote[$Name] -ArgumentList $argList
}

function Write-Audit([string]$Line) {
    $entry = "{0}  {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $Line
    Write-Host $entry -ForegroundColor Yellow
    Add-Content -Path $AuditLog -Value $entry -Encoding ASCII
}

function Send-Response($Ctx, [int]$Status, [string]$Body, [string]$Type = "application/json; charset=utf-8") {
    $res = $Ctx.Response
    $res.StatusCode = $Status
    $res.ContentType = $Type
    $res.AddHeader("Cache-Control", "no-store")
    $res.AddHeader("X-Content-Type-Options", "nosniff")
    $res.AddHeader("X-Frame-Options", "DENY")
    $res.AddHeader("Referrer-Policy", "no-referrer")
    $buf = $Utf8.GetBytes($Body)
    $res.ContentLength64 = $buf.Length
    $res.OutputStream.Write($buf, 0, $buf.Length)
    $res.OutputStream.Close()
}

function Send-Error($Ctx, [int]$Status, [string]$Message) {
    Send-Response $Ctx $Status (ConvertTo-Json -Compress -InputObject @{ error = $Message })
}

function Invoke-Request($Ctx) {
    $req  = $Ctx.Request
    $path = $req.Url.AbsolutePath

    # Protection contre le DNS rebinding : seul l'hote localhost est accepte
    if ($req.Headers["Host"] -ne "localhost:$Port") { return Send-Error $Ctx 421 "Hote refuse" }

    if ($req.HttpMethod -eq "GET") {
        switch ($path) {
            "/" {
                $html = [IO.File]::ReadAllText((Join-Path $Root "index.html"), $Utf8)
                $html = $html.Replace("__CSRF_TOKEN__", $CsrfToken).Replace("__MODE__", $(if ($Demo) { "demo" } else { "live" }))
                return Send-Response $Ctx 200 $html "text/html; charset=utf-8"
            }
            "/favicon.ico" { $Ctx.Response.StatusCode = 204; $Ctx.Response.Close(); return }
            { $_ -in "/api/users", "/api/dcs", "/api/gpo", "/api/alerts" } {
                return Send-Response $Ctx 200 (Invoke-Dc $path.Substring(5))
            }
        }
        return Send-Error $Ctx 404 "Introuvable"
    }

    if ($req.HttpMethod -eq "POST" -and $path -eq "/api/unlock") {
        if ($req.Headers["Origin"] -ne $Origin)                 { return Send-Error $Ctx 403 "Origine refusee" }
        if ($req.Headers["X-CSRF-Token"] -ne $CsrfToken)       { return Send-Error $Ctx 403 "Jeton invalide" }
        if ($req.ContentType -notlike "application/json*")     { return Send-Error $Ctx 415 "JSON attendu" }
        if ($req.ContentLength64 -gt 1024)                     { return Send-Error $Ctx 413 "Requete trop longue" }
        $reader = New-Object IO.StreamReader($req.InputStream, $Utf8)
        try { $sam = ($reader.ReadToEnd() | ConvertFrom-Json).sam } catch { $sam = $null } finally { $reader.Close() }
        if ($sam -isnot [string] -or $sam -notmatch '^[A-Za-z0-9._-]{1,20}$') { return Send-Error $Ctx 400 "Identifiant invalide" }

        try {
            $json = Invoke-Dc "unlock" $sam
            Write-Audit "UNLOCK $sam par $(if ($Demo) { 'demo' } else { $Credential.UserName }) : OK"
            return Send-Response $Ctx 200 $json
        } catch {
            Write-Audit "UNLOCK $sam : ECHEC $($_.Exception.Message)"
            throw
        }
    }

    return Send-Error $Ctx 405 "Methode refusee"
}

# ---------------------------------------------------------------------------
# Demarrage
# ---------------------------------------------------------------------------
if (-not $Demo) {
    if (-not $Credential) {
        $Credential = Get-Credential -UserName "LAB\Administrator" -Message "Compte du domaine lab.local pour interroger $DomainController"
    }
    Write-Host "Connexion WinRM a $DomainController..."
    try {
        $null = Invoke-Dc "users"
    } catch {
        Write-Host "Impossible d'interroger $DomainController : $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Verifie que le lab tourne (vagrant up) et que $DomainController est dans TrustedHosts." -ForegroundColor Red
        Write-Host "Voir tools/dashboard/README.md." -ForegroundColor Red
        exit 1
    }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
$mode = if ($Demo) { "donnees de demo" } else { "relie a $DomainController" }
Write-Host "Tableau de bord sur $Origin/ ($mode). Ctrl+C pour arreter." -ForegroundColor Green

try {
    while ($listener.IsListening) {
        # Attente par tranches de 500 ms pour que Ctrl+C reste reactif
        $async = $listener.BeginGetContext($null, $null)
        while (-not $async.AsyncWaitHandle.WaitOne(500)) { }
        $ctx = $listener.EndGetContext($async)
        try {
            Invoke-Request $ctx
        } catch {
            Write-Host "$($ctx.Request.HttpMethod) $($ctx.Request.Url.AbsolutePath) : $($_.Exception.Message)" -ForegroundColor Red
            try { Send-Error $ctx 502 "Le controleur n'a pas repondu : $($_.Exception.Message)" } catch { }
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
    if ($script:Session) { Remove-PSSession $script:Session -ErrorAction SilentlyContinue }
    Write-Host "Serveur arrete."
}
