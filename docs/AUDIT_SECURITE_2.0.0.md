# Audit de sécurité — Noli `2.0.0` (Next.js)

**Date :** 2026-08-08
**Périmètre :** branche `2.0.0` (application Next.js réellement en production).
**Méthode :** vérification outillée (TypeScript, tests, build, lint) + revue manuelle
du modèle d'authentification et des ~60 routes API, avec focus sur l'autorisation
(rôles) et les accès inter-comptes (IDOR).

> **Note de contexte.** Un premier lot de correctifs avait été produit sur la
> branche `main` (une application **Vite**, codebase distinct). Ce travail ne
> s'applique **pas** à `2.0.0` et n'est pas inclus ici. Le présent audit porte
> uniquement sur le produit réel (`2.0.0`).

---

## 1. Bilan de santé outillé

| Contrôle | Commande | Résultat |
|---|---|---|
| TypeScript strict | `tsc --noEmit` (`ignoreBuildErrors: false`) | ✅ **0 erreur** |
| Tests | `vitest run` | ✅ **98/98** |
| Build production | `next build` | ✅ **réussi** |
| Lint | `eslint .` | ✅ **0 erreur** (après correctif, voir §4) |

---

## 2. Modèle d'authentification — **solide**

- **Session = JWT Supabase** validé côté serveur via `supabase.auth.getUser()`
  (`src/lib/auth-guard.ts`) — la méthode sûre (le JWT est vérifié, pas simplement
  lu depuis le cookie).
- Helpers centralisés : `requireAuth(roles)`, `requireAdmin`, `requireRole`.
- **CSRF** : middleware global (`src/middleware.ts`) qui vérifie l'en-tête `Origin`
  sur les méthodes mutantes (`POST/PUT/PATCH/DELETE`) des routes `/api/*`, en
  complément des cookies `SameSite=Lax`.
- **Identité assureur tirée de la session**, jamais du client (`getInsurerAccount`).

## 3. Autorisation par route — **conforme**

- **Routes `admin/*`** (27 fichiers) : toutes protégées par
  `requireAuth(["ADMIN"])` **avec** court-circuit `if (guard) return guard;`.
  → pas d'élévation de privilège possible depuis un compte `USER`/`INSURER`.
- **Routes `insurer/*/[id]`** (offres, devis) : vérifient systématiquement
  l'appartenance (`offer.insurerId === insurerId`, `quote.offer.insurerId ===
  account.insurerId`) avant lecture/écriture → **pas d'IDOR** entre assureurs.
- **Routes `user/*` et `notifications/[id]`** : contrôlent la propriété
  (`resource.userId === session.id`) → un utilisateur ne peut lire/modifier que
  ses propres devis/notifications.
- **`insurer/me`** : réservé au rôle `INSURER`, périmètre limité au compte lié.
- **`seed`** : réservé `ADMIN`, **idempotent** (upserts, garde sur données
  existantes) — non destructif.
- **Routes publiques** (`offers`, `coverage-categories`, `stats`, `auth/*`,
  `contact/*`) : exposition volontaire ; `stats` ne renvoie que des **compteurs
  agrégés** (nb assureurs/offres/utilisateurs), pas de données nominatives.

**Conclusion :** l'application est **déjà bien durcie**. Aucune faille d'accès
majeure identifiée. Le commit « durcissement sécurité » antérieur (marqueurs
`H-04`, `M-01`, …) avait déjà traité l'essentiel.

---

## 4. Correctifs appliqués

- **Lint (`ecosystem.config.js`)** : ce fichier de configuration **PM2** doit être
  en CommonJS (`require`/`module.exports`) — PM2 le charge ainsi. Les 2 erreurs
  `no-require-imports` étaient donc des faux positifs sur un fichier de
  déploiement. Il a été ajouté aux `ignores` d'ESLint (comme les autres fichiers
  de config déjà exclus). `npm run lint` passe désormais au vert.
- **`insurer/me` (GET) — code mort retiré** : la variable `isAdmin` et le paramètre
  `?userId` étaient inatteignables (la route bloque déjà tout rôle ≠ `INSURER`
  juste au-dessus). La route interroge désormais directement `sessionProfile.id`.
  **Comportement identique** — un assureur ne pouvait de toute façon consulter que
  son propre compte — mais code plus clair et anti-IDOR explicite.

---

## 5. Observations examinées

1. **`admin/callbacks` (GET) — VÉRIFIÉ CORRECT (fausse alerte initiale).** Le filtre
   `user_id = admin courant` est en réalité **le bon comportement** : à chaque
   demande de rappel, une notification `CALLBACK` distincte est insérée **pour
   chaque admin** (`contact/request-callback`). Chaque admin voit donc l'intégralité
   des rappels via ses propres copies. Retirer le filtre introduirait des doublons
   et exposerait les copies d'autres comptes. **Aucune modification.**
2. **`seed` en production — laissé tel quel (décision motivée).** L'endpoint est
   déjà `ADMIN`-only et **idempotent** (upserts, garde sur données existantes,
   non destructif). Ajouter un blocage `NODE_ENV !== "production"` casserait un
   *bootstrap* légitime des données en prod par un admin (usage plausible sur ce
   déploiement PM2 mono-instance). Le risque résiduel est faible et couvert par le
   garde de rôle ; on **ne bloque donc pas** la prod pour ne pas retirer une
   fonctionnalité d'administration voulue.

Aucune vulnérabilité exploitable identifiée.

---

## 6. Verdict

`2.0.0` est un codebase **sain et bien sécurisé** : types stricts, tests verts,
build OK, modèle d'auth centralisé et correctement appliqué, protections IDOR et
CSRF en place. Les seuls éléments restants sont des **nettoyages mineurs** relevant
de décisions produit, pas des correctifs de sécurité urgents.

---

## 7. Note de mise à jour — contre-audit des nouvelles fonctionnalités

Un **contre-audit récent** a couvert les 5 fonctionnalités ajoutées depuis
(Contrats et Clients assureur, Mes Avis, Paiements et Sinistres client/assureur)
et leurs routes API. Périmètre étendu à **71 routes**, **23 tables**, **27
migrations**, **138 tests**. Verdict : **sécurité des nouvelles routes OK**, dans
la continuité du modèle existant.

- **Isolation par assureur** confirmée : `insurer/contracts`, `insurer/clients`,
  `insurer/claims` et `insurer/claims/[id]/status` tirent l'identité de la session
  (`getInsurerAccount`) et filtrent/vérifient sur `insurer_id` — un assureur ne
  voit et ne modifie que **ses** contrats, clients et sinistres (mise à jour de
  statut avec contrôle d'appartenance → **403** sinon).
- **Propriété côté client** confirmée : `claims` (POST/GET) et `reviews` (GET/POST)
  contrôlent `profile_id = session` ; déclaration de sinistre restreinte aux
  contrats du client ; avis en `upsert` sur `(profile_id, insurer_id)` (pas de
  doublon), note bornée 1–5.
- **RLS** activée sur les nouvelles tables `reviews` et `claims`
  (migrations `20260810130000_reviews.sql` et `20260810140000_claims.sql`).

Aucune faille d'accès introduite par ces ajouts. Le verdict §6 reste valable.
