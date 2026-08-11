# Noli — Comparateur d'assurances

[![Coverage](public/badges/coverage.svg)](https://github.com/your-org/noli)

Plateforme de comparaison d'assurances multi-assureurs avec interface admin, espace utilisateur et tableau de bord assureur.

## Fonctionnalités

3 espaces (client, assureur, admin) au-dessus d'un cœur de comparaison/devis
multi-assureurs. La plateforme s'appuie sur une base **Supabase / Postgres**
(23 tables, 27 migrations SQL) et **71 routes API**.

- **Cœur métier** : comparaison en 3 étapes, moteur de tarification, catalogue
  d'offres, devis.
- **Espace admin** : assureurs, catégories, offres, garanties (wizard de calcul),
  devis, rappels, journaux d'audit, sauvegardes, rôles & permissions, paramètres.
- **Espace assureur** : tableau de bord, offres, garanties, devis reçus, rappels,
  **Contrats** et **Clients** (nouveau).
- **Espace client** : devis, contrats, documents, notifications, profil,
  **Mes Avis**, **Paiements** et **Sinistres** (nouveau).

Fonctionnalités ajoutées récemment (auparavant écrans « vitrines », désormais
branchées sur la base) :

| Fonctionnalité | Espace | Description |
|---|---|---|
| **Contrats** | Assureur | Liste des contrats de l'assureur (isolation par `insurer_id`). |
| **Clients** | Assureur | Clients de l'assureur dérivés des devis/contrats. |
| **Mes Avis** | Client | Notation (1–5) + commentaire d'un assureur, 1 avis par assureur (upsert), table `reviews` + RLS. |
| **Paiements** | Client | Suivi des primes des contrats (table `contracts`, champ `premium`). |
| **Sinistres** | Client / Assureur | Déclaration client sur un contrat et traitement/suivi de statut par l'assureur, table `claims` + RLS. |

## Documentation

La documentation détaillée (recette fonctionnelle, audits de sécurité,
déploiement, calcul des prix, plan d'industrialisation, sauvegarde/DR) se trouve
dans le dossier [`docs/`](docs/). Voir aussi [`deploiement.md`](deploiement.md)
et [`comptes-test.md`](comptes-test.md).

## Stack

- **Framework** : Next.js 16 (App Router)
- **Langage** : TypeScript
- **Base de données / Auth** : Supabase (Postgres + Supabase Auth, migrations SQL dans `supabase/migrations/`)
- **UI** : Tailwind CSS v4 + shadcn/ui
- **State** : Zustand
- **Validation** : Zod v4
- **Tests** : Vitest + Testing Library + @vitest/coverage-v8

> ⚠️ Le projet a migré de Prisma/SQLite vers Supabase. La dépendance
> `next-auth` présente dans `package.json` n'est plus utilisée dans le code
> (l'authentification passe entièrement par Supabase Auth via
> `src/lib/auth-guard.ts`) — à retirer lors d'un prochain nettoyage de
> dépendances.

## Configuration

Copier `.env.example` en `.env` et renseigner les clés Supabase du projet
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`) ainsi que `RESEND_API_KEY` pour les emails.

Les migrations SQL (schéma + policies RLS) se trouvent dans
`supabase/migrations/` et s'appliquent via la CLI Supabase
(`supabase db push` / `supabase migration up`, selon votre workflow).

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de développement |
| `npm run build` | Build de production |
| `npm run test` | Exécute les tests unitaires |
| `npm run test:coverage` | Exécute les tests avec rapport de couverture |
| `npm run test:coverage:badge` | Génère le rapport de couverture + le badge SVG |
| `npm run lint` | Vérification ESLint |

## Structure du projet

```ini
src/
├── app/          # Routes Next.js (App Router) + API
├── components/   # Composants React (admin, insurer, user, shared, ui)
├── hooks/        # Hooks personnalisés
├── lib/          # Utilitaires, services, validation
├── store/        # Store Zustand
└── types/        # Types TypeScript
```

## Tests

```bash
# Exécuter tous les tests
npm run test

# Avec rapport de couverture
npm run test:coverage

# Avec badge de couverture
npm run test:coverage:badge
```

Le badge de couverture est généré localement dans `public/badges/coverage.svg` et mis à jour via la commande `test:coverage:badge`.
