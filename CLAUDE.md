# CLAUDE.md

Lab Active Directory durci déployé par Vagrant + VirtualBox : DC01 (Windows Server 2022, 192.168.56.10) et CLI01 (Windows 11, 192.168.56.20), domaine `lab.local`, réseau host-only `192.168.56.0/24`. Projet d'apprentissage, pas de production.

## Exécution

Les scripts `.ps1` tournent dans les VM, lancés par le Vagrantfile, jamais sur l'hôte. Ordre fixe : `dc/01-install-adds` → reboot (`vagrant-reload`) → `dc/02-configure-ad` → `dc/03-apply-gpo`, puis `client/01-join-domain` → reboot. Dans la VM, le dépôt est monté en `C:\vagrant` (d'où `C:\vagrant\data\users.csv`).

Aucun test automatisé. Sans VM, la seule vérification possible est une relecture ; dis-le explicitement plutôt que d'affirmer qu'un script fonctionne.

## Conventions

- Chaque script est idempotent : tester l'existence (rôle, OU, groupe, utilisateur, GPO) avant de créer. `vagrant provision` doit pouvoir être rejoué sans erreur.
- `$ErrorActionPreference = "Stop"` en tête, bloc `.SYNOPSIS/.DESCRIPTION/.NOTES`, sorties en `Write-Host "==> ..."`.
- Commentaires et messages des `.ps1` en français sans accents ; docs Markdown en français accentué.
- Toute nouvelle GPO de durcissement : valeur de registre issue des modèles d'administration Microsoft (aucune valeur inventée) et section correspondante dans `docs/gpo-hardening.md` (effet, vecteur d'attaque, référence ANSSI/CIS).
- Un nouveau département impose de toucher trois endroits : `data/users.csv`, `$DeptToOu` et la liste des groupes `GS-*` dans `02-configure-ad.ps1`.

## Secrets

Les mots de passe en clair (`vagrant`, `User-L@b-2025!`, DSRM) sont des valeurs de lab assumées et documentées. Ne pas les « corriger » en coffre-fort, ne jamais y ajouter de vrai secret.

## Docs

`docs/architecture.md` (réseau, images), `docs/ou-design.md` (OU, délégation), `docs/gpo-hardening.md` (justification de chaque mesure), `docs/troubleshooting.md` (pannes connues). Les lire seulement si la tâche les concerne.
