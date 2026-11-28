# Tableau de bord du lab

Une page web qui affiche l'état de `lab.local` et permet de déverrouiller un compte. Elle est servie par `Start-Dashboard.ps1`, qui tourne sur la machine hôte et lance les commandes Active Directory sur DC01 par WinRM. Rien n'est à installer, ni sur l'hôte ni sur les VM.

```
navigateur  →  Start-Dashboard.ps1 (hôte, localhost:8080)  →  WinRM  →  DC01 (192.168.56.10)
```

## Ce qui est relié au lab

| Vue | Source sur DC01 |
| --- | --- |
| Utilisateurs | `Get-ADUser` sur `OU=Users,OU=LAB` |
| Déverrouiller | `Unlock-ADAccount`, limité aux comptes de `OU=Users,OU=LAB` |
| Contrôleurs | `Get-ADDomainController`, `Get-ADReplicationPartnerMetadata` |
| GPO | `Get-GPO -All`, `Get-GPInheritance`, `Get-ADDefaultDomainPasswordPolicy` |
| Alertes | journal Security de DC01 sur 7 jours : 4740, 4767, 4771, 4625, 4720, 4726, 4728, 4732, 4756 |

Le graphique des connexions et la vue Partages DFS affichent encore des données de démo. Les boutons des vues Rapports et Paramètres ne font rien.

La page se rafraîchit toutes les 60 secondes.

## Préparation, une seule fois

1. Démarre le lab :

   ```powershell
   vagrant up
   ```

2. Dans un PowerShell **administrateur** sur l'hôte, ajoute DC01 aux hôtes WinRM de confiance. L'hôte n'est pas membre du domaine, donc sans ce réglage WinRM refuse la connexion :

   ```powershell
   Start-Service WinRM
   Set-Item WSMan:\localhost\Client\TrustedHosts -Value 192.168.56.10 -Concatenate
   ```

   Ce réglage autorise l'hôte à envoyer des identifiants à 192.168.56.10 sans vérifier l'identité du serveur. Il reste acceptable ici parce que cette adresse n'existe que sur le réseau host-only du lab.

## Lancement

```powershell
.\tools\dashboard\Start-Dashboard.ps1
```

Le script demande un compte du domaine, puis affiche l'adresse à ouvrir dans le navigateur : http://localhost:8080/.

- Pour lire les comptes et les GPO, n'importe quel compte du domaine suffit.
- Pour lire les alertes, le compte doit pouvoir lire le journal Security : il doit être membre de « Event Log Readers » ou administrateur.
- Pour déverrouiller, le compte doit avoir le droit de déverrouiller sur `OU=Users,OU=LAB`. Un administrateur du domaine l'a.

Options :

| Option | Effet |
| --- | --- |
| `-Demo` | Sert des données fictives, sans contacter le lab. Le déverrouillage modifie seulement ces données. |
| `-Port 8090` | Change le port d'écoute. |
| `-DomainController 192.168.56.11` | Interroge DC02 au lieu de DC01. |

`Ctrl+C` arrête le serveur.

## Sécurité

- Le serveur n'accepte que les requêtes adressées à `localhost`. Il refuse les autres machines du réseau et les attaques par DNS rebinding.
- Le mot de passe reste en mémoire le temps de la session. Il n'est jamais écrit sur le disque ni envoyé à la page.
- Pour déverrouiller, le navigateur doit présenter un jeton tiré au hasard à chaque démarrage du serveur et injecté dans la page. Le serveur vérifie aussi l'origine `http://localhost:8080`. Un autre site ouvert dans le navigateur ne peut donc pas déclencher de déverrouillage.
- L'identifiant reçu est validé avant d'être envoyé à DC01. Il est transmis comme argument et n'est jamais inséré dans une commande.
- Chaque déverrouillage, réussi ou non, est inscrit dans `tools/dashboard/dashboard-audit.log`. Côté DC01, l'événement 4767 le trace aussi et apparaît dans la vue Alertes.

## Limites

- « Dernière connexion » vient de `lastLogonTimestamp`, qui peut avoir jusqu'à 14 jours de retard.
- Les verrouillages et les échecs Kerberos sont lus sur DC01, qui porte le rôle PDC. Un échec de session ouvert directement sur CLI01 (4625) n'apparaît que dans le journal de CLI01.
