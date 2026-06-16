# Durcissement par GPO

Chaque mesure de durcissement appliquee par le lab contre un vecteur d'attaque precis. Ce document explique, pour chaque mesure, ce qu'elle fait, l'attaque qu'elle bloque, et la reference qui la recommande. Comprendre la menace derriere une mesure est la difference entre appliquer une recette et savoir defendre un systeme.

## Politique de mot de passe et de verrouillage

Posee sur la politique de domaine par defaut.

| Parametre | Valeur | Effet |
|-----------|--------|-------|
| Longueur minimale | 14 caracteres | Allonge le temps de cassage hors ligne |
| Complexite | activee | Impose plusieurs types de caracteres |
| Historique | 24 | Empeche la reutilisation immediate |
| Age maximal | 90 jours | Limite la duree de vie d'un secret compromis |
| Seuil de verrouillage | 5 tentatives | Bloque le test de mots de passe en masse |
| Duree de verrouillage | 15 minutes | Ralentit fortement une attaque en ligne |

Vecteur contre : le test de mots de passe en ligne et la cassage de condensats hors ligne. Un mot de passe court et simple tombe en quelques secondes sur du materiel courant. La longueur est le facteur le plus efficace.

Reference : guide ANSSI sur la securisation d'Active Directory, recommandations CIS Benchmarks pour Windows Server.

## Desactivation de LLMNR

Valeur de registre `EnableMulticast` a 0.

Effet : desactive le protocole de resolution de noms multicast local.

Vecteur contre : l'empoisonnement de resolution de noms. Quand une machine ne resout pas un nom par DNS, elle interroge le reseau local en multicast. Un attaquant present sur le segment repond a la place du vrai service et capture des condensats d'authentification, qu'il casse ensuite ou rejoue. C'est l'une des premieres techniques utilisees lors d'un test d'intrusion interne.

Desactiver ce protocole supprime ce canal. La resolution legitime passe par le DNS du domaine, qui reste disponible.

Reference : recommandation ANSSI, technique largement documentee dans les referentiels d'attaque.

## Desactivation de SMBv1

Valeur de registre `SMB1` a 0 cote serveur.

Effet : desactive la premiere version du protocole de partage de fichiers.

Vecteur contre : l'exploitation de vulnerabilites connues de cette version ancienne du protocole. SMBv1 a porte des failles critiques ayant servi a des propagations massives. Cette version n'a aucune raison d'etre active sur un systeme moderne. Les versions recentes du protocole assurent les memes fonctions de maniere sure.

Reference : Microsoft recommande la desactivation depuis plusieurs annees, reprise par l'ANSSI et les CIS Benchmarks.

## Signature LDAP requise

Valeur de registre `LDAPServerIntegrity` a 2.

Effet : impose la signature des echanges LDAP cote serveur d'annuaire.

Vecteur contre : le relais d'authentification vers LDAP. Sans signature, un attaquant peut intercepter une authentification et la rejouer contre le service d'annuaire pour agir au nom de la victime. Exiger la signature rend ce relais inoperant car l'echange non signe est refuse.

Reference : Microsoft a publie des durcissements pour ce canal, repris par l'ANSSI dans ses recommandations sur l'annuaire.

## Restriction de l'enumeration anonyme

Valeurs de registre `RestrictAnonymous` et `RestrictAnonymousSAM` a 1.

Effet : limite ce qu'une session anonyme peut lister sur le systeme.

Vecteur contre : la reconnaissance prealable a une attaque. Une session anonyme trop permissive permet de lister les comptes et les groupes sans s'authentifier. Cette information sert ensuite a cibler le test de mots de passe ou a reperer les comptes a privileges. Restreindre cette enumeration reduit la surface de reconnaissance.

Reference : CIS Benchmarks pour Windows, recommandations ANSSI.

## Durcissement de l'ouverture de session

Valeur de registre `DontDisplayLastUserName` a 1.

Effet : masque le dernier nom d'utilisateur connecte sur l'ecran d'ouverture de session.

Vecteur contre : la fuite passive de noms de comptes. Afficher le dernier compte connecte donne gratuitement la moitie d'un identifiant a toute personne ayant un acces physique a l'ecran. Le masquer impose de connaitre le nom complet pour se connecter.

Reference : CIS Benchmarks pour Windows.

## Ce que le lab ne fait pas, et pourquoi

Ce socle est volontairement lisible et entierement scriptable par valeurs de registre. Plusieurs durcissements importants reposent sur des extensions de securite de GPO plus complexes a poser par script, ou sur des composants supplementaires. Ils sont laisses comme axes d'extension :

- la politique d'audit fine, pour journaliser les evenements d'authentification et de gestion de comptes
- le deploiement d'une solution de gestion des mots de passe d'administrateur local
- la separation des comptes d'administration en couches
- la desactivation de la mise en cache des condensats d'authentification

Les nommer plutot que les ignorer est volontaire. Un socle honnete indique ses limites et la suite logique.
