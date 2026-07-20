# Architecture

## Topologie

Le lab repose sur trois machines virtuelles connectees a un reseau host-only prive. Ce reseau isole le trafic du domaine de ton reseau physique et de la box NAT que Vagrant utilise pour l'acces internet.

```
                        Hote (ta machine)
                               |
        +----------------------+-----------------------+
        |         Reseau host-only 192.168.56.0/24     |
        +----+-----------------+---------------+-------+
             |                 |               |
       +-----+------+   +------+-----+   +-----+------+
       |   DC01     |   |    DC02    |   |   CLI01    |
       |192.168.56.10|  |192.168.56.11|  |192.168.56.20|
       |AD DS + DNS |   |AD DS + DNS |   | Client     |
       |DFS-N/R     |<->|DFS-N/R     |   | joint      |
       +------------+   +------------+   +------------+
                 \\lab.local\Public (DFS)      ^
                    \\lab.local\Public\Files   |
                    replique DC01 <-> DC02 ----+
                    Welcome.txt ouvert au login
```

Chaque VM dispose de deux interfaces :

- une interface NAT geree par Vagrant, pour le telechargement des mises a jour et la resolution externe
- une interface host-only en 192.168.56.x, pour le trafic du domaine

Cette separation est volontaire. Le trafic d'annuaire reste contenu dans un segment isole, ce qui reproduit la logique de segmentation reseau d'un environnement reel.

## Choix d'infrastructure

### Images

Les images proviennent de l'editeur communautaire gusztavvargadr, activement maintenu et largement utilise pour les labs Windows. Les deux controleurs tournent sous Windows Server 2022, le client sous Windows 10. Ce trio correspond a un parc d'entreprise courant.

### Reseau host-only plutot que bridge

Un reseau host-only n'expose pas les VM sur le reseau physique. Pour un lab de domaine, c'est le bon choix : aucun risque de conflit DHCP avec un vrai serveur, aucun risque d'exposer un controleur de domaine de test sur le LAN.

### DNS porte par les deux controleurs

DC01 et DC02 hebergent tous deux le service DNS, integre a AD. C'est une exigence d'Active Directory : la resolution des enregistrements de service du domaine passe par ce DNS. Le client pointe son DNS vers 192.168.56.10 (DC01) au moment de la jonction, et beneficie automatiquement de la resilience via DC02 apres.

Un forwarder vers un resolveur public est ajoute sur DC01 pour conserver la resolution des noms externes.

### Deux controleurs de domaine

DC02 est promu comme controleur additionnel dans la meme foret `lab.local`. Cette configuration reproduit le pattern minimal recommande en production (jamais un DC seul), permet d'observer la replication AD, et sert de base a la replication DFS.

### DFS Namespaces + Replication

DFS regroupe deux briques :

- **DFS Namespaces (DFS-N)** : le partage `\\lab.local\Public` est un chemin logique, resolu par AD, qui pointe indifferemment sur `\\DC01\Public` ou `\\DC02\Public`. Le client n'a pas a connaitre les serveurs derriere.
- **DFS Replication (DFS-R)** : le contenu de `C:\SharedData` est repliqué automatiquement entre DC01 et DC02 (multi-master). Une ecriture sur un DC apparait sur l'autre en quelques minutes.

Cela met en pratique la haute disponibilite d'un partage de fichiers et l'abstraction cliente typique d'un DFS d'entreprise.

## Dimensionnement

| Ressource | DC01 | DC02 | CLI01 |
|-----------|------|------|-------|
| vCPU | 2 | 2 | 2 |
| RAM | 4 Go | 4 Go | 4 Go |
| Disque | image de base | image de base | image de base |

Le total mobilise 12 Go de RAM pendant que les trois machines tournent. **Sur un poste a 16 Go, ca passe mais tres serre** : cohabitation difficile avec navigateur + editeur. Sur 20-32 Go c'est confortable. En dessous de 16 Go, demarrer les VM une par une (`vagrant up dc01`, puis `vagrant up dc02`, puis `vagrant up cli01`).

## Sequence de provisioning

La promotion d'un controleur de domaine et la jonction au domaine imposent des redemarrages. Le Vagrantfile orchestre cette sequence avec le plugin vagrant-reload.

```
DC01
  1. Installation du role AD DS + promotion en foret      (01-install-adds.ps1)
  2. Redemarrage                                          (vagrant reload)
  3. Structure d'OU, groupes, utilisateurs, forwarder DNS (02-configure-ad.ps1)
  4. Durcissement par GPO                                 (03-apply-gpo.ps1)
  5. Installation DFS + dossiers partages                 (04-install-dfs.ps1)

DC02
  1. Pointage DNS vers DC01 + installation role AD DS     (01-install-adds-role.ps1)
  2. Promotion comme DC additionnel                       (02-promote-additional-dc.ps1)
  3. Redemarrage                                          (vagrant reload)
  4. DFS complet : replication + namespace + Welcome.txt  (03-configure-dfs.ps1)
     + GPO d'ouverture automatique au login

CLI01
  1. Pointage DNS + jonction au domaine                   (01-join-domain.ps1)
  2. Redemarrage                                          (vagrant reload)
```

Les scripts sont idempotents. Relancer `vagrant provision` ne casse rien : chaque action verifie l'etat avant de s'executer.

## Pistes d'extension

Le lab est deja consequent. Quelques axes pour l'enrichir davantage :

- ajouter un serveur membre (fichiers, IIS, RDS) pour pratiquer la delegation d'admin
- decouper le reseau en plusieurs segments et router entre eux
- brancher une collecte de journaux vers un puits central pour pratiquer la detection
- ajouter une PKI interne (AD CS) pour delivrer des certificats aux services
- publier des applications RemoteApp via un RD Session Host
