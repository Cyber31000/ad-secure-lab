# Graph Report - /home/user/ad-secure-lab  (2026-08-02)

## Corpus Check
- Corpus is ~4,406 words - fits in a single context window. You may not need a graph.

## Summary
- 57 nodes · 78 edges · 10 communities
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.82)
- Token cost: 55,411 input · 0 output

## Community Hubs (Navigation)
- Durcissement GPO
- Conception des OU
- Topologie du lab
- Reseau et limites
- Provisioning du DC
- Jonction domaine et DNS

## God Nodes (most connected - your core abstractions)
1. `Socle de durcissement par GPO` - 10 edges
2. `Structure d'unites d'organisation` - 10 edges
3. `Lab Active Directory securise` - 7 edges
4. `Sequence de provisioning avec redemarrages` - 7 edges
5. `Restriction de l'enumeration anonyme (RestrictAnonymous)` - 5 edges
6. `Guide ANSSI de securisation d'Active Directory` - 5 edges
7. `Topologie a deux VM` - 4 edges
8. `DNS porte par le controleur de domaine` - 4 edges
9. `Desactivation de LLMNR (EnableMulticast=0)` - 4 edges
10. `Masquage du dernier utilisateur connecte (DontDisplayLastUserName=1)` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Lab Active Directory securise` --references--> `Repartir de zero (vagrant destroy -f)`  [EXTRACTED]
  README.md → docs/troubleshooting.md
- `Lab Active Directory securise` --references--> `Socle de durcissement par GPO`  [EXTRACTED]
  README.md → docs/gpo-hardening.md
- `Lab Active Directory securise` --references--> `Structure d'unites d'organisation`  [EXTRACTED]
  README.md → docs/ou-design.md
- `DNS porte par le controleur de domaine` --conceptually_related_to--> `DC01 (controleur de domaine, DNS)`  [EXTRACTED]
  docs/architecture.md → README.md
- `Sequence de provisioning avec redemarrages` --references--> `Plugin vagrant-reload`  [EXTRACTED]
  docs/architecture.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Sequence complete de provisioning du lab** — docs_architecture_01_install_adds, docs_architecture_02_configure_ad, docs_architecture_03_apply_gpo, docs_architecture_01_join_domain, readme_vagrant_reload [EXTRACTED 1.00]
- **Mesures de durcissement posees par valeurs de registre** — docs_gpo_hardening_llmnr, docs_gpo_hardening_smbv1, docs_gpo_hardening_signature_ldap, docs_gpo_hardening_restriction_anonyme, docs_gpo_hardening_dontdisplaylastusername [EXTRACTED 1.00]
- **Chaine DNS / jonction au domaine et ses pannes** — docs_architecture_dns_sur_dc, docs_architecture_01_join_domain, docs_troubleshooting_jonction_echoue, docs_architecture_reseau_host_only [INFERRED 0.85]

## Communities (10 total, 0 thin omitted)

### Community 0 - "Durcissement GPO"
Cohesion: 0.30
Nodes (12): Guide ANSSI de securisation d'Active Directory, CIS Benchmarks pour Windows, Masquage du dernier utilisateur connecte (DontDisplayLastUserName=1), Empoisonnement de resolution de noms, Desactivation de LLMNR (EnableMulticast=0), Politique de mot de passe et de verrouillage, Reconnaissance prealable a une attaque, Relais d'authentification vers LDAP (+4 more)

### Community 1 - "Conception des OU"
Cohesion: 0.24
Nodes (10): 02-configure-ad.ps1 (OU, groupes, utilisateurs, forwarder DNS), Ciblage des GPO, Delegation d'administration, OU dediee aux comptes de service, OU racine LAB, Protection contre la suppression accidentelle, Separation comptes machines / comptes utilisateurs, Sous-OU par departement (IT, Finance, Operations) (+2 more)

### Community 2 - "Topologie du lab"
Cohesion: 0.24
Nodes (10): Dimensionnement (2 vCPU, 4 Go par VM), Images gusztavvargadr (Windows Server 2022 / Windows 11), Topologie a deux VM, Panne : identifiants de la box differents, Panne : telechargement de l'image lent ou echoue, Lab Active Directory securise, CLI01 (poste client joint au domaine), DC01 (controleur de domaine, DNS) (+2 more)

### Community 3 - "Reseau et limites"
Cohesion: 0.22
Nodes (10): Pistes d'extension du lab, Reseau host-only 192.168.56.0/24, Segmentation reseau du trafic d'annuaire, Limites assumees du socle (audit fin, LAPS, modele en couches, cache de condensats), Moindre privilege et modele d'administration en couches, Panne : conflit de reseau host-only VirtualBox, Panne : plugin vagrant-reload introuvable, Vagrant (orchestration) (+2 more)

### Community 4 - "Provisioning du DC"
Cohesion: 0.40
Nodes (6): 01-install-adds.ps1 (installation AD DS + promotion), 03-apply-gpo.ps1 (durcissement par GPO), Sequence de provisioning avec redemarrages, Panne : la promotion du controleur echoue, Repartir de zero (vagrant destroy -f), Idempotence des scripts de provisioning

### Community 5 - "Jonction domaine et DNS"
Cohesion: 1.00
Nodes (3): 01-join-domain.ps1 (pointage DNS + jonction), DNS porte par le controleur de domaine, Panne : la jonction du client au domaine echoue

## Knowledge Gaps
- **5 isolated node(s):** `Empoisonnement de resolution de noms`, `Relais d'authentification vers LDAP`, `Delegation d'administration`, `Panne : plugin vagrant-reload introuvable`, `Panne : telechargement de l'image lent ou echoue`
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Lab Active Directory securise` connect `Topologie du lab` to `Durcissement GPO`, `Conception des OU`, `Reseau et limites`, `Provisioning du DC`?**
  _High betweenness centrality (0.343) - this node is a cross-community bridge._
- **Why does `Socle de durcissement par GPO` connect `Durcissement GPO` to `Conception des OU`, `Topologie du lab`, `Reseau et limites`, `Provisioning du DC`?**
  _High betweenness centrality (0.316) - this node is a cross-community bridge._
- **Why does `Structure d'unites d'organisation` connect `Conception des OU` to `Topologie du lab`, `Reseau et limites`?**
  _High betweenness centrality (0.243) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Socle de durcissement par GPO` (e.g. with `03-apply-gpo.ps1 (durcissement par GPO)` and `Ciblage des GPO`) actually correct?**
  _`Socle de durcissement par GPO` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Empoisonnement de resolution de noms`, `Relais d'authentification vers LDAP`, `Delegation d'administration` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._