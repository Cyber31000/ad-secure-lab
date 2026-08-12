# Architecture

## Topologie

Le lab repose sur deux machines virtuelles connectées à un réseau host-only privé. Ce réseau isole le trafic du domaine de ton réseau physique et de la box NAT que Vagrant utilise pour l'accès internet.

```
                 Hôte (ta machine)
                        |
        +---------------+----------------+
        |   Réseau host-only 192.168.56.0/24   |
        +---------------+----------------+
                |                  |
        +-------+------+    +------+-------+
        |    DC01      |    |    CLI01     |
        | 192.168.56.10|    | 192.168.56.20|
        | AD DS + DNS  |    | Client joint |
        +--------------+    +--------------+
```

Chaque VM dispose de deux interfaces :

- une interface NAT gérée par Vagrant, pour le téléchargement des mises à jour et la résolution externe
- une interface host-only en 192.168.56.x, pour le trafic du domaine

Cette séparation est volontaire. Le trafic d'annuaire reste contenu dans un segment isolé, ce qui reproduit la logique de segmentation réseau d'un environnement réel.

## Choix d'infrastructure

### Images

Les images proviennent de l'éditeur communautaire gusztavvargadr, activement maintenu et largement utilisé pour les labs Windows. Le contrôleur tourne sous Windows Server 2022, le client sous Windows 11. Ce couple correspond à un parc d'entreprise courant.

### Réseau host-only plutôt que bridge

Un réseau host-only n'expose pas les VM sur le réseau physique. Pour un lab de domaine, c'est le bon choix : aucun risque de conflit DHCP avec un vrai serveur, aucun risque d'exposer un contrôleur de domaine de test sur le LAN.

### DNS porté par le contrôleur

Le contrôleur de domaine héberge le service DNS. C'est une exigence d'Active Directory : la résolution des enregistrements de service du domaine passe par ce DNS. Le client pointe donc son DNS vers 192.168.56.10 avant la jonction. Sans ce pointage, la jonction échoue car le client ne trouve pas le domaine.

Un forwarder vers un résolveur public est ajouté sur le contrôleur pour conserver la résolution des noms externes.

## Dimensionnement

| Ressource | DC01 | CLI01 |
|-----------|------|-------|
| vCPU | 2 | 2 |
| RAM | 4 Go | 4 Go |
| Disque | image de base | image de base |

Le total mobilise 8 Go de RAM pendant que les deux machines tournent. Sur un poste à 16 Go, le lab cohabite avec une utilisation bureautique. En dessous, démarrer les VM une par une.

## Séquence de provisioning

La promotion d'un contrôleur de domaine et la jonction au domaine imposent des redémarrages. Le Vagrantfile orchestre cette séquence avec le plugin vagrant-reload.

```
DC01
  1. Installation du rôle AD DS + promotion en forêt      (01-install-adds.ps1)
  2. Redémarrage                                          (vagrant reload)
  3. Structure d'OU, groupes, utilisateurs, forwarder DNS (02-configure-ad.ps1)
  4. Durcissement par GPO                                 (03-apply-gpo.ps1)

CLI01
  1. Pointage DNS + jonction au domaine                   (01-join-domain.ps1)
  2. Redémarrage                                          (vagrant reload)
```

Les scripts sont idempotents. Relancer `vagrant provision` ne casse rien : chaque action vérifie l'état avant de s'exécuter.

## Pistes d'extension

Le lab est volontairement compact. Quelques axes pour l'enrichir :

- ajouter un second contrôleur de domaine et observer la réplication
- ajouter un serveur membre (serveur de fichiers, IIS) pour pratiquer la délégation
- découper le réseau en plusieurs segments et router entre eux
- brancher une collecte de journaux vers un puits central pour pratiquer la détection
