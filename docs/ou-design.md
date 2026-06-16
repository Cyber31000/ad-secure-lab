# Conception de l'annuaire

## Principe

Une structure d'unites d'organisation n'est pas un classement esthetique. Elle conditionne deux choses : la delegation d'administration et le ciblage des GPO. Une mauvaise structure rend toute gestion fine impossible et pousse a sur-attribuer des droits. Une bonne structure permet de deleguer un perimetre precis a une personne precise, et d'appliquer une politique a un groupe precis d'objets.

## Structure mise en place

```
lab.local
└── OU=LAB
    ├── OU=Servers           comptes machines serveurs
    ├── OU=Workstations      comptes machines clientes
    ├── OU=Groups            groupes de securite
    ├── OU=ServiceAccounts   comptes de service
    └── OU=Users
        ├── OU=IT
        ├── OU=Finance
        └── OU=Operations
```

## Justification des choix

### Une OU racine LAB

Tous les objets du lab vivent sous une OU racine unique. Cela isole les objets crees par le projet des conteneurs par defaut du domaine. Avantage concret : on peut cibler une GPO sur toute l'organisation en une seule liaison, ou deleguer l'ensemble a un administrateur sans toucher au reste de l'annuaire.

### Separation comptes machines et comptes utilisateurs

Les serveurs, les postes et les utilisateurs sont dans des OU distinctes. Les GPO machine et les GPO utilisateur ne ciblent pas les memes objets. Les separer evite d'appliquer par erreur une politique poste a un serveur, ou une politique utilisateur a un compte de service.

### Sous-OU par departement

Les utilisateurs sont ranges par departement. Cela permet deux usages courants :

- appliquer une politique propre a un service, par exemple un lecteur reseau monte pour la Finance uniquement
- deleguer la reinitialisation de mot de passe d'un service au referent de ce service, sans lui donner de droits sur les autres

### OU dediee aux comptes de service

Les comptes de service sont separes des comptes humains. Ils n'ont pas les memes besoins ni les memes risques. Les regrouper permet d'appliquer une surveillance et une politique specifiques, et de les reperer immediatement lors d'un audit.

## Protection contre la suppression accidentelle

Chaque OU est creee avec la protection contre la suppression accidentelle activee. Une OU supprimee par erreur emporte tout son contenu. Cette protection impose une action volontaire pour supprimer, ce qui evite les incidents.

## Lien avec la securite

Cette structure prepare l'application du moindre privilege. Plutot que d'attribuer des droits larges, on delegue un perimetre precis sur une OU precise. C'est la base d'un modele d'administration en couches, ou les droits d'administration du domaine restent reserves a un nombre minimal de comptes, separes des comptes d'usage quotidien.

Le lab ne met pas en place un modele en couches complet, mais sa structure d'OU est compatible avec cette evolution. C'est un point d'extension naturel pour aller plus loin.
