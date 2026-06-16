# Depannage

Pannes courantes lors du deploiement et leur resolution.

## Le plugin vagrant-reload est introuvable

Symptome : Vagrant signale un provisioner `reload` inconnu au demarrage.

Cause : le plugin n'est pas installe. Il n'est pas inclus dans Vagrant par defaut.

Resolution :

```bash
vagrant plugin install vagrant-reload
```

## Le telechargement de l'image echoue ou est tres lent

Symptome : `vagrant up` reste bloque sur le telechargement de la box.

Cause : les images Windows sont volumineuses. La premiere execution telecharge plusieurs gigaoctets.

Resolution : laisser le telechargement se terminer. En cas de coupure, relancer `vagrant up`, le telechargement reprend. Verifier l'espace disque disponible.

## La promotion du controleur echoue

Symptome : le script 01 s'interrompt pendant la promotion.

Causes possibles et verifications :

- RAM insuffisante allouee a la VM. La promotion d'un controleur demande des ressources. Verifier les 4 Go alloues.
- Le service a besoin d'un redemarrage propre. Le script utilise volontairement l'option qui empeche le reboot automatique, car ce reboot est gere par Vagrant. Si tu as modifie le Vagrantfile en retirant le provisioner reload, la sequence casse. Le reload doit rester juste apres le script 01.

Pour rejouer proprement :

```bash
vagrant provision dc01
```

Les scripts sont idempotents, relancer ne casse rien.

## La jonction du client au domaine echoue

Symptome : le script client signale que le domaine est introuvable.

Cause la plus frequente : le client ne resout pas le domaine car son DNS ne pointe pas vers le controleur.

Verifications :

- le controleur DC01 est demarre et a terminé sa configuration avant la jonction du client
- l'interface host-only du client est bien en 192.168.56.x
- le DNS du client pointe vers 192.168.56.10

Test manuel depuis le client :

```powershell
Resolve-DnsName lab.local
nltest /dsgetdc:lab.local
```

Si la resolution echoue, verifier que le controleur repond et que le script de pointage DNS a bien identifie la bonne interface.

## Conflit de reseau host-only

Symptome : VirtualBox refuse de creer l'interface en 192.168.56.x.

Cause : sur certaines versions de VirtualBox, la plage 192.168.56.0/24 doit etre declaree comme reseau host-only autorise.

Resolution : verifier dans les preferences reseau de VirtualBox que la plage est presente, ou ajuster l'adresse dans le Vagrantfile vers une plage autorisee, en gardant la coherence entre les deux VM et les scripts.

## Identifiants de la box differents

Symptome : la jonction au domaine echoue sur l'authentification, alors que le DNS resout bien le domaine.

Cause : le script client utilise le compte Administrateur du domaine avec le mot de passe par defaut de la box. Si tu changes de box, ce mot de passe peut differer.

Resolution : verifier les identifiants par defaut de la box utilisee et ajuster le script de jonction en consequence.

## Repartir de zero

Pour tout supprimer et recommencer :

```bash
vagrant destroy -f
vagrant up
```

Cette commande detruit les deux VM et relance un deploiement complet.
