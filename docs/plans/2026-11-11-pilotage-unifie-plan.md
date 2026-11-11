# Pilotage unifié (livraison 1) — plan d'implémentation

> **Pour l'exécution :** `superpowers:executing-plans` en direct (choix validé, cadrage § 5 bis), sous `disciplined-execution`. Étapes à cocher (`- [ ]`).

**But :** `/pilotage` devient la seule page d'analyse, en trois onglets (Indicateurs, Veille, Analyses) sur une même période, `/veille` redirige, et les Analyses perdent leurs doublons.

**Architecture :** un composant client `PilotageOnglets` porte le sélecteur de période et les onglets (Radix Tabs, déjà dans `components/ui/tabs`). L'onglet et la période vivent dans l'adresse (`?onglet=&debut=&fin=`). Chaque onglet garde son propre chargement et ses états, et ne charge ses données qu'une fois affiché (Radix démonte les onglets inactifs). Aucune action serveur, aucun schéma ni aucun export n'est modifié.

**Pile :** Next.js 15 App Router, React 19, shadcn/ui (Tabs), Recharts 2.15, Playwright (tests unitaires via `npm run test:unit`, E2E via le skill `base-test`).

**Cadrage :** `docs/plans/2026-11-11-simplification-modules-et-tableau-de-bord-design.md` (F1, § 5 bis, § 5 ter).

## Contraintes globales

- Rôles inchangés : `/pilotage` réservé à ADMIN et AVANCE (`requireRole(['ADMIN', 'AVANCE'])`, sinon `redirect('/')`).
- Toute URL retirée redirige : `/veille` → `/pilotage?onglet=veille` en gardant `debut` et `fin`.
- Valeurs d'onglet : `indicateurs` (défaut), `veille`, `analyses`. Libellés : « Indicateurs », « Veille », « Analyses ».
- Aucune suppression d'un graphique ou d'un tableau avant la validation de l'inventaire (tâche 1) par Abel.
- Pas de nouvelle dépendance, pas de mode sombre, cibles tactiles de 44 px (`min-h-11`, comme l'existant).
- Exports PDF et Excel des analyses : **inchangés** dans cette livraison (voir Inventaire, ligne X1).
- Tests E2E sur la base locale uniquement, par `base-test` ; `.env` et `.env.local` visent la production.

## Points de vigilance de la revue

1. Changer de période sur l'onglet Veille doit rester sur Veille : aujourd'hui `setPeriode` réécrit l'adresse avec `debut` et `fin` seuls, donc perdrait `onglet` (test unitaire en tâche 2, E2E en tâche 3).
2. Un ancien lien `/veille` sans dates, ou avec des dates invalides, arrive sur l'onglet Veille avec la période par défaut, sans erreur (E2E en tâche 3).
3. `?onglet=inconnu` affiche Indicateurs, jamais un écran vide (test unitaire en tâche 2).
4. EXPLOITATION ou VISITEUR sur l'ancien `/veille` finit sur `/`, sans aucune donnée affichée (E2E en tâche 3).
5. Un paramètre répété (`?debut=a&debut=b`, reçu en `string[]` par la page) ne fait pas planter la redirection : on prend la première valeur (test unitaire en tâche 2).

---

## Inventaire des graphiques et tableaux (tâche 1, à valider par Abel)

**Verdict d'Abel (2026-11-11) : toutes les propositions sont validées.** A3 : retirer. Le retrait de « par statut » en A10 est compris dans l'accord.

Règle du cadrage (§ 5 ter) : une question de décision, une notion à un seul endroit, un chiffre et une liste plutôt qu'un graphique quand ils disent la même chose, pas de camembert, chaque chiffre exact selon sa définition. Les constats viennent de `lib/actions/analytics.ts`, `lib/pilotage/calculs.ts` et `lib/veille/calculs.ts`.

**Onglet Indicateurs** (l'actuel haut de `/pilotage`)

| # | Élément | Question de décision | Proposition |
|---|---------|----------------------|-------------|
| I1 | Conversion attribué → facturé | La valeur gagnée devient-elle du chiffre d'affaires ? | **Garder** |
| I2 | Issue des offres (par lot) | Combien d'offres perd-on, et lesquelles ? | **Garder** |
| I3 | Écart de prix face au gagnant | De combien sommes-nous trop chers ? | **Fusionner avec V2** : même notion, deux chiffres possibles (I3 compte les lots perdus avec montant concurrent ; V2 exige aussi le nom du concurrent). Garder V2, retirer I3. |
| I4 | Marchés historiques | Que sont devenus les marchés saisis sans opportunité ? | **Garder** |
| I5 | Qualité des données | Quelles fiches faussent les chiffres ? | **Garder** |

**Onglet Veille** (l'actuelle `/veille`)

| # | Élément | Question de décision | Proposition |
|---|---------|----------------------|-------------|
| V1 | Couverture (lots documentés) | Peut-on se fier à la veille ? | **Garder** |
| V2 | Écart moyen global (% et FCFA) | De combien sommes-nous trop chers ? | **Garder** (reçoit I3) |
| V3 | Classements Concurrent / Autorité / Véhicule | Qui nous bat, où, sur quel véhicule ? | **Garder** (déjà des listes) |
| V4 | Chronologie, non documentées, doublons possibles | Que s'est-il passé, que faut-il compléter ? | **Garder** |

**Onglet Analyses** (les actuelles « Analyses détaillées »)

| # | Élément | Constat | Proposition |
|---|---------|---------|-------------|
| A1 | Tuiles Performance : total marchés, gagnés, montant total, délai moyen | « Montant total » additionne gagnés, perdus, annulés et infructueux ; « gagnés » double I2 sur une autre date de référence ; « délai moyen » (délai d'exécution contractuel) ne sert aucune décision | **Retirer** les quatre |
| A2 | Répartition des marchés par statut (camembert) | Où en sont nos marchés ? Camembert interdit | **Remplacer par une liste** : statut, nombre ; un clic ouvre le détail existant (`DrillDownSheet`) |
| A3 | Top concurrents identifiés (champ du marché) | Double V3. **Mais** la Veille ne lit que les lots : les gagnants saisis sur les marchés d'avant les lots ne seraient plus visibles nulle part | **Retirer** (recommandé, ces données sont visées par le chantier D6), ou **déplacer** dans l'onglet Veille sous « Marchés historiques » : **choix d'Abel** |
| A4 | Tuiles financières : CA contractualisé, encaissé, en attente, cautions actives | Deuxième définition du chiffre d'affaires dans la même page (statuts et date de référence différents de I1) ; « cautions actives » ignore la période | **Retirer** les quatre |
| A5 | Graphique CA contractualisé / encaissé / en attente | Même chose que A4 | **Retirer** |
| A6 | Factures par statut (barres) | Où sont bloquées nos factures ? Le bloc « À traiter » du futur tableau de bord listera les factures échues | **Retirer** |
| A7 | Tuiles Capitalisation : nombre d'autorités, gagnés, segment le plus rentable, top organisme | « Nombre d'autorités » plafonné à 10 (compté sur le top 10) ; « segment le plus rentable » compte aussi les marchés perdus | **Retirer** les quatre |
| A8 | Top 10 autorités contractantes (Capitalisation, montants de tous les marchés) | Doublon de A11 ; le montant mélange gagnés et perdus | **Retirer** |
| A9 | Saisonnalité « des appels d'offres » (courbe) | Compte les marchés **notifiés** par mois, pas les appels d'offres : le titre est faux | **Retirer** |
| A10 | SAV : tuiles, interventions par type, par statut, top véhicules défaillants | Quels véhicules et quels types d'intervention nous coûtent ? | **Garder** les tuiles et le top véhicules ; **liste** à la place des barres « par type » (nombre, coût) ; **retirer** « par statut » |
| A11 | Opportunités : tuiles, répartition par statut, top 10 autorités, montants du pipeline | Où en est le pipeline, avec qui ? « Gagnées » et « offres soumises » doublent I2 sur une autre date | **Retirer** les tuiles ; **liste** par statut (nombre, montant proposé, clic → détail) qui absorbe « montants du pipeline » ; **garder** le top 10 autorités en **liste** (nombre, gagnées, clic → détail) |
| X1 | Exports PDF et Excel des analyses | Ils reprennent A1 à A11 tels quels | **Inchangés dans cette livraison**, alignés dans une livraison suivante après ce verdict (dette notée) |

---

### Tâche 1 : Validation de l'inventaire

**Fichiers :** modifier ce plan (colonne « Proposition », ligne par ligne).

- [x] **Étape 1 :** présenter l'inventaire à Abel ; il tranche chaque ligne, dont le choix A3.
- [x] **Étape 2 :** reporter le verdict en tête de l'inventaire et commiter : `git commit -m "docs(plans): inventaire des graphiques de Pilotage validé"`.

Les tâches 2 et 3 n'en dépendent pas et peuvent avancer avant ; **la tâche 4 attend ce verdict.**

### Tâche 2 : onglet et période dans l'adresse

**Fichiers :**
- Créer : `lib/pilotage/onglets.ts`
- Modifier : `lib/veille/periode.ts`, `hooks/use-periode-url.ts`
- Tests : `tests/unit/pilotage-onglets.spec.ts` (créer), `tests/unit/veille-periode.spec.ts` (compléter)

**Interfaces :**
- Produit, dans `lib/pilotage/onglets.ts` :
  - `export const ONGLETS_PILOTAGE = ['indicateurs', 'veille', 'analyses'] as const`
  - `export type OngletPilotage = (typeof ONGLETS_PILOTAGE)[number]`
  - `export function lireOnglet(valeur: string | null): OngletPilotage`
  - `export function avecOnglet(recherche: string, onglet: OngletPilotage): string` : renvoie la chaîne de recherche (sans `?`) avec `onglet` posé, les autres paramètres gardés
  - `export function urlVeilleVersPilotage(debut?: string | string[], fin?: string | string[]): string`
- Produit, dans `lib/veille/periode.ts` : `export function avecPeriode(recherche: string, periode: Periode): string` (même principe, pose `debut` et `fin`)

- [ ] **Étape 1 : écrire les tests qui échouent**

```ts
// tests/unit/pilotage-onglets.spec.ts
test('onglet absent ou inconnu → indicateurs', () => {
  expect(lireOnglet(null)).toBe('indicateurs')
  expect(lireOnglet('inconnu')).toBe('indicateurs')
  expect(lireOnglet('veille')).toBe('veille')
})
test("changer d'onglet garde la période", () => {
  expect(avecOnglet('debut=2026-01-01&fin=2026-06-30', 'analyses'))
    .toBe('debut=2026-01-01&fin=2026-06-30&onglet=analyses')
  expect(avecOnglet('onglet=veille&debut=2026-01-01', 'indicateurs'))
    .toBe('onglet=indicateurs&debut=2026-01-01')
})
test('redirection de /veille', () => {
  expect(urlVeilleVersPilotage('2026-01-01', '2026-06-30'))
    .toBe('/pilotage?onglet=veille&debut=2026-01-01&fin=2026-06-30')
  expect(urlVeilleVersPilotage()).toBe('/pilotage?onglet=veille')
  expect(urlVeilleVersPilotage(['2026-01-01', '2027-01-01'], undefined))
    .toBe('/pilotage?onglet=veille&debut=2026-01-01')
})
// tests/unit/veille-periode.spec.ts (ajout)
test("changer de période garde l'onglet", () => {
  const p = lirePeriodeUrl('2026-01-01', '2026-06-30', MAINTENANT)
  expect(avecPeriode('onglet=veille&debut=2025-01-01&fin=2025-02-01', p))
    .toBe('onglet=veille&debut=2026-01-01&fin=2026-06-30')
})
```

- [ ] **Étape 2 :** `npm run test:unit -- tests/unit/pilotage-onglets.spec.ts tests/unit/veille-periode.spec.ts` → ÉCHEC (fonctions absentes).
- [ ] **Étape 3 : implémenter** avec `URLSearchParams` (`set` garde la place d'une clé existante ; `toString()`). `urlVeilleVersPilotage` prend la première valeur d'un tableau et omet une valeur absente ; les dates ne sont pas validées ici (`lirePeriodeUrl` s'en charge à l'arrivée).
- [ ] **Étape 4 :** dans `usePeriodeUrl`, `setPeriode` écrit `` `${pathname}?${avecPeriode(searchParams.toString(), p)}` `` au lieu de `parametresPeriode(p)` seul.
- [ ] **Étape 5 :** relancer la commande de l'étape 2 → SUCCÈS ; `npm run typecheck` → 0 erreur.
- [ ] **Étape 6 :** `git commit -m "feat(pilotage): onglet et période gardés dans l'adresse"`

### Tâche 3 : trois onglets sur /pilotage, redirection de /veille, menu

**Fichiers :**
- Créer : `app/(dashboard)/pilotage/PilotageOnglets.tsx`
- Déplacer : `app/(dashboard)/veille/VeilleClient.tsx` → `app/(dashboard)/pilotage/VeilleClient.tsx` (`git mv`)
- Modifier : `app/(dashboard)/pilotage/page.tsx`, `app/(dashboard)/pilotage/PilotageClient.tsx`, `app/(dashboard)/veille/page.tsx`, `components/layout/dashboard-shell.tsx`
- Tests : `tests/v1/pilotage.spec.ts`, `tests/v1/veille.spec.ts`

**Interfaces :**
- Consomme : `lireOnglet`, `avecOnglet`, `urlVeilleVersPilotage` (tâche 2), `usePeriodeUrl`.
- Produit : `export function PilotageOnglets()` (client) ; `PilotageClient({ periode }: { periode: Periode })` ; `VeilleClient({ periode }: { periode: Periode })` ; `AnalytiquesTab({ periode })` (inchangé).

- [ ] **Étape 1 : écrire les E2E qui échouent**
  - `veille.spec.ts`, test 4 remplacé par « l'ancienne adresse redirige vers l'onglet Veille » : `goto('/veille?debut=2026-01-01&fin=2026-06-30')` → `toHaveURL(/\/pilotage\?onglet=veille&debut=2026-01-01&fin=2026-06-30/)`, `getByRole('tab', { name: 'Veille' })` a `aria-selected="true"`, texte « période du 01/01/2026 au 30/06/2026 » visible.
  - Nouveau test, « période et onglet se gardent l'un l'autre » : sur l'onglet Veille, clic sur « 30 jours » → l'URL contient encore `onglet=veille` ; clic sur l'onglet « Analyses » → l'URL garde les `debut` et `fin` de « 30 jours » ; rechargement → Analyses toujours sélectionné.
  - Nouveau test, « ancien lien sans dates ou invalide » : `goto('/veille?debut=xx')` → onglet Veille sélectionné, phrase de période affichée (période par défaut).
  - Test 1 complété : EXPLOITATION sur `/veille` → `toHaveURL('/')` ; le menu d'un AVANCE n'a plus de lien « Veille » (`getByRole('link', { name: 'Veille', exact: true })` a 0 occurrence), mais garde « Pilotage ».
  - Les autres tests de `veille.spec.ts` gardent `goto('/veille')`, ce qui couvre aussi la redirection.
  - `pilotage.spec.ts`, « un seul sélecteur de période » : vérifier `getByText('Période :')` à 1 sur chacun des trois onglets.
- [ ] **Étape 2 :** E2E `tests/v1/pilotage.spec.ts tests/v1/veille.spec.ts` par `base-test` → les nouveaux tests ÉCHOUENT.
- [ ] **Étape 3 : `PilotageOnglets`** : `usePeriodeUrl()`, puis `PeriodSelector` et la phrase « Tous les chiffres de la page portent sur la période du … au … » (sortis de `PilotageClient`, une seule fois pour la page) ; `Tabs` contrôlé par `value={lireOnglet(searchParams.get('onglet'))}`, `onValueChange` → `router.replace(` `` `/pilotage?${avecOnglet(searchParams.toString(), v)}` ``, `{ scroll: false })` ; trois `TabsTrigger` en `min-h-11` dans un `TabsList` qui passe à la ligne (`h-auto flex-wrap justify-start`, comme dans `VeilleClient`) ; chaque `TabsContent` reçoit `periode`.
- [ ] **Étape 4 :** `PilotageClient` et `VeilleClient` prennent `periode` en prop et perdent le sélecteur, la phrase de période et les liens croisés (« Voir la veille concurrentielle », « Retour au pilotage ») ; `PilotageClient` perd la section « Analyses détaillées ». Leurs chargements, erreurs et états vides restent tels quels.
- [ ] **Étape 5 :** `pilotage/page.tsx` rend `<PilotageOnglets />` dans le `Suspense` ; sous-titre : « Indicateurs de décision, veille concurrentielle et analyses, sur une même période. »
- [ ] **Étape 6 :** `veille/page.tsx` devient une redirection, sur le modèle de `dossiers-offre/page.tsx` : `searchParams: Promise<{ debut?: string | string[]; fin?: string | string[] }>`, `await requireAuth()`, `permanentRedirect(urlVeilleVersPilotage(debut, fin))`. Le contrôle des rôles reste celui de `/pilotage`.
- [ ] **Étape 7 :** `dashboard-shell.tsx` : retirer l'entrée `/veille` du menu et de `pageTitles`, et l'import `Eye` s'il devient orphelin.
- [ ] **Étape 8 :** relancer l'E2E de l'étape 2 → SUCCÈS ; `npm run typecheck`, `npm run lint` → OK.
- [ ] **Étape 9 :** `git commit -m "feat(pilotage): Indicateurs, Veille et Analyses en onglets, /veille redirige"`

### Tâche 4 : dédoublonnage des Analyses (selon le verdict de la tâche 1)

**Fichiers :** `components/analytique/{Performance,Financiere,Capitalisation,SAV,Opportunites}Section.tsx`, `components/analytique/AnalytiquesTab.tsx`, `app/(dashboard)/pilotage/PilotageClient.tsx` (I3) ; tests : `tests/v1/pilotage.spec.ts`.

**Interfaces :** consomme les types existants de `lib/analytics/types.ts`, sans les modifier. Les champs que l'écran n'affiche plus restent calculés côté serveur : les exports les lisent (X1).

- [ ] **Étape 1 : écrire l'E2E qui échoue**, « les Analyses n'affichent chaque notion qu'une fois », sur `/pilotage?onglet=analyses` : `page.locator('.recharts-pie')` à 0 occurrence ; « Top 10 Autorités Contractantes » à 1 occurrence au plus ; aucune occurrence de « CA contractualisé », « Montant total », « Saisonnalité », « Top concurrents identifiés » ; une ligne de la liste des statuts de marché, au clavier (`Enter`), ouvre le panneau de détail. Sur l'onglet Indicateurs, « Écart de prix face au gagnant » est absent si I3 est validé.
- [ ] **Étape 2 :** E2E `tests/v1/pilotage.spec.ts` par `base-test` → ÉCHEC.
- [ ] **Étape 3 :** appliquer chaque ligne validée. Une liste = boutons pleine largeur, `min-h-11`, libellé à gauche et chiffres à droite (`tabular-nums`), clic → `DrillDownSheet` existant via `getMarchesByStatut`, `getOpportunitesByStatut` ou `getOpportunitesByAC`. Une section entièrement vidée disparaît, son état vide avec. Retirer les imports et constantes de couleur devenus orphelins.
- [ ] **Étape 4 :** relancer l'E2E → SUCCÈS ; `npm run typecheck`, `npm run lint`, `npm run test:unit` → OK.
- [ ] **Étape 5 :** `git commit -m "refactor(pilotage): une notion par endroit dans les Analyses"`

### Tâche 5 : contrôles avant la PR

Suivre le cadrage § 5 bis, dans cet ordre : `simplify` ; agent `ui-ux-reviewer` sur `/pilotage` (trois onglets) ; `agent-browser` sur la base locale (clavier, 375 / 768 / 1920 px, aucun débordement) ; E2E complets `pilotage` + `veille` par `base-test` ; `superpowers:verification-before-completion` ; `code-review` depuis `origin/main`.

- [ ] **Étape 1 :** chaque contrôle passé, ses constats corrigés ou notés en dette avec l'accord d'Abel.
- [ ] **Étape 2 :** ARRÊT, geste distant : feu vert d'Abel pour le push, puis séparément pour la fusion, qui déploie (`production-steps.md`).
