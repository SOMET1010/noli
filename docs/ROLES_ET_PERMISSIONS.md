# NOLI — Rôles & permissions

**Produit :** NOLI, comparateur d'assurances auto en Côte d'Ivoire (Next.js + Supabase)
**Objet :** rôles des utilisateurs, matrice des fonctionnalités, modèle d'authentification, système de permissions et protections d'accès.

> Ce document décrit le fonctionnement **tel qu'implémenté**, vérifié dans le code
> (`src/lib/auth-guard.ts`, `src/lib/auth-actions.ts`, `src/lib/validation.ts`,
> migrations `supabase/migrations/*` dont `…security_fixes.sql`).

---

## 1. Les 3 rôles

L'application repose sur **trois rôles principaux**, portés par le champ `role` de la table `profiles` (valeurs autorisées : `USER`, `INSURER`, `ADMIN`).

### USER — Client
Utilisateur final qui compare les offres, demande des devis et gère ses contrats.
- Utilise le comparateur et confirme des devis.
- Gère son espace : tableau de bord, Mes Devis, Mes Contrats (+ déclaration de sinistre), Mes Documents, Historique, Notifications, Paiements (suivi des primes), Mes Avis (notation des assureurs), Mon Profil, Paramètres.
- **Ne peut pas** approuver de devis, créer de contrats, ni accéder aux espaces assureur / admin.

### INSURER — Assureur (compagnie)
Compte rattaché à une **compagnie d'assurance** par un administrateur.
- Gère les offres et garanties de sa compagnie.
- Traite les **devis reçus** sur ses offres (approbation / rejet → **création automatique de contrat**).
- Suit ses contrats, ses clients, traite les **sinistres**, consulte les rappels et ses analytics.
- **Périmètre limité à sa propre compagnie** : il n'agit que sur les devis, contrats et sinistres liés à ses offres / sa compagnie.

### ADMIN — Administrateur
Administrateur de la plateforme.
- Gère les compagnies, active/lie les comptes assureurs, gère le référentiel (catégories produits, offres, catégories de garanties, garanties & règles tarifaires).
- Consulte les devis (transversal), les rappels, les **journaux d'audit**, gère les **sauvegardes**, les **rôles & permissions** et les **paramètres**.

---

## 2. Matrice rôle × fonctionnalités

Légende : ✅ autorisé — ⛔ non autorisé — 🔒 = limité à ses propres données / sa compagnie — « — » = sans objet.

| Fonctionnalité | USER (Client) | INSURER (Assureur) | ADMIN |
|---|:---:|:---:|:---:|
| Utiliser le comparateur / obtenir un devis | ✅ (aussi anonyme) | ✅ | ✅ |
| Confirmer un devis (référence) | ✅ | ✅ | ✅ |
| Voir **ses** devis | ✅ 🔒propre | — | — |
| Voir les devis sur **ses offres** | — | ✅ 🔒compagnie | — |
| Voir **tous** les devis | ⛔ | ⛔ | ✅ |
| Approuver / rejeter un devis | ⛔ | ✅ 🔒ses offres | ✅ |
| Voir / gérer **ses** contrats | ✅ 🔒propre | — | — |
| Création de contrat (à l'approbation) | ⛔ | ✅ (auto) 🔒ses offres | ✅ |
| Voir les contrats de **sa compagnie** | — | ✅ 🔒compagnie | ✅ (tous) |
| Déclarer un sinistre | ✅ 🔒ses contrats | ⛔ | ✅ |
| Traiter / suivre un sinistre | ⛔ | ✅ 🔒ses contrats | ✅ |
| Noter un assureur (avis 1–5) | ✅ 🔒assureurs interagis | ⛔ | ✅ (modération) |
| Gérer les **offres** | ⛔ | ✅ 🔒sa compagnie | ✅ (transversal) |
| Gérer les **garanties & règles tarifaires** | ⛔ | ✅ 🔒sa compagnie | ✅ (transversal) |
| Gérer les **compagnies (assureurs)** | ⛔ | ⛔ | ✅ |
| Activer / lier un compte assureur | ⛔ | ⛔ | ✅ |
| Catégories produits / catégories garanties | ⛔ | Lecture (catégories) | ✅ |
| Journaux d'audit | ⛔ | ⛔ | ✅ |
| Sauvegardes | ⛔ | ⛔ | ✅ |
| Rôles & permissions | ⛔ | ⛔ | ✅ |
| Paramètres de la plateforme | ⛔ | ⛔ | ✅ |
| Gérer **son** profil | ✅ 🔒propre | ✅ 🔒propre | ✅ |
| Demande de rappel (contact) | ✅ (public) | Réception 🔒compagnie | Consultation |

> **Note.** Un devis anonyme (visiteur non connecté) est rattaché au compte USER lors de l'inscription ou de la connexion, **par correspondance email exacte** (voir §3).

---

## 3. Modèle d'authentification

L'authentification s'appuie sur **Supabase Auth** (email / mot de passe). La session est le **JWT Supabase** transporté par un **cookie** (il n'y a pas de table « sessions »).

**Points clés vérifiés dans le code :**

- **Profil lié à `auth.users`.** À l'inscription, un profil est créé dans `profiles` (même identifiant que `auth.users`) par le trigger `on_auth_user_created` / `handle_new_user()`. Un **filet de sécurité** applicatif recrée le profil si le trigger n'a pas abouti (idempotent).

- **Confirmation d'email automatique + connexion immédiate.** Après l'inscription, l'email est confirmé automatiquement (`email_confirm: true`) et une session est ouverte immédiatement, pour **tous** les rôles.

- **Rôle forcé à `USER` à l'inscription.** Le rôle envoyé par le client n'est **jamais** pris en compte : le trigger `handle_new_user()` insère systématiquement `role = 'USER'`, et la réponse d'inscription renvoie toujours `USER`. **Un assureur (INSURER) ou un administrateur (ADMIN) ne peut être attribué que par un administrateur** (via la `service_role` côté serveur). De plus, un compte ne devient assureur opérationnel qu'une fois **lié à une compagnie** (`insurer_accounts`) par un admin.

- **Contrôles à la connexion.** Un compte **sans profil** ou **désactivé** (`is_active = false`) est refusé. Les messages d'erreur sont **génériques** (anti-énumération des emails).

- **Récupération de mot de passe.** « Mot de passe oublié » renvoie une **réponse identique** que le compte existe ou non ; la réinitialisation se fait via le lien reçu par email, puis la session de récupération est fermée (reconnexion explicite).

- **Compte désactivé pris en compte immédiatement.** `getSessionProfile()` traite un profil `is_active = false` comme **non authentifié**, sans attendre l'expiration du JWT.

- **Protections anti-abus.** Limitation de débit (rate limiting) sur inscription, connexion, mot de passe oublié, réinitialisation, comparaison publique et demande de rappel ; **politique de complexité** du mot de passe (au moins 8 caractères, une majuscule et un chiffre) ; journalisation d'audit des actions sensibles (`REGISTER`, `PASSWORD_RESET`, …).

---

## 4. Système de permissions (rôles personnalisés)

En complément des trois rôles principaux, un **système de permissions granulaires** existe en base, destiné à des **rôles personnalisés** administrables. Il repose sur **quatre tables** :

| Table | Rôle |
|---|---|
| `roles` | Rôles personnalisés (nom, description, indicateur « par défaut »). |
| `permissions` | Catalogue de permissions granulaires (`code`, `name`, `category`). |
| `role_permissions` | Liaison **rôle ↔ permission** (permissions accordées à un rôle). |
| `profile_roles` | Liaison **profil ↔ rôle personnalisé** (rôles attribués à un utilisateur). |

**Catalogue de permissions (par domaine).** `settings` (view, edit), `users` (view, create, edit, delete, activate), `offers` (view, create, edit, delete), `quotes` (view, create, edit, delete, approve), `insurers` (view, create, edit, delete), `coverages` (view, create, edit, delete), `backups` (view, create, restore, delete), `audit` (view, export), `roles` (view, create, edit, delete).

**Attribution par défaut des permissions par rôle (référence) :**
- **ADMIN** : **toutes** les permissions.
- **INSURER** : `users.view`, `offers.view/create/edit`, `quotes.view/create/edit`, `coverages.view`.
- **USER** : `offers.view`, `quotes.view`, `quotes.create`.

**Gouvernance.** La lecture des `roles` / `permissions` / `role_permissions` est ouverte aux utilisateurs connectés ; **toute écriture** (créer/modifier/supprimer un rôle, une permission, une liaison, ou **attribuer un rôle à un utilisateur**) est **réservée aux administrateurs** (RLS `is_admin()`). Chaque utilisateur ne voit que **ses propres** entrées dans `profile_roles`.

> **À noter.** Le contrôle d'accès effectif des routes API repose aujourd'hui sur le **rôle principal** (`USER` / `INSURER` / `ADMIN`) via `requireAuth([...])`. Les tables de permissions granulaires constituent le **modèle de données RBAC** administrable (catalogue et attribution), utilisé pour l'affichage et la gestion des rôles personnalisés.

---

## 5. Protections d'accès

La sécurité repose sur **deux couches complémentaires** : les **gardes applicatifs** (côté routes serveur) et la **RLS PostgreSQL** (côté base).

### 5.1 Gardes applicatifs (`requireAuth`, `src/lib/auth-guard.ts`)

- `getSessionProfile()` : lit le profil de l'utilisateur **à partir de la session** (JWT/cookie), jamais du client ; renvoie `null` si non connecté **ou** compte désactivé.
- `requireAuth(allowedRoles?)` : renvoie **401** si non authentifié, **403** si le rôle n'est pas dans la liste autorisée. C'est le garde utilisé en tête de route :
  - routes **Admin** → `requireAuth(["ADMIN"])` ;
  - routes **Assureur** → `requireAuth(["INSURER"])`.
- `getInsurerAccount(profileId)` : résout la **compagnie** d'un assureur **à partir de la session**, jamais d'un identifiant fourni par le client — un assureur ne peut donc agir que sur **ses** offres / devis / contrats / sinistres (vérifié, p. ex., à l'approbation d'un devis).
- Helpers complémentaires : `requireAdmin`, `requireRole`.

### 5.2 RLS PostgreSQL (Row Level Security)

La **RLS est activée** sur les tables métier. L'application écrit via la **`service_role`** (RLS contournée pour les routes serveur de confiance) ; la RLS protège les accès directs via la clé `anon` (JWT utilisateur). Principes vérifiés :

- **`profiles`** : chacun ne voit/gère que **son** profil ; l'admin gère tout. La fonction `is_admin()` (SECURITY DEFINER, `search_path` figé) évite la récursion.
- **`contracts`, `claims`, `reviews`, `profile_roles`, etc.** : un client ne voit que **ses** données ; un assureur ne voit que ce qui est **lié à sa compagnie** ; l'admin voit tout.
- **Écritures d'administration** (roles, permissions, role_permissions, profile_roles) : réservées à `is_admin()`.

### 5.3 Durcissements de sécurité (`…security_fixes.sql`)

- **C-01** : `handle_new_user()` **force `role = 'USER'`** (aucune confiance au rôle client).
- **C-02** : trigger `protect_profile_sensitive_fields()` — un utilisateur non-admin **ne peut pas** modifier son `role`, réactiver son compte (`is_active`) ni changer son `email` ; ces champs sont **verrouillés** (restaurés à l'ancienne valeur). Seul un admin (ou la `service_role`) le peut.
- **C-03** : suppression de la policy d'**auto-liaison** `insurer_accounts` — un utilisateur ne peut plus se lier lui-même à une compagnie ; **seul l'admin** crée les liaisons.
- **H-04** : trigger `protect_quote_lifecycle()` — un **client** ne peut pas falsifier le **cycle de vie** ni les **prix** de ses devis (à l'insertion : statut forcé `DRAFT`, prix neutralisés ; en mise à jour : statut et prix restaurés). L'assureur et l'admin restent libres.
- **H-05** : contraintes d'**intégrité financière** — interdiction des montants négatifs (`estimated_price`, `final_price`, `premium_amount`).
- **B-10** : révocation de l'exécution directe (publique) des fonctions `SECURITY DEFINER` sensibles.

> Ces triggers distinguent deux contextes : `auth.uid() IS NULL` = `service_role` (route serveur de confiance, libre) ; `auth.uid() IS NOT NULL` = utilisateur via clé `anon` (restreint).

---

*Document généré à partir du code source réel : `src/lib/auth-guard.ts`, `src/lib/auth-actions.ts`, `src/lib/validation.ts`, `src/app/api/admin/permissions/route.ts`, et migrations `supabase/migrations/*` (profiles, roles, permissions, role_permissions, profile_roles, contracts, claims, reviews, security_fixes).*
