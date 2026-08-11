# 📚 Documentation projet NOLI — Sommaire général

**Projet :** NOLI — Plateforme de comparaison d'assurances (Côte d'Ivoire)
**Version :** 2.0.0
**Stack :** Next.js 16 (App Router) · Supabase (Postgres + Auth) · TypeScript · Tailwind CSS · PM2
**Mise à jour :** 2026-08

Ce dossier regroupe l'ensemble de la documentation du projet, organisée par thème.
Chaque document est rédigé à partir du code réel de l'application.

---

## 1. Cadrage & produit

| Document | Objet |
|---|---|
| [Présentation & démarrage (README)](../README.md) | Vue d'ensemble du projet, stack, installation, fonctionnalités |
| [Spécifications fonctionnelles](./SPECIFICATIONS_FONCTIONNELLES.md) | Description détaillée de tous les modules (comparateur, devis, contrats, sinistres, avis, paiements, espaces client/assureur/admin) |
| [Note de livraison / PV de recette](./NOTE_DE_LIVRAISON.md) | Périmètre livré, état de qualité, points « à venir », prérequis de mise en production |

## 2. Architecture & technique

| Document | Objet |
|---|---|
| [Dossier d'architecture technique](./ARCHITECTURE_TECHNIQUE.md) | Stack, schéma d'architecture, arborescence, flux d'authentification, sécurité transverse, build & exécution |
| [Modèle de données](./MODELE_DONNEES.md) | Les 23 tables (colonnes, relations, RLS), schémas de relations, liste des 27 migrations |
| [Référence API](./REFERENCE_API.md) | Les 71 endpoints REST (méthode, rôle requis, entrées/sorties), regroupés par domaine |

## 3. Sécurité & droits d'accès

| Document | Objet |
|---|---|
| [Rôles & permissions](./ROLES_ET_PERMISSIONS.md) | Les 3 rôles (client/assureur/admin), matrice des droits, authentification, RBAC |
| [Rapport d'audit de sécurité](./AUDIT_SECURITE_2.0.0.md) | Analyse des risques, correctifs, contre-audit des nouvelles routes |
| [Récapitulatif d'audit](./RECAP_AUDIT_NOLI.md) | Synthèse des audits menés |

## 4. Guides utilisateurs

| Document | Objet |
|---|---|
| [Guide utilisateur — Client](./GUIDE_UTILISATEUR_CLIENT.md) | Comparer, devis, contrats, sinistres, paiements, avis, profil |
| [Guide utilisateur — Assureur](./GUIDE_UTILISATEUR_ASSUREUR.md) | Offres, devis, contrats, portefeuille clients, sinistres |
| [Guide administrateur](./GUIDE_ADMINISTRATEUR.md) | Gestion assureurs, offres, garanties, rôles, paramètres, sauvegardes |

## 5. Exploitation & déploiement

| Document | Objet |
|---|---|
| [Guide de déploiement](../deploiement.md) | Procédure de déploiement (build standalone, PM2, reverse-proxy), application des migrations |
| [Exploitation & supervision](./EXPLOITATION_ET_SUPERVISION.md) | Healthcheck `/api/health`, variables d'environnement, cycle PM2, logs, supervision |
| [Sauvegarde & reprise (DR)](./SAUVEGARDE_DR.md) | Stratégie de sauvegarde et de restauration |
| [Plan d'industrialisation](./PLAN_INDUSTRIALISATION.md) | CI/CD, robustesse, feuille de route technique |

## 6. Qualité & recette

| Document | Objet |
|---|---|
| [Stratégie de tests](./STRATEGIE_DE_TESTS.md) | Les 138 tests automatisés, la CI (tsc/lint/tests/build), la démarche de recette |
| [Recette fonctionnelle](./RECETTE_FONCTIONNELLE_2.0.0.md) | Scénarios de recette validés, dont les 5 nouvelles fonctionnalités |
| [Exemple de calcul de prix](./EXEMPLE_CALCUL_PRIX.md) | Illustration chiffrée de la règle de tarification |
| [Audit des interfaces (UX/UI)](../audit-interfaces.md) | Revue des écrans et corrections |

## 7. Gouvernance & annexes

| Document | Objet |
|---|---|
| [Journal des versions (changelog)](./JOURNAL_DES_VERSIONS.md) | Historique des évolutions de la version 2.0.0 |
| [Comptes de test](../comptes-test.md) | Identifiants de démonstration (dépend du seed de la base) |

---

## Comment lire cette documentation

- **Pour comprendre le produit** → commencez par le *README*, puis les *Spécifications fonctionnelles*.
- **Pour développer / reprendre le code** → *Architecture technique*, *Modèle de données*, *Référence API*.
- **Pour exploiter en production** → *Déploiement*, *Exploitation & supervision*, *Sauvegarde & DR*.
- **Pour utiliser l'application** → les 3 *Guides utilisateurs*.
- **Pour la conformité / la sécurité** → *Rôles & permissions*, *Audit de sécurité*.

> ⚠️ **Prérequis de mise en production** : après déploiement du code, appliquer les migrations de base
> `20260810130000_reviews.sql` et `20260810140000_claims.sql` (voir *Déploiement* et *Note de livraison*).
