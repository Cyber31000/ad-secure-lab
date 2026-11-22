# Dépannage

Pannes courantes lors du déploiement et leur résolution.

## Le plugin vagrant-reload est introuvable

Symptôme : Vagrant signale un provisioner `reload` inconnu au démarrage.

Cause : le plugin n'est pas installé. Il n'est pas inclus dans Vagrant par défaut.

Résolution :

```bash
vagrant plugin install vagrant-reload
```

## Le téléchargement de l'image échoue ou est très lent

Symptôme : `vagrant up` reste bloqué sur le téléchargement de la box.

Cause : les images Windows sont volumineuses. La première exécution télécharge plusieurs gigaoctets.

Résolution : laisser le téléchargement se terminer. En cas de coupure, relancer `vagrant up`, le téléchargement reprend. Vérifier l'espace disque disponible.

## La promotion du contrôleur échoue

Symptôme : le script 01 s'interrompt pendant la promotion.

Causes possibles et vérifications :

- RAM insuffisante allouée à la VM. La promotion d'un contrôleur demande des ressources. Vérifier les 4 Go alloués.
- Le service a besoin d'un redémarrage propre. Le script utilise volontairement l'option qui empêche le reboot automatique, car ce reboot est géré par Vagrant. Si tu as modifié le Vagrantfile en retirant le provisioner reload, la séquence casse. Le reload doit rester juste après le script 01.

Pour rejouer proprement :

```bash
vagrant provision dc01
```

Les scripts sont idempotents, relancer ne casse rien.

## La jonction du client au domaine échoue

Symptôme : le script client signale que le domaine est introuvable.

Cause la plus fréquente : le client ne résout pas le domaine car son DNS ne pointe pas vers le contrôleur.

Vérifications :

- le contrôleur DC01 est démarré et a terminé sa configuration avant la jonction du client
- l'interface host-only du client est bien en 192.168.56.x
- le DNS du client pointe vers 192.168.56.10

Test manuel depuis le client :

```powershell
Resolve-DnsName lab.local
nltest /dsgetdc:lab.local
```

Si la résolution échoue, vérifier que le contrôleur répond et que le script de pointage DNS a bien identifié la bonne interface.

## Conflit de réseau host-only

Symptôme : VirtualBox refuse de créer l'interface en 192.168.56.x.

Cause : sur certaines versions de VirtualBox, la plage 192.168.56.0/24 doit être déclarée comme réseau host-only autorisé.

Résolution : vérifier dans les préférences réseau de VirtualBox que la plage est présente, ou ajuster l'adresse dans le Vagrantfile vers une plage autorisée, en gardant la cohérence entre les deux VM et les scripts.

## Identifiants de la box différents

Symptôme : la jonction au domaine échoue sur l'authentification, alors que le DNS résout bien le domaine.

Cause : le script client utilise le compte Administrateur du domaine avec le mot de passe par défaut de la box. Si tu changes de box, ce mot de passe peut différer.

Résolution : vérifier les identifiants par défaut de la box utilisée et ajuster le script de jonction en conséquence.

## Le contrôleur s'annonce avec l'adresse 10.0.2.15

Symptôme : `nltest /dsgetdc:lab.local` renvoie `Address: \\10.0.2.15`, le client ne joint plus le domaine, ou la réplication entre deux DC échoue avec `The target principal name is incorrect` (erreur 2148074274).

Cause : Vagrant ajoute à chaque VM une carte NAT avec la même adresse, 10.0.2.15. Si un contrôleur l'enregistre dans le DNS, une machine qui le cherche obtient cette adresse et se connecte à elle-même. Pour la réplication, DC01 présente alors un ticket Kerberos destiné à DC02 qu'il ne peut pas déchiffrer.

Diagnostic : interroger le serveur DNS directement, pas le cache local.

```powershell
Resolve-DnsName dc01.lab.local -Server 192.168.56.10 -DnsOnly
```

Résolution : les scripts de provisioning excluent désormais la carte NAT de l'enregistrement DNS et limitent l'écoute du serveur DNS à 192.168.56.10. Sur une VM déjà déployée :

```powershell
Set-DnsClient -InterfaceAlias "Ethernet" -RegisterThisConnectionsAddress $false
dnscmd /ResetListenAddresses 192.168.56.10
Restart-Service DNS
```

Puis supprimer les enregistrements A en 10.0.2.15 dans les zones `lab.local` et `_msdcs.lab.local`, et relancer `ipconfig /registerdns`.

## Repartir de zero

Pour tout supprimer et recommencer :

```bash
vagrant destroy -f
vagrant up
```

Cette commande détruit les deux VM et relance un déploiement complet.
