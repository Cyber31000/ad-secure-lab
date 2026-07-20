# Depannage

Pannes courantes lors du deploiement et leur resolution. Les sections sont classees par ordre de survenue habituel : prerequis d'hote, puis import de box, puis provisioning des VM.

## Le plugin vagrant-reload est introuvable

Symptome : Vagrant signale un provisioner `reload` inconnu au demarrage.

Cause : le plugin n'est pas installe. Il n'est pas inclus dans Vagrant par defaut.

Resolution : le Vagrantfile detecte ce cas et installe le plugin automatiquement au premier `vagrant up`. En cas d'echec du bootstrap :

```bash
vagrant plugin install vagrant-reload
```

## Erreur VirtualBox `Unknown resource type 32768`

Symptome : `vagrant up` echoue a l'import de la box avec :

```
VBoxManage.exe: error: Unknown resource type 32768 in hardware item, line 49
```

Cause : les box recentes de `gusztavvargadr` declarent une entree NVRAM (etat UEFI/Secure Boot pre-configure) avec un ResourceType que VirtualBox 7.0 comme 7.2 ne savent pas parser.

Resolution : le Vagrantfile patche automatiquement l'OVF au chargement pour retirer ce noeud, aucune action manuelle requise. Si tu utilisais VirtualBox 7.2, downgrade recommande vers 7.0.x (dernier 7.0.26 disponible sur https://www.virtualbox.org/wiki/Download_Old_Builds_7_0). La branche 7.2 introduit d'autres regressions sur les box Windows.

Si le patch n'a pas ete applique (par exemple parce que tu as ajoute une box manuellement), forcer le patch en supprimant la box et en relancant `vagrant up` (le Vagrantfile re-patchera au moment du telechargement) :

```powershell
vagrant box remove gusztavvargadr/windows-server-2022-standard --force
vagrant box remove gusztavvargadr/windows-10 --force
vagrant up
```

## VM bloquee sur ecran noir (host Windows 11)

Symptome : la VM demarre selon VirtualBox (`En fonction`), mais l'ecran reste noir, Vagrant timeout sur `Waiting for machine to boot`.

Cause : sur Windows 11, la Virtualization-Based Security (VBS) reste active meme quand Hyper-V est desinstalle. L'hyperviseur Microsoft tourne en parallele et bloque VirtualBox.

Verification :

```powershell
Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard |
  Select VirtualizationBasedSecurityStatus, SecurityServicesRunning
```

Si `VirtualizationBasedSecurityStatus` vaut 2, VBS est actif. Il faut le desactiver :

1. Securite Windows -> Securite de l'appareil -> Isolation du noyau -> Details -> desactiver **Integrite de la memoire**.
2. Registre + bcdedit (PowerShell admin) :
   ```powershell
   reg add "HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard" /v EnableVirtualizationBasedSecurity /t REG_DWORD /d 0 /f
   reg add "HKLM\SYSTEM\CurrentControlSet\Control\Lsa" /v LsaCfgFlags /t REG_DWORD /d 0 /f
   bcdedit /set hypervisorlaunchtype off
   ```
3. Redemarrer Windows (obligatoire).
4. Verifier a nouveau que `VirtualizationBasedSecurityStatus` vaut 0.

Attention : les builds Windows Insider Preview forcent VBS actif et ne permettent pas toujours de le desactiver. Repasser sur une build stable est parfois necessaire.

## Reseau host-only 192.168.56.0/24 rejete

Symptome : VirtualBox refuse de creer l'interface hostonly avec un message du type `IP address is not within the allowed ranges`.

Cause : depuis VirtualBox 6.1+, la plage 192.168.56.0/24 doit etre explicitement autorisee.

Resolution (PowerShell admin sur hote Windows) :

```powershell
New-Item -ItemType Directory -Force -Path "C:\ProgramData\VirtualBox" | Out-Null
Add-Content -Path "C:\ProgramData\VirtualBox\networks.conf" -Value "* 192.168.56.0/21"
```

Sur macOS/Linux, editer `/etc/vbox/networks.conf` avec la meme ligne.

## Le telechargement de l'image echoue ou est tres lent

Symptome : `vagrant up` reste bloque sur le telechargement de la box, ou echoue avec une erreur de checksum.

Cause : les images Windows sont volumineuses (5 a 8 Go). La premiere execution telecharge plusieurs gigaoctets. Une coupure produit un fichier partiel dont le checksum echoue.

Resolution : nettoyer le telechargement partiel et relancer :

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.vagrant.d\tmp\*" -ErrorAction SilentlyContinue
vagrant up
```

Verifier au prealable l'espace disque disponible (au moins 20 Go libres).

## Conflit de VM VirtualBox : `VBoxManage: error: Could not rename the directory`

Symptome : au demarrage, VirtualBox indique qu'une VM du meme nom existe deja.

Cause : residus d'un `vagrant destroy` interrompu ou d'un crash Vagrant. La VM est encore enregistree dans VirtualBox et/ou son dossier existe encore sur disque.

Resolution :

```powershell
# Tuer les processus VirtualBox restants
Get-Process VBoxHeadless, VirtualBox, VBoxSVC, VBoxManage, vagrant, ruby -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 5

# Desinscrire toutes les VM enregistrees
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" list vms | ForEach-Object {
    if ($_ -match '\{([a-f0-9-]+)\}') {
        & "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" unregistervm $Matches[1] 2>$null
    }
}

# Supprimer les dossiers residuels
Get-ChildItem "$env:USERPROFILE\VirtualBox VMs" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\.vagrant -ErrorAction SilentlyContinue

vagrant up
```

## Vagrant signale `another process is already executing an action on the machine`

Symptome : `vagrant up` echoue immediatement avec ce message.

Cause : un processus Vagrant precedent tourne encore (souvent apres un Ctrl+C mal digere ou un timeout WinRM).

Resolution :

```powershell
Get-Process ruby, vagrant -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3
vagrant up
```

## La promotion du controleur echoue au reload : "Role change is in progress"

Symptome : le script `01-install-adds.ps1` echoue avec :

```
Install-ADDSForest : Verification of prerequisites for Domain Controller promotion failed.
Role change is in progress or this computer needs to be restarted.
```

Cause : une promotion precedente a ete initiee mais la VM n'a pas rebootee pour la finaliser. Le script tente de relancer la promotion, Windows refuse.

Resolution : forcer un cycle reboot + provisioning :

```bash
vagrant reload dc01 --provision
```

Les scripts sont idempotents. Au reboot, `01-install-adds.ps1` va detecter que la machine est deja controleur (DomainRole = 4 ou 5) et sauter la promotion.

## Vagrant timeout WinRM apres la promotion DC

Symptome : apres le provisioning `01-install-adds.ps1`, Vagrant reste bloque sur `Attempting graceful shutdown of VM...` puis timeout et detruit la VM.

Cause : apres la promotion DC, WinRM change d'authentification (NTLM vers Kerberos). Le transport `negotiate` par defaut ne gere pas bien cette transition et hang sur le handshake.

Resolution : le Vagrantfile force `winrm.transport = :plaintext` avec `basic_auth_only = true` pour eviter ce probleme. Si tu as modifie ces reglages, remets-les et relance. Le `graceful_halt_timeout` est aussi porte a 10 minutes pour laisser AD DS terminer son arret propre.

## Vagrant bloque sur `Setting hostname` (Windows 10)

Symptome : cli01 boot, mais Vagrant reste indefiniment sur `==> cli01: Setting hostname...`.

Cause : la commande de renommage Windows a echoue silencieusement, ou Vagrant attend un reboot qui n'a pas ete demande.

Resolution : renommer manuellement puis reprendre le provisioning :

```powershell
# Verifier qu'on peut parler a la VM
vagrant winrm cli01 -c "hostname"

# Renommer + reboot
vagrant winrm cli01 -c "Rename-Computer -NewName CLI01 -Force -Restart"

# Attendre 2-3 min que Windows reboot, puis :
vagrant winrm cli01 -c "hostname"   # doit renvoyer CLI01

# Continuer le provisioning
vagrant up cli01 --provision
```

## La jonction du client au domaine echoue

Symptome : le script client signale que le domaine est introuvable ou que l'authentification echoue.

Cause la plus frequente : le client ne resout pas le domaine car son DNS ne pointe pas vers le controleur.

Verifications :

- DC01 est demarre et a termine sa configuration avant la jonction du client
- l'interface host-only du client est bien en 192.168.56.x
- le DNS du client pointe vers 192.168.56.10

Test manuel depuis le client :

```powershell
vagrant winrm cli01 -c "Resolve-DnsName lab.local"
vagrant winrm cli01 -c "nltest /dsgetdc:lab.local"
vagrant winrm cli01 -c "Test-ComputerSecureChannel"
```

`Test-ComputerSecureChannel` doit renvoyer `True` : c'est le vrai indicateur que la jonction fonctionne. Un `nslookup lab.local` sans serveur explicite peut echouer (le client interroge le DNS du NAT VirtualBox qui ne connait pas le domaine), ce n'est pas revelateur d'un vrai probleme.

## Identifiants de la box differents

Symptome : la jonction au domaine echoue sur l'authentification, alors que le DNS resout bien le domaine.

Cause : le script client utilise le compte Administrateur du domaine avec le mot de passe par defaut de la box gusztavvargadr (`vagrant`). Si tu changes de box, ce mot de passe peut differer.

Resolution : verifier les identifiants par defaut de la box utilisee et ajuster `scripts/client/01-join-domain.ps1` en consequence.

## Repartir de zero

Pour tout supprimer et recommencer :

```bash
vagrant destroy -f
vagrant up
```

Si `destroy` echoue lui aussi (VM bloquee), utiliser la procedure de nettoyage complete de la section "Conflit de VM VirtualBox" ci-dessus.
