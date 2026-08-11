# Récap — Audit & recette Noli 2.0.0

**Date :** 2026-08-08 · **Branche de travail :** `SOMET1010/noli:claude/audit-2.0.0`
**Cible :** `akoun-dev/noli:2.0.0` (produit Next.js en production)

---

## ✅ Ce qui a été fait

**1. Audit de sécurité** — verdict : codebase **sain et bien durci**. Modèle d'auth
solide (JWT Supabase vérifié serveur), rôles admin corrects, contrôles IDOR
présents, CSRF en place. 1 correctif lint + nettoyage de code mort.

**2. Recette fonctionnelle en 3 passes — 19 bugs corrigés** (chacun vérifié à la main) :
- **Sécurité/données** : fuite des devis entre assureurs (`!inner` manquant).
- **Bug majeur** : onglet « Mes Offres » (assureur) bloqué au chargement.
- **Routage/session** : liens directs/favoris cassés ; session expirée sans redirection.
- **Admin** : compteur de devis, colonne Client, filtres journaux d'audit, 2 recherches.
- **Assureur** : catégorie d'offre, catégorie de garantie, téléphone entreprise.
- **Client** : « Mes Devis » masquait les pannes ; filtre budget ; date d'effet.
- + validations (min ≤ max), planif de sauvegarde, etc.

**3. Calcul du prix (décisions métier appliquées + tests)**
- **Option A** : prix basé sur `grossPremium` (garanties retenues + obligatoires),
  au lieu du texte marketing → **fin du double comptage / des obligatoires oubliées**.
- **P1** : prix mensuel = prix annuel ÷ 12 (cohérent avec « X/mois · Soit Y/an »).
- **P2** : remise nette (5 % + 2 500 FCFA) **non appliquée** — règle non validée,
  documentée, à confirmer ou supprimer (voir « À valider » ci-dessous).

**Qualité vérifiée** (branche complète) : `tsc` **0** · `eslint` **0** ·
**99 tests** · `next build` **OK**. Détails : `RECETTE_FONCTIONNELLE_2.0.0.md`,
`AUDIT_SECURITE_2.0.0.md`, `EXEMPLE_CALCUL_PRIX.md`.

---

## 📍 État d'intégration

- ✅ **PR #34 déjà mergée** dans `2.0.0` → audit + 1re passe de recette **en ligne**.
  Vérifié : cette version compile (tsc 0, 105 tests, build OK).
- ⏳ **5 commits restants NON mergés** (2e + 3e passe + calcul de prix), dont le
  **bug majeur des offres** et **toutes les corrections de prix**.
- ℹ️ Branche `fix/audit-securite` = ancienne branche, déjà contenue dans `2.0.0`,
  **aucun risque** — peut être supprimée.

---

## 👉 ACTION UNIQUE RESTANTE (Akoun)

Ouvrir et merger cette Pull Request, puis **re-déployer** :

```
https://github.com/akoun-dev/noli/compare/2.0.0...SOMET1010:noli:claude/audit-2.0.0
```

Elle contient exactement les 5 commits manquants (dernier : `e45b024`).

---

## 🔎 À valider ensuite (Hervé & Akoun)

- **Prime nette (P2)** : confirmer si la remise **5 %** + frais **2 500 FCFA** sont
  réels/à jour et à afficher au client → on branche la prime nette ; sinon on
  supprime `calculateNetPremium`.
- **Recette live** après déploiement : liens directs, expiration de session,
  parcours comparaison → devis, prix affichés.
- Points produit mineurs (dans `RECETTE_FONCTIONNELLE_2.0.0.md`) : « Demander un
  devis » qui ne pré-remplit pas l'offre, « Contrats actifs », KPI Notifications,
  pagination des devis assureur.

---

## 🆕 Mise à jour — nouvelles fonctionnalités & contre-audit

Depuis ce récap, **5 fonctionnalités** ont été livrées (onglets auparavant
« vitrines », désormais fonctionnels) : **Contrats** et **Clients** (assureur),
**Mes Avis** et **Paiements** (client), **Sinistres** (déclaration client +
traitement assureur). La base compte désormais **23 tables**, **27 migrations**
(dont `reviews` et `claims`), **71 routes API** et **138 tests** verts.

Un **contre-audit récent** confirme que la **sécurité des nouvelles routes est
OK** : **isolation par assureur** (contrats/clients/sinistres filtrés sur
`insurer_id`, identité tirée de la session), propriété côté client vérifiée, et
**RLS activée sur `reviews` et `claims`**. Détails : recette 4e passe dans
`RECETTE_FONCTIONNELLE_2.0.0.md` (§4) et note §7 de `AUDIT_SECURITE_2.0.0.md`.
