# Référence API — NOLI

Documentation de référence de l'API HTTP de la plateforme NOLI (comparateur
d'assurances). Toutes les routes sont servies par le Route Handler Next.js
(App Router) sous `src/app/api/**/route.ts` et utilisent Supabase (Auth +
PostgreSQL) côté serveur.

> Cette référence est générée à partir du code réel. Pour chaque endpoint on
> indique le chemin, les méthodes HTTP réellement exportées, le rôle requis,
> une description, les entrées principales et la nature de la sortie.

---

## Authentification & session

L'authentification repose sur **Supabase Auth**. La session est un **JWT stocké
dans un cookie `httpOnly`** (posé/effacé par le client Supabase SSR côté
serveur). Il n'existe pas de table `sessions` applicative : l'identité est
toujours dérivée du cookie de session, **jamais d'un paramètre fourni par le
client** (pas de `?userId` de confiance).

Contrôles d'accès (helpers `src/lib/auth-guard.ts`) :

| Niveau | Mécanisme dans le code | Effet |
|--------|------------------------|-------|
| **public** | aucun garde (parfois `getSessionProfile()` seulement pour lier un devis) | accessible sans être connecté |
| **USER** (connecté) | `getSessionProfile()` puis rejet si `null` | tout utilisateur authentifié et actif |
| **INSURER** | `requireAuth(["INSURER"])` + `getInsurerAccount()` | assureur rattaché à une compagnie |
| **ADMIN** | `requireAuth(["ADMIN"])` | administrateur uniquement |

Un compte **désactivé** (`is_active = false`) est traité comme non authentifié,
même si son JWT est encore valide.

### Codes d'erreur communs

| Code | Signification |
|------|---------------|
| **400** | Corps/paramètres invalides (échec de validation Zod, champ manquant, valeur hors bornes). Le message précis est renvoyé dans `{ "error": "..." }`. |
| **401** | Non authentifié (« Authentification requise » / « Non authentifié »). Aucun cookie de session valide. |
| **403** | Authentifié mais rôle insuffisant ou ressource n'appartenant pas à l'utilisateur (« Accès refusé »). |
| **404** | Ressource introuvable. |
| **429** | Trop de requêtes — rate limiting par IP (voir en-tête `Retry-After`). S'applique aux endpoints publics coûteux : `POST /api/auth/login`, `/register`, `/forgot`, `POST /api/compare`, `POST /api/contact/*`, `GET /api/stats`, `POST /api/user/quotes`. |
| **500** | Erreur serveur interne. |
| **503** | Service momentanément indisponible (ex. base injoignable sur `/api/health`, service Auth trop lent à l'inscription). |

Format d'erreur standard : `{ "error": "message en français" }`.
Sauf mention contraire, les réponses de succès sont en JSON.

---

## 1. Authentification (`/api/auth/*`)

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/auth/register` | POST | public | Inscription. Crée le compte Supabase Auth (rôle forcé à `USER` en base), confirme l'email automatiquement, ouvre la session immédiate (cookie), rattache les devis anonymes de cet email. | `{ email, password, name, phone?, role? }` (validé, politique de mot de passe appliquée) | `{ user: { id, email, name, role: "USER" } }` |
| `/api/auth/login` | POST | public | Connexion. Vérifie identifiants + compte actif, pose le cookie de session, rattache les devis anonymes. Anti brute-force par IP+email. | `{ email, password }` | `{ user: { id, email, name, role } }` — 401 si identifiants invalides, 403 si compte désactivé/sans profil |
| `/api/auth/logout` | POST | public | Déconnexion : ferme la session Supabase (efface le cookie). | — | `{ message: "Déconnecté" }` |
| `/api/auth/me` | GET | USER | Retourne le profil de l'utilisateur de la session courante. | — | `{ user: { id, email, name, role } }` — 401 si non connecté |
| `/api/auth/forgot` | POST | public | Demande de réinitialisation : envoie un email avec lien de récupération. Réponse identique que le compte existe ou non (anti-énumération). Rate limit par IP+email. | `{ email }` | `{ message }` |
| `/api/auth/reset-password` | POST | public | Étape 2 : fixe le nouveau mot de passe à partir des tokens de récupération extraits du lien email. Ferme ensuite la session de récupération. | `{ accessToken, refreshToken, password }` | `{ message }` |
| `/api/auth` | POST | public | **Endpoint historique (rétro-compatibilité)** : dispatch selon `action`. À éviter au profit des routes REST dédiées ci-dessus. | `{ action: "register"\|"login"\|"logout"\|"forgot"\|"me", ... }` | idem l'action correspondante |

---

## 2. Comparaison & Devis (`/api/compare`, `quotes`, `offers`, `coverage-categories`)

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/compare` | POST | public (session facultative) | Lance le moteur de comparaison tarifaire à partir du profil, du véhicule et des besoins de garantie. Si l'utilisateur est connecté, le résultat est rattaché à son compte. Rate limit par IP (calcul coûteux). | `{ personalInfo, vehicleInfo, coverageNeeds }` (validé) | Résultat de comparaison (offres classées + tarifs) |
| `/api/offers` | GET | public | Liste des offres d'assurance actives, avec filtrage et éligibilité véhicule. Retourne aussi catégories et assureurs pour les filtres. | Query : `categoryId`, `insurerId`, `contractType`, `sortBy` (`price_asc`/`price_desc`/`name_asc`), `fiscalPower`, `fuelType`, `newValue`, `venalValue`, `vehicleUsage` | `{ offers[], categories[], insurers[], total }` |
| `/api/coverage-categories` | GET | public | Catégories de garanties actives (clé = `code`), triées par ordre d'affichage. Sert le tunnel de comparaison. | — | `[{ id, code, name, description, displayOrder }]` |
| `/api/quotes` | GET | USER | Liste des devis de l'utilisateur connecté (avec offre, assureur, catégorie liés). | Query : `limit` (défaut 50) | `{ quotes[] }` |

> Voir aussi `POST /api/user/quotes` (création de devis) et `GET /api/user/quotes` (liste paginée) dans l'Espace Client.

---

## 3. Espace Client (`/api/user/*`, `profile`, `notifications`, `claims`, `reviews`)

Toutes ces routes exigent un utilisateur connecté (`getSessionProfile`).
L'identité vient de la session ; un `?userId` ne peut désigner que soi-même
(sinon **403**).

### Profil & tableau de bord

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/user/profile` | GET, PUT | USER | GET : lit son profil. PUT : met à jour ses informations et/ou son mot de passe (politique appliquée, vérif. de l'ancien mot de passe). | GET query `userId?` (soi-même). PUT `{ firstName?, lastName?, phone?, currentPassword?, newPassword? }` | `{ user }` / profil mis à jour |
| `/api/profile` | GET, PUT | USER | **Alias** de `/api/user/profile` (rétro-compatibilité, même implémentation). | idem `/api/user/profile` | idem |
| `/api/user/contracts` | GET | USER | Liste des contrats de l'utilisateur. | Query `userId?` (soi-même) | `{ contracts[], ... }` |
| `/api/user/stats` | GET | USER | Statistiques du tableau de bord client (nombre de devis par statut, etc.). | — | `{ ... }` compteurs |

### Devis client

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/user/quotes` | POST, GET | public (POST) / USER (GET) | POST : crée un devis (depuis le tunnel, connecté ou anonyme via email) ; génère le PDF et notifie l'assureur concerné. Rate limit par IP. GET : liste paginée + recherche des devis de l'utilisateur connecté. | POST `{ ... , email }`. GET query `status?`, `search?`, `page?`, `limit?` (max 100) | POST `{ ... }` (devis créé). GET `{ quotes[], total, page, limit }` |
| `/api/user/quotes/[id]` | GET | USER | Détail d'un devis appartenant à l'utilisateur (403 si ce n'est pas le sien). | Path `id` | Devis formaté |

### Notifications

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/notifications` | GET, POST | USER | GET : notifications de l'utilisateur (`unreadOnly`). POST : crée une notification. | GET query `unreadOnly=true?`. POST `{ ... }` | GET `[notifications]`. POST notification créée (201) |
| `/api/notifications/[id]` | PUT | USER | Marque une notification (la sienne) comme lue/non lue. 403 si elle appartient à un autre. | Path `id`, body `{ isRead }` | Notification mise à jour |
| `/api/notifications/read-all` | PUT | USER | Marque toutes les notifications de l'utilisateur comme lues. | — | `{ ... }` (compteur) |

### Sinistres & avis

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/claims` | GET, POST | USER | GET : sinistres de l'utilisateur. POST : déclare un sinistre sur l'un de ses contrats (validation type/description/date). | POST `{ contractId, type, description (≥10 car.), incidentDate? (YYYY-MM-DD) }` | GET `{ claims[] }`. POST `{ ok: true, reference }` |
| `/api/reviews` | GET, POST | USER | GET : avis de l'utilisateur + assureurs qu'il peut évaluer (ayant un devis). POST : dépose/actualise un avis (note 1–5) pour un assureur déjà « rencontré » (sinon 403). | POST `{ insurerId, rating (1-5), comment? }` | GET `{ reviews[], reviewableInsurers[] }`. POST `{ ok: true }` |

---

## 4. Espace Assureur (`/api/insurer/*`)

Toutes ces routes exigent le rôle **INSURER** (`requireAuth(["INSURER"])`) et un
compte assureur rattaché à une compagnie via `getInsurerAccount()` (404 si le
profil n'est lié à aucune compagnie). L'assureur ne voit et ne modifie que **ses
propres** données (offres, devis, sinistres, contrats de sa compagnie).

### Compte & identité

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/insurer/me` | GET, PUT | INSURER | GET : compagnie de l'assureur connecté. PUT : met à jour les informations de sa compagnie. | PUT `{ ... }` champs compagnie | Compagnie |
| `/api/insurer/account` | GET | INSURER | Compte assureur (lien profil ↔ compagnie) de la session. | — | `{ ... }` |
| `/api/insurer/logo` | POST | INSURER | Téléverse le logo de la compagnie (image, max 2 Mo, SVG interdit — anti-XSS ; extension déduite du type MIME). | `multipart/form-data` : `file` | `{ ... , logoUrl }` |
| `/api/insurer/stats` | GET | INSURER | Statistiques de la compagnie (offres, devis par statut, garanties). | — | `{ ... }` compteurs |

### Catalogue (offres & garanties)

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/insurer/offers` | GET, POST | INSURER | GET : offres de la compagnie (`active?`). POST : crée une offre (validation numérique des prix/montants/taux et cohérence des bornes min/max). | GET query `active?`. POST corps de l'offre | GET `[offers]`. POST offre créée (201) |
| `/api/insurer/offers/[id]` | GET, PUT, DELETE | INSURER | Consulte / modifie / supprime une offre de la compagnie. | Path `id`, body (PUT) | Offre / statut |
| `/api/insurer/coverages` | GET, POST | INSURER | GET : garanties de la compagnie. POST : crée une garantie. | GET query filtres. POST corps garantie | GET `[coverages]`. POST garantie créée |
| `/api/insurer/coverages/[id]` | GET, PUT, DELETE | INSURER | Consulte / modifie / supprime une garantie de la compagnie. | Path `id`, body (PUT) | Garantie / statut |
| `/api/insurer/coverage-categories` | GET | INSURER | Catégories de garanties (référentiel) accessibles à l'assureur. | — | `[categories]` |
| `/api/insurer/insurance-categories` | GET | INSURER | Catégories d'assurance (référentiel). | — | `[categories]` |

### Devis, sinistres, clients & contrats

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/insurer/quotes` | GET | INSURER | Devis reçus sur les offres de la compagnie (paginé, recherche, filtre statut). | Query `status?`, `search?`, `page?`, `limit?` (max 100) | `{ quotes[], total, page, limit }` |
| `/api/insurer/quotes/[id]/status` | PUT | INSURER | Change le statut d'un devis (de sa compagnie). À l'**approbation**, crée automatiquement le contrat et notifie le client (rollback si la création échoue). | Path `id`, body `{ status, finalPrice? }` | Devis mis à jour |
| `/api/insurer/claims` | GET | INSURER | Sinistres déclarés sur les contrats de la compagnie. | — | `{ claims[] }` |
| `/api/insurer/claims/[id]/status` | PUT | INSURER | Met à jour le statut d'un sinistre de la compagnie et notifie le client. | Path `id`, body `{ status }` | Sinistre mis à jour |
| `/api/insurer/clients` | GET | INSURER | Portefeuille : clients enregistrés ayant soumis ≥1 devis sur ses offres (nb de devis, dernière activité, nb de contrats). | — | `{ clients[] }` |
| `/api/insurer/contracts` | GET | INSURER | Contrats liés à la compagnie (filtre sur `insurer_id`). | — | `{ contracts[] }` |

---

## 5. Administration (`/api/admin/*`)

Toutes ces routes exigent le rôle **ADMIN** (`requireAuth(["ADMIN"])`).

### Statistiques, journal, sauvegardes

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/admin/stats` | GET | ADMIN | Statistiques globales de la plateforme (assureurs, offres, garanties, devis par statut, etc.). | — | `{ ... }` compteurs |
| `/api/admin/audit-logs` | GET | ADMIN | Journal d'audit filtrable et paginé. | Query `action?`, `entity?`, `userId?`, `startDate?`, `endDate?`, `search?`, `page?`, `limit?` (max 100) | `{ logs[], total, ... }` |
| `/api/admin/backups` | GET, POST | ADMIN | GET : liste des sauvegardes + planification. POST : crée une sauvegarde, ou configure la planification (`?action=schedule`). | GET —. POST query `action=schedule?` + body | GET `{ backups[], schedule }`. POST `{ backup }` (201) ou `{ success }` |
| `/api/admin/backups/[id]` | GET, POST, DELETE | ADMIN | GET : télécharge le fichier de sauvegarde (`Content-Disposition`). POST : restaure (`?action=restore`). DELETE : supprime la sauvegarde. | Path `id`, query `action=restore?` (POST) | Fichier / `{ success }` |

### Comptes, rôles & permissions

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/admin/users` | GET, PUT | ADMIN | GET : liste des utilisateurs (avec nb de devis). PUT : met à jour un utilisateur (activation, rôle, etc.). | GET query filtres. PUT `{ id, ... }` | Liste / utilisateur mis à jour |
| `/api/admin/profiles` | GET, PUT | ADMIN | GET : profils (recherche). PUT : met à jour un profil. | GET query `search?`. PUT `{ id, ... }` | Liste / profil mis à jour |
| `/api/admin/profiles/[id]/roles` | GET, PUT | ADMIN | GET : rôles d'un profil. PUT : remplace l'ensemble des rôles (`profile_roles`) du profil. | Path `id`, body `{ roles[] }` | Rôles du profil |
| `/api/admin/roles` | GET, POST | ADMIN | GET : liste des rôles. POST : crée un rôle. | POST `{ name, ... }` | Liste / rôle créé |
| `/api/admin/roles/[id]` | GET, PUT, DELETE | ADMIN | Consulte / modifie / supprime un rôle. | Path `id`, body (PUT) | Rôle / statut |
| `/api/admin/permissions` | GET | ADMIN | Liste des permissions (initialise le référentiel permissions/role_permissions au besoin). | — | `[permissions]` |

### Référentiels & catalogue

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/admin/insurers` | GET, POST | ADMIN | GET : liste des compagnies. POST : crée une compagnie. | GET query filtres. POST corps compagnie | Liste / compagnie créée |
| `/api/admin/insurers/[id]` | GET, PUT, DELETE | ADMIN | Consulte / modifie / supprime une compagnie. | Path `id`, body (PUT) | Compagnie / statut |
| `/api/admin/insurance-offers` | GET, POST | ADMIN | GET : liste des offres. POST : crée une offre. | GET query filtres. POST corps offre | Liste / offre créée |
| `/api/admin/insurance-offers/[id]` | GET, PUT, DELETE | ADMIN | Consulte / modifie / supprime une offre. | Path `id`, body (PUT) | Offre / statut |
| `/api/admin/insurance-categories` | GET, POST | ADMIN | GET : catégories d'assurance. POST : en crée une. | POST corps catégorie | Liste / catégorie créée |
| `/api/admin/insurance-categories/[id]` | GET, PUT, DELETE | ADMIN | Consulte / modifie / supprime une catégorie d'assurance. | Path `id`, body (PUT) | Catégorie / statut |
| `/api/admin/insurance-packages` | GET, POST | ADMIN | GET : formules/packs. POST : en crée un. | POST corps pack | Liste / pack créé |
| `/api/admin/insurance-packages/[id]` | GET, PUT, DELETE | ADMIN | Consulte / modifie / supprime un pack. | Path `id`, body (PUT) | Pack / statut |
| `/api/admin/coverage-categories` | GET, POST | ADMIN | GET : catégories de garanties. POST : en crée une. | GET query filtres. POST corps | Liste / catégorie créée |
| `/api/admin/coverage-categories/[id]` | GET, PUT, DELETE | ADMIN | Consulte / modifie / supprime une catégorie de garanties. | Path `id`, body (PUT) | Catégorie / statut |
| `/api/admin/coverages` | GET, POST | ADMIN | GET : garanties. POST : en crée une. | GET query filtres. POST corps | Liste / garantie créée |
| `/api/admin/coverages/[id]` | GET, PUT, DELETE | ADMIN | Consulte / modifie / supprime une garantie. | Path `id`, body (PUT) | Garantie / statut |
| `/api/admin/coverages/[id]/tariff-rules` | GET, POST | ADMIN | GET : règles tarifaires d'une garantie. POST : ajoute une règle. | Path `id`, body (POST) | Règles / règle créée |
| `/api/admin/tariff-rules/[id]` | DELETE | ADMIN | Supprime une règle tarifaire. | Path `id` | `{ ... }` statut |

### Suivi & configuration

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/admin/quotes` | GET, PUT | ADMIN | GET : tous les devis (filtres statut/offre/recherche). PUT : met à jour un devis. | GET query `status?`, `offerId?`, `search?`. PUT `{ id, ... }` | Liste / devis mis à jour |
| `/api/admin/callbacks` | GET, PATCH | ADMIN | GET : demandes de rappel (basées sur les notifications). PATCH : met à jour le statut d'une demande. | GET query `status?`. PATCH `{ id, status }` | Liste / statut |
| `/api/admin/settings` | GET, PUT | ADMIN | GET : paramètres système (`system_settings`, initialisés au besoin). PUT : met à jour un/des paramètre(s). | PUT `{ key, value }` | Paramètres |

---

## 6. Contact (`/api/contact/*`)

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/contact/messages` | POST | public | Envoie un message de contact et notifie les administrateurs actifs. Anti-spam : 5 messages / 10 min par IP. | `{ name, email, message, ... }` | `{ ... }` — 429 si limite atteinte |
| `/api/contact/request-callback` | POST | public | Demande de rappel : email de confirmation au client + notification des assureurs concernés et des admins. Rate limit par IP (anti email-bombing). | `{ ... }` (coordonnées, offre concernée) | `{ ... }` |
| `/api/contact/callbacks` | GET, PATCH | INSURER ou ADMIN (connecté) | GET : demandes de rappel visibles par l'utilisateur connecté (via notifications). PATCH : met à jour le statut d'une de **ses** demandes (403 sinon). | GET query `status?`. PATCH `{ id, status }` | Liste / statut |

> `GET`/`PATCH /api/contact/callbacks` utilisent `getSessionProfile()` : accès
> réservé à un utilisateur connecté, chacun n'agissant que sur ses propres
> notifications.

---

## 7. Système (`/api/health`, `/api/stats`, `/api/seed`)

| Endpoint | Méthode(s) | Rôle | Description | Entrées | Sortie |
|----------|-----------|------|-------------|---------|--------|
| `/api/health` | GET | public | Sonde d'exploitation (liveness + readiness). Ping léger de la base. N'expose aucune donnée. | — | `{ status, db, latencyMs, uptimeSeconds, timestamp }` — **200** si la base répond, **503** sinon |
| `/api/stats` | GET | public | Compteurs publics (assureurs, offres, utilisateurs). Rate limit par IP (anti-énumération). | — | `{ insurers, offers, users }` |
| `/api/seed` | POST | ADMIN | Amorçage/normalisation des données de référence (catégories, garanties, offres, assureurs). | — | `{ ... }` résultat de seed |

---

## Récapitulatif par domaine

| Domaine | Routes documentées |
|---------|--------------------|
| Authentification | 7 |
| Comparaison & Devis | 4 |
| Espace Client | 11 |
| Espace Assureur | 16 |
| Administration | 27 |
| Contact | 3 |
| Système | 3 |
| **Total** | **71** |
