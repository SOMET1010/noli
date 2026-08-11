# Journal des versions — NOLI

**Branche :** `2.0.0` (application Next.js en production).
**Période :** 2026-08.
**Source :** historique Git (`git log`) de la branche. Synthèse des évolutions majeures, regroupées par thème.

> Ce journal est une synthèse fonctionnelle destinée au suivi projet. Il agrège les commits par catégorie plutôt que de les lister un à un.

---

## 1. Migration technique — Supabase

- Migration de la persistance **Prisma / SQLite → Supabase (Postgres + Auth)**.
- Authentification portée sur **Supabase Auth**, routes d'authentification en REST.
- Modernisation du guide de déploiement pour la stack Supabase (abandon de Prisma / SQLite / NextAuth).
- Migration de l'envoi d'emails vers **SMTP Gmail**, avec **Resend en fallback**.

## 2. Audit et durcissement de la sécurité

- Audit de sécurité complet **P0–P2+** : correction d'une escalade de privilèges `ADMIN`, renforcement de la **RLS**, protections **XSS**, **rate-limiting**, durcissement des accès inter-comptes (**IDOR**).
- Durcissement global de la configuration système et de la sécurité.
- Réinitialisation de mot de passe via lien email.
- Rapport de sécurité formalisé (`AUDIT_SECURITE_2.0.0.md`) et nettoyage du code mort.
- **Contre-audit** : corrections complémentaires (libellé de prime mensuelle, validation de la date de sinistre, RLS sur les sinistres).

## 3. Correctifs de tarification (prix)

- Correction du **moteur tarifaire** : prix basé sur la prime brute (`grossPremium`), sans double-comptage des garanties obligatoires (Option A).
- **Prix mensuel = prix annuel / 12** ; correction de l'application de la prime nette.
- Garde contre les valeurs de prix `NaN`.
- Documentation d'un exemple chiffré du calcul de prix (aide à la décision métier).

## 4. Corrections UX / UI et accessibilité

- Campagne UX **2026-08** par lots :
  - **Lot A** : quick wins UX.
  - **Lot B** : contrastes conformes **WCAG**.
  - **Lot E** : résilience réseau (`fetchWithTimeout`).
  - **Lot F** : validation de formulaire visible.
  - **Lot G** : finitions accessibilité / mobile.
  - **Lot D** : devis anonymes (réconciliation + confirmation).
- Correctifs de recette : routage incohérent, placeholders de valeurs véhicule, chevauchement label/prix des garanties, textes d'accueil, profil admin manquant, purge des vues persistées (redirections fantômes).

## 5. Industrialisation — CI et supervision

- Mise en place du **pipeline qualité GitHub Actions** (TypeScript · Lint · Tests · Build), bloquant sur PR et push `2.0.0`.
- Ajout du **healthcheck `/api/health`** (P0).
- Ajout de tests **sécurité / rate-limit** et d'un seuil de couverture en CI.
- Documentation d'un **plan d'industrialisation** (cible VPS + PM2) et d'une vraie **stratégie de sauvegarde** de la base.
- Alignement du proxy Caddy sur le port PM2 `8080`.

## 6. Résilience de l'inscription

- Correction du **502 Bad Gateway** à l'inscription : bornage temporel des étapes réseau.
- Messages d'erreur détaillés à l'inscription + log serveur.
- Résilience de l'inscription et cohérence du rôle à l'inscription.
- `autoComplete=new-password` sur les champs mot de passe.

## 7. Correctif d'affichage de l'espace client

- Correction du **contenu invisible** de l'espace client (animation d'entrée bloquée).
- Compteur de notifications réel + historique fonctionnel.

## 8. Nouvelles fonctionnalités (récentes)

Cinq fonctionnalités livrées en fin de cycle, branchées sur des **données réelles** :

| Fonctionnalité | Espace | Description |
|---|---|---|
| **Contrats** | Assureur | Onglet Contrats branché aux données réelles du portefeuille |
| **Clients** | Assureur | Onglet Clients fonctionnel (portefeuille client réel) |
| **Mes Avis** | Client | Notation des assureurs (avis 1–5 + commentaire) |
| **Paiements** | Client | Onglet Paiements branché aux contrats réels |
| **Sinistres** | Client + Assureur | Déclaration côté client, traitement et suivi de statut côté assureur (bout-en-bout) |

---

## Note

L'ordre des sections suit les thèmes, non la chronologie stricte des commits. Pour le détail commit par commit : `git log --oneline` sur la branche `2.0.0`.
