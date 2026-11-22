# Lab Active Directory sécurisé

![Schéma d'architecture du lab : DC01 sous Windows Server 2022 et CLI01 sous Windows 11 sur un réseau host-only isolé, domaine lab.local](docs/architecture.png)

Infrastructure as code pour déployer en une commande un environnement Active Directory durci sur poste local. Le projet provisionne deux contrôleurs de domaine répliqués, un poste client joint au domaine, une structure d'annuaire réaliste et un socle de durcissement appliqué par GPO.

Ce dépôt sert de support de pratique pour l'administration système Windows et la sécurisation d'un annuaire. Il documente les choix techniques et leur justification sécurité, pas seulement le code.

## Aperçu

| Composant | Rôle | Système | Adresse |
|-----------|------|---------|---------|
| DC01 | Contrôleur de domaine principal, DNS, DFS | Windows Server 2022 | 192.168.56.10 |
| DC02 | Contrôleur additionnel, DNS, DFS (réplique DC01) | Windows Server 2022 | 192.168.56.11 |
| CLI01 | Poste client joint au domaine | Windows 10 | 192.168.56.20 |

Domaine : `lab.local`
Réseau host-only : `192.168.56.0/24`

## Ce que le lab met en place automatiquement

- Installation automatique du plugin `vagrant-reload` s'il manque
- Patch automatique des OVF des box Windows pour compatibilité VirtualBox 7.0
- Promotion d'un contrôleur de domaine principal et configuration DNS
- Promotion d'un contrôleur additionnel dans la même forêt (redondance AD + DNS)
- Structure d'unités d'organisation par fonction (IT, Finance, Operations)
- Groupes de sécurité et comptes utilisateurs importés depuis un fichier CSV
- Politique de mot de passe et de verrouillage durcie
- GPO de durcissement contre des vecteurs d'attaque connus (empoisonnement LLMNR, SMBv1, relais LDAP, énumération anonyme)
- Infrastructure DFS : namespace domain-based `\\lab.local\Public` avec cibles multiples + réplication DFS-R du dossier SharedData entre DC01 et DC02
- Fichier de bienvenue `Welcome.txt` placé dans le partage répliqué
- GPO qui ouvre `Welcome.txt` automatiquement à chaque ouverture de session sur le domaine
- Jonction automatique du poste client au domaine

## Prérequis

| Outil | Version conseillée | Rôle |
|-------|--------------------|------|
| VirtualBox | **7.0.x uniquement** (7.2 non compatible avec les box Windows récentes) | Hyperviseur |
| Vagrant | 2.4 ou supérieure | Orchestration |
| Plugin vagrant-reload | dernière version | Gestion des redémarrages, installé automatiquement au premier `vagrant up` |
| RAM disponible | 16 Go minimum, 20-32 Go recommandés | Trois VM tournent en parallèle (12 Go alloués) |

Note importante sur VirtualBox : la branche 7.2 rejette l'OVF des box Windows récentes de gusztavvargadr avec l'erreur `Unknown resource type 32768`. Utiliser VirtualBox 7.0.x (dernier build 7.0.26 disponible sur https://www.virtualbox.org/wiki/Download_Old_Builds_7_0). Le Vagrantfile patche automatiquement l'OVF téléchargé pour retirer l'entree NVRAM incompatible, aucune action manuelle requise.

Note sur les hôtes Windows 11 : si `Memory Integrity` (Sécurité Windows -> Sécurité de l'appareil -> Isolation du noyau) est activée, VirtualBox tourne en mode dégradé et les VM restent bloquées à l'écran noir. Désactiver Memory Integrity puis redémarrer avant `vagrant up`. Voir [dépannage](docs/troubleshooting.md).

Le plugin `vagrant-reload` est installé automatiquement au premier `vagrant up` s'il manque. Installation manuelle possible si besoin :

```bash
vagrant plugin install vagrant-reload
```

## Démarrage rapide

```bash
git clone https://github.com/Cyber31000/ad-secure-lab.git
cd ad-secure-lab
vagrant up
```

La première exécution télécharge les images Windows, ce qui prend du temps selon la connexion. Le provisioning enchaîne la promotion du contrôleur, sa configuration, le durcissement, puis la jonction du client. Plusieurs redémarrages sont normaux et gérés automatiquement.

## Accès aux machines

```bash
# Ouvrir une session RDP vers le contrôleur
vagrant rdp dc01

# Ouvrir une session vers le client
vagrant rdp cli01
```

Comptes de laboratoire :

| Compte | Mot de passe | Usage |
|--------|--------------|-------|
| LAB\Administrator | vagrant | Administration du domaine |
| LAB\m.lefevre (et autres) | User-L@b-2025! | Comptes utilisateurs, changement imposé à la première connexion |

Ces identifiants sont des valeurs de laboratoire. Voir la note de sécurité en bas de page.

## Cycle de vie

```bash
vagrant halt        # arrêt des VM
vagrant up          # redémarrage
vagrant provision   # rejouer le provisioning (scripts idempotents)
vagrant destroy -f  # suppression complète
```

## Structure du dépôt

```
ad-secure-lab/
├── Vagrantfile              orchestration des trois VM
├── data/
│   └── users.csv            comptes utilisateurs à importer
├── scripts/
│   ├── dc/                  provisioning du contrôleur principal (DC01)
│   │   ├── 01-install-adds.ps1
│   │   ├── 02-configure-ad.ps1
│   │   ├── 03-apply-gpo.ps1
│   │   └── 04-install-dfs.ps1
│   ├── dc2/                 provisioning du contrôleur additionnel (DC02)
│   │   ├── 01-install-adds-role.ps1
│   │   ├── 02-promote-additional-dc.ps1
│   │   └── 03-configure-dfs.ps1
│   └── client/
│       └── 01-join-domain.ps1
└── docs/                    documentation technique
    ├── architecture.md      schéma réseau et choix d'infrastructure
    ├── architecture.png     schéma d'architecture du lab (image)
    ├── ou-design.md         logique de la structure d'annuaire
    ├── gpo-hardening.md     justification de chaque mesure de durcissement
    └── troubleshooting.md   pannes courantes et résolution
```

## Documentation

- [Architecture](docs/architecture.md) : topologie réseau, dimensionnement, choix des images
- [Conception de l'annuaire](docs/ou-design.md) : structure d'OU, délégation, ciblage de GPO
- [Durcissement par GPO](docs/gpo-hardening.md) : chaque mesure, le vecteur d'attaque qu'elle contre, la référence ANSSI ou CIS associée
- [Dépannage](docs/troubleshooting.md) : erreurs fréquentes et corrections

## Note de sécurité

Tous les mots de passe de ce dépôt sont des valeurs de laboratoire en clair. Ce projet est conçu pour un environnement isolé sur poste local. Ne jamais réutiliser ces identifiants, ne jamais exposer ces machines sur un réseau de production, ne jamais publier de vrais secrets dans un dépôt Git. En conditions réelles, les secrets se gèrent par coffre dédié et les comptes par délégation et moindre privilège.

## Licence

MIT. Voir le fichier LICENSE.
