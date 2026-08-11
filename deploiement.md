# Déploiement NOLI

Guide de déploiement production. Stack : **Next.js 16 (build `standalone`) · Supabase (Postgres + Auth) · Caddy + PM2**.

> L'ancienne stack **Prisma / SQLite / NextAuth n'est plus utilisée**. La base est **Postgres (Supabase Cloud)**, l'authentification via **Supabase Auth**. Package manager de référence : **bun** (`bun.lock`).

---

## 1. Prérequis

- **Node.js >= 18** + **bun**
- **Supabase CLI** (`npx supabase`) — projet lié : `lqjdmugtrhwtkofkcmlw`
- **PM2** : `npm install -g pm2`
- **Caddy** (reverse-proxy, **seul** point d'entrée public)

---

## 2. Variables d'environnement (`.env`)

Copier `.env.example` et renseigner (Dashboard Supabase → Project Settings → API) :

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon (client, soumise à la RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service_role (**serveur uniquement**, contourne la RLS — ne JAMAIS exposer côté client) |
| `NEXT_PUBLIC_SITE_URL` | URL publique de l'app (emails de réinitialisation) |
| `RESEND_API_KEY` | Emails transactionnels (Resend) |

> Le serveur **standalone Next.js ne charge pas `.env` automatiquement**. `ecosystem.config.js` l'injecte via `loadEnvFile(".env")` au démarrage PM2.

---

## 3. Base de données (Postgres / Supabase)

**Pas de Prisma, pas de SQLite.** Schéma + RLS dans `supabase/migrations/`.

```bash
npx supabase link --project-ref lqjdmugtrhwtkofkcmlw
npx supabase migration list   # migrations appliquées vs en attente
npx supabase db push          # appliquer les nouvelles migrations
```

> ⚠️ **Nouvelles migrations à appliquer** (fonctionnalités Avis & Sinistres) :
> `20260810130000_reviews.sql` (table `reviews` + RLS) et
> `20260810140000_claims.sql` (table `claims` + RLS). Après un `git pull`,
> lancer `npx supabase db push` pour les appliquer, sinon les onglets
> **Mes Avis** (client) et **Sinistres** (client/assureur) renverront des
> erreurs (tables absentes). Total attendu : **27 migrations**.

Edge Function (notifications) :

```bash
npx supabase functions deploy send-notification
npx supabase secrets set NOLI_FUNCTION_SECRET=...   # secret partagé (anti-invocation publique)
```

---

## 4. Build

Avant un déploiement : `npx tsc --noEmit && bun run test`.

```bash
bun install
bun run build                 # output: "standalone" → .next/standalone/server.js
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
```

---

## 5. Démarrage (PM2)

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

L'app écoute sur **:8080** (`PORT: process.env.PORT || 8080`).

> **Mono-instance obligatoire** (`instances: 1`, `exec_mode: "fork"`). Raison : le **rate limiting est en mémoire** (`src/lib/rate-limit.ts`). Avant tout scale-out, migrer vers Redis/Upstash (`UPSTASH_REDIS_REST_URL`), sinon la limite effective = limite × nb d'instances.

Sans PM2 :

```bash
bun run start   # NODE_ENV=production, lance .next/standalone/server.js
```

---

## 6. Reverse-proxy (Caddy)

Le `Caddyfile` expose **:81** et proxie vers `localhost:8080`. Caddy **écrase** `X-Forwarded-For` (`{remote_host}`) → l'IP client est fiable **tant que Caddy est le seul point d'entrée**.

```bash
caddy start --config Caddyfile   # ou : caddy reload --config Caddyfile
```

> ⚠️ Le port **8080 ne doit pas être exposé publiquement** : un accès direct à l'app contournerait Caddy et rendrait l'IP (donc le rate-limit) falsifiable. Pare-feu : seul `:81` est public.

---

## 7. Mise à jour

```bash
git pull
bun install
bun run build
cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
npx supabase db push          # si de nouvelles migrations
pm2 reload ecosystem.config.js
caddy reload --config Caddyfile
```

---

## 8. Commandes utiles

```bash
pm2 status                              # état
pm2 logs noli                           # logs
pm2 reload ecosystem.config.js          # redémarrage sans coupure
npx supabase migration list             # état des migrations
npx supabase db query --linked          # requête SQL read-only sur la base liée
```

---

## 9. Vérifications post-déploiement

```bash
curl -I http://localhost:8080   # app répond (200/3xx)
curl -I http://localhost:81     # via Caddy (pas de 502)
ss -lntp | grep -E ':8080|:81'  # noli sur :8080, caddy sur :81
```
