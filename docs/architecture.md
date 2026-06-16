# Architecture

## Topologie

Le lab repose sur deux machines virtuelles connectees a un reseau host-only prive. Ce reseau isole le trafic du domaine de ton reseau physique et de la box NAT que Vagrant utilise pour l'acces internet.

```
                 Hote (ta machine)
                        |
        +---------------+----------------+
        |   Reseau host-only 192.168.56.0/24   |
        +---------------+----------------+
                |                  |
        +-------+------+    +------+-------+
        |    DC01      |    |    CLI01     |
        | 192.168.56.10|    | 192.168.56.20|
        | AD DS + DNS  |    | Client joint |
        +--------------+    +--------------+
```

Chaque VM dispose de deux interfaces :

- une interface NAT geree par Vagrant, pour le telechargement des mises a jour et la resolution externe
- une interface host-only en 192.168.56.x, pour le trafic du domaine

Cette separation est volontaire. Le trafic d'annuaire reste contenu dans un segment isole, ce qui reproduit la logique de segmentation reseau d'un environnement reel.

## Choix d'infrastructure

### Images

Les images proviennent de l'editeur communautaire gusztavvargadr, activement maintenu et largement utilise pour les labs Windows. Le controleur tourne sous Windows Server 2022, le client sous Windows 11. Ce couple correspond a un parc d'entreprise courant.

### Reseau host-only plutot que bridge

Un reseau host-only n'expose pas les VM sur le reseau physique. Pour un lab de domaine, c'est le bon choix : aucun risque de conflit DHCP avec un vrai serveur, aucun risque d'exposer un controleur de domaine de test sur le LAN.

### DNS porte par le controleur

Le controleur de domaine heberge le service DNS. C'est une exigence d'Active Directory : la resolution des enregistrements de service du domaine passe par ce DNS. Le client pointe donc son DNS vers 192.168.56.10 avant la jonction. Sans ce pointage, la jonction echoue car le client ne trouve pas le domaine.

Un forwarder vers un resolveur public est ajoute sur le controleur pour conserver la resolution des noms externes.

## Dimensionnement

| Ressource | DC01 | CLI01 |
|-----------|------|-------|
| vCPU | 2 | 2 |
| RAM | 4 Go | 4 Go |
| Disque | image de base | image de base |

Le total mobilise 8 Go de RAM pendant que les deux machines tournent. Sur un poste a 16 Go, le lab cohabite avec une utilisation bureautique. En dessous, demarrer les VM une par une.

## Sequence de provisioning

La promotion d'un controleur de domaine et la jonction au domaine imposent des redemarrages. Le Vagrantfile orchestre cette sequence avec le plugin vagrant-reload.

```
DC01
  1. Installation du role AD DS + promotion en foret      (01-install-adds.ps1)
  2. Redemarrage                                          (vagrant reload)
  3. Structure d'OU, groupes, utilisateurs, forwarder DNS (02-configure-ad.ps1)
  4. Durcissement par GPO                                 (03-apply-gpo.ps1)

CLI01
  1. Pointage DNS + jonction au domaine                   (01-join-domain.ps1)
  2. Redemarrage                                          (vagrant reload)
```

Les scripts sont idempotents. Relancer `vagrant provision` ne casse rien : chaque action verifie l'etat avant de s'executer.

## Pistes d'extension

Le lab est volontairement compact. Quelques axes pour l'enrichir :

- ajouter un second controleur de domaine et observer la replication
- ajouter un serveur membre (serveur de fichiers, IIS) pour pratiquer la delegation
- decouper le reseau en plusieurs segments et router entre eux
- brancher une collecte de journaux vers un puits central pour pratiquer la detection
