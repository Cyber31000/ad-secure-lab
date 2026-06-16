# Lab Active Directory securise

Infrastructure as code pour deployer en une commande un environnement Active Directory durci sur poste local. Le projet provisionne un controleur de domaine, un poste client joint au domaine, une structure d'annuaire realiste et un socle de durcissement applique par GPO.

Ce depot sert de support de pratique pour l'administration systeme Windows et la securisation d'un annuaire. Il documente les choix techniques et leur justification securite, pas seulement le code.

## Apercu

| Composant | Role | Systeme | Adresse |
|-----------|------|---------|---------|
| DC01 | Controleur de domaine, DNS | Windows Server 2022 | 192.168.56.10 |
| CLI01 | Poste client joint au domaine | Windows 11 | 192.168.56.20 |

Domaine : `lab.local`
Reseau host-only : `192.168.56.0/24`

## Ce que le lab met en place automatiquement

- Promotion d'un controleur de domaine et configuration DNS
- Structure d'unites d'organisation par fonction (IT, Finance, Operations)
- Groupes de securite et comptes utilisateurs importes depuis un fichier CSV
- Politique de mot de passe et de verrouillage durcie
- GPO de durcissement contre des vecteurs d'attaque connus (empoisonnement LLMNR, SMBv1, relais LDAP, enumeration anonyme)
- Jonction automatique du poste client au domaine

## Prerequis

| Outil | Version conseillee | Role |
|-------|--------------------|------|
| VirtualBox | 7.0 ou superieure | Hyperviseur |
| Vagrant | 2.4 ou superieure | Orchestration |
| Plugin vagrant-reload | derniere version | Gestion des redemarrages |
| RAM disponible | 8 Go minimum | Les deux VM tournent en parallele |

Installation du plugin requis :

```bash
vagrant plugin install vagrant-reload
```

## Demarrage rapide

```bash
git clone https://github.com/<ton-compte>/ad-secure-lab.git
cd ad-secure-lab
vagrant up
```

La premiere execution telecharge les images Windows, ce qui prend du temps selon la connexion. Le provisioning enchaine la promotion du controleur, sa configuration, le durcissement, puis la jonction du client. Plusieurs redemarrages sont normaux et geres automatiquement.

## Acces aux machines

```bash
# Ouvrir une session RDP ou WinRM vers le controleur
vagrant rdp dc01

# Ouvrir une session vers le client
vagrant rdp cli01
```

Comptes de laboratoire :

| Compte | Mot de passe | Usage |
|--------|--------------|-------|
| LAB\Administrator | vagrant | Administration du domaine |
| LAB\m.lefevre (et autres) | User-L@b-2025! | Comptes utilisateurs, changement impose a la premiere connexion |

Ces identifiants sont des valeurs de laboratoire. Voir la note de securite en bas de page.

## Cycle de vie

```bash
vagrant halt        # arret des VM
vagrant up          # redemarrage
vagrant provision   # rejouer le provisioning (scripts idempotents)
vagrant destroy -f  # suppression complete
```

## Structure du depot

```
ad-secure-lab/
├── Vagrantfile              orchestration des deux VM
├── data/
│   └── users.csv            comptes utilisateurs a importer
├── scripts/
│   ├── dc/                  provisioning du controleur de domaine
│   │   ├── 01-install-adds.ps1
│   │   ├── 02-configure-ad.ps1
│   │   └── 03-apply-gpo.ps1
│   └── client/
│       └── 01-join-domain.ps1
└── docs/                    documentation technique
    ├── architecture.md      schema reseau et choix d'infrastructure
    ├── ou-design.md         logique de la structure d'annuaire
    ├── gpo-hardening.md      justification de chaque mesure de durcissement
    └── troubleshooting.md   pannes courantes et resolution
```

## Documentation

- [Architecture](docs/architecture.md) : topologie reseau, dimensionnement, choix des images
- [Conception de l'annuaire](docs/ou-design.md) : structure d'OU, delegation, ciblage de GPO
- [Durcissement par GPO](docs/gpo-hardening.md) : chaque mesure, le vecteur d'attaque qu'elle contre, la reference ANSSI ou CIS associee
- [Depannage](docs/troubleshooting.md) : erreurs frequentes et corrections

## Note de securite

Tous les mots de passe de ce depot sont des valeurs de laboratoire en clair. Ce projet est concu pour un environnement isole sur poste local. Ne jamais reutiliser ces identifiants, ne jamais exposer ces machines sur un reseau de production, ne jamais publier de vrais secrets dans un depot Git. En conditions reelles, les secrets se gerent par coffre dedie et les comptes par delegation et moindre privilege.

## Licence

MIT. Voir le fichier LICENSE.
