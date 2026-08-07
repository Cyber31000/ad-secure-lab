# Graph Report - .  (2026-08-07)

## Corpus Check
- Corpus is ~4,406 words - fits in a single context window. You may not need a graph.

## Summary
- 58 nodes · 98 edges · 12 communities (10 shown, 2 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.85)
- Token cost: 11,000 input · 11,000 output

## Community Hubs (Navigation)
- Sequence de provisioning
- Protocoles reseau durcis
- Machines du lab et images
- Configuration de l'annuaire
- Reseau host-only et extensions
- Politique de mots de passe
- Moindre privilege et tiering
- Structure d'OU et ciblage GPO
- Jonction au domaine et DNS
- Surface de reconnaissance
- Delegation par departement
- Projet et identifiants de lab

## God Nodes (most connected - your core abstractions)
1. `Structure d'unites d'organisation` - 9 edges
2. `Lab Active Directory securise` - 8 edges
3. `Reseau host-only 192.168.56.0/24` - 7 edges
4. `Sequence de provisioning` - 7 edges
5. `DC01 (controleur de domaine)` - 6 edges
6. `Politique de mot de passe durcie` - 6 edges
7. `CLI01 (poste client)` - 5 edges
8. `DNS porte par le controleur` - 5 edges
9. `Restriction de l'enumeration anonyme` - 5 edges
10. `Guide ANSSI securisation Active Directory` - 5 edges

## Surprising Connections (you probably didn't know these)
- `New-LabOU()` --implements--> `Structure d'unites d'organisation`  [INFERRED]
  scripts/dc/02-configure-ad.ps1 → docs/ou-design.md
- `New-LabOU()` --implements--> `Protection contre la suppression accidentelle`  [INFERRED]
  scripts/dc/02-configure-ad.ps1 → docs/ou-design.md
- `New-LabGPO()` --implements--> `Ciblage des GPO`  [INFERRED]
  scripts/dc/03-apply-gpo.ps1 → docs/ou-design.md
- `Import des comptes depuis users.csv` --conceptually_related_to--> `Sous-OU par departement (IT, Finance, Operations)`  [INFERRED]
  README.md → docs/ou-design.md
- `Politique de mot de passe durcie` --conceptually_related_to--> `Identifiants de laboratoire en clair`  [INFERRED]
  docs/gpo-hardening.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Socle de durcissement par GPO** — docs_gpo_hardening_password_policy, docs_gpo_hardening_lockout_policy, docs_gpo_hardening_llmnr_disable, docs_gpo_hardening_smbv1_disable, docs_gpo_hardening_ldap_signing, docs_gpo_hardening_restrict_anonymous, docs_gpo_hardening_dontdisplaylastusername, scripts_dc_03_apply_gpo [EXTRACTED 1.00]
- **Chaine de jonction au domaine** — docs_architecture_dns_on_dc, scripts_client_01_join_domain, readme_cli01, docs_troubleshooting_domain_join_failure, docs_architecture_host_only_network [EXTRACTED 1.00]
- **Modele de delegation par structure d'OU** — docs_ou_design_lab_root_ou, docs_ou_design_machine_user_separation, docs_ou_design_department_ous, docs_ou_design_service_accounts_ou, docs_ou_design_delegation, docs_ou_design_least_privilege [EXTRACTED 1.00]

## Communities (12 total, 2 thin omitted)

### Community 0 - "Sequence de provisioning"
Cohesion: 0.36
Nodes (7): Idempotence des scripts, Sequence de provisioning, Panne: promotion du controleur interrompue, Repartir de zero (destroy puis up), Panne: provisioner reload inconnu, Orchestration Vagrant, Plugin vagrant-reload

### Community 1 - "Protocoles reseau durcis"
Cohesion: 0.33
Nodes (7): Guide ANSSI securisation Active Directory, Relais d'authentification vers LDAP, Signature LDAP requise (LDAPServerIntegrity=2), Desactivation de LLMNR (EnableMulticast=0), Empoisonnement de resolution de noms, Desactivation de SMBv1 (SMB1=0), Exploitation des failles SMBv1

### Community 2 - "Machines du lab et images"
Cohesion: 0.40
Nodes (6): Dimensionnement 2 vCPU / 4 Go par VM, Images Windows gusztavvargadr, Panne: telechargement de l'image bloque, CLI01 (poste client), DC01 (controleur de domaine), Domaine lab.local

### Community 3 - "Configuration de l'annuaire"
Cohesion: 0.40
Nodes (4): Forwarder DNS vers resolveur public, Protection contre la suppression accidentelle, Import des comptes depuis users.csv, New-LabOU()

### Community 4 - "Reseau host-only et extensions"
Cohesion: 0.40
Nodes (5): Pistes d'extension du lab, Reseau host-only 192.168.56.0/24, Interface NAT geree par Vagrant, Politique d'audit fine (non couverte), Panne: conflit de reseau host-only

### Community 5 - "Politique de mots de passe"
Cohesion: 0.50
Nodes (4): Mise en cache des condensats (non desactivee), Politique de verrouillage de compte, Test de mots de passe et cassage hors ligne, Politique de mot de passe durcie

### Community 6 - "Moindre privilege et tiering"
Cohesion: 0.40
Nodes (5): Gestion des mots de passe admin local (non couverte), Separation des comptes d'administration en couches (non couverte), Moindre privilege, OU dediee aux comptes de service, Modele d'administration en couches

### Community 7 - "Structure d'OU et ciblage GPO"
Cohesion: 0.60
Nodes (5): Ciblage des GPO, OU racine LAB, Separation comptes machines et utilisateurs, Structure d'unites d'organisation, New-LabGPO()

### Community 8 - "Jonction au domaine et DNS"
Cohesion: 0.83
Nodes (3): DNS porte par le controleur, Panne: identifiants de la box differents, Panne: jonction au domaine echoue

### Community 9 - "Surface de reconnaissance"
Cohesion: 0.83
Nodes (4): CIS Benchmarks Windows, Masquage du dernier utilisateur connecte, Reconnaissance prealable a une attaque, Restriction de l'enumeration anonyme

## Knowledge Gaps
- **4 isolated node(s):** `Interface NAT geree par Vagrant`, `Panne: provisioner reload inconnu`, `Panne: telechargement de l'image bloque`, `Panne: conflit de reseau host-only`
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Lab Active Directory securise` connect `Projet et identifiants de lab` to `Sequence de provisioning`, `Machines du lab et images`, `Reseau host-only et extensions`, `Politique de mots de passe`, `Structure d'OU et ciblage GPO`, `Jonction au domaine et DNS`?**
  _High betweenness centrality (0.380) - this node is a cross-community bridge._
- **Why does `Structure d'unites d'organisation` connect `Structure d'OU et ciblage GPO` to `Projet et identifiants de lab`, `Delegation par departement`, `Configuration de l'annuaire`, `Moindre privilege et tiering`?**
  _High betweenness centrality (0.303) - this node is a cross-community bridge._
- **Why does `Politique de mot de passe durcie` connect `Politique de mots de passe` to `Protocoles reseau durcis`, `Projet et identifiants de lab`, `Surface de reconnaissance`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **What connects `Interface NAT geree par Vagrant`, `Panne: provisioner reload inconnu`, `Panne: telechargement de l'image bloque` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._