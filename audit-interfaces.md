# 🔍 Audit complet des interfaces NOLI Assurance

**Date** : 6 août 2026
**Portée** : Interfaces Admin, Assureur, Client + pages publiques partagées
**Méthode** : revue statique de code (composants React/Next.js, store Zustand, routes API)

---

> **Mise à jour (post-audit).** Les onglets décrits ci-dessous comme des
> « placeholders » / « vitrines » ont depuis été **branchés sur la base** et sont
> désormais **fonctionnels** : **Contrats** et **Clients** (assureur),
> **Sinistres** (client + assureur), **Paiements** (client, primes des contrats)
> et **Mes Avis** (client, qui affichait de **faux avis codés en dur** —
> désormais de vrais avis issus de la table `reviews`). Ces ajouts s'appuient sur
> les nouvelles tables `reviews` et `claims` (RLS activée) et leurs routes API
> (isolation par assureur / propriété par client). Les tableaux « État » et
> « Placeholders » ci-après reflètent l'audit initial ; se reporter à
> `docs/RECETTE_FONCTIONNELLE_2.0.0.md` (§4) pour l'état à jour.

---

## 1. Architecture générale

### 1.1 SPA à vue unique (catch-all)

Le projet est une **SPA Next.js** (App Router) pilotée par un catch-all `src/app/[...slug]/page.tsx` :

| Vue | Chemin URL | Composant |
|---|---|---|
| `landing` | `/` | `LandingPage` |
| `offers` | `/offres` | `OffersPage` |
| `compare` | `/comparer` | `ComparisonForm` |
| `results` | `/resultats` | `ResultsPage` |
| `about` / `contact` / `faq` / `mentions-legales` | `/a-propos`, `/contact`, `/faq`, `/mentions-legales` | pages statiques |
| `login` / `register` / `forgot` | `/connexion`, `/inscription`, `/mot-de-passe-oublie` | `AuthPages` |
| `admin` | `/admin` | `AdminPage` |
| `user-dashboard` | `/espace-client` | `UserLayout` |
| `insurer-dashboard` | `/espace-assureur` | `InsurerLayout` |

- **Routing** : synchronisation bidirectionnelle store ⇄ URL (`VIEW_TO_PATH` / `PATH_TO_VIEW`). Détection 404 dérivée pendant le rendu (corrigée cette session).
- **State global** : `src/store/app-store.ts` (Zustand + persist localStorage `noli-store`). Persiste : user, currentView, onglets actifs, formulaire de comparaison (3 étapes).
- **Auth** : cookie session via `/api/auth` (login/register/logout/me), redirection par rôle (ADMIN → admin, INSURER → espace-assureur, USER → espace-client).
- **Sécurité des vues** : garde en `useEffect` dans `[...slug]/page.tsx` (redirige vers `landing` si le rôle ne correspond pas). À noter : la garde est **front uniquement** — les routes API vérifient leurs propres droits.

### 1.2 Les 3 layouts partagent le même squelette

`AdminPage`, `InsurerLayout` et `UserLayout` suivent **exactement le même pattern** :

- Sidebar desktop fixe 256px (`hidden lg:flex`) + Sheet mobile (hamburger)
- En-tête sticky : titre + badge de rôle, cloche de notifications, toggle thème, menu avatar (profil/paramètres/déconnexion)
- Fil d'Ariane : Accueil > Espace > Onglet
- Zone de contenu = `renderTab(onglet)` par switch

> ⚠️ **Duplication massive** : les 3 layouts ont ~200 lignes quasi identiques (sidebar, header, breadcrumb, logout). Un layout générique paramétré par rôle serait un refactor à forte valeur.

---

## 2. Interface ADMIN (`/admin`)

### 2.1 Structure

`src/components/admin/admin-page.tsx` — 12 onglets en sidebar :

| # | Onglet | Composant | Lignes | API utilisée |
|---|---|---|---|---|
| 1 | Tableau de bord | `DashboardTab` | ~100 | `/api/admin/stats` |
| 2 | Assureurs | `AssureursTab` | ~400 | `/api/admin/insurers` (+ `/insurers/:id`) |
| 3 | Catégories Produits | `InsuranceCategoriesTab` | ~150 | `/api/admin/insurance-categories` |
| 4 | Offres | `InsuranceOffersTab` | ~600 | `/api/admin/insurance-offers` |
| 5 | Cat. Garanties | `CoverageCategoriesTab` | ~150 | `/api/admin/coverage-categories` |
| 6 | Garanties | `CoveragesTab` | ~1200 | `/api/admin/coverages` (+ tariff-rules) |
| 7 | Devis | `DevisTab` | ~300 | `/api/admin/quotes` |
| 8 | Rappels | `RappelsTab` | ~200 | `/api/admin/callbacks` |
| 9 | Journaux d'audit | `AuditLogsTab` | ~350 | `/api/admin/audit-logs` |
| 10 | Sauvegardes | `BackupsTab` | ~450 | `/api/admin/backups` |
| 11 | Rôles & Permissions | `RolesTab` | ~400 | `/api/admin/roles`, `/permissions` |
| 12 | Paramètres | `SettingsTab` | ~1641 | `/api/admin/settings`, `/profiles`, `/users` |

**56 routes API au total** (`find src/app/api -name route.ts`).

### 2.2 Fonctionnalités par onglet

- **Dashboard** : 5 KPI (assureurs actifs, offres actives, garanties, devis en attente, utilisateurs) + tableau des 10 derniers devis (client, assureur, prix, statut, date). Lecture seule, pas de refresh manuel.
- **Assureurs** : CRUD complet (créer/éditer/supprimer/activer), recherche, détail avec offres + garanties + comptes liés.
- **Catégories Produits / Cat. Garanties** : CRUD, recherche, compteurs liés (offres/devis/garanties), toggle actif.
- **Offres** : CRUD complet avec **assistant riche** : type de contrat (Tiers/Tiers+/Tous risques), prix min/max, franchise, capital garanti, **case à cocher de garanties groupées par catégorie** (chargées selon l'assureur), éligibilité véhicule (PF, carburants, VN, VA, usage), détail en modal (stats + garanties + compteur devis).
- **Garanties** (`CoveragesTab`) : le composant le plus complexe de l'app (~1200 lignes). **Wizard 3 étapes** :
  1. Infos générales (nom, catégorie produit, assureur, catégorie garantie, obligatoire, ordre, actif)
  2. Choix de la méthode de calcul (FREE / FIXED_AMOUNT / VARIABLE_BASED / MATRIX_BASED) avec cartes explicatives
  3. Configuration spécifique : taux variable (avec seuil VN conditionnel), montants fixes, **matrices tarifaires** (PF×carburant, catégories 401/402/412, formules IC/IPT, grilles Tierce avec VN_RANGES × FRANCHISE_LEVELS)
  - Sous-panneau **Règles tarifaires** (CRUD par garantie sélectionnée)
- **Devis** : recherche, filtre statut, **changement de statut inline**, détail complet (client, véhicule, besoins couverture, prix final + notes), responsive table/cards.
- **Rappels** : listes des demandes de rappel, filtres (toutes/nouvelles/traitées), marquer traitée/non traitée, lien `tel:`, compteurs.
- **Audit** : filtres (action, entité, dates, recherche), pagination, stats, détails JSON extensibles, bouton **Exporter** (⚠️ ne fait qu'un toast, aucune implémentation).
- **Sauvegardes** : création manuelle, **planification auto** (quotidienne/hebdo/mensuelle), restaurer (avec confirmation), supprimer. Bouton **Télécharger désactivé** (« Fonctionnalité en développement »).
- **Rôles** : liste des rôles, création/édition/suppression, **matrice de permissions par catégorie** (accordéons) avec enregistrement.
- **Paramètres** (`SettingsTab`, 1641 lignes !) : onglets — paramètres globaux (email SMTP, notifs), **gestion des utilisateurs** (liste, recherche, changement de rôle, activation), thème/logo, envoi d'emails test.

### 2.3 Problèmes détectés (Admin)

| Sévérité | Problème | Détail |
|---|---|---|
| 🟠 | **`SettingsTab` trop gros** | 1641 lignes pour un onglet : mélange paramètres globaux + gestion utilisateurs. À découper. |
| 🟠 | **Fichiers morts dans `/admin`** | `packages-tab.tsx`, `offres-tab.tsx`, `categories-tab.tsx`, `garanties-tab.tsx` ne sont **importés nulle part** (worklog indique d'ailleurs « Deleted packages-tab » mais le fichier existe encore). Confusion possible pour les devs. |
| 🟠 | **Exporter (audit) = faux bouton** | `handleExport` affiche seulement un toast « Export en cours... ». Aucune API d'export n'existe. |
| 🟡 | **Télécharger sauvegarde désactivé** | Aucun endpoint `/api/admin/backups/:id/download`. |
| 🟡 | **Réponse non vérifiée** | Plusieurs CRUD ne vérifient pas `res.ok` avant de rafraîchir (ex. `handleDelete` des offres). Erreur silencieuse possible. |
| 🟡 | **`devis-tab` statusMap** | N'inclut pas `IN_PROGRESS` (présent côté user). Statuts possibles incohérents entre interfaces. |
| 🟡 | **Répétition constante** | `bg-[#B9E54D] text-black hover:bg-[#a5d044]` codé en dur partout — devrait être un utilitaire `bg-brand` (existe dans globals.css ?). |
| 🔵 | `assureurs-tab` | Import vide `import {} from "@/components/ui/dropdown-menu"` (résidu). |
| 🔵 | `coverages-tab` | Import vide `import {} from dropdown-menu` également. |

---

## 3. Interface ASSUREUR (`/espace-assureur`)

### 3.1 Structure

`src/components/insurer/insurer-layout.tsx` — 10 onglets :

| # | Onglet | Composant | État |
|---|---|---|---|
| 1 | Tableau de bord | `InsurerDashboardTab` | ✅ Données réelles `/api/insurer/stats` |
| 2 | Clients | `InsurerClientsTab` | ❌ **Placeholder statique** (table vide + « Aucun client trouvé ») |
| 3 | Contrats | `InsurerContractsTab` | ❌ **Placeholder** (KPI à 0, recherche factice, pipeline à 0) |
| 4 | Sinistres | `InsurerClaimsTab` | ❌ **Placeholder** (KPI à 0, workflow décoratif) |
| 5 | Offres | `InsurerOffersTab` | ✅ CRUD réel `/api/insurer/offers` + `/api/insurer/coverages` |
| 6 | Devis Reçus | `InsurerQuotesTab` | ⚠️ Lecture réelle mais **boutons Accepter/Refuser/Contre-proposition désactivés** (`disabled`) ; fetch `/api/quotes?all=true` non filtré par assureur |
| 7 | Rappels | `InsurerCallbacksTab` | ✅ Réel `/api/contact/callbacks` (lire/marquer traitée) |
| 8 | Analytics | `InsurerAnalyticsTab` | ❌ **Placeholder** (chiffres codés en dur : 45 devis, 68%, 100 000 FCFA ; graphiques « bientôt disponible ») |
| 9 | Mes Garanties | `InsurerGuaranteesTab` | ✅ CRUD réel (wizard identique à l'admin) |
| 10 | Paramètres | `InsurerSettingsTab` | ✅ Logo upload réel `/api/insurer/logo` ; ⚠️ boutons « Enregistrer » société/profil **sans effet** (seul le logo est persisté) ; Équipe = placeholder |

### 3.2 Problèmes détectés (Assureur)

| Sévérité | Problème | Détail |
|---|---|---|
| 🔴 | **5 onglets sur 10 sont des coquilles vides** | Clients, Contrats, Sinistres, Analytics, Équipe (settings). Zéro donnée réelle, zéro API. |
| 🔴 | **`InsurerQuotesTab` : actions métier désactivées** | Accepter / Refuser / Contre-proposition sont `disabled` — le cœur du métier assureur (traiter les devis) n'est **pas fonctionnel**. |
| 🔴 | **`InsurerQuotesTab` : aucun filtrage par assureur** | Fetch `?all=true&limit=100` : **tous les devis de la plateforme** sont visibles par chaque assureur (fuite de données + non-fonctionnel). Les routes `/api/insurer/quotes*` existent mais ne sont pas utilisées ! |
| 🟠 | **Boutons « Enregistrer » sans effet** | Dans `InsurerSettingsTab` : les infos société (nom, email, tel) et profil ne sont **jamais envoyées**. L'utilisateur croit sauvegarder, rien ne se passe (simple toast local `saved`). |
| 🟠 | **Legacy components morts** | `insurer-dashboard.tsx`, `insurer-quotes.tsx`, `insurer-offers.tsx`, `insurer-coverages.tsx` (à la racine de `/insurer`) ne sont **importés nulle part** — l'ancienne interface remplacée par les onglets. À supprimer (noter que `insurer-offers.tsx` référence le mapper qu'on vient de tester). |
| 🟡 | `InsurerDashboardTab` | KPI « En attente »/« Approuvés » avec trend décoratif (pas de réel comparaison 7j/30j). |
| 🟡 | Routes `/api/insurer/quotes/[id]/status` | Existent mais **aucun composant ne les appelle** — déjà prêtes pour le fix des actions. |
| 🔵 | Greeting | « Bienvenue, Assureur 👋 » sans le nom (fallback) quand le nom manque. |

---

## 4. Interface CLIENT (`/espace-client`)

### 4.1 Structure

`src/components/user/user-layout.tsx` — 10 onglets :

| # | Onglet | Composant | État |
|---|---|---|---|
| 1 | Tableau de bord | `UserDashboardTab` | ✅ Réel (`/api/quotes`) |
| 2 | Mes Devis | `UserQuotesTab` | ✅ Réel (`/api/quotes`) |
| 3 | Mes Contrats | `UserContractsTab` | ❌ Placeholder (timeline « Comment ça marche ») |
| 4 | Mes Documents | `UserDocumentsTab` | ❌ Placeholder (catégories de docs décoratives) |
| 5 | Mes Avis | `UserReviewsTab` | ⚠️ **Avis de démo codés en dur** (« Jean Dupont », « SAHAM »…) affichés comme réels |
| 6 | Paiements | `UserPaymentsTab` | ❌ Placeholder (totaux à 0, moyens de paiement décoratifs, switch auto-pay local) |
| 7 | Historique | `UserHistoryTab` | ❌ Placeholder (timeline « À venir... ») |
| 8 | Notifications | `UserNotificationsTab` | ✅ Réel (`/api/notifications`, lire tout/lire une) |
| 9 | Mon Profil | `UserProfileTab` | ✅ Réel (`/api/user/profile` GET/PUT, changement mdp, validations) |
| 10 | Paramètres | `UserSettingsTab` | ⚠️ Thème + changement mdp réels ; **email notifications : local seulement** ; suppression compte → toast « non disponible » |

### 4.2 Problèmes détectés (Client)

| Sévérité | Problème | Détail |
|---|---|---|
| 🔴 | **6 onglets sur 10 sont des placeholders** | Contrats, Documents, Avis, Paiements, Historique, (Paramètres partiellement). Aucun contrat/documents/paiement réel possible. |
| 🔴 | **`UserReviewsTab` affiche de faux avis comme réels** | `demoReviews` (« Jean Dupont », « Aminata Koné », « SAHAM Assurances », notes…) rendus dans « Avis récents » avec note globale « 4.5/5 — 2 avis ». **Danger UX/de confiance** : un client croit lire de vrais avis. |
| 🟠 | **Dashboard : KPI « Notifications » et « Économies » codés en dur** | `value: 0` et `value: "—"` (alors qu'une API `/api/user/stats` existe). |
| 🟠 | **Contrats actifs = devis APPROVED** | `activeContracts = quotes.filter(status === APPROVED)` — un devis approuvé n'est pas un contrat. Métrique trompeuse. |
| 🟡 | **`UserSettingsTab` : notif email non persistée** | Le switch n'appelle aucune API. |
| 🟡 | **Incohérence statut** | Les user tabs ne connaissent pas `IN_PROGRESS` (même map que admin). |
| 🔵 | `UserDashboardTab` | Fait `fetch("/api/quotes")` sans `userId` explicite (dépend du cookie) alors que le header envoie aussi des params `?userId=` ailleurs. |

---

## 5. Interfaces publiques / partagées

### 5.1 Landing (`landing-page.tsx`) — ✅ Solide
Hero avec 6 cartes produits (Auto « En service », 5 autres « Bientôt » en pointillé), 3 étapes, avantages, témoignages (codés en dur mais *cohérents pour un site vitrine*), CTA. Animations CSS, responsive, accessibilité de base (role/tabIndex sur cartes cliquables).

### 5.2 Parcours de comparaison — ✅ Le plus abouti

- **`ComparisonForm`** (3 étapes) : profil assuré → véhicule → options. Validation par étape avec messages français, barre de progression, indicateurs de confiance, préfixe 🇨🇮 +225, durée de contrat, date d'effet. Soumission POST `/api/compare` → store → vue résultats.
- **`ResultsPage`** (~1200 lignes) : filtres latéraux (formules, assureurs, budget mensuel slider), barre de comparaison sticky (max 4), **modale de comparaison détaillée** (tableau garanties × offres avec prix unitaires, capitaux, tooltips détaillés, panneaux « moins chères » / « mieux notées »), sauvgarde favoris (Heart), appels/réorientation.

### 5.3 Offres (`OffersPage`) — ✅ Réel
Grille d'offres publique depuis `/api/offers` avec mapping typé (`mapRawOffers` — module testé à 100%, 17 tests).

### 5.4 Auth (`AuthPages` + modals) — ✅ Fonctionnel
Login/Register/Forgot : validation, force de mot de passe, wizard d'inscription 3-4 étapes selon rôle (avec entreprise pour assureur), redirection par rôle. Mot de passe oublié → `/api/auth` (action forgot).

### 5.5 Partagés

| Composant | État |
|---|---|
| `NotificationDropdown` | ✅ Popover notifications, marquer lu/tout lu, badge compteur, navigation par lien |
| `ThemeToggle` | ✅ Toggle clair/sombre |
| `StarRating` | ✅ Réutilisé (résultats + landing) |
| `Header` | ✅ Nav public/privé, dropdown utilisateur (espace selon rôle), thème, mobile sheet |
| `Footer` | ✅ |

---

## 6. Problèmes transverses (toutes interfaces)

### 6.1 Placeholders / fonctionnalités non implémentées — tableau récapitulatif

| Interface | Onglet | Statut |
|---|---|---|
| Admin | Export audit | Toast seul |
| Admin | Télécharger sauvegarde | Désactivé |
| Assureur | Clients | Placeholder vide |
| Assureur | Contrats | Placeholder (0 partout) |
| Assureur | Sinistres | Placeholder (0 partout) |
| Assureur | Analytics | Chiffres factices + graphiques à venir |
| Assureur | Équipe (settings) | « bientôt disponible » |
| Assureur | Actions devis (Accepter/Refuser) | **Désactivées** |
| Assureur | Enregistrer société/profil | **Sans effet** |
| Client | Contrats / Documents / Paiements / Historique | Placeholders |
| Client | Avis | **Faux avis affichés comme réels** |
| Client | Paramètres (email notif, suppr. compte) | Non persistés / toast |

### 6.2 Fichiers morts à supprimer (8 confirmés)

```
src/components/admin/packages-tab.tsx      ← worklog dit « deleted » mais le fichier existe
src/components/admin/offres-tab.tsx
src/components/admin/categories-tab.tsx
src/components/admin/garanties-tab.tsx
src/components/insurer/insurer-dashboard.tsx   ← ancienne UI, remplacée par tabs/
src/components/insurer/insurer-quotes.tsx
src/components/insurer/insurer-offers.tsx      ← référence le mapper testé
src/components/insurer/insurer-coverages.tsx
```

### 6.3 Cohérence & qualité

- **Palette** : `#B9E54D` codé en dur dans ~20 fichiers au lieu d'un token (`bg-brand` existe déjà dans le CSS global).
- **Import vides** : `import {} from "@/components/ui/dropdown-menu"` dans `assureurs-tab` et `coverages-tab`.
- **Framer-motion** : utilisé dans les 3 espaces + pages publiques (bundles plus lourds).
- **Tests** : 90 tests unitaires (mapping offres, pricing, validation zod, compare-service) — mais **aucun test de composant UI** ni de routes API.
- **Accessibilité** : bonnes pratiques globalement respectées (aria-label, aria-invalid, sr-only), mais switches dans les tableaux sans `aria-label` clair (ex. toggle actif admin).

---

## 7. Recommandations priorisées

### 🟥 P0 — Correctifs fonctionnels critiques
1. **Activer les actions devis assureur** (Accepter/Refuser/Contre-proposition) via `/api/insurer/quotes/:id/status` — routes déjà prêtes.
2. **Filtrer `InsurerQuotesTab` par assureur** (passer par `/api/insurer/quotes` au lieu de `/api/quotes?all=true` — **fuite de données**).
3. **Persister réellement les settings assureur** (société + profil) — actuellement faux bouton.
4. **Retirer les faux avis de `UserReviewsTab`** (ou les marquer clairement « exemples ») — risque de confiance/compliance.

### 🟧 P1 — Compléter les interfaces (minimum viable)
5. Analytics assureur : brancher `/api/insurer/stats` étendu (séries temporelles) ou masquer l'onglet.
6. Contrats client : créer la table + API `contracts` (déjà référencée dans le design).
7. Documents client : génération d'attestation (le module `generate-pdf.ts` existe en lib !).
8. Paiements : intégration Mobile Money/Wave (étapes de souscription à définir).

### 🟨 P2 — Dette technique
9. Supprimer les 8 fichiers morts.
10. Découper `admin/settings-tab.tsx` (1641 lignes) en sous-composants.
11. Créer un layout partagé paramétré (sidebar items + badge) pour les 3 espaces.
12. Centraliser la couleur de marque (`bg-brand`), retirer les imports vides.
13. Exporter l'audit (CSV/JSON) et télécharger les sauvegardes (API à créer).
14. Ajouter des tests de composants (Vitest + Testing Library) sur le parcours de comparaison.

---

## 8. Chiffres clés

| Métrique | Valeur |
|---|---|
| Composants UI audités | ~45 |
| Onglets Admin / Assureur / Client | 12 / 10 / 10 |
| Routes API | 56 |
| Onglets **totalement fonctionnels** | Admin 12/12 · Assureur 5/10 · Client 4/10 |
| Onglets placeholders / faux | Assureur 5 · Client 5-6 |
| Fichiers morts | 8 |
| Boutons sans effet | ≥ 4 |
| Tests unitaires | 90 (aucun de composant) |

---

*Rapport généré par audit statique du code source. Les chiffres de lignes sont approximatifs (à ±10%).*
