# Stratégie de tests et de qualité — NOLI

**Application :** NOLI (comparateur d'assurances) — Next.js 16 · Supabase.
**Objet :** décrire la démarche qualité : tests automatisés, contrôles d'intégration continue, recette manuelle.
**Chiffres de référence (vérifiés dans le dépôt) :** **138 tests automatisés** répartis sur **11 fichiers** de tests unitaires Vitest.

---

## 1. Tests automatisés (Vitest)

Le socle qualité repose sur **138 tests** exécutés par **Vitest** (`vitest.config.ts`, script `npm run test`). Ils couvrent en priorité la logique métier sensible (tarification, comparaison de devis) et les briques de sécurité (rate-limiting, réconciliation, validation, échappement).

### 1.1 Répartition par fichier

| Fichier de test | Nombre de tests | Ce qu'il couvre |
|---|---:|---|
| `src/lib/pricing-service.test.ts` | 44 | Moteur tarifaire : calcul de prime par garantie (`FREE`, `FIXED_AMOUNT`, `VARIABLE_BASED`, `MATRIX_BASED`), prix réduits en pack, bornes min/max, arrondis, tranches (CV, carburant, valeur à neuf/vénale) |
| `src/lib/validation.test.ts` | 23 | Schémas de validation (Zod) : email, mot de passe, infos personnelles, véhicule, besoins de couverture, requête de comparaison — avec messages en français |
| `src/lib/insurer-offers-mapper.test.ts` | 17 | Transformation des offres brutes assureur vers la forme d'affichage : catégories, statut actif/inactif, sérialisation des caractéristiques, compteur de devis, parsing défensif |
| `src/lib/security.test.ts` | 13 | Sécurité : échappement HTML anti-XSS (`escapeHtml`), échappement des filtres PostgREST (`sanitizePostgrestSearch`), coercition/bornage de champs numériques, masquage de secrets |
| `src/lib/pagination.test.ts` | 8 | Pagination : valeurs par défaut, bornage de la limite (max 200), rejet des valeurs invalides, en-têtes de pagination |
| `src/lib/compare-service.test.ts` | 7 | Comparaison de devis : éligibilité des formules, calcul prime/score/garanties, tri (score puis prix), respect de la durée, non-double-comptage des obligatoires, sauvegarde conditionnelle du devis |
| `src/lib/utils.test.ts` | 7 | Utilitaires : parsing des montants FCFA, formats divers |
| `src/lib/auth-actions.test.ts` | 6 | Messages d'erreur d'inscription (`signUpErrorMessage`) |
| `src/lib/rate-limit.test.ts` | 6 | Rate-limiting anti-bruteforce : verrouillage après N tentatives, isolation par IP, réautorisation après expiration, extraction de l'IP client (`x-forwarded-for`, `x-real-ip`, fallback) |
| `src/lib/quotes-reconcile.test.ts` | 4 | Réconciliation des devis anonymes : rattachement au seul email exact (insensible casse/espaces), refus des correspondances partielles, robustesse aux données illisibles — **garde de sécurité** |
| `src/lib/fetch-with-timeout.test.ts` | 3 | Résilience réseau : réponse dans les temps, rejet par `TimeoutError` au-delà du délai, distinction de l'erreur de timeout |
| **Total** | **138** | |

### 1.2 Points forts de la couverture

- **Moteur tarifaire** : le composant le plus testé (44 tests) — cœur de valeur du comparateur, sensible à toute régression de prix.
- **Sécurité** : rate-limiting, échappement anti-XSS/injection, réconciliation d'email et validation stricte sont couverts par des tests dédiés.
- **Résilience réseau** : `fetchWithTimeout` borne les appels sortants (évite les blocages type 502 sur étape réseau lente).

### 1.3 Lancer les tests

```bash
npm run test                # exécution unique (138 tests)
npm run test:watch          # mode watch
npm run test:coverage       # avec couverture
```

---

## 2. Intégration continue (GitHub Actions)

Pipeline de contrôle qualité **bloquant** défini dans `.github/workflows/ci.yml` (job `quality`). Il s'exécute sur **chaque Pull Request** et sur les **pushs vers la branche `2.0.0`**. La branche `2.0.0` est destinée à être configurée en branche protégée exigeant ce job (merge bloqué si rouge).

### 2.1 Étapes du pipeline

| # | Étape | Commande | Rôle |
|---|---|---|---|
| 1 | Checkout | `actions/checkout@v4` | Récupération du code |
| 2 | Setup Node | `actions/setup-node@v4` (Node 22, cache npm) | Environnement d'exécution |
| 3 | Install | `npm ci --no-audit --no-fund` | Dépendances reproductibles |
| 4 | **TypeScript** | `npx tsc --noEmit` | Vérification de typage (0 erreur exigée) |
| 5 | **Lint** | `npx eslint .` | Qualité et cohérence du code |
| 6 | **Tests + couverture** | `npx vitest run --coverage` | Exécution des 138 tests |
| 7 | **Build** | `npx next build` | Vérifie que l'application compile en production |

Optimisation : `concurrency` avec `cancel-in-progress` (annule les exécutions redondantes sur une même référence).

### 2.2 Portée

Les quatre contrôles (types, lint, tests, build) forment une **barrière qualité** unique : un seul rouge bloque l'intégration. C'est le garant automatisé de l'état de qualité annoncé en livraison (TypeScript 0 erreur, ESLint 0 erreur, 138 tests, build OK).

---

## 3. Recette manuelle

Les tests automatisés couvrent la logique unitaire ; ils ne remplacent pas la validation fonctionnelle de bout en bout. La démarche de recette est documentée dans [`RECETTE_FONCTIONNELLE_2.0.0.md`](RECETTE_FONCTIONNELLE_2.0.0.md).

### 3.1 Méthode appliquée

- **Recette technique (revue de code)** : revue systématique **front ↔ route API** des 4 parcours (utilisateur, assureur, admin, cœur comparaison/devis) — cohérence méthode HTTP, noms de champs, forme des réponses, états, boutons. Chaque bug identifié a été vérifié manuellement avant correction.
- **Passes successives** : plusieurs itérations de recette ont corrigé des lots de bugs fonctionnels (voir [`JOURNAL_DES_VERSIONS.md`](JOURNAL_DES_VERSIONS.md)).

### 3.2 Recette live à réaliser (staging)

Une **recette live** (clics réels dans l'application avec les vraies clés Supabase) reste à mener côté staging pour valider les parcours de bout en bout avec des données réelles, en particulier après application des dernières migrations (voir [`NOTE_DE_LIVRAISON.md`](NOTE_DE_LIVRAISON.md)).

### 3.3 Comptes de test

Des comptes de test par rôle (client, assureur, admin) sont disponibles pour la recette (voir `comptes-test.md` à la racine du dépôt).

---

## 4. Synthèse

| Dimension | État |
|---|---|
| Tests unitaires Vitest | 138 tests, 11 fichiers |
| TypeScript (`tsc --noEmit`) | Bloquant en CI |
| ESLint | Bloquant en CI |
| Build Next.js | Bloquant en CI |
| Recette technique (revue code) | Réalisée sur les 4 parcours |
| Recette live (staging) | À réaliser |
