# Guide administrateur NOLI

Ce guide s'adresse aux **administrateurs** de la plateforme NOLI. En tant qu'administrateur, vous disposez d'un accès complet : gestion des assureurs, du catalogue produits (catégories, offres, garanties, règles tarifaires), suivi des devis, gestion des rappels et contacts, journaux d'audit, sauvegardes, rôles et permissions, paramètres système, et votre profil.

Il est rédigé de façon opérationnelle : suivez les étapes numérotées pour chaque tâche.

---

## Avant de commencer (prérequis)

- **Adresse du site** : https://noli.ci
- **Un compte administrateur** (rôle ADMIN) : accès complet à l'espace d'administration.
- **Identifiants** : l'email et le mot de passe de votre compte administrateur.

Le menu de gauche de l'espace d'administration donne accès à toutes les rubriques : **Tableau de bord, Assureurs, Catégories Produits, Offres, Cat. Garanties, Garanties, Devis, Rappels, Journaux d'audit, Sauvegardes, Rôles & Permissions, Mon Profil, Paramètres**.

---

## 1. Se connecter

1. Rendez-vous sur https://noli.ci et cliquez sur **Connexion**.
2. Saisissez votre **email** et votre **mot de passe** administrateur, puis cliquez sur **Se connecter**.
3. Vous êtes redirigé vers le **Tableau de bord** de l'administration, qui présente une vue d'ensemble de l'activité de la plateforme.

---

## 2. Gérer les assureurs (activation, liaison compte-compagnie)

L'onglet **Assureurs** liste les compagnies d'assurance présentes sur la plateforme, avec pour chacune le nombre d'offres, de garanties et de comptes rattachés.

### 2.1 Créer ou modifier un assureur (compagnie)

1. Cliquez sur **Assureurs** dans le menu de gauche.
2. Cliquez sur **Ajouter** pour créer une compagnie, ou sur l'icône **Modifier** d'une ligne existante.
3. Renseignez les informations : **nom** (obligatoire), logo, **email de contact**, téléphone, site web, et l'état **Actif**.
4. Enregistrez : un message « Assureur créé » ou « Assureur modifié » confirme l'opération.

### 2.2 Activer / désactiver une compagnie

1. Dans la liste des assureurs, repérez la colonne d'état.
2. Basculez l'interrupteur (**Switch**) **Actif / Inactif** de la compagnie concernée. Le changement est pris en compte immédiatement.

> **Activation d'un espace assureur** : lorsqu'une compagnie est **active**, ses offres et garanties peuvent alimenter les comparaisons et ses gestionnaires accèdent pleinement à leur espace. Un compte assureur nouvellement inscrit reste inutilisable tant qu'il n'est pas activé.

### 2.3 Liaison compte-compagnie

1. Cliquez sur une compagnie pour ouvrir sa **fiche détaillée** : vous y voyez ses **offres**, ses **garanties** et surtout ses **comptes** rattachés (les gestionnaires liés à cette compagnie).
2. La **gestion des comptes utilisateurs** se fait aussi depuis **Paramètres → Comptes** (voir §12) : vous y retrouvez tous les profils, dont les comptes de rôle **Assureur** (badge « Gestionnaire »).
3. Vérifiez qu'un gestionnaire assureur est bien **rattaché** à sa compagnie et que celle-ci est **active** : c'est la condition pour que son espace soit opérationnel.

---

## 3. Gérer les catégories de produits

1. Cliquez sur **Catégories Produits** dans le menu de gauche.
2. Cliquez sur **Ajouter** pour créer une catégorie ; renseignez le **Nom** (obligatoire), une **Description**, une **Icône** et l'état **Active**.
3. Enregistrez (« Catégorie créée »). Utilisez les icônes **Modifier** / **Supprimer** pour gérer les catégories existantes ; l'interrupteur **Active** permet d'activer/désactiver une catégorie. Le nombre d'**offres** rattachées est indiqué.

---

## 4. Gérer les offres

1. Cliquez sur **Offres** dans le menu de gauche.
2. Cliquez sur **Ajouter** pour créer une offre. Sélectionnez l'**assureur** et le **nom** (obligatoires), le **type de contrat**, et les autres paramètres.
3. Enregistrez (« Offre créée »). Utilisez la recherche et les filtres (par **assureur**, par **type**) pour retrouver une offre.
4. Les icônes **Modifier** / **Supprimer** permettent de gérer chaque offre.

---

## 5. Gérer les catégories de garanties

1. Cliquez sur **Cat. Garanties** dans le menu de gauche.
2. Cliquez sur **Ajouter**, renseignez le **Nom** (obligatoire) et la **Description**, puis enregistrez (« Catégorie créée »).
3. Chaque catégorie indique le nombre de **garanties** rattachées ; l'interrupteur **Active** et les icônes **Modifier** / **Supprimer** permettent de la gérer.

---

## 6. Gérer les garanties et les règles tarifaires

L'onglet **Garanties** permet de créer et paramétrer finement les garanties, y compris leur mode de calcul de prix.

### 6.1 Créer / modifier une garantie

1. Cliquez sur **Garanties** dans le menu de gauche.
2. Lancez la création d'une garantie et renseignez : l'**assureur**, la **catégorie**, le **code**, le **nom**, et le **mode de calcul** :
   - **Libre (FREE)** : aucun frais additionnel, prime = 0 FCFA (garantie incluse/promotionnelle),
   - **Montant fixe (FIXED_AMOUNT)** : un montant forfaitaire (ex. 50 000 FCFA),
   - **Basé sur une variable (VARIABLE_BASED)** : prime = Variable × (Taux / 100), calculée en pourcentage d'une variable (valeur neuve, valeur actuelle, puissance fiscale…), avec option de **seuil** conditionnel,
   - **Basé sur une matrice (MATRIX_BASED)** : barème selon catégorie/type.
3. Renseignez la **franchise** si nécessaire (aucune, **Pourcentage %** ou **Montant fixe FCFA**).
4. Enregistrez : un message « Garantie créée » (ou « modifiée ») confirme l'opération.

### 6.2 Gérer les règles tarifaires

1. Pour une garantie basée sur une variable, ajoutez une **règle tarifaire** en précisant le **taux** (ex. 0,42 %) et, le cas échéant, un **seuil** (ex. valeur neuve à 25 000 000).
2. Enregistrez (« Règle ajoutée »). Vous pouvez **supprimer** une règle tarifaire depuis la liste.
3. Utilisez les filtres (assureur, catégorie, mode de calcul) pour retrouver une garantie.

> Le document `docs/EXEMPLE_CALCUL_PRIX.md` détaille des exemples concrets de calcul de prime.

---

## 7. Suivre les devis

1. Cliquez sur **Devis** dans le menu de gauche.
2. Recherchez par **référence** et filtrez par **statut** : **Brouillon, En attente, Approuvé, Rejeté** (ou **Tous**).
3. Cliquez sur un devis pour ouvrir son **détail** : vous pouvez y consulter les informations, ajuster le **prix final**, ajouter des **notes internes** et **mettre à jour le statut**.
4. Enregistrez : un message « Devis mis à jour » ou « Statut mis à jour » confirme l'opération.

---

## 8. Gérer les rappels et contacts

1. Cliquez sur **Rappels** dans le menu de gauche.
2. Vous y trouvez les **demandes de rappel** émises par les clients depuis les offres.
3. Filtrez par **Nouvelles** (non lues) ou consultez l'ensemble, puis traitez / marquez les demandes après prise de contact.

---

## 9. Consulter les journaux d'audit

1. Cliquez sur **Journaux d'audit** dans le menu de gauche.
2. Les journaux tracent les actions sensibles de la plateforme (par exemple **Export**, **Sauvegarde créée / supprimée / restaurée**, modifications de **profil (rôle)**, de **rôle**…).
3. Utilisez la **recherche** et les filtres par **Action** et par **Entité** pour cibler les événements.
4. Cliquez sur **Exporter** pour générer un fichier **CSV** des journaux correspondant à vos filtres (« Export réussi » indique le nombre de lignes exportées).

---

## 10. Gérer les sauvegardes

1. Cliquez sur **Sauvegardes** dans le menu de gauche.
2. **Créer une sauvegarde** : cliquez sur le bouton dédié ; un message « Sauvegarde créée avec succès » confirme l'opération.
3. **Télécharger** une sauvegarde existante depuis la liste.
4. **Restaurer** une sauvegarde : lancez la restauration et confirmez (« Restauration lancée avec succès »).
5. **Supprimer** une sauvegarde devenue inutile.
6. **Planifier** des sauvegardes automatiques : configurez la planification puis enregistrez (« Planification enregistrée »).

> La restauration remplace les données actuelles : à utiliser avec prudence. Voir aussi `docs/SAUVEGARDE_DR.md`.

---

## 11. Gérer les rôles et permissions

1. Cliquez sur **Rôles & Permissions** dans le menu de gauche.
2. La page liste les **rôles** existants et le nombre de **permissions** de chacun.
3. Pour **créer ou modifier un rôle**, ouvrez le formulaire, définissez son **libellé** et cochez les **permissions** souhaitées, regroupées par catégorie (assureurs, offres, garanties, devis, sauvegardes, rôles…).
4. Enregistrez : les changements de permissions s'appliquent au rôle concerné. Vous pouvez également **supprimer** un rôle personnalisé.

---

## 12. Régler les paramètres système

L'onglet **Paramètres** regroupe plusieurs sous-onglets :

1. Cliquez sur **Paramètres** dans le menu de gauche.
2. Naviguez entre les sous-onglets :
   - **Général** : réglages généraux de la plateforme,
   - **Email** : paramètres d'envoi d'emails,
   - **Utilisateurs / Comptes** : gestion des comptes (recherche par nom/email, consultation des rôles, activation…). C'est ici que vous **changez le rôle** d'un profil (ex. promouvoir un compte en Assureur ou Admin),
   - **Sécurité** : paramètres de sécurité,
   - **Notifications** : réglages des notifications,
   - **Apparence** : personnalisation de l'affichage.
3. Après modification, cliquez sur **Enregistrer** : un message « Paramètres enregistrés avec succès » confirme la sauvegarde.

> Le changement de **rôle** d'un compte est une action sensible, tracée dans les **Journaux d'audit**.

---

## 13. Accéder à Mon Profil

1. Cliquez sur **Mon Profil** dans le menu de gauche (ou via le menu de votre profil en haut à droite).
2. Mettez à jour vos **informations personnelles** (prénom, nom, téléphone) et enregistrez.
3. **Changez votre mot de passe** : saisissez le mot de passe actuel, le nouveau (au moins 6 caractères) et sa confirmation, puis validez.

---

## FAQ / Dépannage

**Un assureur ne voit pas son espace / message « Compte assureur non configuré ».**
Vérifiez dans **Assureurs** que la compagnie est **active** (interrupteur activé) et que le compte du gestionnaire est bien **rattaché** à cette compagnie. Vérifiez aussi son rôle dans **Paramètres → Comptes**.

**Comment promouvoir un utilisateur en administrateur ou assureur ?**
Allez dans **Paramètres → Comptes/Utilisateurs**, retrouvez le profil et modifiez son **rôle**. L'action est enregistrée dans les journaux d'audit.

**Une garantie donne un prix inattendu.**
Vérifiez son **mode de calcul** et ses **règles tarifaires** (taux, seuil) dans **Garanties**. Consultez `docs/EXEMPLE_CALCUL_PRIX.md` pour valider la logique de calcul.

**Je dois retrouver qui a effectué une action sensible.**
Ouvrez **Journaux d'audit**, filtrez par **Action** et **Entité**, et exportez au besoin en **CSV**.

**Comment sécuriser les données avant une opération importante ?**
Créez une **sauvegarde** manuelle depuis l'onglet **Sauvegardes** avant toute modification à risque, et vérifiez que la **planification** automatique est active.

**Je ne trouve pas un devis.**
Dans **Devis**, recherchez par **référence** et repassez le filtre de **statut** sur **Tous**.
