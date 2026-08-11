# Recette fonctionnelle — Noli `2.0.0`

**Date :** 2026-08-08
**Périmètre :** branche `2.0.0` (Next.js). Revue fonctionnelle de bout en bout des
4 parcours (utilisateur, assureur, admin, cœur comparaison/devis), par
recoupement systématique **front ↔ route API** (méthode HTTP, noms de champs,
forme des réponses, états, boutons). Chaque bug a été **vérifié manuellement**
avant correction.

**Méthode :** recette *technique* (revue de code). Une recette *live* (clics dans
l'app avec les vraies clés Supabase) reste à faire côté staging pour les 2 points
« à valider » ci-dessous.

---

## Bugs corrigés (11)

| # | Grav. | Bug | Correctif |
|---|---|---|---|
| 1 | 🔴 Haute | **Listes devis/stats assureur non filtrées** : `.eq("offer.insurer_id")` sur un embed to-one *sans* `!inner` ne filtre pas les lignes racine → un assureur pouvait voir *tous* les devis de la plateforme + KPI gonflés. | `!inner` ajouté sur `insurer/quotes` et les 6 requêtes de `insurer/stats`. |
| 2 | 🟠 Moy | Compteur « Devis » du détail d'offre (admin) affichait le total plateforme (`offerId` ignoré par la route). | `admin/quotes` lit et applique `offerId` (`eq("offer_id")`). |
| 3 | 🟠 Moy | Dashboard admin : colonne « Client » toujours « — » (double `JSON.parse` sur un objet déjà désérialisé). | Le front gère le cas objet avant de tenter `JSON.parse`. |
| 4 | 🟠 Moy | Filtre « Entité » des journaux d'audit ne renvoyait jamais rien (valeurs FR envoyées vs entités EN stockées). | Valeurs du menu alignées sur les entités réelles (`User`, `Insurer`, `InsuranceOffer`, `Quote`, `Settings`, `Backup`, `Role`). |
| 5 | 🟠 Moy | Impossible d'assigner une **catégorie** à une offre à la création (aucun sélecteur ; `categoryId` restait vide). | Ajout du chargement des catégories + d'un `Select` de catégorie dans le formulaire d'offre. |
| 6 | 🟠 Moy | **Catégorie de garantie perdue** à la création (le POST écrasait `type` par le code auto-généré). | POST écrit `type: type || genCode` (cohérent avec le PUT). |
| 7 | 🟠 Moy | **Téléphone entreprise** (assureur) non persistant : rechargé depuis le profil utilisateur au lieu de `insurers.phone`. | Le champ est réhydraté depuis `insurerData.phone`. |
| 8 | 🟡 Bas | **Date d'effet** supprimée du devis auto-enregistré (Zod retirait la clé inconnue). | `effectiveDate` ajoutée au schéma véhicule (`validation.ts`). |
| 9 | 🟡 Bas | 2 **recherches inopérantes** (catégories garanties / produits) : `search` jamais lu. | Filtre `ilike("name", …)` ajouté aux 2 routes. |
| 10 | 🟡 Bas | Planification de **sauvegarde en écriture seule** : jamais rechargée → réaffichait « désactivé » après reload. | Le GET renvoie la planif enregistrée ; l'onglet réhydrate l'état. |
| 11 | 🟡 Bas | Filtre **budget** mal calé/libellé en mode « par mois » (max du curseur figé sur l'annuel). | `effectiveBudgetMax` dépend du `priceMode` ; libellé dynamique (mensuel/annuel). |

---

## À valider en recette *live* (non corrigés — dépendent des données réelles)

Ces 2 points n'ont **pas** été corrigés à l'aveugle car le comportement dépend des
données ou d'une intention produit à confirmer :

1. **Somme des prix par garantie ≠ prix annuel affiché.** Le serveur
   (`compare-service.ts`) et le front (`results-helpers.ts`/`offer-card.tsx`)
   utilisent deux normalisations de libellés différentes (`normalizeGuaranteeText`
   vs `normalizeGuaranteeName` + `resolveCoverageName`). Pour des libellés avec
   tiret/underscore, une ligne affichée peut ne pas être comptée par le serveur
   (ou l'inverse). *À vérifier sur les `coverages`/`features` réels ; corriger en
   unifiant la normalisation.*
2. **« Demander un devis » depuis le catalogue** appelle `setSelectedOffer` puis
   `setView("compare")`, mais `ComparisonForm` ne lit jamais `selectedOffer` :
   l'offre choisie n'est pas pré-remplie. Impact limité (toutes les offres
   éligibles réapparaissent après comparaison). *À confirmer : comportement voulu
   ou pré-remplissage attendu ?*

## Notes (non-bugs)

- Onglets sans appel API (écrans statiques/vides) : côté utilisateur
  (avis, paiements, historique), côté assureur (contrats, clients, sinistres).
  Ce sont des fonctionnalités **non branchées**, pas des bugs front/route — à
  activer seulement si prévues dans cette version.
- KPI « Notifications » du tableau de bord utilisateur codé à `0` (placeholder, au
  même titre que « Économies réalisées » affiché « — »). Laissé tel quel : décision
  d'affichage, pas un bug.
- `pricing-service.ts` : branche morte `seatsRaw === "+8"` (le formulaire produit
  `"9+"`), sans impact — `parseInt("9+")` = 9. Non corrigé (aucun effet).

---

## Vérification post-correctifs

`tsc --noEmit` : **0 erreur** · `eslint` : **0** · `vitest` : **98/98** ·
`next build` : **OK**. Aucun changement de comportement hors des bugs traités.

---

# 2e passe (re-recette) — vérification des correctifs + nouveaux bugs

Après application des 11 correctifs ci-dessus, une **2e recette** a (a) vérifié
chaque correctif et (b) cherché ce qui restait sous un autre angle (cycle de
chargement, rafraîchissement après action, états d'erreur, validations).

## Vérification des 11 correctifs
Tous **confirmés corrects**. Deux compléments détectés et traités (voir ci-dessous :
filtre d'audit incomplet).

## Nouveaux bugs corrigés (2e passe)

| # | Grav. | Bug | Correctif |
|---|---|---|---|
| 12 | 🔴 **Haute** | **Onglet « Mes Offres » (assureur) bloqué sur le squelette** : `fetchOffers` ne remettait jamais `loading` à `false` sur le chemin succès. **Bug pré-existant dans `2.0.0`.** | `finally { setLoading(false) }` ajouté. |
| 13 | 🟠 Moy | Filtre **« Entité »** des journaux d'audit **incomplet** : 5 entités non filtrables (garanties, catégories, règles tarifaires, rôles/profil). | 5 `SelectItem` ajoutés (Coverage, CoverageCategory, InsuranceCategory, CoverageTariffRule, Profile). |
| 14 | 🟠 Moy | **« Mes Devis » masquait les pannes** : erreur réseau/500 avalée → affichait « Aucun devis » même quand l'utilisateur en a. | État d'erreur + bouton « Réessayer » ajoutés. |
| 15 | 🟡 Bas | Filtre **« Action »** des journaux : 3 options mortes (LOGIN/LOGOUT/EXPORT jamais écrites) + 3 manquantes (REGISTER, BACKUP_DELETE, BACKUP_RESTORE). | Menu réaligné sur les actions réellement journalisées. |
| 16 | 🟡 Bas | Offres : bornes **min > max** acceptées (prix, puissance, valeurs). | Contrôle `min ≤ max` ajouté (POST + PUT). |

## Points laissés à décision produit / recette live (non corrigés)

- **CTA « Demander un devis » du catalogue** : `selectedOffer` est défini mais
  **jamais consommé** → l'utilisateur atterrit sur un formulaire vierge, l'offre
  choisie est perdue. *Bug ou simple point d'entrée ? À trancher côté produit.*
- **« Contrats actifs » (tableau de bord user)** compte les devis `APPROVED` et non
  les contrats `ACTIVE` de `/api/user/contracts` → un contrat expiré reste compté.
  *À confirmer (intention).*
- **KPI « Notifications »** du tableau de bord user codé à `0` (placeholder).
- **Garantie « montant fixe » à 0** acceptée (montant non validé à l'étape 3).
- **Devis assureur** : `limit=100` sans pagination → au-delà de 100 devis, les
  suivants ne s'affichent pas (à traiter selon la volumétrie réelle).

## Vérification post-correctifs (2e passe)
`tsc` **0** · `eslint` **0** · `vitest` **98/98** · `next build` **OK**.

---

# 3e passe (re-recette) — régression, logique métier, zones non couvertes

Angle différent des 2 premières passes : (a) **régression** des 16 correctifs,
(b) **justesse des calculs** de tarification, (c) **auth / routage / formatage**.

## Régression des 16 correctifs
**Aucune régression.** Les 16 correctifs sont vérifiés corrects et complets
(tsc 0, 98/98 tests). Rien de cassé, changements additifs/correctifs.

## Nouveaux bugs corrigés (3e passe)

| # | Grav. | Bug | Correctif |
|---|---|---|---|
| 17 | 🔴 Haute | **Liens directs / favoris / liens partagés cassés** : ouvrir une URL de sous-page (`/faq`, `/espace-client`…) dans un navigateur neuf renvoyait sur l'accueil (la vue persistée écrasait l'URL au montage). | Au 1er rendu, l'URL prime sur la vue persistée (drapeau `didInitialSync`). |
| 18 | 🔴 Haute | **Session expirée / non connecté sur écran protégé** : l'utilisateur restait bloqué sur un chrome privé vide (erreurs 401), sans redirection. | Garde ajoutée : écran protégé + `!isLoggedIn` → retour à l'accueil. |
| 19 | 🟠 Moy | Header **« Mon profil »** : un ADMIN atterrissait sur l'accueil (impasse). | Branche ADMIN ajoutée (→ espace admin), bureau + mobile. |

*(Les bugs 18 couvre aussi le cas « accès non connecté à une vue protégée ».)*

## ⚠️ À décider par le métier — calcul du prix (NON corrigé volontairement)

Ces points touchent le **calcul du prix affiché** : les corriger changerait le prix
de **toutes** les offres. **Décision métier requise** — je ne modifie rien sans
validation (des tests verrouillent le comportement actuel).

1. **Prix total basé sur le texte marketing (`features`), pas sur les garanties
   réelles.** `compare-service.ts` calcule une somme « propre » (`grossPremium` =
   garanties matchées + obligatoires) mais **ne l'utilise pas** : le prix affiché
   (`annualPrice`) additionne les garanties dont le **nom apparaît dans `features`**.
   Conséquences possibles : (a) **double comptage** si deux libellés pointent vers la
   même garantie ; (b) **garantie obligatoire non citée = exclue du prix**.
   *Recommandation : baser le prix sur `grossPremium`, ou dédupliquer + inclure
   systématiquement les garanties obligatoires. À valider (impacte tous les devis).*
2. **`monthlyPrice` = prime ÷ `contractDuration`**, pas ÷ 12 → le « mensuel » est en
   fait « montant par échéance ». Nom/logique à clarifier.
3. **Remise fiscale 5 % + frais** (`calculateNetPremium`) **calculés mais jamais
   appliqués** au prix présenté. Voulu ou oubli ?
4. **Valeur du véhicule absente → taux majoré appliqué** (au lieu de « non
   applicable »). À confirmer.

## Autres points à confirmer (mineurs, non corrigés)
- Dates malformées éventuelles affichées « Invalid Date » (plusieurs helpers sans
  garde `isNaN`) — dégradé, non bloquant, dépend de la validité des dates de l'API.
- `UserPaymentsTab` entièrement statique (aucun fetch) — placeholder ou
  fonctionnalité paiements non implémentée ?

## Vérification post-correctifs (3e passe)
`tsc` **0** · `eslint` **0** · `vitest` **98/98** · `next build` **OK**.

> ⚠️ Les correctifs 17-18 touchent le **routage/session** : à **confirmer en
> recette live** (liens directs, expiration de session, navigation retour).

---

# 4e passe — recette des 5 nouvelles fonctionnalités

Les onglets auparavant « vitrines » (placeholders sans appel API) sont désormais
**branchés sur la base**. Cette passe recette les 5 fonctionnalités ajoutées
récemment. Base : **Supabase / Postgres** (23 tables, 27 migrations), **71 routes
API**, **138 tests** verts. Nouvelles migrations : `20260810130000_reviews.sql`
et `20260810140000_claims.sql` (à appliquer via `supabase db push`).

## 4.1 Contrats (assureur) — `InsurerContractsTab`

- Route `GET /api/insurer/contracts` — `requireAuth(["INSURER"])`, identité tirée
  de la session (`getInsurerAccount`), filtre `eq("insurer_id", account.insurerId)`.
- Recette : un assureur ne voit **que ses propres contrats** (isolation par
  `insurer_id`). Champs exposés : `reference`, `status`, `start_date`, `end_date`,
  `premium`, `created_at`. ✅ Onglet fonctionnel (plus de KPI à 0).

## 4.2 Clients (assureur) — `InsurerClientsTab`

- Route `GET /api/insurer/clients` — `requireAuth(["INSURER"])`. Les clients sont
  **dérivés** des devis (`quotes` joints à `insurance_offers!inner` filtrés sur
  `offer.insurer_id`) **et** des contrats (`contracts.profile_id` filtrés sur
  `insurer_id`), puis dédupliqués.
- Recette : la liste ne contient que les clients ayant interagi avec l'assureur
  connecté — pas de fuite inter-assureurs. ✅ Onglet fonctionnel (plus de table
  vide « Aucun client trouvé »).

## 4.3 Mes Avis (client) — `UserReviewsTab`

- Table `reviews` (migration `20260810130000_reviews.sql`) : note `1–5`
  (`reviews_rating_check`), commentaire optionnel, **1 avis par (client, assureur)**
  (`reviews_unique_per_insurer`), RLS activée.
- Routes : `GET /api/reviews` (avis du client connecté, join `insurers`),
  `POST /api/reviews` — validation `rating` entier 1–5, `upsert` sur
  `(profile_id, insurer_id)` (un avis modifiable, pas de doublon).
- Recette : les **faux avis codés en dur** (« Jean Dupont », « SAHAM »…) signalés
  dans l'audit d'interfaces sont **remplacés par de vrais avis** issus de la base.
  Note hors bornes → 400. Deux soumissions sur le même assureur → mise à jour
  (pas de second avis). ✅ Correctif de confiance/compliance appliqué.

## 4.4 Paiements (client) — `UserPaymentsTab`

- Pas de table dédiée : l'onglet lit `GET /api/user/contracts` et affiche les
  **primes des contrats** (`premium`) du client (échéances/paiements dérivés des
  contrats). ✅ Onglet fonctionnel (plus de totaux figés à 0).
- Recette : les montants affichés correspondent aux `premium` réels des contrats
  du client connecté ; propriété vérifiée côté route (`profile_id` = session).

## 4.5 Sinistres (client + assureur) — `User*` / `InsurerClaimsTab`

- Table `claims` (migration `20260810140000_claims.sql`) : `reference`
  (`NOLI-SIN-XXXXXX`, unique), `contract_id`, `profile_id`, `insurer_id`, `type`
  (`ACCIDENT | VOL | BRIS_GLACE | INCENDIE | AUTRE`), `description`,
  `incident_date`, `status` (`SUBMITTED | IN_REVIEW | APPROVED | REJECTED |
  CLOSED`, `claims_status_check`), RLS activée.
- **Déclaration client** : `POST /api/claims` — auth requise, `contractId` valide
  et **appartenant au client** (contrat introuvable → 404), `type` dans la liste,
  `description` ≥ 10 caractères, `incident_date` valide si fournie ; création en
  statut `SUBMITTED`. `GET /api/claims` = sinistres du client connecté.
- **Traitement assureur** : `GET /api/insurer/claims` filtré sur
  `eq("insurer_id", account.insurerId)` ; `PUT /api/insurer/claims/[id]/status` —
  `requireAuth(["INSURER"])`, statut validé contre `VALID_STATUSES`, contrôle
  d'appartenance (`claim.insurerId === account.insurerId`, sinon **403** « Ce
  sinistre ne concerne pas vos contrats »).
- Recette : un client ne déclare un sinistre que sur **ses** contrats ; un
  assureur ne voit et ne fait évoluer le statut que des sinistres de **ses**
  contrats. Statut invalide → 400. ✅ Onglets Sinistres fonctionnels (plus de
  KPI/workflow décoratifs).

## Vérification (4e passe)
`tsc` **0** · `eslint` **0** · `vitest` **138 tests** · `next build` **OK**.
Sécurité des nouvelles routes : voir la note de contre-audit dans
`AUDIT_SECURITE_2.0.0.md` et `RECAP_AUDIT_NOLI.md`.
