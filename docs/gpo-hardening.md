# Durcissement par GPO

Chaque mesure de durcissement appliquée par le lab contre un vecteur d'attaque précis. Ce document explique, pour chaque mesure, ce qu'elle fait, l'attaque qu'elle bloque, et la référence qui la recommande. Comprendre la menace derrière une mesure est la différence entre appliquer une recette et savoir défendre un système.

## Politique de mot de passe et de verrouillage

Posée sur la politique de domaine par défaut.

| Paramètre | Valeur | Effet |
|-----------|--------|-------|
| Longueur minimale | 14 caractères | Allonge le temps de cassage hors ligne |
| Complexité | activée | Impose plusieurs types de caractères |
| Historique | 24 | Empêche la réutilisation immédiate |
| Âge maximal | 90 jours | Limite la durée de vie d'un secret compromis |
| Seuil de verrouillage | 5 tentatives | Bloque le test de mots de passe en masse |
| Durée de verrouillage | 15 minutes | Ralentit fortement une attaque en ligne |

Vecteur contre : le test de mots de passe en ligne et le cassage de condensats hors ligne. Un mot de passe court et simple tombe en quelques secondes sur du matériel courant. La longueur est le facteur le plus efficace.

Référence : guide ANSSI sur la sécurisation d'Active Directory, recommandations CIS Benchmarks pour Windows Server.

## Désactivation de LLMNR

Valeur de registre `EnableMulticast` à 0.

Effet : désactive le protocole de résolution de noms multicast local.

Vecteur contre : l'empoisonnement de résolution de noms. Quand une machine ne résout pas un nom par DNS, elle interroge le réseau local en multicast. Un attaquant présent sur le segment répond à la place du vrai service et capture des condensats d'authentification, qu'il casse ensuite ou rejoue. C'est l'une des premières techniques utilisées lors d'un test d'intrusion interne.

Désactiver ce protocole supprime ce canal. La résolution légitime passe par le DNS du domaine, qui reste disponible.

Référence : recommandation ANSSI, technique largement documentée dans les référentiels d'attaque.

## Désactivation de SMBv1

Valeur de registre `SMB1` à 0 côté serveur.

Effet : désactive la première version du protocole de partage de fichiers.

Vecteur contre : l'exploitation de vulnérabilités connues de cette version ancienne du protocole. SMBv1 a porté des failles critiques ayant servi à des propagations massives. Cette version n'a aucune raison d'être active sur un système moderne. Les versions récentes du protocole assurent les mêmes fonctions de manière sûre.

Référence : Microsoft recommande la désactivation depuis plusieurs années, reprise par l'ANSSI et les CIS Benchmarks.

## Signature LDAP requise

Valeur de registre `LDAPServerIntegrity` à 2.

Effet : impose la signature des échanges LDAP côté serveur d'annuaire.

Vecteur contre : le relais d'authentification vers LDAP. Sans signature, un attaquant peut intercepter une authentification et la rejouer contre le service d'annuaire pour agir au nom de la victime. Exiger la signature rend ce relais inopérant car l'échange non signé est refusé.

Référence : Microsoft a publié des durcissements pour ce canal, repris par l'ANSSI dans ses recommandations sur l'annuaire.

## Restriction de l'énumération anonyme

Valeurs de registre `RestrictAnonymous` et `RestrictAnonymousSAM` à 1.

Effet : limite ce qu'une session anonyme peut lister sur le système.

Vecteur contre : la reconnaissance préalable à une attaque. Une session anonyme trop permissive permet de lister les comptes et les groupes sans s'authentifier. Cette information sert ensuite à cibler le test de mots de passe ou à repérer les comptes à privilèges. Restreindre cette énumération réduit la surface de reconnaissance.

Reference : CIS Benchmarks pour Windows, recommandations ANSSI.

## Durcissement de l'ouverture de session

Valeur de registre `DontDisplayLastUserName` à 1.

Effet : masque le dernier nom d'utilisateur connecté sur l'écran d'ouverture de session.

Vecteur contre : la fuite passive de noms de comptes. Afficher le dernier compte connecté donne gratuitement la moitié d'un identifiant à toute personne ayant un accès physique à l'écran. Le masquer impose de connaître le nom complet pour se connecter.

Reference : CIS Benchmarks pour Windows.

## Ce que le lab ne fait pas, et pourquoi

Ce socle est volontairement lisible et entièrement scriptable par valeurs de registre. Plusieurs durcissements importants reposent sur des extensions de sécurité de GPO plus complexes à poser par script, ou sur des composants supplémentaires. Ils sont laissés comme axes d'extension :

- la politique d'audit fine, pour journaliser les événements d'authentification et de gestion de comptes
- le déploiement d'une solution de gestion des mots de passe d'administrateur local
- la séparation des comptes d'administration en couches
- la désactivation de la mise en cache des condensats d'authentification

Les nommer plutôt que les ignorer est volontaire. Un socle honnête indique ses limites et la suite logique.
