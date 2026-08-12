# Conception de l'annuaire

## Principe

Une structure d'unités d'organisation n'est pas un classement esthétique. Elle conditionne deux choses : la délégation d'administration et le ciblage des GPO. Une mauvaise structure rend toute gestion fine impossible et pousse à sur-attribuer des droits. Une bonne structure permet de déléguer un périmètre précis à une personne précise, et d'appliquer une politique à un groupe précis d'objets.

## Structure mise en place

```
lab.local
└── OU=LAB
    ├── OU=Servers           comptes machines serveurs
    ├── OU=Workstations      comptes machines clientes
    ├── OU=Groups            groupes de sécurité
    ├── OU=ServiceAccounts   comptes de service
    └── OU=Users
        ├── OU=IT
        ├── OU=Finance
        └── OU=Operations
```

## Justification des choix

### Une OU racine LAB

Tous les objets du lab vivent sous une OU racine unique. Cela isole les objets créés par le projet des conteneurs par défaut du domaine. Avantage concret : on peut cibler une GPO sur toute l'organisation en une seule liaison, ou déléguer l'ensemble à un administrateur sans toucher au reste de l'annuaire.

### Séparation comptes machines et comptes utilisateurs

Les serveurs, les postes et les utilisateurs sont dans des OU distinctes. Les GPO machine et les GPO utilisateur ne ciblent pas les mêmes objets. Les séparer évite d'appliquer par erreur une politique poste à un serveur, ou une politique utilisateur à un compte de service.

### Sous-OU par département

Les utilisateurs sont rangés par département. Cela permet deux usages courants :

- appliquer une politique propre à un service, par exemple un lecteur réseau monté pour la Finance uniquement
- déléguer la réinitialisation de mot de passe d'un service au référent de ce service, sans lui donner de droits sur les autres

### OU dédiée aux comptes de service

Les comptes de service sont séparés des comptes humains. Ils n'ont pas les mêmes besoins ni les mêmes risques. Les regrouper permet d'appliquer une surveillance et une politique spécifiques, et de les repérer immédiatement lors d'un audit.

## Protection contre la suppression accidentelle

Chaque OU est créée avec la protection contre la suppression accidentelle activée. Une OU supprimée par erreur emporte tout son contenu. Cette protection impose une action volontaire pour supprimer, ce qui évite les incidents.

## Lien avec la sécurité

Cette structure prépare l'application du moindre privilège. Plutôt que d'attribuer des droits larges, on délègue un périmètre précis sur une OU précise. C'est la base d'un modèle d'administration en couches, où les droits d'administration du domaine restent réservés à un nombre minimal de comptes, séparés des comptes d'usage quotidien.

Le lab ne met pas en place un modèle en couches complet, mais sa structure d'OU est compatible avec cette évolution. C'est un point d'extension naturel pour aller plus loin.
