# NOLI — Dossier d'architecture technique

Comparateur d'assurances en Côte d'Ivoire.

> Ce document décrit l'architecture réelle de l'application telle qu'implémentée
> dans le dépôt. Il est destiné aux équipes techniques du client (exploitation,
> maintenance, reprise). Il reflète le code à date et non une cible théorique.

---

## 1. Vue d'ensemble et choix de la stack

NOLI est une application web **monolithique full-stack Next.js** : le même
processus sert l'interface (React) et les routes API (backend). La persistance
et l'authentification sont déléguées à **Supabase** (Postgres managé + Auth).

| Domaine | Technologie | Version (`package.json`) | Rôle |
|---|---|---|---|
| Framework | Next.js (App Router) | `^16.1.1` | Rendu React + routes API, build `standalone` |
| UI | React / React DOM | `^19.0.0` | Interface |
| Langage | TypeScript | `^5` | Typage strict (build bloquant si erreur) |
| Base de données | Supabase / Postgres | `@supabase/supabase-js ^2.49.4` | Données + RLS |
| Auth | Supabase Auth (SSR) | `@supabase/ssr ^0.6.1` | Sessions par cookies httpOnly |
| État client | Zustand | `^5.0.6` | Store global + persistance sélective |
| Validation | Zod | `^4.0.2` | Schémas d'entrée (API et formulaires) |
| Styles | Tailwind CSS | `^4` | Design system utilitaire |
| Composants | shadcn/ui + Radix UI | — | 48 primitives dans `src/components/ui` |
| Emails | Resend / Nodemailer | `^6.18.0` / `^7.0.13` | Emails transactionnels |
| PDF | jsPDF | `^4.2.1` | Génération de devis/documents |
| Tests | Vitest + Testing Library | `^4.1.9` | Tests unitaires |
| Package manager | bun | `bun.lock` | Installation et exécution |

**Choix structurants :**

- **Un seul déployable** (`output: "standalone"`) : simplicité d'exploitation
  sur un VPS, aucune dépendance runtime externe hors Supabase et Resend.
- **Supabase plutôt qu'un ORM local** : la base est Postgres managé (Supabase
  Cloud). L'ancienne stack **Prisma / SQLite / NextAuth n'est plus utilisée**.
- **Sécurité en profondeur** : la **RLS Postgres** protège la donnée au niveau
  base, et les routes serveur ajoutent contrôle de rôle, validation Zod et
  rate-limiting. La clé `service_role` reste strictement côté serveur.

---

## 2. Schéma logique

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            NAVIGATEUR (client)                            │
│                                                                            │
│   React 19 + Zustand (store) + shadcn/ui                                   │
│   Rendu « SPA-like » : une route catch-all [...slug] pilote les vues       │
│   Cookies de session httpOnly (posés/lus par Supabase SSR)                 │
└───────────────┬────────────────────────────────────┬───────────────────────┘
                │ fetch() JSON                        │ (auth : cookies httpOnly)
                ▼                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS (processus unique, PM2 :8080)                    │
│                                                                            │
│   src/app/api/**/route.ts  (71 routes)                                     │
│     ├─ requireAuth / getSessionProfile   (contrôle de rôle)                │
│     ├─ Zod (validation d'entrée)                                           │
│     ├─ rate-limit (en mémoire, par IP + action)                           │
│     ├─ services métier : compare-service, pricing-service, ...            │
│     └─ accès données :                                                     │
│         • db  → client service_role (contourne la RLS)  [écritures/admin]  │
│         • getSupabaseServerClient → client anon lié au cookie [session]    │
└───────────────┬─────────────────────────────────────┬──────────────────────┘
                │ service_role (bypass RLS)            │ clé anon (RLS appliquée)
                ▼                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       SUPABASE (Postgres + Auth)                           │
│                                                                            │
│   • Auth : auth.users, JWT, emails de récupération                         │
│   • 23 tables applicatives (schéma public) + RLS par rôle                  │
│   • Triggers : handle_new_user (rôle forcé USER), protections d'intégrité  │
│   • Edge Function : send-notification                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

Deux clients Supabase coexistent côté serveur, avec des rôles distincts :

- **`db`** (`src/lib/db.ts`) — client **`service_role`**. Il **contourne la
  RLS** et sert les routes de confiance (opérations admin, écritures
  serveur). Il ne doit **jamais** être importé côté client. Sa création est
  paresseuse (Proxy) pour ne pas faire échouer le build si `.env` est
  incomplet. Il expose aussi `mapRow` / `mapRows` (conversion snake_case →
  camelCase des lignes Postgres).
- **`getSupabaseServerClient`** (`src/lib/auth-guard.ts`) — client **anon**
  lié à la **session** (cookies). Il est **soumis à la RLS** et sert à lire
  l'utilisateur courant (`auth.getUser()`) et à opérer les flux Auth.

---

## 3. Arborescence des dossiers

```
noli/
├── src/
│   ├── app/                      # App Router Next.js
│   │   ├── layout.tsx            # Layout racine (polices, ThemeProvider, ErrorBoundary, Toaster)
│   │   ├── page.tsx              # Ré-exporte [...slug]/page.tsx (racine « / »)
│   │   ├── globals.css           # Styles globaux (Tailwind)
│   │   ├── [...slug]/
│   │   │   └── page.tsx          # Route catch-all : rendu SPA-like, mapping URL ↔ vue, 404
│   │   └── api/                  # 71 routes API (route.ts), par espace :
│   │       ├── auth/             #   register, login, logout, me, forgot, reset-password
│   │       ├── admin/            #   back-office : insurers, offers, coverages, tariff-rules,
│   │       │                     #   profiles, roles, permissions, settings, audit-logs,
│   │       │                     #   backups, stats, quotes, callbacks...
│   │       ├── insurer/          #   espace assureur : account, offers, quotes, claims,
│   │       │                     #   contracts, clients, coverages, stats, logo, me...
│   │       ├── user/             #   espace client : profile, quotes, contracts, stats
│   │       ├── compare/          #   comparaison tarifaire publique (POST)
│   │       ├── quotes/           #   devis
│   │       ├── offers/           #   offres publiques
│   │       ├── claims/           #   sinistres
│   │       ├── reviews/          #   avis clients
│   │       ├── notifications/    #   notifications utilisateur
│   │       ├── contact/          #   messages, demandes de rappel
│   │       ├── profile/, stats/, coverage-categories/, health/, seed/
│   │   
│   ├── components/               # Composants React, organisés par espace :
│   │   ├── ui/                   #   48 primitives shadcn/ui (Radix)
│   │   ├── layout/               #   Header, Footer
│   │   ├── landing/, about/, contact/, legal/, offers/, comparison/, results/
│   │   ├── auth/                 #   pages d'authentification
│   │   ├── admin/                #   back-office (13 fichiers, dont settings/)
│   │   ├── insurer/              #   espace assureur (+ tabs/)
│   │   ├── user/                 #   espace client (+ tabs/)
│   │   └── shared/               #   composants transverses
│   │
│   ├── lib/                      # Logique métier et utilitaires serveur (20 modules)
│   │   ├── db.ts                 #   client service_role + mapRow/mapRows
│   │   ├── auth-guard.ts         #   getSessionProfile, requireAuth, requireRole/Admin
│   │   ├── auth-actions.ts       #   actions register/login/logout/forgot/reset/me
│   │   ├── rate-limit.ts         #   rate-limiting en mémoire (par IP + action)
│   │   ├── security.ts           #   escapeHtml, sanitizePostgrest, parseNumberField
│   │   ├── validation.ts         #   schémas Zod
│   │   ├── password-policy.ts    #   politique de mot de passe (configurable)
│   │   ├── compare-service.ts    #   moteur de comparaison
│   │   ├── pricing-service.ts    #   moteur de calcul de prime
│   │   ├── audit.ts, email.ts, generate-pdf.ts, notifications.ts,
│   │   ├── pagination.ts, quotes-reconcile.ts, insurer-offers-mapper.ts,
│   │   └── fetch-with-timeout.ts, constants.ts, utils.ts, backups.ts
│   │
│   ├── store/
│   │   └── app-store.ts          # Store Zustand (vue courante, user, formulaire, onglets)
│   ├── hooks/                    # use-mobile, use-toast
│   └── types/index.ts            # Types partagés (AppView, InsurerOffer, QuoteRecord...)
│
├── supabase/
│   ├── migrations/               # 27 migrations SQL (schéma + RLS + triggers)
│   ├── functions/
│   │   └── send-notification/    # Edge Function (notifications)
│   ├── seed.sql                  # Données d'amorçage
│   └── config.toml
│
├── next.config.ts                # output standalone + en-têtes de sécurité (CSP...)
├── ecosystem.config.js           # Configuration PM2 (mono-instance, :8080)
├── Caddyfile                     # Reverse-proxy Caddy (:81 → localhost:8080)
├── vitest.config.ts              # Configuration des tests
└── deploiement.md                # Procédure de déploiement
```

Les modules `*.test.ts` cohabitent avec le code dans `src/lib` (exécutés par
Vitest).

---

## 4. Flux d'authentification

L'authentification repose **entièrement sur Supabase Auth**. Il n'existe pas de
table `sessions` applicative : la session **est** le JWT Supabase, transporté
par des **cookies httpOnly** posés et lus par le client SSR
(`@supabase/ssr`, via `getSupabaseServerClient`).

### 4.1 Inscription (`registerAction`, `POST /api/auth/register`)

1. Rate-limiting par IP (5 inscriptions / 10 min).
2. Validation Zod (`registerSchema`) puis politique de mot de passe
   (`validatePasswordPolicy`).
3. `supabase.auth.signUp` avec `firstName/lastName/phone/role` en
   `user_metadata`. Le profil applicatif est créé automatiquement par le
   **trigger `on_auth_user_created` → `handle_new_user()`**.
4. **Le rôle réel en base est TOUJOURS forcé à `USER`** par le trigger
   (correctif de sécurité C-01) : la valeur `role` envoyée par le client n'est
   jamais prise en compte. Un compte `INSURER` ou `ADMIN` ne peut être obtenu
   que par un administrateur via la `service_role`. La réponse renvoie donc
   `role: "USER"`, quel que soit le rôle demandé.
5. Étapes best-effort bornées dans le temps (`bestEffort`, timeout) :
   confirmation email automatique, **filet de création de profil** (upsert
   `service_role` si le trigger a échoué), établissement de la session
   immédiate (`signInWithPassword`), rattachement des devis anonymes
   (`reconcileAnonymousQuotes`). Aucune de ces étapes ne doit bloquer la
   réponse (protection contre les délais qui provoqueraient un 502 au proxy).

### 4.2 Connexion (`loginAction`, `POST /api/auth/login`)

1. Validation Zod, normalisation de l'email.
2. Rate-limiting **par IP + email** (5 tentatives / min, verrouillage 30 min).
3. `signInWithPassword`. En cas d'échec : message **générique** « Email ou mot
   de passe incorrect » (pas d'énumération de comptes).
4. Vérification du profil : refus si aucun profil (`403`) ou si
   `is_active = false` (`403`, déconnexion).

### 4.3 Session courante et gardes

- **`getSessionProfile()`** : lit `auth.getUser()` puis le profil en base. Un
  compte **désactivé par un admin** (`is_active = false`) est traité comme
  **non authentifié** même si son JWT est encore valide.
- **`requireAuth(roles?)`** : renvoie `401` si non connecté, `403` si le rôle
  n'est pas autorisé. Utilisée en tête de chaque route protégée
  (ex. `const guard = await requireAuth(["ADMIN"]); if (guard) return guard;`).
- **`requireAdmin` / `requireRole`** : variantes sur un profil déjà chargé.
- **`getInsurerAccount(profileId)`** : l'identité assureur provient **toujours
  de la session**, jamais d'un paramètre client (liaison via
  `insurer_accounts`).

### 4.4 Mot de passe oublié / réinitialisation

- `forgotAction` : rate-limité (3 / 10 min par IP+email), envoie un lien via
  `resetPasswordForEmail`, réponse **identique** que le compte existe ou non.
- `resetPasswordAction` : échange le token de récupération (`setSession`),
  applique la politique de mot de passe, `updateUser`, puis **ferme la
  session** pour forcer une reconnexion explicite.

---

## 5. Modèle de rendu

Le rendu est **« SPA-like »** sur une **route catch-all unique**
(`src/app/[...slug]/page.tsx`, `"use client"`), à laquelle `src/app/page.tsx`
délègue également la racine.

- **Mapping URL ↔ vue** : un dictionnaire `VIEW_TO_PATH` associe chaque vue
  applicative (`AppView`) à une URL lisible en français (`/comparer`,
  `/resultats`, `/espace-client`, `/espace-assureur`, `/admin`, `/connexion`,
  `/inscription`, `/mot-de-passe-oublie`, `/a-propos`, `/faq`,
  `/mentions-legales`...). Deux effets synchronisent **vue → URL** (navigation
  applicative) et **URL → vue** (accès direct, favori, boutons précédent/
  suivant du navigateur). Au premier rendu, **l'URL prime** sur la vue
  persistée pour éviter les redirections fantômes.
- **404 intégré** : tout chemin hors de `VALID_PATHS` rend un composant
  `NotFoundPage` sans quitter l'application.
- **Code splitting (UI-C06)** : les vues lourdes (offres, résultats, tableaux
  de bord admin/client/assureur) sont chargées **à la demande** via
  `next/dynamic`, ce qui réduit le bundle initial.
- **Gardes de vue côté client** : un effet redirige vers l'accueil si une vue
  protégée (`admin`, `user-dashboard`, `insurer-dashboard`) est ouverte sans
  session ou avec un rôle non concordant. Ces gardes sont **ergonomiques** ; la
  sécurité réelle est assurée côté serveur (routes API + RLS).
- **Store Zustand** (`app-store.ts`) : conserve la vue courante, l'utilisateur,
  l'état du formulaire de comparaison et les onglets. La **persistance est
  volontairement restreinte** (`partialize`) : seuls `user` et les onglets sont
  écrits en `localStorage`. La `currentView` **n'est plus persistée** (l'URL est
  la seule source de vérité, `migrate` v1 purge l'ancienne clé) et les
  **données personnelles** (`personalInfo`, `vehicleInfo`) **ne sont jamais**
  stockées en clair sur le poste (UI-H04).

---

## 6. Sécurité transverse

### 6.1 Séparation des clés Supabase

- **`SUPABASE_SERVICE_ROLE_KEY`** : utilisée uniquement par `src/lib/db.ts`,
  **côté serveur**. Elle contourne la RLS ; elle ne doit jamais être exposée au
  navigateur. Les routes qui l'emploient valident systématiquement le rôle en
  amont (`requireAuth`).
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** : clé publique, **soumise à la RLS**,
  utilisée pour les opérations liées à la session.

### 6.2 RLS (Row-Level Security)

**Chaque table applicative active la RLS** avec des politiques par rôle
(voir `docs/MODELE_DONNEES.md`). Principes :

- Catalogue public (assureurs, offres, garanties, catégories, règles
  tarifaires, packs) : **lecture `anon`/`authenticated`**, écriture réservée
  aux admins via `public.is_admin()`.
- Données personnelles (profils, devis, contrats, sinistres, notifications,
  avis) : accès limité au **propriétaire**, à l'**assureur concerné** (via
  `insurer_accounts`) et à l'**admin**.
- **Triggers de défense en profondeur** (`security_fixes`) : rôle forcé à
  `USER` à l'inscription, verrouillage des champs sensibles du profil (`role`,
  `is_active`, `email`) pour un utilisateur non-admin, protection du cycle de
  vie et des prix des devis (un client ne peut pas s'auto-approuver ni fixer
  `final_price`), contraintes de non-négativité des montants. Ces triggers
  distinguent le contexte `service_role` (`auth.uid() IS NULL`, libre) du
  contexte utilisateur (clé anon, restreint).

### 6.3 Rate-limiting

`src/lib/rate-limit.ts` : fenêtre glissante **en mémoire**, indexée par
`IP + action`, avec verrouillage après dépassement. Politiques dédiées :
login (5/min, IP+email), inscription (5/10 min), mot de passe oublié (3/10 min),
reset (5/10 min), comparaison publique (20/min), création de devis (10/10 min),
demande de rappel (5/10 min), lecture publique (60/min). L'IP est extraite de
`x-forwarded-for` / `x-real-ip`.

> **Contrainte d'exploitation** : ce stockage étant en mémoire, il **impose le
> déploiement mono-instance** (voir §7). Un passage en cluster/HA exige d'abord
> un store partagé (Redis/Upstash).

### 6.4 En-têtes HTTP et durcissement (`next.config.ts`)

Appliqués à toutes les routes : `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`,
`Strict-Transport-Security` (HSTS 2 ans + preload) et une **Content-Security-
Policy** restrictive (`default-src 'self'`, `connect-src` limité à Supabase,
`frame-ancestors 'none'`, `object-src 'none'`). `'unsafe-eval'` n'est ajouté
qu'en développement.

### 6.5 Autres protections applicatives

- **Validation Zod** systématique des entrées API et formulaires.
- **`security.ts`** : `escapeHtml` (interpolation dans les emails),
  `sanitizePostgrestSearch` (anti-injection de filtre PostgREST sur `.or()` /
  `.ilike()`), `parseNumberField` (rejet des `NaN`/`Infinity`/négatifs).
- **Journal d'audit** (`audit.ts` → table `audit_logs`) sur les actions
  sensibles (inscription, reset, changements).
- **TypeScript strict** au build (`ignoreBuildErrors: false`).

---

## 7. Build et exécution

### 7.1 Build

- `next.config.ts` : **`output: "standalone"`** → produit
  `.next/standalone/server.js`, un serveur Node autonome.
- Script `build` (`package.json`) : `next build` puis recopie de
  `.next/static` et `public/` dans le bundle standalone.
- Contrôles pré-déploiement recommandés : `npx tsc --noEmit && bun run test`.
- Package manager de référence : **bun** (`bun.lock`).

### 7.2 Exécution (PM2)

`ecosystem.config.js` :

- Application **`noli`**, point d'entrée `.next/standalone/server.js`.
- **Mono-instance** (`instances: 1`, `exec_mode: "fork"`) — imposé par le
  rate-limiting en mémoire.
- **Port `8080`** (`PORT: process.env.PORT || 8080`).
- Le serveur standalone **ne charge pas `.env`** automatiquement :
  `ecosystem.config.js` injecte les variables (`loadEnvFile(".env")`) dans
  l'environnement PM2 au démarrage.
- Robustesse : `autorestart`, `max_memory_restart: 500M`, backoff de
  redémarrage, logs horodatés dans `logs/`.

### 7.3 Reverse-proxy

Le dépôt fournit un **`Caddyfile`** comme reverse-proxy de production :
Caddy écoute sur **`:81`** et proxifie vers **`localhost:8080`**, en
transmettant `Host`, `X-Forwarded-For` ({remote_host}), `X-Forwarded-Proto` et
`X-Real-IP`. Caddy réécrit `X-Forwarded-For`, ce qui rend l'IP client fiable
**tant qu'il est le seul point d'entrée public** ; le port 8080 ne doit pas
être exposé directement (sinon le rate-limiting par IP devient falsifiable).

> **Note.** Certaines annotations du code (ex. `auth-actions.ts`) mentionnent
> un délai proxy « nginx 60 s ». Le reverse-proxy effectivement livré dans le
> dépôt est **Caddy** (`Caddyfile`) ; le principe reste identique si un
> **nginx** est utilisé à la place en production (unique point d'entrée →
> `localhost:8080`, en-tête `X-Forwarded-For` maîtrisé, timeout amont > durée
> des étapes best-effort d'inscription).

### 7.4 Base de données et Edge Function

- Schéma et RLS versionnés dans `supabase/migrations/` (27 migrations),
  appliqués via `npx supabase db push`.
- **Edge Function** `send-notification` (`supabase/functions/`) pour les
  notifications, déployée séparément.
- Emails transactionnels via **Resend** (`RESEND_API_KEY`).

---

## 8. Rôles applicatifs

Trois rôles portés par `profiles.role` (contrainte
`check (role in ('USER','INSURER','ADMIN'))`) :

| Rôle | Description | Périmètre |
|---|---|---|
| **USER** (client) | Rôle par défaut, forcé à l'inscription | Comparaison, devis, contrats, sinistres, avis, notifications le concernant |
| **INSURER** (assureur) | Lié à une compagnie via `insurer_accounts` (activé par un admin) | Ses offres/garanties, devis et contrats sur ses offres, sinistres de ses contrats, statistiques |
| **ADMIN** | Back-office complet | Toutes les tables (catalogue, utilisateurs, rôles/permissions, paramètres, audit, sauvegardes) |

Un système de **rôles/permissions granulaires** (`roles`, `permissions`,
`role_permissions`, `profile_roles`) complète ces trois rôles de base.
