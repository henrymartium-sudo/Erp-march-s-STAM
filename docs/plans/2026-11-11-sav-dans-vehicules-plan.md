# SAV dans Véhicules (livraison 2) — plan d'implémentation

> **Pour l'exécution :** `superpowers:executing-plans` en direct (cadrage § 5 bis), sous `disciplined-execution`. Étapes à cocher (`- [ ]`).

**But :** la vue globale SAV devient un onglet de `/vehicules` (« Parc » / « SAV »), `/vehicules/sav` redirige, l'entrée « SAV » quitte le menu, et les `revalidatePath` morts des dossiers d'offre sont retirés.

**Architecture :** l'onglet vit dans l'adresse (`/vehicules` = Parc, `/vehicules?onglet=sav` = SAV). La page `/vehicules` reste un composant serveur : elle ne charge que les données de l'onglet affiché. Le contenu SAV actuel (KPI + liste) est déplacé tel quel dans un composant serveur. Aucune action serveur de lecture, aucun schéma, aucun e-mail, aucune règle d'alerte ne change.

**Pile :** Next.js 15 App Router (composants serveur), React 19, Tailwind, Playwright (unitaires `npm run test:unit`, E2E via le skill `base-test`).

**Cadrage :** `docs/plans/2026-11-11-simplification-modules-et-tableau-de-bord-design.md` (F3, F5, § 4 livraison 2, § 5 bis).

## Contraintes globales

- Rôles inchangés : la vue SAV reste ouverte à tout utilisateur connecté (`getInterventionsGlobales` = `requireAuth`) ; les actions du Parc (export, « Nouveau véhicule ») gardent leurs contrôles actuels et n'apparaissent pas sur l'onglet SAV.
- Toute URL retirée redirige : `/vehicules/sav` → `/vehicules?onglet=sav`.
- Valeurs d'onglet : `parc` (défaut, adresse sans paramètre) et `sav`. Libellés : « Parc », « SAV ».
- Un seul `<h1>` par page : « Véhicules » (le titre « SAV — Vue globale » disparaît, c'est le bug de titre F2 du cadrage).
- Aucun e-mail, aucun moteur d'alerte, aucun schéma touché. Pas de nouvelle dépendance, pas de mode sombre, cibles tactiles de 44 px (`min-h-11`).
- Tests E2E sur la base locale uniquement, par `base-test` ; `.env` et `.env.local` visent la production.

## Points de vigilance de la revue

1. `?onglet=inconnu` ou répété (`?onglet=sav&onglet=parc`, reçu en `string[]`) affiche le Parc ou la première valeur, jamais un écran vide (test unitaire, tâche 1).
2. Les filtres du Parc (`search`, `statut`, `marque`, `page`) ne fuient pas dans le lien de l'onglet SAV, et l'onglet Parc ne reprend pas `onglet=sav` (tâche 2).
3. Un VISITEUR garde l'accès à la vue SAV, et ne gagne ni l'export ni « Nouveau véhicule » (E2E, tâche 6).
4. Les actions SAV (création, modification, suppression d'intervention) rafraîchissent bien la vue SAV de `/vehicules` (tâche 5).
5. À 375 px, l'onglet SAV ne déborde pas horizontalement (E2E, tâche 6).

---

### Tâche 1 : Lecture de l'onglet dans l'adresse (pur, testé)

**Fichiers :**
- Créer : `lib/vehicules/onglets.ts`
- Test : `tests/unit/vehicules-onglets.spec.ts`

**Interfaces :**
- Produit : `type OngletVehicules = 'parc' | 'sav'`
- Produit : `lireOngletVehicules(valeur: string | string[] | undefined): OngletVehicules` — absent, inconnu ou vide → `'parc'` ; tableau → première valeur.
- Produit : `urlOngletVehicules(onglet: OngletVehicules): string` — `'parc'` → `'/vehicules'`, `'sav'` → `'/vehicules?onglet=sav'`.

- [ ] **Étape 1 : écrire le test (rouge)** dans `tests/unit/vehicules-onglets.spec.ts`, même style que `tests/unit/pilotage-onglets.spec.ts`. Assertions :
  - `lireOngletVehicules(undefined)` = `'parc'` ; `('')` = `'parc'` ; `('inconnu')` = `'parc'` ; `('sav')` = `'sav'` ; `(['sav', 'parc'])` = `'sav'` ; `(['x', 'sav'])` = `'parc'`.
  - `urlOngletVehicules('parc')` = `'/vehicules'` ; `urlOngletVehicules('sav')` = `'/vehicules?onglet=sav'`.
- [ ] **Étape 2 :** `npm run test:unit -- vehicules-onglets` → échec attendu (module absent).
- [ ] **Étape 3 :** implémenter `lib/vehicules/onglets.ts` (mêmes conventions que `lib/pilotage/onglets.ts`).
- [ ] **Étape 4 :** même commande → vert.
- [ ] **Étape 5 : commit** `feat(vehicules): lecture de l'onglet Parc/SAV dans l'adresse`.

### Tâche 2 : Onglets et vue SAV dans `/vehicules`

**Fichiers :**
- Créer : `components/vehicules/vehicules-onglets.tsx` (composant serveur : `nav` de deux liens)
- Créer : `components/vehicules/sav-vue-globale.tsx` (composant serveur asynchrone)
- Modifier : `app/(dashboard)/vehicules/page.tsx`

**Interfaces :**
- Consomme : `lireOngletVehicules`, `urlOngletVehicules` (tâche 1).
- Produit : `VehiculesOnglets({ onglet }: { onglet: OngletVehicules })` — `<nav aria-label="Sections de la page Véhicules">` avec deux `Link` (« Parc », « SAV ») vers `urlOngletVehicules(...)`, le lien actif porte `aria-current="page"`, classes de `TabsList`/`TabsTrigger` existantes pour l'aspect, `min-h-11`. Liens et non Radix Tabs : l'onglet change d'adresse et le contenu est rendu par le serveur.
- Produit : `SavVueGlobale()` — contenu actuel de `app/(dashboard)/vehicules/sav/page.tsx` **sans** le fil d'Ariane, sans le `<h1>` ni la description (appels `getInterventionsGlobales({ limit: 50 })` et `getMetriquesSAVGlobales()`, quatre KPI, liste « Dernières interventions » : déplacés sans modification de leur logique ni de leur texte).

- [ ] **Étape 1 :** créer `sav-vue-globale.tsx` par déplacement du contenu SAV (garder les imports utiles, retirer `auth`, `redirect`, `BreadcrumbNav` qui restent à la page).
- [ ] **Étape 2 :** créer `vehicules-onglets.tsx`.
- [ ] **Étape 3 :** modifier `vehicules/page.tsx` : lire `onglet` depuis `searchParams` (type `onglet?: string | string[]` ajouté). Si `sav` : `PageHeader` titre « Véhicules », description « Suivi des interventions sur l'ensemble du parc », sans `action` ; puis `VehiculesOnglets` ; puis `<SavVueGlobale />` ; aucune requête `getVehicules`. Sinon : le flux actuel inchangé, avec `VehiculesOnglets onglet="parc"` inséré juste après le `PageHeader` (et au-dessus de la carte d'erreur dans la branche d'échec). L'authentification par `auth()` reste celle d'aujourd'hui.
- [ ] **Étape 4 :** `npm run typecheck` → 0 erreur.
- [ ] **Étape 5 : commit** `feat(vehicules): onglet SAV dans la page Véhicules`.

### Tâche 3 : Redirection de l'ancienne adresse

**Fichiers :**
- Modifier : `app/(dashboard)/vehicules/sav/page.tsx` (devient une redirection)
- Supprimer : `app/(dashboard)/vehicules/sav/loading.tsx`

**Interfaces :**
- Consomme : `urlOngletVehicules('sav')`, `requireAuth` (`@/lib/utils/permissions`).

- [ ] **Étape 1 :** réécrire la page sur le modèle de `app/(dashboard)/veille/page.tsx` : `await requireAuth()` puis `permanentRedirect(urlOngletVehicules('sav'))`. Choix : redirection permanente comme `/veille` ; un retour arrière de la PR laisserait des navigateurs qui ont vu la 308 sur `/vehicules?onglet=sav`, qui affiche alors le Parc (sans perte de données).
- [ ] **Étape 2 :** supprimer `sav/loading.tsx` (sans objet sur une redirection ; `vehicules/loading.tsx` couvre l'onglet).
- [ ] **Étape 3 : commit** `feat(vehicules): /vehicules/sav redirige vers l'onglet SAV`.

### Tâche 4 : Menu et titres

**Fichiers :**
- Modifier : `components/layout/dashboard-shell.tsx` (lignes `navItems` SAV et `pageTitles` `'/vehicules/sav'`, import `Wrench` devenu orphelin)
- Modifier : `tests/layout/a11y-shell.spec.ts`

- [ ] **Étape 1 : adapter le test (rouge)** : dans `a11y-shell.spec.ts`, les constantes `SAV_PATH = '/vehicules?onglet=sav'` et `SAV_TITLE = 'Véhicules'` ; les trois tests F02/#008/jumeau attendent désormais : titre topbar « Véhicules », un seul `<h1>` « Véhicules », un seul item de nav actif dont le `href` est `/vehicules`. Mettre à jour le commentaire d'en-tête (le cas SAV n'existe plus comme sous-route ; les assertions restent des garde-fous du shell). Le `goto` compare le chemin sans la requête : il renavigue toujours, sans conséquence.
- [ ] **Étape 2 :** retirer l'entrée SAV de `navItems`, l'entrée `'/vehicules/sav'` de `pageTitles` et l'import `Wrench` (seul usage, ligne 58). Laisser intacts `getPageTitle` et `isActive` (logique « préfixe le plus long » toujours correcte ; hors périmètre).
- [ ] **Étape 3 :** `npm run typecheck` et `npm run lint` → aucune erreur, plafond ESLint 172 respecté.
- [ ] **Étape 4 : commit** `feat(menu): l'entrée SAV quitte le menu ; titres de la topbar`.

### Tâche 5 : `revalidatePath` morts et rafraîchissement de la vue SAV

**Fichiers :**
- Modifier : `lib/actions/interventions.ts` (lignes 77, 180, 222, 249)
- Modifier : `lib/actions/dossiers-offre.ts` (lignes 170, 216, 217, 251, 318-320)

- [ ] **Étape 1 :** `interventions.ts` : ligne 77, supprimer `revalidatePath('/vehicules/sav')` (la ligne 75 revalide déjà `/vehicules`) ; lignes 180, 222, 249, remplacer `'/vehicules/sav'` par `'/vehicules'` (la vue SAV est désormais cette page ; la revalidation d'un chemin couvre ses paramètres d'adresse).
- [ ] **Étape 2 :** `dossiers-offre.ts` : supprimer les cinq `revalidatePath('/dossiers-offre…')` (ces pages ne font que rediriger ; les pages Opportunité qui affichent les dossiers sont `force-dynamic`), supprimer le bloc `if (piece.dossierId) { … }` devenu vide, et l'import `revalidatePath` s'il n'est plus utilisé (`grep -n revalidatePath lib/actions/dossiers-offre.ts`).
- [ ] **Étape 3 :** `npm run typecheck` ; `grep -rn "vehicules/sav\|dossiers-offre'" lib app components` ne montre plus que la redirection de la tâche 3 et les pages de redirection des dossiers.
- [ ] **Étape 4 : commit** `refactor(actions): revalidations des dossiers d'offre et du SAV alignées sur les pages réelles`.

### Tâche 6 : Tests E2E (base locale, skill `base-test`)

**Fichiers :**
- Créer : `tests/vehicules/sav-onglet.spec.ts`
- Modifier : `tests/layout/overflow.spec.ts` (ajouter `'/vehicules?onglet=sav'` à `PAGES`)

- [ ] **Étape 1 : écrire le test** `tests/vehicules/sav-onglet.spec.ts` (connexion par `login`, `TEST_USERS`, clé visiteur à confirmer dans `tests/helpers/auth.ts`). Assertions :
  - ADMIN ouvre `/vehicules/sav` : l'adresse devient `/vehicules?onglet=sav` ; le lien « SAV » a `aria-current="page"` ; « Total interventions » est visible ; un seul `h1` « Véhicules » ; « Nouveau véhicule » est absent.
  - ADMIN ouvre `/vehicules` : le lien « Parc » a `aria-current="page"` ; « Total interventions » est absent ; « Nouveau véhicule » est visible.
  - `/vehicules?onglet=inconnu` affiche le Parc.
  - Le lien « SAV » est `/vehicules?onglet=sav` même après un filtre posé sur le Parc (`/vehicules?statut=…&page=2`) ; le lien « Parc » est `/vehicules`.
  - VISITEUR : voit « Total interventions » sur `/vehicules?onglet=sav` et n'a ni « Nouveau véhicule » ni menu d'export.
  - Menu : aucun lien `a[href="/vehicules/sav"]` dans `nav[aria-label="Navigation principale"]`.
- [ ] **Étape 2 :** `overflow.spec.ts` : ajouter le chemin à `PAGES` (768, 1024, 1280 px). Le contrôle à 375 px est une assertion du nouveau spec (`scrollWidth <= innerWidth` sur l'onglet SAV), pour ne pas changer `WIDTHS` des autres pages.
- [ ] **Étape 3 :** lancer par `base-test` : `tests/vehicules/sav-onglet.spec.ts`, `tests/layout/a11y-shell.spec.ts`, `tests/layout/overflow.spec.ts`, `tests/permissions/vehicules-permissions.spec.ts`, `tests/exports/vehicules-exports.spec.ts` → tout vert.
- [ ] **Étape 4 : commit** `test(vehicules): onglet SAV, redirection, droits, 375 px`.

### Tâche 7 : Contrôles de fin de livraison

- [ ] **Étape 1 :** `npm run ci` (typecheck, lint, tests unitaires, build) → vert.
- [ ] **Étape 2 :** `simplify` sur le diff, puis agent `ui-ux-reviewer` sur `/vehicules` (Parc et SAV) à 1920, 768 et 375 px, au clavier (cadrage § 5 bis).
- [ ] **Étape 3 :** `superpowers:verification-before-completion`, puis `code-review` (normes du dépôt et conformité au cadrage).
- [ ] **Étape 4 :** aperçu en direct proposé à Abel (`apercu`), lancé seulement sur son « oui ».
- [ ] **Étape 5 :** protocole de mise en production (`disciplined-execution`, `references/production-steps.md`) : feu vert d'Abel pour le push, puis pour la fusion en squash (déploie en production) ; avant le push, aucune valeur réelle, aucun chemin local dans le diff (dépôt public) ; contrôle après déploiement de `/vehicules?onglet=sav` et de `/vehicules/sav` ; repli noté (rétablir le déploiement précédent depuis Vercel). Aucun e-mail envoyé.
