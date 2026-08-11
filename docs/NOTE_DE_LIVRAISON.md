# Note de livraison / PV de recette — NOLI

**Produit :** NOLI — comparateur d'assurances.
**Version :** branche `2.0.0`.
**Date :** 2026-08.
**Stack :** Next.js 16 (build `standalone`) · Supabase (Postgres + Auth) · Caddy + PM2 sur VPS.

Cette note formalise le périmètre livré, l'état de qualité, les points restant à finaliser et les prérequis de mise en production.

---

## 1. Périmètre livré

La plateforme s'articule autour de **trois espaces**, complétés par le cœur de comparaison et de génération de devis.

### 1.1 Espace Client

- Comparaison d'assurances et génération de devis (avec envoi du devis en **PDF par email**).
- Réconciliation des **devis anonymes** (rattachement au compte après inscription).
- Espace personnel : historique, notifications, compteur temps réel.
- **Mes Avis** : notation des assureurs (note 1–5 + commentaire).
- **Paiements** : suivi branché aux contrats réels.
- **Sinistres** : déclaration d'un sinistre lié à un contrat.

### 1.2 Espace Assureur

- **Contrats** : portefeuille réel de contrats.
- **Clients** : portefeuille client réel.
- **Sinistres** : traitement et suivi de statut (SUBMITTED → IN_REVIEW → APPROVED / REJECTED / CLOSED).
- Gestion des offres, garanties, devis et paramètres.

### 1.3 Espace Admin

- Gestion des utilisateurs, rôles et permissions.
- Gestion des offres d'assurance et des règles de tarification.
- Statistiques, journaux d'audit, paramètres système.

### 1.4 Socle transverse

- Moteur tarifaire (calcul de prime par garantie et par formule).
- Authentification Supabase Auth (inscription, connexion, réinitialisation de mot de passe par email).
- Emails transactionnels (SMTP Gmail, Resend en fallback).
- Notifications (Edge Function Supabase).

---

## 2. État de qualité

| Contrôle | Résultat |
|---|---|
| TypeScript (`tsc --noEmit`) | **0 erreur** |
| ESLint | **0 erreur** |
| Tests automatisés (Vitest) | **138 tests** au vert |
| Build production (`next build`) | **OK** |
| Audit de sécurité `2.0.0` | **OK** (P0–P2+ traités) |
| Contre-audit | **OK** (corrections complémentaires appliquées) |

Ces contrôles sont **automatisés et bloquants** dans la CI GitHub Actions (voir [`STRATEGIE_DE_TESTS.md`](STRATEGIE_DE_TESTS.md)). Le détail de l'audit figure dans [`AUDIT_SECURITE_2.0.0.md`](AUDIT_SECURITE_2.0.0.md).

---

## 3. Points « à venir » / à finaliser

Éléments hors périmètre livré à ce jour, à traiter dans une itération ultérieure :

- **Paiement en ligne intégré** : l'onglet Paiements reflète les contrats réels, mais l'encaissement en ligne (passerelle de paiement) reste à intégrer.
- **Upload du logo (admin)** : fonctionnalité à finaliser.
- **Numéro de téléphone de contact** : à renseigner (valeur de contact publique à fournir par le client).

---

## 4. Prérequis de mise en production

À réaliser lors du passage en production :

1. **Redéploiement** de l'application selon la procédure de [`../deploiement.md`](../deploiement.md) (build `standalone`, PM2 sur port `8080`, reverse-proxy Caddy).
2. **Application des migrations de base de données**, en particulier les deux migrations récentes :
   - `20260810130000_reviews.sql` — table **reviews** (Mes Avis) + RLS.
   - `20260810140000_claims.sql` — table **claims** (Sinistres) + RLS.
   ```bash
   npx supabase db push
   npx supabase migration list   # vérifier l'état appliqué / en attente
   ```
3. **Variables d'environnement** : `.env` complet et injecté par PM2 (voir [`EXPLOITATION_ET_SUPERVISION.md`](EXPLOITATION_ET_SUPERVISION.md), §2).
4. **Vérification post-déploiement** : sonde `/api/health` en `200` / `status: "ok"` (voir §1 du manuel d'exploitation).
5. **Recette live** sur staging avec les vraies clés Supabase, avant bascule (voir [`RECETTE_FONCTIONNELLE_2.0.0.md`](RECETTE_FONCTIONNELLE_2.0.0.md)).

---

## 5. Documents de référence

| Sujet | Document |
|---|---|
| Exploitation, supervision, variables d'environnement, PM2, logs | [`EXPLOITATION_ET_SUPERVISION.md`](EXPLOITATION_ET_SUPERVISION.md) |
| Stratégie de tests et de qualité | [`STRATEGIE_DE_TESTS.md`](STRATEGIE_DE_TESTS.md) |
| Journal des versions | [`JOURNAL_DES_VERSIONS.md`](JOURNAL_DES_VERSIONS.md) |
| Déploiement | [`../deploiement.md`](../deploiement.md) |
| Sauvegarde et reprise après sinistre | [`SAUVEGARDE_DR.md`](SAUVEGARDE_DR.md) |
| Audit de sécurité | [`AUDIT_SECURITE_2.0.0.md`](AUDIT_SECURITE_2.0.0.md) |
| Recette fonctionnelle | [`RECETTE_FONCTIONNELLE_2.0.0.md`](RECETTE_FONCTIONNELLE_2.0.0.md) |

---

*Note de livraison établie sur la base de l'état réel du dépôt (code, historique Git, migrations, configuration CI/PM2).*
