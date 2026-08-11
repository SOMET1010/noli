# NOLI — Modèle de données

Base **PostgreSQL** managée par **Supabase**. Schéma, index, contraintes,
triggers et **RLS (Row-Level Security)** sont versionnés dans
`supabase/migrations/` (27 migrations). Toutes les tables applicatives ont la
RLS **activée**.

> Conventions : les colonnes sont en `snake_case` en base ; l'application les
> convertit en `camelCase` à la lecture (`mapRow`/`mapRows`, `src/lib/db.ts`).
> Les identifiants sont soit des `bigint` auto-générés, soit des `uuid` (pour
> les entités liées à `auth.users`). Les colonnes `*_data`, `metadata`,
> `conditions`, `features`, `fuel_types`… sont du **JSON stocké en `text`**.
> La fonction `public.is_admin()` (SECURITY DEFINER) est le pivot des
> politiques admin.

---

## 1. Les 23 tables

### 1.1 `profiles` — Utilisateurs de la plateforme

Rôle métier : représente tout utilisateur (client, assureur ou admin). L'`id`
est **identique à celui de `auth.users`** (pattern Supabase), ce qui permet
d'utiliser `auth.uid()` dans la RLS. Le mot de passe n'est jamais stocké ici.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | FK → `auth.users(id)` `on delete cascade` |
| `email` | `text` | `not null unique` |
| `role` | `text` | `default 'USER'`, check `USER \| INSURER \| ADMIN` |
| `first_name`, `last_name`, `phone` | `text` | Optionnels |
| `is_active` | `boolean` | `default true` |
| `created_at`, `updated_at` | `timestamptz` | `updated_at` via trigger |

Trigger `on_auth_user_created` → `handle_new_user()` : crée le profil après
inscription Auth (rôle **forcé à `USER`**). Trigger
`protect_profile_sensitive_fields` : un non-admin ne peut modifier ni `role`,
ni `is_active`, ni `email`.
**RLS** : chacun lit/écrit son propre profil (`auth.uid() = id`) ; l'admin gère
tout (`is_admin()`). Aucun accès `anon`.

### 1.2 `insurers` — Compagnies d'assurance

Rôle métier : catalogue des compagnies présentes (ex. NOLIA, SUNU, NSIA, GNA,
SAHAM).

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | Identity |
| `code` | `text` | `not null unique` |
| `name` | `text` | `not null` |
| `logo_url`, `contact_email`, `phone`, `website` | `text` | Optionnels |
| `is_active` | `boolean` | `default true` |
| `created_at`, `updated_at` | `timestamptz` | |

**RLS** : lecture publique (`anon`, `authenticated`) ; création/modification/
suppression **admin uniquement**.

### 1.3 `insurer_accounts` — Liaison profil ↔ compagnie

Rôle métier : associe un utilisateur `INSURER` à la compagnie qu'il gère. C'est
la source d'identité de l'assureur côté serveur.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `profile_id` | `uuid` | FK → `profiles(id)` cascade |
| `insurer_id` | `bigint` | FK → `insurers(id)` cascade |
| `created_at` | `timestamptz` | |
| — | contrainte | `unique (profile_id, insurer_id)` |

**RLS** : l'assureur lit ses propres liaisons ; **seul l'admin crée/modifie/
supprime** les liaisons (la policy d'auto-liaison a été retirée — correctif
C-03).

### 1.4 `insurance_categories` — Catégories de produits

Rôle métier : familles de produits (Automobile, Moto, Habitation…).

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `name` | `text` | `not null` |
| `description`, `icon` | `text` | |
| `is_active` | `boolean` | `default true` |
| `created_at`, `updated_at` | `timestamptz` | |

**RLS** : lecture publique ; écriture admin.

### 1.5 `coverage_categories` — Catégories de garanties

Rôle métier : regroupe les garanties (responsabilité civile, incendie, vol…).

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `code` | `text` | `not null unique` |
| `name` | `text` | `not null` |
| `description` | `text` | |
| `display_order` | `integer` | `default 0` |
| `is_active` | `boolean` | `default true` |
| `created_at`, `updated_at` | `timestamptz` | |

**RLS** : lecture publique ; écriture admin.

### 1.6 `coverages` — Garanties paramétrables

Rôle métier : garanties d'assurance avec leur **mode de calcul de prime**. Table
centrale du moteur tarifaire.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `code` | `text` | `not null unique` |
| `type` | `text` | RC, INCENDIE, VOL… |
| `name`, `description` | `text` | |
| `calculation_type` | `text` | check `FREE \| FIXED_AMOUNT \| VARIABLE_BASED \| MATRIX_BASED` |
| `category_id` | `bigint` | FK → `coverage_categories(id)` |
| `insurer_id` | `bigint` | FK → `insurers(id)`, `not null` |
| `is_mandatory`, `is_optional` | `boolean` | |
| `conditions`, `metadata` | `text` | JSON (`default '{}'`) |
| `variable_source` | `text` | NEW_VALUE \| VENAL_VALUE \| FISCAL_POWER |
| `rate_percent`, `fixed_amount`, `capital`, `min_amount`, `max_amount` | `double precision` | Paramètres de prime |
| `conditioned_by_new_value`, `new_value_threshold`, `rate_below_threshold`, `rate_above_threshold` | | Barème par seuil de valeur à neuf |
| `pack_price_reduced` | `double precision` | Prix réduit en pack |
| `matrix_dimension`, `requires_guarantee` | `text` | Matrices / garantie prérequise |
| `is_active`, `display_order` | | |
| `created_at`, `updated_at` | `timestamptz` | |

Index sur `category_id` et `insurer_id`.
**RLS** : lecture publique ; écriture admin.

### 1.7 `coverage_tariff_rules` — Règles de tarification

Rôle métier : grilles de tarif d'une garantie selon le véhicule, la puissance
fiscale, la valeur, le carburant ou la formule.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `coverage_id` | `bigint` | FK → `coverages(id)` cascade, `not null` |
| `vehicle_category` | `text` | VP, VT… |
| `min_fiscal_power`, `max_fiscal_power` | `integer` | |
| `min_vehicle_value`, `max_vehicle_value` | `double precision` | |
| `fuel_type` | `text` | ESSENCE \| DIESEL |
| `formula_name` | `text` | Formule 1/2/3 |
| `base_rate`, `fixed_amount`, `min_amount`, `max_amount` | `double precision` | |
| `conditions` | `text` | JSON |
| `created_at`, `updated_at` | `timestamptz` | |

Index sur `coverage_id`.
**RLS** : lecture publique ; écriture admin.

### 1.8 `insurance_offers` — Offres commercialisées

Rôle métier : offres proposées par les assureurs, avec critères d'éligibilité
véhicule. Pivot de la comparaison.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `insurer_id` | `bigint` | FK → `insurers(id)`, `not null` |
| `category_id` | `bigint` | FK → `insurance_categories(id)` |
| `name`, `description` | `text` | |
| `price_min`, `price_max`, `coverage_amount`, `deductible` | `integer` | |
| `features`, `fuel_types`, `vehicle_usage` | `text` | JSON `string[]` |
| `contract_type` | `text` | basic \| third_party_plus \| all_risks |
| `fiscal_power_min/max`, `new_value_min/max`, `venal_value_min/max` | `integer` | Critères d'éligibilité |
| `is_active` | `boolean` | |
| `created_at`, `updated_at` | `timestamptz` | |

Index sur `insurer_id` et `category_id`.
**RLS** : lecture publique ; écriture admin.

### 1.9 `insurance_packages` — Packs d'assurance

Rôle métier : regroupement de garanties avec un prix de base.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `name`, `description` | `text` | |
| `base_price` | `integer` | `not null` |
| `is_active` | `boolean` | |
| `created_at`, `updated_at` | `timestamptz` | |

**RLS** : lecture publique ; écriture admin.

### 1.10 `package_coverages` — Liaison pack ↔ garantie

Rôle métier : garanties incluses dans chaque pack.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `package_id` | `bigint` | FK → `insurance_packages(id)` cascade |
| `coverage_id` | `bigint` | FK → `coverages(id)` cascade |
| `is_mandatory` | `boolean` | `default true` |
| — | contrainte | `unique (package_id, coverage_id)` |

Index sur `coverage_id`.
**RLS** : lecture publique ; écriture admin.

### 1.11 `quotes` — Devis

Rôle métier : devis émis par un utilisateur pour une offre. Point de départ d'un
contrat.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `reference` | `text` | `not null unique` |
| `user_id` | `uuid` | FK → `profiles(id)` `on delete set null` |
| `category_id` | `bigint` | FK → `insurance_categories(id)` |
| `offer_id` | `bigint` | FK → `insurance_offers(id)` |
| `status` | `text` | check `DRAFT \| PENDING \| APPROVED \| REJECTED` |
| `estimated_price` | `integer` | `>= 0` (contrainte) |
| `final_price` | `double precision` | `>= 0` (contrainte) |
| `notes` | `text` | |
| `vehicle_data`, `personal_data`, `coverage_requirements` | `text` | JSON |
| `created_at`, `updated_at` | `timestamptz` | |

Index sur `user_id`, `offer_id`, `status`, `category_id`. Trigger
`protect_quote_lifecycle` : un client ne peut ni changer le statut ni fixer les
prix (réservé assureur/admin/`service_role`).
**RLS** : le client lit/écrit ses devis (`user_id`) ; l'assureur lit et met à
jour (statut) les devis liés à **ses** offres (jointure `insurer_accounts`) ;
l'admin gère tout. Suppression : propriétaire ou admin.

### 1.12 `quote_coverages` — Lignes de devis

Rôle métier : détail des garanties et primes d'un devis (une ligne par
garantie).

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `quote_id` | `bigint` | FK → `quotes(id)` cascade, `not null` |
| `coverage_id` | `bigint` | FK → `coverages(id)`, `not null` |
| `tariff_rule_id` | `bigint` | FK → `coverage_tariff_rules(id)` |
| `premium_amount` | `integer` | `not null`, `>= 0` (contrainte) |
| `calculation_parameters` | `text` | JSON |
| `is_included`, `is_mandatory` | `boolean` | |
| `created_at` | `timestamptz` | |
| — | contrainte | `unique (quote_id, coverage_id)` |

Index sur `coverage_id`.
**RLS** : accès **hérité du devis parent** (propriétaire ou assureur de
l'offre) ; admin complet.

### 1.13 `system_settings` — Paramètres système

Rôle métier : configuration de la plateforme (email, sécurité, notifications,
apparence). Peut contenir des secrets.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `key` | `text` | `not null unique` |
| `value` | `text` | `default ''` |
| `category` | `text` | general \| email \| security \| notification \| appearance |
| `label` | `text` | `not null` |
| `type` | `text` | text \| boolean \| number \| json \| password |
| `created_at`, `updated_at` | `timestamptz` | |

**RLS** : **admin uniquement** (y compris en lecture).

### 1.14 `audit_logs` — Journal d'audit

Rôle métier : trace des actions sensibles (connexion, création, modification,
export, changement de paramètres…).

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `user_id` | `uuid` | FK → `profiles(id)` `on delete set null` |
| `user_email`, `user_name` | `text` | Dénormalisés |
| `action` | `text` | LOGIN, CREATE, UPDATE, DELETE… |
| `entity`, `entity_id` | `text` | Profile, Insurer, Offer, Quote… |
| `details` | `text` | JSON |
| `ip_address`, `user_agent` | `text` | |
| `created_at` | `timestamptz` | |

Index sur `created_at desc` et `user_id`.
**RLS** : **admin uniquement**.

### 1.15 `backups` — Sauvegardes

Rôle métier : historique des sauvegardes (traçabilité ; Supabase assure le PITR
nativement).

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `filename` | `text` | `not null` |
| `file_size` | `integer` | `default 0` |
| `status` | `text` | check `COMPLETED \| FAILED \| IN_PROGRESS \| SCHEDULED` |
| `type` | `text` | check `MANUAL \| SCHEDULED \| AUTO` |
| `schedule`, `path`, `note` | `text` | `schedule` = cron |
| `next_run` | `timestamptz` | |
| `created_at` | `timestamptz` | |

**RLS** : **admin uniquement**.

### 1.16 `notifications` — Notifications utilisateur

Rôle métier : messages adressés à un utilisateur (devis, compte, système,
demandes de rappel).

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `user_id` | `uuid` | FK → `profiles(id)` cascade, `not null` |
| `type` | `text` | check `INFO \| SUCCESS \| WARNING \| ERROR \| CALLBACK` |
| `title`, `message` | `text` | `not null` |
| `link` | `text` | Navigation optionnelle |
| `is_read` | `boolean` | `default false` |
| `created_at` | `timestamptz` | |

Index sur `(user_id, is_read)`.
**RLS** : le destinataire lit / marque lu / supprime les siennes ; création
admin (ou serveur `service_role` / Edge Function). *(Le type `CALLBACK` a été
ajouté par la migration d'extension.)*

### 1.17 `roles` — Rôles personnalisés

Rôle métier : rôles additionnels (au-delà de USER/INSURER/ADMIN) pour le RBAC
granulaire.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `name` | `text` | `not null unique` |
| `description` | `text` | |
| `is_default` | `boolean` | `default false` |
| `created_at`, `updated_at` | `timestamptz` | |

**RLS** : lecture pour tout utilisateur connecté ; écriture admin.

### 1.18 `permissions` — Permissions granulaires

Rôle métier : permissions attribuables aux rôles (ex. `settings.view`,
`users.create`, `offers.delete`).

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `code` | `text` | `not null unique` |
| `name` | `text` | `not null` |
| `category` | `text` | settings, users, offers, quotes… |
| `created_at` | `timestamptz` | |

**RLS** : lecture pour tout utilisateur connecté ; écriture admin.

### 1.19 `role_permissions` — Liaison rôle ↔ permission

Rôle métier : permissions accordées à chaque rôle.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `role_id` | `bigint` | FK → `roles(id)` cascade |
| `permission_id` | `bigint` | FK → `permissions(id)` cascade |
| `created_at` | `timestamptz` | |
| — | contrainte | `unique (role_id, permission_id)` |

Index sur `permission_id`.
**RLS** : lecture pour tout utilisateur connecté ; écriture admin.

### 1.20 `profile_roles` — Liaison profil ↔ rôle personnalisé

Rôle métier : rôles personnalisés attribués à chaque utilisateur.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `profile_id` | `uuid` | FK → `profiles(id)` cascade |
| `role_id` | `bigint` | FK → `roles(id)` cascade |
| `created_at` | `timestamptz` | |
| — | contrainte | `unique (profile_id, role_id)` |

Index sur `role_id`.
**RLS** : chacun voit ses propres rôles ; **attribution/retrait admin
uniquement**.

### 1.21 `contracts` — Contrats d'assurance

Rôle métier : contrat né de l'approbation d'un devis ; lie un client à une offre
et une compagnie.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `reference` | `text` | `not null unique` (NOLI-CON-XXXXXX) |
| `quote_id` | `bigint` | FK → `quotes(id)` `on delete set null`, `unique` |
| `profile_id` | `uuid` | FK → `profiles(id)` cascade, `not null` |
| `insurer_id` | `bigint` | FK → `insurers(id)` cascade, `not null` |
| `offer_id` | `bigint` | FK → `insurance_offers(id)` `on delete set null` |
| `status` | `text` | check `ACTIVE \| EXPIRED \| CANCELLED` |
| `start_date` | `date` | `default current_date` |
| `end_date` | `date` | |
| `premium` | `double precision` | |
| `created_at`, `updated_at` | `timestamptz` | |

Index sur `profile_id`, `insurer_id`, `offer_id`, `status`.
**RLS** : le client lit ses contrats ; l'assureur lit/crée/met à jour ceux liés
à ses offres (jointure `insurer_accounts`) ; admin complet ; suppression admin.

### 1.22 `reviews` — Avis clients sur les assureurs

Rôle métier : note (1–5) et commentaire d'un client sur une compagnie ; un seul
avis par (client, assureur), modifiable.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `profile_id` | `uuid` | FK → `profiles(id)` cascade, `not null` |
| `insurer_id` | `bigint` | FK → `insurers(id)` cascade, `not null` |
| `rating` | `int` | `not null`, check `between 1 and 5` |
| `comment` | `text` | |
| `created_at`, `updated_at` | `timestamptz` | |
| — | contrainte | `unique (profile_id, insurer_id)` |

Index sur `insurer_id` et `profile_id`.
**RLS** : le client gère (CRUD) **ses** avis ; lecture par tout utilisateur
authentifié (agrégats publics) ; modération admin.

### 1.23 `claims` — Sinistres

Rôle métier : sinistre déclaré par un client sur l'un de ses contrats, suivi par
l'assureur.

| Colonne | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `reference` | `text` | `not null unique` (NOLI-SIN-XXXXXX) |
| `contract_id` | `bigint` | FK → `contracts(id)` cascade, `not null` |
| `profile_id` | `uuid` | FK → `profiles(id)` cascade, `not null` |
| `insurer_id` | `bigint` | FK → `insurers(id)` cascade, `not null` |
| `type` | `text` | ACCIDENT \| VOL \| BRIS_GLACE \| INCENDIE \| AUTRE |
| `description` | `text` | `not null` |
| `incident_date` | `date` | |
| `status` | `text` | check `SUBMITTED \| IN_REVIEW \| APPROVED \| REJECTED \| CLOSED` |
| `created_at`, `updated_at` | `timestamptz` | |

Index sur `profile_id`, `insurer_id`, `contract_id`, `status`.
**RLS** : le client voit/crée ses sinistres, avec **défense en profondeur** (le
contrat référencé doit lui appartenir **et** `insurer_id` doit correspondre au
contrat) ; l'assureur voit et met à jour le statut des sinistres de ses
contrats ; admin complet.

---

## 2. Schéma des relations principales

### 2.1 Parcours client : profil → devis → contrat → sinistre

```
                       profiles (USER)
                            │ user_id / profile_id
        ┌───────────────────┼───────────────────────┐
        ▼                   ▼                        ▼
     quotes ──────────►  contracts ──────────►    claims
      │  1─N               │ 1 (quote_id unique)     │
      ▼                    ▼                         ▼
  quote_coverages     (offer, insurer)          (contract, insurer)
      │
      ├─► coverages
      └─► coverage_tariff_rules
```

- Un **devis** (`quotes.user_id`) porte des **lignes** (`quote_coverages`)
  référençant `coverages` et une éventuelle `coverage_tariff_rules`.
- Un devis approuvé donne un **contrat** (`contracts.quote_id`, liaison **1:1**).
- Un **sinistre** (`claims.contract_id`) se rattache à un contrat, au client et
  à la compagnie.

### 2.2 Catalogue assureur : insurers → offres / garanties

```
   insurers ──1─N──► insurance_offers ──► insurance_categories
      │  │                                 
      │  └──1─N──► coverages ──► coverage_categories
      │                │
      │                └──1─N──► coverage_tariff_rules
      │
      └──N─N (via insurer_accounts)──► profiles (INSURER)

   insurance_packages ──N─N (package_coverages)──► coverages
```

- Une **compagnie** possède des **offres** et des **garanties**.
- Les **packs** (`insurance_packages`) regroupent des garanties via
  `package_coverages`.
- Un utilisateur `INSURER` est rattaché à sa compagnie par `insurer_accounts`
  (base de toutes les politiques RLS assureur).

### 2.3 Avis et RBAC

```
   profiles ──1─N──► reviews ──N─1──► insurers

   profiles ──N─N (profile_roles)──► roles ──N─N (role_permissions)──► permissions
```

- Les **avis** relient un client et une compagnie (unicité par couple).
- Le **RBAC granulaire** : `profiles` ↔ `roles` (via `profile_roles`) et
  `roles` ↔ `permissions` (via `role_permissions`).

---

## 3. Liste chronologique des 27 migrations

| # | Fichier | Objet |
|---|---|---|
| 1 | `20260806120000_helpers.sql` | Fonctions `set_updated_at()`, `handle_new_user()` |
| 2 | `20260806120100_profiles.sql` | Table `profiles`, `is_admin()`, triggers, RLS |
| 3 | `20260806120200_insurers.sql` | Table `insurers` + RLS |
| 4 | `20260806120300_insurer_accounts.sql` | Table `insurer_accounts` + RLS |
| 5 | `20260806120400_insurance_categories.sql` | Table `insurance_categories` + RLS |
| 6 | `20260806120500_coverage_categories.sql` | Table `coverage_categories` + RLS |
| 7 | `20260806120600_coverages.sql` | Table `coverages` + RLS |
| 8 | `20260806120700_coverage_tariff_rules.sql` | Table `coverage_tariff_rules` + RLS |
| 9 | `20260806120800_insurance_offers.sql` | Table `insurance_offers` + RLS |
| 10 | `20260806120900_insurance_packages.sql` | Table `insurance_packages` + RLS |
| 11 | `20260806121000_package_coverages.sql` | Table `package_coverages` + RLS |
| 12 | `20260806121100_quotes.sql` | Table `quotes` + RLS |
| 13 | `20260806121200_quote_coverages.sql` | Table `quote_coverages` + RLS |
| 14 | `20260806121300_system_settings.sql` | Table `system_settings` + RLS |
| 15 | `20260806121400_audit_logs.sql` | Table `audit_logs` + RLS |
| 16 | `20260806121500_backups.sql` | Table `backups` + RLS |
| 17 | `20260806121600_notifications.sql` | Table `notifications` + RLS |
| 18 | `20260806121700_roles.sql` | Table `roles` + RLS |
| 19 | `20260806121800_permissions.sql` | Table `permissions` + RLS |
| 20 | `20260806121900_role_permissions.sql` | Table `role_permissions` + RLS |
| 21 | `20260806122000_profile_roles.sql` | Table `profile_roles` + RLS |
| 22 | `20260806200000_extend_notification_types.sql` | Ajout du type `CALLBACK` à `notifications` |
| 23 | `20260806210000_contracts.sql` | Table `contracts` + RLS |
| 24 | `20260808120000_security_fixes.sql` | Correctifs sécurité : rôle forcé USER, protection champs profil, cycle de vie des devis, montants ≥ 0, révocations |
| 25 | `20260810120000_registration_resilience.sql` | `handle_new_user()` tolérant aux erreurs (ne bloque plus l'inscription) |
| 26 | `20260810130000_reviews.sql` | Table `reviews` + RLS |
| 27 | `20260810140000_claims.sql` | Table `claims` + RLS |

> Les migrations 1, 22, 24 et 25 ne créent pas de table : elles ajoutent des
> fonctions/triggers (1), étendent une contrainte (22) ou renforcent la
> sécurité et la résilience (24, 25). Les **23 tables** sont créées par les
> migrations 2 à 21, 23, 26 et 27.
