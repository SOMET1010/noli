# NOLI — Spécifications fonctionnelles

**Produit :** NOLI, comparateur d'assurances auto en Côte d'Ivoire
**Nature du document :** description fonctionnelle du produit *tel qu'implémenté* (Next.js + Supabase)
**Public :** client / métier

> Ce document décrit **ce que fait** l'application aujourd'hui, module par module.
> Les éléments marqués **« À venir »** ne sont pas encore actifs en production.
> Les montants sont exprimés en **FCFA**.

---

## Sommaire

1. Accueil & présentation (landing)
2. Comparateur & Devis
3. Espace Client
4. Espace Assureur
5. Espace Administrateur
6. Fonctions transverses
7. Points « À venir »

---

## 1. Accueil & présentation (landing)

**Objectif.** Présenter NOLI, expliquer la promesse (comparer les offres d'assurance auto de plusieurs compagnies en Côte d'Ivoire) et diriger le visiteur vers le comparateur.

**Acteurs.** Visiteur anonyme, client connecté.

**Parcours principal.**
1. Le visiteur arrive sur la page d'accueil (présentation du service, mise en avant du comparateur, sections d'information).
2. Des pages annexes sont accessibles : **Offres** (vitrine des offres), **À propos**, **Contact**, **FAQ**, **Mentions légales**.
3. Un appel à l'action principal lance le **comparateur** (parcours de devis).

**Règles notables.**
- L'accès au comparateur ne nécessite **pas** de compte : un visiteur anonyme peut obtenir une comparaison et un devis.
- L'en-tête propose la connexion / l'inscription et le basculement de thème (clair / sombre).

---

## 2. Comparateur & Devis

**Objectif.** Recueillir le profil de l'assuré, les caractéristiques du véhicule et le besoin de couverture, calculer un prix pour chaque offre éligible, présenter les résultats classés et permettre de confirmer un devis avec référence.

**Acteurs.** Visiteur anonyme, client connecté, (indirectement) assureur qui reçoit le devis.

### 2.1 Formulaire (3 étapes)

Le parcours est un formulaire en **3 étapes** avec barre de progression.

**Étape 1 — Profil de l'assuré.**
- Nom, Prénom, Email, Numéro de téléphone (tous obligatoires).
- Option de contact **WhatsApp** (case à cocher facultative).

**Étape 2 — Informations véhicule.**
- Carburant : **Essence** ou **Diesel**.
- Puissance fiscale : de **1 CV à « 12 CV et plus »**.
- Nombre de places : de 2 à « 9+ ».
- Année de mise en circulation.
- **Valeur neuve (VN)** en FCFA et **Valeur actuelle / vénale (VA)** en FCFA.
- Usage du véhicule : **Personnel**, **Professionnel**, **Taxi / VTC**, **Autre**.
- Durée du contrat (jusqu'à 12 mois).
- Date d'effet souhaitée.

**Étape 3 — Options (type de contrat).** Choix d'une formule :
- **Tiers** (couverture de base obligatoire : Responsabilité Civile + Défense & Recours).
- **Tiers+** (garanties renforcées : Incendie, Vol, Bris de Glaces, Individuelle Conducteur & Passagers).
- **Tous Risques** (protection maximale : Tierce Complète, Tierce Collision, Assistance).

**Règles notables.**
- Chaque étape est validée avant de passer à la suivante ; les champs obligatoires sont contrôlés.
- Le type de contrat choisi **n'est pas un filtre bloquant** : toutes les offres éligibles au véhicule restent présentées. Le type choisi est simplement **favorisé dans le classement** (voir 2.2), et un filtre « Formules » sur la page de résultats permet d'affiner ensuite.

### 2.2 Calcul du prix

Le prix de chaque offre est calculé côté serveur, garantie par garantie, à partir des données du véhicule.

**Principes de tarification.**
- Chaque garantie (couverture) d'un assureur est valorisée selon l'une des **4 méthodes de calcul** : garantie **incluse sans surprime** (FREE), **montant fixe** (FIXED_AMOUNT), **basée sur une variable** (VARIABLE_BASED, ex. un taux appliqué à la valeur neuve, vénale ou à la puissance fiscale), ou **basée sur une matrice/grille** (MATRIX_BASED, ex. grilles par puissance fiscale, carburant, catégorie de véhicule, places, formules, ou grilles Tierce Complète / Collision par classe de valeur).
- Les montants variables sont arrondis au **multiple de 500 FCFA** le plus proche, puis bornés par d'éventuels minimum / plafond.
- Le **prix (prime brute)** d'une offre = somme des garanties **retenues** (correspondant à la formule) **et** des garanties **obligatoires**.
- **Prix mensuel = prix annuel ÷ 12** (règle P1). L'affichage est « X/mois · soit Y/an ». La durée de contrat choisie **ne modifie pas** le prix mensuel affiché.
- **Prime nette : non appliquée.** Une fonction de calcul de prime nette (remise fiscale de 5 % et frais de 2 500 FCFA) existe dans le code mais **n'est volontairement pas branchée** sur le prix affiché au client : ces valeurs ne sont pas validées par une source métier. **Le prix présenté reste donc la prime brute.**

**Éligibilité et classement.**
- Une offre n'est proposée que si le véhicule est **éligible** (puissance fiscale, carburant, valeur neuve, valeur vénale et usage dans les plages de l'offre ; une liste vide = « tous acceptés »).
- Chaque offre reçoit un **score de pertinence** (garanties correspondantes, type de contrat, cohérence prix/valeur du véhicule, puissance fiscale, carburant, valeur neuve, usage). Un **bonus** est ajouté lorsque le type de contrat de l'offre correspond au type demandé par l'utilisateur.
- Les résultats sont triés par **score décroissant**, puis par **prix mensuel croissant** à score égal.

### 2.3 Page de résultats

**Objectif.** Présenter les offres éligibles et permettre de les comparer.

**Parcours principal.**
1. Liste des offres avec, pour chacune : compagnie (logo, nom), nom de l'offre, type de couverture (Tiers / Tiers+ / Tous Risques), prix **mensuel** et **annuel**, garanties incluses et détail de tarification par garantie.
2. **Filtres** (barre latérale) et **tri**, panneau de synthèse, et **comparaison côte à côte** de plusieurs offres.
3. Possibilité de **demander un rappel** depuis une offre (voir 6.3).

**Règles notables.**
- Le prix affiché suit la règle « X/mois · soit Y/an » (2.2).
- Un état « aucun résultat » est prévu si aucune offre n'est éligible.

### 2.4 Confirmation de devis (référence)

**Objectif.** Matérialiser le devis choisi par une **référence** persistante.

**Parcours principal.**
1. À l'issue de la comparaison (utilisateur connecté), un devis est **enregistré automatiquement** avec une **référence unique** de la forme `NOLI-XXXXXXX`, au statut **PENDING** (en attente de traitement), rattaché à l'offre la mieux classée.
2. Une **confirmation persistante** s'affiche : nom de l'offre et de la compagnie, **référence copiable**, message indiquant qu'un email de confirmation sera envoyé.
3. Le client est notifié (« Devis envoyé »), et **chaque assureur actif** reçoit une notification « Nouveau devis reçu ».

**Règles notables.**
- Le devis stocke le profil de l'assuré, les données du véhicule et le besoin de couverture, ainsi qu'un **prix estimé** (prix mensuel de la meilleure offre).
- L'identité du propriétaire du devis provient **toujours de la session**, jamais du formulaire.

### 2.5 Rattachement des devis anonymes à l'inscription

**Objectif.** Ne pas perdre les devis produits avant la création du compte.

**Règle.** Lorsqu'un utilisateur **s'inscrit** ou **se connecte**, les devis « anonymes » (sans propriétaire) dont **l'email correspond exactement** (insensible à la casse) à celui du compte sont **rattachés** automatiquement à ce compte. Seuls les devis **sans propriétaire** sont concernés ; la correspondance est **strictement par email exact** (garde de sécurité).

---

## 3. Espace Client

**Acteur.** Client connecté (rôle USER). Navigation par onglets.

### 3.1 Tableau de bord
Vue de synthèse de l'activité du client (devis, contrats, éléments récents) et accès rapide aux autres sections.

### 3.2 Mes Devis
- Liste des devis du client (référence, statut, offre / compagnie associée, catégorie, date), du plus récent au plus ancien.
- Suivi du statut : **PENDING** (en attente), **APPROVED** (approuvé), **REJECTED** (rejeté) — statuts pilotés par l'assureur (voir 4.4).

### 3.3 Mes Contrats (+ déclaration de sinistre)
- Liste des contrats du client : référence (`NOLI-CON-…`), compagnie, offre, statut (**ACTIVE / EXPIRED / CANCELLED**), dates de début/fin, prime.
- Un contrat **naît automatiquement** lorsqu'un assureur **approuve** un devis (voir 4.4).
- **Déclaration de sinistre** : depuis un contrat, le client déclare un sinistre en choisissant un **type** (Accident, Vol, Bris de glace, Incendie, Autre), une **description** (au moins 10 caractères) et une **date d'incident** facultative. Le sinistre reçoit une référence (`NOLI-SIN-…`) et le statut initial **SUBMITTED**.
- Règle de sécurité : on ne peut déclarer un sinistre que sur **son propre** contrat.

### 3.4 Mes Documents
Espace regroupant les documents du client liés à son parcours (devis, contrats).

### 3.5 Historique
Journal de l'activité du client (parcours et actions dans l'espace).

### 3.6 Notifications
- Centre de notifications (types : **INFO, SUCCESS, WARNING, ERROR**, et **CALLBACK** pour les demandes de rappel côté assureur).
- Notifications reçues : devis envoyé, devis approuvé, devis rejeté, etc.
- Marquage individuel comme lu et **« tout marquer comme lu »**.

### 3.7 Paiements
- Suivi des **primes des contrats** du client (moyens de paiement acceptés présentés à titre informatif : Mobile Money — Orange Money, MTN MoMo, Moov Money —, Wave).
- **Règle actuelle :** le règlement des primes s'effectue **directement auprès de l'assureur**. Le **paiement en ligne intégré est « À venir »** (voir §7).

### 3.8 Mes Avis (notation des assureurs)
- Le client peut **noter (1 à 5 étoiles)** et **commenter** une compagnie d'assurance.
- **Règle :** on ne peut noter qu'un assureur **avec lequel on a interagi** (pour lequel on a demandé un devis). **Un seul avis par (client, assureur)**, modifiable (mise à jour).

### 3.9 Mon Profil
Consultation et modification des informations personnelles (nom, téléphone…). L'email et le rôle ne sont pas modifiables par le client.

### 3.10 Paramètres
Préférences du compte (dont thème d'affichage).

---

## 4. Espace Assureur

**Acteur.** Compte assureur connecté (rôle INSURER), rattaché à une **compagnie** par un administrateur. Navigation par onglets.

> **Prérequis d'accès.** Un compte ne devient assureur que lorsqu'un **administrateur** l'active et le **lie à une compagnie**. Sans ce rattachement, l'espace assureur n'est pas accessible.

### 4.1 Tableau de bord
Synthèse de l'activité de la compagnie (devis reçus, contrats, sinistres, indicateurs clés).

### 4.2 Analytics
Statistiques et tendances de l'activité de la compagnie.

### 4.3 Offres
- Gestion des **offres** de la compagnie (création, modification, activation/désactivation).
- Les critères d'une offre (plages de puissance fiscale, carburants, valeurs, usages, type de contrat, prix) déterminent l'éligibilité et le score dans le comparateur.

### 4.4 Devis reçus (approbation / rejet → création de contrat)
**Objectif.** Traiter les devis soumis sur les offres de la compagnie.

**Parcours principal.**
1. L'assureur consulte les devis portant sur **ses** offres.
2. Il change le statut d'un devis : **APPROVED**, **REJECTED** ou **PENDING**.
3. **À l'approbation**, si le devis n'a pas de prix final, le **prix estimé** est repris comme prix final ; un **contrat** est **créé automatiquement** (référence `NOLI-CON-…`, statut **ACTIVE**, date de début du jour, date de fin à +1 an, prime = prix final/estimé).
4. Le client est notifié (« Devis approuvé » / « Devis rejeté »).

**Règles notables.**
- Un assureur ne peut agir que sur les devis liés à **ses propres offres** (contrôle serveur).
- **Un seul contrat par devis** (idempotence). Si la création du contrat échoue, le devis est **restauré** dans son état précédent (pas de contrat fantôme).

### 4.5 Contrats
Liste et suivi des contrats liés aux offres de la compagnie.

### 4.6 Clients
Vue des clients rattachés à la compagnie (via leurs devis / contrats).

### 4.7 Sinistres (traitement)
- L'assureur voit les sinistres déclarés sur **ses** contrats et met à jour leur **statut** : **SUBMITTED → IN_REVIEW → APPROVED / REJECTED / CLOSED**.

### 4.8 Rappels
Demandes de rappel reçues (téléphone du prospect, horaire préféré, offre concernée) — voir 6.3.

### 4.9 Mes Garanties
- Gestion des **garanties (couvertures)** de la compagnie et de leurs paramètres de tarification (méthode de calcul et règles associées) qui alimentent le calcul du prix dans le comparateur.

### 4.10 Paramètres
Réglages du compte assureur (dont logo de la compagnie, informations de contact).

---

## 5. Espace Administrateur

**Acteur.** Administrateur (rôle ADMIN). Navigation par onglets. L'administrateur pilote l'ensemble du référentiel et des accès.

### 5.1 Tableau de bord
Vue d'ensemble de la plateforme (indicateurs globaux).

### 5.2 Gestion des assureurs
- Création / modification des **compagnies** (code, nom, logo, email de contact, téléphone, site web) et **activation/désactivation**.
- **Création et liaison des comptes assureurs** à une compagnie (condition d'accès à l'espace assureur).

### 5.3 Catégories de produits
Gestion des **catégories de produits d'assurance** (ex. Auto).

### 5.4 Offres
Gestion **transversale** des offres d'assurance (toutes compagnies).

### 5.5 Catégories de garanties
Gestion des **catégories de garanties** (RC, Défense & Recours, Individuelle Conducteur/Passagers, Incendie, Vol, Bris de Glaces, Tierce Complète/Collision, Assistance…).

### 5.6 Garanties & règles tarifaires
- Gestion des **garanties (couvertures)** et de leurs **règles de tarification** (paramètres des méthodes FREE / FIXED_AMOUNT / VARIABLE_BASED / MATRIX_BASED, grilles par tranche, etc.) qui pilotent le calcul de prix.

### 5.7 Devis
Consultation et gestion **transversale** des devis (toutes compagnies).

### 5.8 Rappels
Consultation des **demandes de rappel** (voir 6.3).

### 5.9 Journaux d'audit
Consultation des **journaux d'audit** : traçabilité des actions sensibles (ex. inscription, réinitialisation de mot de passe, opérations d'administration).

### 5.10 Sauvegardes
Gestion des **sauvegardes** de la base (création, consultation, restauration, suppression).

### 5.11 Rôles & permissions
- Gestion des **rôles personnalisés** et des **permissions granulaires** (catalogue par domaine : settings, users, offers, quotes, insurers, coverages, backups, audit, roles) et de leur attribution.
- Voir le document **Rôles & permissions** pour le détail du modèle.

### 5.12 Paramètres
Réglages de la plateforme, organisés en sous-sections : **général**, **utilisateurs**, **comptes**, **apparence**, **email**, **notifications**, **sécurité** (dont politique de mot de passe).

### 5.13 Mon Profil
Profil de l'administrateur.

---

## 6. Fonctions transverses

### 6.1 Authentification

**Objectif.** Inscription, connexion, déconnexion et récupération de mot de passe.

**Parcours et règles.**
- **Inscription** (email, nom complet, mot de passe, téléphone) : création d'un compte via Supabase Auth. **Confirmation d'email automatique** et **connexion immédiate** après l'inscription. Le **rôle réel est toujours forcé à USER** ; un assureur ne peut être activé que par un administrateur.
- **Connexion** : email + mot de passe. Un **compte désactivé** ou **sans profil** est refusé. Message d'erreur **générique** (pas d'énumération des emails).
- **Déconnexion** : fermeture de la session.
- **Mot de passe oublié** : envoi d'un lien de réinitialisation. Réponse **identique** que le compte existe ou non (anti-énumération), puis **réinitialisation** via le lien reçu par email.
- **Protections :** limitation du nombre de tentatives (anti-force brute) sur inscription, connexion, mot de passe oublié et réinitialisation ; **politique de complexité** du mot de passe (au moins 8 caractères, une majuscule et un chiffre).

### 6.2 Notifications
Système de notifications in-app (voir 3.6) alimenté par les événements métier (devis envoyé/approuvé/rejeté, nouveau devis reçu, demande de rappel).

### 6.3 Contact / demande de rappel
- **Demande de rappel** : un prospect laisse son **téléphone**, éventuellement un **horaire préféré** et l'**offre** concernée. Un **email de confirmation** peut être envoyé et une **notification « Demande de rappel »** est adressée à l'assureur concerné.
- **Contact** : formulaire de contact / messages, et pages d'information (FAQ, À propos, Mentions légales).
- **Protection :** limitation du nombre de demandes par IP (anti-spam).

---

## 7. Points « À venir »

- **Paiement en ligne intégré** des primes (Mobile Money, Wave…). Aujourd'hui, le règlement se fait **directement auprès de l'assureur** ; l'espace Paiements est informatif et de suivi.
- **Prime nette** (remise fiscale + frais) : **non appliquée** au prix affiché tant qu'elle n'est pas validée par une source métier — le prix reste la **prime brute**.

---

*Document généré à partir du code source réel (composants `src/components/*`, routes `src/app/api/*`, services `src/lib/*` et migrations `supabase/migrations/*`).*
