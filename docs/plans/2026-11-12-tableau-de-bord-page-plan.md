# Nouvelle page d'accueil (livraison 7) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** remplacer la page `/` par le tableau de bord de la maquette v3 (À traiter, cinq voyants, pipeline), branché sur `getTableauDeBordData()`, avec les droits par rôle déjà appliqués côté serveur.

**Architecture :** une page serveur unique (`app/(dashboard)/page.tsx`) qui lit `?vue=` dans l'URL, appelle `getTableauDeBordData()` dans un `Suspense`, et rend des composants serveur (`components/tableau-de-bord/`). Aucun composant client : le filtre est un jeu de liens, le repli « Ce mois-ci » est un `<details>`. Les décisions de présentation (vue, comptages, délais, verbes, liens) vivent dans un module pur testé en unitaire (`lib/tableau-de-bord/presentation.ts`). Deux changements de données accompagnent la page : la règle des marchés en fin d'exécution (§5 ter du design) et les liens de phase du pipeline qui listent tous les statuts comptés (§5 bis, point 1).

**Tech Stack :** Next.js 15 (RSC, `searchParams` asynchrone), React 19, shadcn/ui, Tailwind, lucide-react, Playwright (unitaire `npm run test:unit` ; E2E via le skill `base-test`).

**Spec :** `docs/plans/2026-11-12-tableau-de-bord-page-design.md` (en entier, surtout §3, §4, §5 bis, §5 ter) ; cadrage `docs/plans/2026-11-11-simplification-modules-et-tableau-de-bord-design.md` §3-§4 ; données `docs/plans/2026-11-12-donnees-tableau-de-bord-plan.md` ; maquette v3 https://claude.ai/code/artifact/f0633563-e57a-4bd0-8ab0-d26e2c4892d3.

## Global Constraints

- **Aucune nouvelle règle de calcul** hors §5 ter : si l'affichage révèle un défaut de règle, le signaler, ne pas recalculer dans l'interface.
- **Aucune migration Prisma, aucun e-mail touché**, aucune bibliothèque ajoutée : shadcn/ui et jetons existants (`globals.css`, `tailwind.config.ts`). **Pas de mode sombre.**
- **Un bloc `null` disparaît** (ni cadre vide, ni cadenas) ; **un `montant: null` n'affiche rien** (ni « — », ni 0).
- **Aucun montant ni donnée de passation** dans le HTML pour les rôles sans droit : l'interface ne reçoit que ce que `getTableauDeBordData()` renvoie, et ne recalcule rien.
- **Un bloc en erreur** (`status: 'error'`) affiche un message dans son cadre ; les autres blocs restent affichés.
- **Un seul `<h1>`** sur `/`, texte exact « Tableau de bord » (test `tests/layout/a11y-shell.spec.ts`).
- État d'un voyant montré par **icône et texte**, jamais par la couleur seule. Cibles tactiles ≥ 44 px (`min-h-11`), aucun débordement horizontal à 375 px.
- Libellés et commentaires en français. Dates et délais au jour calendaire UTC (`joursDepuis`, `horizonDe` de `lib/tableau-de-bord/dates.ts`).
- Vérification de fin : `npm run ci` (tsc, ESLint au plafond de 172 avertissements, tests unitaires, build). **Pas de push, de PR ni de fusion sans accord d'Abel** (la fusion sur `main` déploie en production).

## Choix de Claude à confirmer à la relecture

1. **Liens des voyants** vers la liste existante la plus proche, sans filtre nouveau (design §5). Ce sont des surensembles, notés ici : Encaissements → `/factures` (le filtre `statut` des factures n'accepte qu'une valeur, or le voyant couvre `EMISE` et `EN_ATTENTE`) ; Reste à facturer → `/marches` ; Cautions → `/cautions?dateEcheanceFin=<aujourd'hui + 30 j>` (inclut des cautions qui ne sont plus nécessaires) ; Dépôts → `/opportunites?echeance=a-venir` (la liste n'a pas de fenêtre de 14 jours).
2. **Taux de succès sans lien pour VISITEUR** : `/pilotage` est réservé à ADMIN et AVANCE (il renvoie vers `/` sinon). Lien seulement pour `canWrite(role)`.
3. **Création** : « Nouvelle opportunité » et « Créer… » seulement pour `canWrite(role)` (ADMIN, AVANCE), règle commune aux cinq pages de création. `/marches/nouveau` n'a pas de garde de page (la garde est dans l'action serveur) : non touché.
4. **Verbe d'action = libellé simple** dans une ligne entièrement cliquable (design §5 bis, point 3).

## Review Focus

1. **Marché en exécution et fin prévue** (tâche 1) : fin prévue hier → « Réception définitive à obtenir » en retard ; aujourd'hui → « Fin d'exécution proche » (pas en retard) ; J+30 visible, J+31 absent ; sans fin prévue → listé dans les données manquantes, jamais perdu.
2. **Chiffre ≠ liste** (tâche 2) : le clic sur une phase du pipeline ouvre exactement les lignes comptées, y compris `IDENTIFIEE` et `SOUMISE` ; un statut inconnu dans l'URL est ignoré sans erreur.
3. **Lien mort selon le rôle** (tâches 3 et 5) : VISITEUR ne doit voir aucun lien vers `/pilotage` ni aucun bouton de création.
4. **EXPLOITATION** (tâches 3, 4 et 7) : `?vue=passation` forcé à « exécution », aucun filtre affiché, aucun pipeline, aucun montant dans le HTML.
5. **Rien à traiter / aucune donnée** (tâches 4 et 5) : message clair au lieu d'un vide ; voyants à 0 ou gris lisibles ; un bloc en erreur n'empêche pas les autres.

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `lib/tableau-de-bord/a-traiter.ts` (modifier) | Règle §5 ter : deux natures remplacent `A_CLOTURER`, nouveau manquant |
| `lib/utils/opportunite-filters.ts` (modifier) | Filtre `statut` multi-valeurs (`statuts`) et `serialiserStatuts` |
| `lib/tableau-de-bord/pipeline.ts` (modifier) | `href` de phase = tous les statuts comptés |
| `lib/tableau-de-bord/presentation.ts` (créer) | Vue, filtrage, compteurs, délais, verbes, seuils en clair, liens |
| `components/tableau-de-bord/*.tsx` (créer) | `EnTete`, `FiltreVue`, `BlocATraiter`, `LigneATraiterItem`, `Voyants`, `PipelineOffres`, `BlocIndisponible`, `SqueletteTableauDeBord` |
| `app/(dashboard)/page.tsx` (réécrire) | Page serveur, `Suspense`, droits |
| `components/dashboard/`, `lib/dashboard/`, `get*Stats` (supprimer) | Orphelins de l'ancienne page (après vérification) |
| `tests/unit/tableau-de-bord-*.spec.ts`, `tests/unit/opportunite-filters-statuts.spec.ts` | Unitaires |
| `tests/dashboard/tableau-de-bord.spec.ts` (créer), anciens specs (supprimer ou réécrire) | E2E par rôle |

---

### Task 1 : marchés en fin d'exécution (design §5 ter)

**Files :**
- Modify : `lib/tableau-de-bord/a-traiter.ts` (type `NatureEcheance`, `LIBELLES`, boucle des marchés, `ResultatATraiter.manquants`)
- Modify : `tests/unit/tableau-de-bord-a-traiter.spec.ts`, `tests/unit/tableau-de-bord-droits.spec.ts` (fixture `manquants`)

**Interfaces :**
- Produces : `NatureEcheance` perd `'A_CLOTURER'` et gagne `'FIN_EXECUTION_PROCHE'` et `'RECEPTION_DEFINITIVE'` ; libellés « Fin d'exécution proche » et « Réception définitive à obtenir » ; `ResultatATraiter['manquants']` gagne `marchesEnExecutionSansFin: ElementLie[]`.

- [ ] **Step 1 : écrire les tests qui échouent** (`AUJ = 2026-11-12T15:30:00Z`, un marché `EN_EXECUTION` par cas, domaine `exec`, `href: /marches/<id>`) :
  - `dateFinPrevue 2026-11-09` → une ligne `RECEPTION_DEFINITIVE`, horizon `retard`, libellé « Réception définitive à obtenir », `sansRattrapage false` ;
  - `2026-11-12` → `FIN_EXECUTION_PROCHE`, horizon `semaine` ; `2026-12-12` → `FIN_EXECUTION_PROCHE`, horizon `mois` ; `2026-12-13` → aucune ligne ;
  - `dateFinPrevue null` → aucune ligne et `manquants.marchesEnExecutionSansFin` égal à `[{ libelle: numero, href }]` ;
  - un marché `EN_ATTENTE_LIVRAISON_OS` avec `dateFinPrevue` passée → aucune des deux natures ; l'ancien test `A_CLOTURER` est remplacé.
- [ ] **Step 2 : `npm run test:unit -- tests/unit/tableau-de-bord-a-traiter.spec.ts`** — attendu : échec (nature inconnue).
- [ ] **Step 3 : implémenter** dans `construireATraiter` : pour `statut === 'EN_EXECUTION'` avec `dateFinPrevue`, nature `passee(dateFinPrevue) ? 'RECEPTION_DEFINITIVE' : 'FIN_EXECUTION_PROCHE'` ; `manquants.marchesEnExecutionSansFin` = marchés `EN_EXECUTION` sans `dateFinPrevue`. Corriger la fixture de `tableau-de-bord-droits.spec.ts` pour que `tsc` passe.
- [ ] **Step 4 : `grep -rn "A_CLOTURER" lib app components tests`** — attendu : aucun résultat ; puis `npm run typecheck` et `npm run test:unit` — attendu : verts.
- [ ] **Step 5 : commit** `feat(tableau-de-bord): un marché en exécution reste à traiter jusqu'à la réception définitive`.

### Task 2 : liens de phase du pipeline (design §5 bis, point 1)

**Files :**
- Modify : `lib/utils/opportunite-filters.ts`, `lib/tableau-de-bord/pipeline.ts`, `app/(dashboard)/opportunites/page.tsx:58,73`, `components/opportunites/opportunite-filters.tsx:35,134-142`
- Test : `tests/unit/opportunite-filters-statuts.spec.ts` (créer), `tests/unit/tableau-de-bord-pipeline.spec.ts` (modifier)

**Interfaces :**
- Produces : `OpportuniteFilters.statuts?: StatutOpportunite[]` (au moins deux statuts) ; `parseOpportuniteFilters` lit le paramètre `statut` séparé par des virgules : un seul statut valide → `statut`, deux ou plus → `statuts` (sans doublon), aucun valide → rien ; `buildOpportuniteWhere` traite `statuts` comme `statut` (prime sur la phase) ; `serialiserStatuts(f: Pick<OpportuniteFilters, 'statut' | 'statuts'>): string | undefined` (valeurs jointes par `,`).

- [ ] **Step 1 : écrire les tests qui échouent** : `parse({ statut: 'EN_ANALYSE,IDENTIFIEE' })` → `statuts` égal aux deux, `statut` indéfini ; `parse({ statut: 'GO,XYZ' })` → `statut === 'GO'` ; `parse({ statut: 'XYZ' })` → ni `statut` ni `statuts` ; `buildOpportuniteWhere({ statuts: [...] })` → `{ AND: [{ statut: { in: [...] } }] }` sans clause de phase ; `serialiserStatuts` rend l'entrée de `parse` ; pour chaque phase de `PHASES_PIPELINE`, `parse({ statut: <fin de href> })` redonne exactement `inclut` (ou `statut` pour une phase à un seul statut). Dans le test du pipeline : `href` de « En analyse » = `/opportunites?statut=EN_ANALYSE,IDENTIFIEE`, de « Go » = `/opportunites?statut=GO`.
- [ ] **Step 2 : lancer les deux fichiers** — attendu : échec.
- [ ] **Step 3 : implémenter** les trois fonctions ci-dessus et `href: /opportunites?statut=${inclut.join(',')}`. Dans `opportunites/page.tsx`, `hasFilters` tient compte de `statuts`, et le filtre transmis à l'export vaut `statut: serialiserStatuts(filters)` (`ExportMenu` et `export-excel-button` typent déjà `statut` en `string` ; les exports de `lib/actions/exports.ts:1314,1606` passent par `parseOpportuniteFilters` et suivent seuls). Dans `opportunite-filters.tsx`, quand `statut` contient une virgule, ajouter un `SelectItem` portant cette valeur, libellé « Plusieurs statuts », pour que la sélection reste lisible et ne soit pas perdue.
- [ ] **Step 4 : `npm run test:unit` et `npm run typecheck`** — attendu : verts.
- [ ] **Step 5 : commit** `fix(opportunites): le filtre de statut accepte plusieurs statuts ; les phases du pipeline listent les lignes comptées`.

### Task 3 : module de présentation (pur)

**Files :**
- Create : `lib/tableau-de-bord/presentation.ts`
- Test : `tests/unit/tableau-de-bord-presentation.spec.ts`

**Interfaces :**
- Consumes : `ResultatATraiter`, `LigneATraiter`, `NatureEcheance` (tâche 1), `Horizon`, `joursDepuis`.
- Produces :
  - `type Vue = 'tout' | 'passation' | 'exec'` ; `parseVue(param: string | string[] | undefined, role: string | null | undefined): Vue` — `passation` → `'passation'`, `execution` → `'exec'`, tout le reste → `'tout'`, **sauf EXPLOITATION qui reçoit toujours `'exec'`** ; `paramVue(v: Vue): string | undefined` (`undefined` pour `'tout'`).
  - `filtrerATraiter(r: ResultatATraiter, vue: Vue): ResultatATraiter` — lignes selon `domaine` ; `opportunitesSansDateDepot` côté passation, `marchesSansDateLivraison`, `marchesEnExecutionSansFin` et `facturesSansDate` côté exécution.
  - `compteursHorizon(lignes: LigneATraiter[]): { retard: number; semaine: number; mois: number; sansRattrapage: Record<Horizon, number> }`.
  - `libelleDelai(echeance: Date, aujourdHui: Date): string` — « Échue depuis 12 j » (passée), « Aujourd'hui », « J-4 » (à venir).
  - `VERBES_ACTION: Record<NatureEcheance, string>` : `DEPOT_OFFRE` « Finaliser le dossier » ; `FIN_VALIDITE_OFFRE` « Proroger ou classer » ; `ATTRIBUTION_PROVISOIRE` « Suivre » ; `LIVRAISON_EN_RETARD` « Mettre à jour la livraison » ; `FIN_EXECUTION_PROCHE` « Préparer la réception » ; `RECEPTION_DEFINITIVE` « Relancer l'autorité » ; `GARANTIES_A_LIBERER` et `CAUTION_A_LIBERER` « Demander la mainlevée » ; `CAUTION_A_RENOUVELER` « Renouveler » ; `FACTURE_ECHUE` « Relancer ».
  - `voyantsVisibles(vue: Vue): { encaissements: boolean; cautions: boolean; resteAFacturer: boolean; tauxSucces: boolean; depots: boolean }` (exécution : les trois premiers ; passation : les deux derniers ; `tout` : tous) et `pipelineVisible(vue: Vue): boolean` (`vue !== 'exec'`).
  - `lienVoyant(nom: keyof ReturnType<typeof voyantsVisibles>, role: string | null | undefined, aujourdHui: Date): string | null` — liens du choix 1, `/pilotage` pour le taux de succès seulement si `canWrite` (sinon `null`). La date de `dateEcheanceFin` du voyant Cautions est le jour UTC + 30 j au format `AAAA-MM-JJ`.
  - `SEUILS_EN_CLAIR: Record<'encaissements' | 'resteAFacturer' | 'cautions' | 'depots' | 'tauxSucces', string>` : Encaissements « Orange dès 20 % en retard, rouge dès 40 % ou une facture en retard de plus de 45 j » ; Reste à facturer « Orange si un reste à facturer date de plus de 15 j après la réception, rouge au-delà de 30 j » ; Cautions « Orange sous 30 j, rouge sous 7 j avant l'échéance » ; Dépôts « Dépôts des 14 prochains jours ; rouge sans dossier ou à 3 j ou moins avec pièces manquantes » ; Taux de succès « Orange dès 10 points sous la moyenne de 24 mois, rouge dès 20 points ; gris sous 5 résultats ».
  - `ETATS_VOYANT: Record<EtatVoyant, string>` : vert « Correct », ambre « À surveiller », rouge « Urgent », gris « Pas assez de données ».

- [ ] **Step 1 : écrire les tests qui échouent** : `parseVue('execution', 'ADMIN') === 'exec'` ; `parseVue('passation', 'EXPLOITATION') === 'exec'` ; `parseVue('xyz', 'ADMIN') === 'tout'` ; `filtrerATraiter` ne garde que les lignes `exec` en vue `exec` et vide `opportunitesSansDateDepot` ; `compteursHorizon` compte 2 en retard dont 1 sans rattrapage sur un jeu de 3 lignes ; `libelleDelai` rend « Échue depuis 12 j » pour 12 jours de retard, « Aujourd'hui » pour le jour même, « J-4 » pour J+4 ; `lienVoyant('tauxSucces', 'VISITEUR', AUJ) === null` et `=== '/pilotage'` pour `'AVANCE'` ; `lienVoyant('cautions', 'ADMIN', AUJ) === '/cautions?dateEcheanceFin=2026-12-12'` ; `VERBES_ACTION` couvre toutes les natures.
- [ ] **Step 2 : lancer `npm run test:unit -- tests/unit/tableau-de-bord-presentation.spec.ts`** — attendu : échec, module introuvable.
- [ ] **Step 3 : implémenter** le module sans accès base ni import NextAuth (`lib/utils/permissions.ts` ne se charge pas en test unitaire, voir `droits.ts`) : pour le rôle, comparer `role === 'ADMIN' || role === 'AVANCE'` comme `droitsTableauDeBord`.
- [ ] **Step 4 : relancer** — attendu : verts. **Step 5 : commit** `feat(tableau-de-bord): module de présentation de la page d'accueil`.

### Task 4 : en-tête, filtre et bloc « À traiter »

**Files :**
- Create : `components/tableau-de-bord/EnTete.tsx`, `FiltreVue.tsx`, `BlocATraiter.tsx`, `LigneATraiterItem.tsx`, `BlocIndisponible.tsx`

**Interfaces :**
- Consumes : tâche 3 (tout le module), `BlocTableauDeBord<ResultatATraiter>` de `lib/actions/tableau-de-bord.ts`, `canWrite` de `lib/utils/permissions.ts`, `formatMontant` de `lib/utils/format`.
- Produces (composants serveur) :
  - `EnTete({ role, aujourdHui }: { role: string | null | undefined; aujourdHui: Date })` — `<h1>` « Tableau de bord », date du jour en français (UTC), puis si `canWrite(role)` : bouton « Nouvelle opportunité » (`/opportunites/nouvelle`) et menu « Créer… » (`DropdownMenu` shadcn : marché `/marches/nouveau`, caution `/cautions/nouvelle`, véhicule `/vehicules/nouveau`, facture `/factures/nouvelle`).
  - `FiltreVue({ vue }: { vue: Vue })` — trois liens « Tout », « Passation », « Exécution et finances » (`/`, `/?vue=passation`, `/?vue=execution`), `aria-current="page"` sur le lien actif. Non rendu pour EXPLOITATION (la page décide).
  - `BlocATraiter({ bloc, vue, aujourdHui }: { bloc: BlocTableauDeBord<ResultatATraiter>; vue: Vue; aujourdHui: Date })` — erreur → `BlocIndisponible` ; sinon `filtrerATraiter`, compteurs d'horizon, groupes « En retard » et « Cette semaine » ouverts, « Ce mois-ci » dans un `<details>` replié, chaque groupe annonçant « N échéances, dont M sans rattrapage » ; encadré « Données manquantes » (chaque élément est un lien) ; si aucune ligne : message « Rien à traiter pour le moment. » (jamais un vide).
  - `LigneATraiterItem({ ligne, aujourdHui })` — toute la ligne est un `Link` vers `ligne.href` : icône par nature (lucide-react), `ligne.libelle`, `ligne.reference`, montant seulement si `ligne.montant !== null`, `libelleDelai`, date, marque « Sans rattrapage » si besoin, verbe `VERBES_ACTION[ligne.nature]`.
  - `BlocIndisponible({ titre }: { titre: string })` — `role="alert"`, texte « {titre} est indisponible. Rechargez la page. ».

- [ ] **Step 1 : écrire les composants** d'après la maquette v3 (mise en page d'une colonne) et les jetons existants ; réutiliser `Card`, `Badge`, `Button` de shadcn.
- [ ] **Step 2 : `npm run typecheck && npm run lint`** — attendu : aucune erreur nouvelle, avertissements ≤ 172.
- [ ] **Step 3 : commit** `feat(tableau-de-bord): en-tête, filtre de vue et bloc À traiter`. Ces composants sont exercés par l'E2E de la tâche 7 (ils ne sont pas encore montés).

### Task 5 : voyants et pipeline

**Files :**
- Create : `components/tableau-de-bord/Voyants.tsx`, `PipelineOffres.tsx`

**Interfaces :**
- Consumes : `TableauDeBordData['voyants']` et `['pipeline']`, `voyantsVisibles`, `pipelineVisible`, `lienVoyant`, `SEUILS_EN_CLAIR`, `ETATS_VOYANT` (tâche 3), `BlocIndisponible` (tâche 4), `formatMontant`.
- Produces :
  - `Voyants({ voyants, vue, role, aujourdHui })` — pour chaque voyant visible dont le bloc n'est pas `null` : une carte avec icône **et** texte d'état (`ETATS_VOYANT`), valeur, une ligne de détail, seuil en clair ; la carte est un lien si `lienVoyant` ne renvoie pas `null` ; bloc en erreur → `BlocIndisponible`. Valeurs : Encaissements « {pourcentageEnRetard} % en retard » + total non encaissé, avec « N factures non datées, non comptées » si `facturesSansDate.length > 0` ; Reste à facturer « {marches.length} marché(s), total {total} » ; Cautions « {sous30} sous 30 j » (+ « la plus proche dans N j ») ; Dépôts « {nonPrets} sur {depotsSous14} non prêts » ; Taux de succès « {taux6Mois} % sur 6 mois » ou « Pas assez de résultats ({resultats6Mois}) ». Les montants des voyants Encaissements et Reste à facturer ne s'affichent que parce que ces blocs ne sont pas `null` (ADMIN, AVANCE).
  - `PipelineOffres({ pipeline, vue })` — rien si `pipeline === null` ou `!pipelineVisible(vue)` ; une barre par phase (libellé, nombre, montant si non `null`) qui est un lien vers `phase.href` ; total ; lien « Toutes les opportunités » (`/opportunites`) ; total à 0 → « Aucune offre en cours. ».

- [ ] **Step 1 : écrire les deux composants.** Le seul calcul toléré est l'affichage (arrondi, pluriel) ; aucun seuil, aucun état n'est recalculé.
- [ ] **Step 2 : `npm run typecheck && npm run lint`** — attendu : propres. **Step 3 : commit** `feat(tableau-de-bord): voyants et pipeline des offres`.

### Task 6 : page `/` et retrait de l'ancienne page

**Files :**
- Rewrite : `app/(dashboard)/page.tsx` ; Create : `components/tableau-de-bord/SqueletteTableauDeBord.tsx`
- Delete (après vérification) : `components/dashboard/*` (8 fichiers), `lib/dashboard/stats.ts`, `lib/dashboard/types.ts`, `getMarchesStats` (`lib/actions/marches.ts`), `getCautionsStats` (`lib/actions/cautions.ts`), `getVehiculesStats` (`lib/actions/vehicules.ts`), `getOpportunitesStats` (`lib/actions/opportunites.ts`) avec leurs types devenus orphelins

**Interfaces :**
- Consumes : tâches 3, 4 et 5, `getTableauDeBordData`, `auth`.
- Produces : `export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ vue?: string }> })` ; `SqueletteTableauDeBord()` (`role="status"`, `aria-label="Chargement du tableau de bord"`, `Skeleton` de shadcn).

- [ ] **Step 1 : réécrire la page** : `auth()` puis `redirect('/login')` si pas de session (comportement actuel conservé) ; `vue = parseVue((await searchParams).vue, role)` ; `EnTete`, puis `FiltreVue` (sauf EXPLOITATION), puis un `Suspense` (fallback `SqueletteTableauDeBord`) autour d'un composant serveur interne qui attend `getTableauDeBordData()` et rend, dans l'ordre : `BlocATraiter`, `Voyants` (titre « Est-ce que ça va ? »), `PipelineOffres`. `export const dynamic = 'force-dynamic'`. Plus de `<h1 className="sr-only">`.
- [ ] **Step 2 : vérifier les orphelins avant toute suppression** : `grep -rn "components/dashboard\|lib/dashboard\|getMarchesStats\|getCautionsStats\|getVehiculesStats\|getOpportunitesStats" app components lib tests` ; `getOpportunitesStats` de `lib/actions/analytics.ts` est une **autre** fonction (à garder). Supprimer ce qui n'a plus d'appelant, et seulement cela ; lister dans le message de commit ce qui reste volontairement.
- [ ] **Step 3 : `npm run typecheck && npm run lint && npm run test:unit`** — attendu : verts (plafond ESLint inchangé).
- [ ] **Step 4 : commit** `feat(tableau-de-bord): la page d'accueil devient le tableau de bord` (suppression des orphelins dans un commit séparé `refactor: retrait de l'ancienne page d'accueil`).

### Task 7 : E2E par rôle, responsive, clavier, qualité

**Files :**
- Create : `tests/dashboard/tableau-de-bord.spec.ts`
- Delete : `tests/dashboard/{kpi-cards,montants-chart,status-charts,quick-actions,recent-activity,alerts-section}.spec.ts` ; Rewrite : `auth.spec.ts`, `permissions.spec.ts`, `responsive.spec.ts` (garder leur intention : redirection hors connexion, accès par rôle, trois tailles), `tests/dashboard/README.md`, `tests/helpers/dashboard.ts` (`waitForDashboardLoaded` attend le `<h1>` « Tableau de bord » puis le texte « Est-ce que ça va ? » ; retirer les helpers devenus inutilisés après `grep`)

- [ ] **Step 1 : amorcer des données `[E2E-TDB]`** dans un `beforeAll` via `requeteLocale` (`tests/helpers/base-locale.ts`, garde 127.0.0.1:5433), modèle `tests/documents/liste-fiable.spec.ts`, nettoyage par préfixe dans `afterAll` : une facture `EMISE` avec échéance il y a 12 j ; un marché `EN_EXECUTION` dont la fin prévue est dépassée de 3 j ; un marché `EN_EXECUTION` sans fin prévue ; une opportunité `EN_ANALYSE` avec dépôt dans 3 j et sans dossier ; une opportunité `IDENTIFIEE`. Lire `prisma/schema.prisma` pour les colonnes obligatoires.
- [ ] **Step 2 : écrire les tests par rôle** (démarrer la base via le skill `base-test`, redémarrer `dev-test` avant chaque exécution, chauffer `/` en dernier) :
  - ADMIN : « Facture à encaisser », « Échue depuis 12 j » avec montant ; « Réception définitive à obtenir » ; le marché sans fin prévue dans « Données manquantes » ; la ligne de dépôt porte « Sans rattrapage » ; les cinq voyants ; « Nouvelle opportunité » et « Créer… » visibles ; le groupe « Ce mois-ci » est replié puis s'ouvre au clavier ; `?vue=passation` masque la facture et garde le pipeline ; `?vue=execution` masque le pipeline.
  - Pipeline : le nombre affiché sur « En analyse » est égal au nombre de lignes de `/opportunites?statut=EN_ANALYSE,IDENTIFIEE` après le clic (comparer, ne pas supposer un nombre absolu).
  - VISITEUR : aucun montant (aucun « XOF »/« FCFA » dans le texte de la page), voyants Encaissements et Reste à facturer absents, aucun lien `/pilotage`, aucun bouton de création.
  - EXPLOITATION : `?vue=passation` affiche quand même l'exécution ; aucun filtre, aucun pipeline, aucune ligne d'opportunité, aucun montant ; un seul `<h1>`.
  - Hors connexion : redirection vers `/login`.
  - Cohérence avec `/pilotage` : le taux de succès à 6 mois affiché à `/` est celui de `/pilotage` sur la même période ; si la période de `/pilotage` ne se fixe pas par l'URL, le dire et s'appuyer sur le test unitaire existant qui partage `calculerIssueOffres`.
- [ ] **Step 3 : lancer l'E2E** (`tests/dashboard`, `tests/layout/a11y-shell.spec.ts`, `tests/alertes/rules.spec.ts`, `tests/audit/audit-logs.spec.ts`) — attendu : verts ; toute autre spec qui visite `/` est relancée.
- [ ] **Step 4 : contrôles manuels** aux trois tailles (1920×1080, 768×1024, 375×667 : aucun débordement horizontal, mesuré par script en comparant `scrollWidth` à `clientWidth`), au clavier (ordre de tabulation, `<details>`, focus visible), puis revue de l'agent `ui-ux-reviewer` ; corriger les points « Bloquant » et « Important ».
- [ ] **Step 5 : `npm run ci`** — attendu : tout vert (tsc, ESLint ≤ 172, tests unitaires, build). Commit `test(tableau-de-bord): E2E par rôle de la nouvelle page d'accueil`.
- [ ] **Step 6 : fin de livraison** : proposer à Abel l'aperçu en direct (skill `apercu`, base de test locale) sans le lancer ; proposer le brouillon d'entrée du Journal de décisions ; **ne rien pousser** — push, PR et fusion attendent son accord explicite.
