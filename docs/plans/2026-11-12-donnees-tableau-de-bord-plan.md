# Données du tableau de bord (livraison 6) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** calculer, côté serveur et sans interface, tout ce que le nouveau tableau de bord affichera : la liste « À traiter », les cinq voyants et le pipeline des offres, avec les règles validées par Abel le 2026-11-12.

**Architecture :** des fonctions pures dans `lib/tableau-de-bord/` (testées en unitaire, sans base), alimentées par une seule action serveur `getTableauDeBordData()` qui lit la base avec des requêtes filtrées et applique les droits par rôle. Même schéma que `/pilotage` (`lib/pilotage/calculs.ts` + `lib/actions/pilotage.ts`) : un bloc en erreur n'empêche pas les autres.

**Tech Stack :** Next.js 15 (Server Actions), Prisma 7, TypeScript, tests unitaires Playwright (`npm run test:unit`, dossier `tests/unit/`).

**Spec :** `docs/plans/2026-11-11-simplification-modules-et-tableau-de-bord-design.md` §3 et §4 (livraison 6) ; Journal de décisions du 2026-11-12, entrées « maquette du tableau de bord validée (A + C) » et « règles des cinq voyants du tableau de bord » ; maquette version 3 (https://claude.ai/code/artifact/f0633563-e57a-4bd0-8ab0-d26e2c4892d3).

## Global Constraints

- **Aucune migration Prisma** dans cette livraison. Le délai de paiement par marché, le type de facture, le montant payé et la retenue de garantie sont la dette d'une livraison ultérieure (migration de production, sauvegarde avant).
- **Aucune interface** : les composants et la page `/` changent en livraison 7. L'ancienne page reste en place, intacte.
- **Un chiffre par notion** : réutiliser `lib/pilotage/calculs.ts` (`calculerIssueOffres`, `montantFacture`, `TOLERANCE_FACTURE`) au lieu de redéfinir.
- **Finances réservées à ADMIN et AVANCE** (décision 3 du cadrage), contrôlé côté serveur : pour les autres rôles, les voyants 1 et 5 et les lignes de facture ne sont **pas calculés ni envoyés**.
- **EXPLOITATION** : les lignes et voyants qui portent sur des marchés suivent `getMarcheStatutRestriction(role)` (marchés `EN_EXECUTION` seulement).
- Dates comparées **au jour calendaire UTC** (Togo = UTC+0). `aujourdHui` est toujours un paramètre des fonctions pures, jamais `new Date()` en dur.
- Délai de paiement par défaut : **45 jours calendaires** après la date de dépôt de la facture (décret 2022-080/PR, art. 145). La date de dépôt est `Facture.dateEmission` (hypothèse : aucun autre champ n'existe).
- Libellés et commentaires en français. Validation Zod côté serveur si l'action reçoit une entrée.

## Review Focus

1. **Facture sans `dateEmission`** : elle ne peut être ni « dans le délai » ni « en retard ». Elle compte dans le total non encaissé, et apparaît dans `manquants.facturesSansDate`. Elle ne fait jamais planter le calcul. (Test : tâche 3.)
2. **Aucune donnée** (aucune facture, aucune caution, aucune offre) : chaque voyant renvoie un état défini (vert à 0, ou gris pour le taux de succès), jamais `NaN` ni une division par zéro. (Tests : tâches 3 et 4.)
3. **Bornes des horizons** : une échéance aujourd'hui est « cette semaine », hier est « en retard », J+7 est « cette semaine », J+8 est « ce mois-ci », J+30 est « ce mois-ci », J+31 n'apparaît pas. (Test : tâche 1.)
4. **Rôle VISITEUR ou EXPLOITATION** : aucune valeur financière dans la réponse, même partielle. (Test : tâche 6.)
5. **Statuts historiques d'opportunité** (`IDENTIFIEE`, `SOUMISE`) : comptés dans la phase de leur équivalent (`EN_ANALYSE`, `OFFRE_SOUMISE`), jamais perdus. (Test : tâche 5.)

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `lib/tableau-de-bord/dates.ts` (créer) | Jours entre deux dates au jour UTC, horizon d'une échéance |
| `lib/tableau-de-bord/a-traiter.ts` (créer) | Types d'entrée et construction de la liste « À traiter » |
| `lib/tableau-de-bord/voyants.ts` (créer) | Les cinq voyants et leurs seuils |
| `lib/tableau-de-bord/pipeline.ts` (créer) | Les six phases du pipeline des offres |
| `lib/tableau-de-bord/droits.ts` (créer) | Ce que chaque rôle reçoit |
| `lib/actions/tableau-de-bord.ts` (créer) | Action serveur : requêtes Prisma filtrées, appel des fonctions pures |
| `lib/pilotage/calculs.ts:81` (modifier) | `montantFacture` accepte `Pick<MarchePilotage, 'factures'>` |
| `tests/unit/tableau-de-bord-*.spec.ts` (créer) | Un fichier de test par module |

---

### Task 1 : dates et horizons

**Files :**
- Create : `lib/tableau-de-bord/dates.ts`
- Test : `tests/unit/tableau-de-bord-dates.spec.ts`

**Interfaces :**
- Produces : `joursDepuis(date: Date, aujourdHui: Date): number` (positif si `date` est passée, au jour UTC) ; `type Horizon = 'retard' | 'semaine' | 'mois'` ; `horizonDe(echeance: Date, aujourdHui: Date): Horizon | null` ; constantes `JOURS_SEMAINE = 7`, `JOURS_MOIS = 30`.

- [ ] **Step 1 : écrire le test qui échoue**

```ts
const AUJ = new Date('2026-11-12T15:30:00Z')
test('horizons aux bornes', () => {
  expect(horizonDe(new Date('2026-11-11T23:59:00Z'), AUJ)).toBe('retard')
  expect(horizonDe(new Date('2026-11-12T00:00:00Z'), AUJ)).toBe('semaine')
  expect(horizonDe(new Date('2026-11-19T10:00:00Z'), AUJ)).toBe('semaine') // J+7
  expect(horizonDe(new Date('2026-11-20T00:00:00Z'), AUJ)).toBe('mois')    // J+8
  expect(horizonDe(new Date('2026-12-12T00:00:00Z'), AUJ)).toBe('mois')    // J+30
  expect(horizonDe(new Date('2026-12-13T00:00:00Z'), AUJ)).toBeNull()      // J+31
})
test('joursDepuis compte des jours calendaires UTC', () => {
  expect(joursDepuis(new Date('2026-09-28T23:00:00Z'), AUJ)).toBe(45)
  expect(joursDepuis(new Date('2026-11-13T01:00:00Z'), AUJ)).toBe(-1)
})
```

- [ ] **Step 2 : lancer `npm run test:unit -- tests/unit/tableau-de-bord-dates.spec.ts`** — attendu : échec, module introuvable.
- [ ] **Step 3 : implémenter `dates.ts`** en tronquant les deux dates à minuit UTC (`Date.UTC(y, m, d)`) avant la différence.
- [ ] **Step 4 : relancer** — attendu : 2 tests passent.
- [ ] **Step 5 : commit** `feat(tableau-de-bord): dates et horizons des échéances`

---

### Task 2 : liste « À traiter »

**Files :**
- Create : `lib/tableau-de-bord/a-traiter.ts`
- Test : `tests/unit/tableau-de-bord-a-traiter.spec.ts`

**Interfaces :**
- Consumes : `horizonDe`, `joursDepuis` (tâche 1).
- Produces :

```ts
export type NatureEcheance =
  | 'DEPOT_OFFRE' | 'FIN_VALIDITE_OFFRE' | 'ATTRIBUTION_PROVISOIRE'
  | 'LIVRAISON_EN_RETARD' | 'A_CLOTURER' | 'GARANTIES_A_LIBERER'
  | 'CAUTION_A_RENOUVELER' | 'CAUTION_A_LIBERER' | 'FACTURE_ECHUE'
export interface LigneATraiter {
  id: string; nature: NatureEcheance; domaine: 'passation' | 'exec'
  libelle: string; reference: string; href: string
  montant: number | null; echeance: Date; horizon: Horizon
  sansRattrapage: boolean
}
export interface OpportuniteEcheances { id: string; reference: string | null; objet: string; statut: StatutOpportunite; montantEstime: number | null; dateLimite: Date | null; periodeValiditeFin: Date | null; echeanceAttributionProv: Date | null }
export interface MarcheEcheances { id: string; numero: string; objet: string; statut: StatutMarche; montant: number; dateLivraisonPrevue: Date | null; dateFinPrevue: Date | null; garantiesLiberees: boolean | null }
export interface CautionEcheances { id: string; reference: string; type: TypeCaution; statut: StatutCaution; montant: number; dateEcheance: Date; opportunite: { id: string; statut: StatutOpportunite } | null; marche: { id: string; numero: string; statut: StatutMarche; garantiesLiberees: boolean | null } | null }
export interface FactureEcheances { id: string; numero: string; marcheId: string; statut: StatutFacture; montantTTC: number; dateEmission: Date | null; datePaiement: Date | null }
export interface SourcesATraiter { opportunites: OpportuniteEcheances[]; marches: MarcheEcheances[]; cautions: CautionEcheances[]; factures: FactureEcheances[] | null }
export interface ResultatATraiter { lignes: LigneATraiter[]; manquants: { opportunitesSansDateDepot: ElementLie[]; marchesSansDateLivraison: ElementLie[] } }
export function cautionEncoreNecessaire(c: CautionEcheances): boolean
export function construireATraiter(s: SourcesATraiter, aujourdHui: Date): ResultatATraiter
export const DELAI_PAIEMENT_DEFAUT = 45
```

Règles (une ligne par élément, gardée seulement si `horizonDe(echeance)` n'est pas `null`) :

| Nature | Source et condition | Échéance | Domaine | Sans rattrapage |
|---|---|---|---|---|
| `DEPOT_OFFRE` | opportunité au statut de `STATUTS_AVANT_SOUMISSION` avec `dateLimite` | `dateLimite` | passation | oui |
| `FIN_VALIDITE_OFFRE` | opportunité `OFFRE_SOUMISE`, `SOUMISE` ou `EN_ATTENTE_ATTRIBUTION` avec `periodeValiditeFin` | `periodeValiditeFin` | passation | oui |
| `ATTRIBUTION_PROVISOIRE` | opportunité `EN_ATTENTE_ATTRIBUTION` avec `echeanceAttributionProv` | `echeanceAttributionProv` | passation | non |
| `LIVRAISON_EN_RETARD` | marché `EN_ATTENTE_LIVRAISON_OS` avec `dateLivraisonPrevue` passée | `dateLivraisonPrevue` | exec | non |
| `A_CLOTURER` | marché `EN_EXECUTION` avec `dateFinPrevue` passée | `dateFinPrevue` | exec | non |
| `GARANTIES_A_LIBERER` | marché `EXECUTE_ATTENTE_GARANTIES`, `garantiesLiberees` différent de `true` ; une ligne par caution `ACTIVE` du marché | `dateEcheance` de la caution | exec | non |
| `CAUTION_A_RENOUVELER` | caution `ACTIVE` ou `EXPIREE` et `cautionEncoreNecessaire`, hors marché `EXECUTE_ATTENTE_GARANTIES` | `dateEcheance` | domaine de son rattachement | non |
| `CAUTION_A_LIBERER` | caution `ACTIVE` et **non** `cautionEncoreNecessaire` | `dateEcheance` | idem | non |
| `FACTURE_ECHUE` | si `factures !== null` : facture `EMISE` ou `EN_ATTENTE`, `dateEmission` non nulle, `datePaiement` nulle | `dateEmission + 45 j` | exec | non |

`cautionEncoreNecessaire(c)` : vrai si la caution est rattachée à une opportunité dont le statut est dans `PHASE_STATUTS['en-cours']`, ou à un marché dont le statut n'est ni `CLOTURE`, `RESILIE`, `ANNULE`, `INFRUCTUEUX` et dont `garantiesLiberees` n'est pas `true`. Faux sinon (y compris sans rattachement).

Tri : par `echeance` croissante ; à horizon égal, les lignes `sansRattrapage` d'abord. Les `href` : `/opportunites/<id>`, `/marches/<id>`, `/cautions/<id>`, `/factures/<id>`. `manquants` : opportunités de `STATUTS_AVANT_SOUMISSION` sans `dateLimite`, marchés `EN_ATTENTE_LIVRAISON_OS` sans `dateLivraisonPrevue`.

- [ ] **Step 1 : écrire les tests qui échouent** — un test par ligne du tableau, avec un cas qui entre et un cas qui sort, plus :
  - `'ordonne par échéance, sans rattrapage en tête à horizon égal'` ;
  - `'caution de soumission sur opportunité PERDUE : à libérer, pas à renouveler'` ;
  - `'caution de bonne exécution sur marché EN_EXECUTION expirant à J+6 : à renouveler, horizon semaine'` ;
  - `'factures null : aucune ligne FACTURE_ECHUE'` ;
  - `'facture émise le 2026-09-28 : échue le 2026-11-12, horizon semaine'` (45 j pile) ;
  - `'manquants : opportunité GO sans dateLimite, marché EN_ATTENTE_LIVRAISON_OS sans dateLivraisonPrevue'`.
- [ ] **Step 2 : lancer** `npm run test:unit -- tests/unit/tableau-de-bord-a-traiter.spec.ts` — attendu : échec.
- [ ] **Step 3 : implémenter `a-traiter.ts`.**
- [ ] **Step 4 : relancer** — attendu : tous passent.
- [ ] **Step 5 : commit** `feat(tableau-de-bord): règles de la liste À traiter`

---

### Task 3 : voyants de trésorerie (1 et 5)

**Files :**
- Create : `lib/tableau-de-bord/voyants.ts`
- Modify : `lib/pilotage/calculs.ts:81` — signature `montantFacture(m: Pick<MarchePilotage, 'factures'>): number`, corps inchangé
- Test : `tests/unit/tableau-de-bord-voyants.spec.ts`

**Interfaces :**
- Consumes : `joursDepuis` (tâche 1), `FactureEcheances`, `DELAI_PAIEMENT_DEFAUT` (tâche 2), `montantFacture`, `TOLERANCE_FACTURE` (Pilotage).
- Produces :

```ts
export type EtatVoyant = 'vert' | 'ambre' | 'rouge' | 'gris'
export interface Voyant<D> { etat: EtatVoyant; detail: D }
export interface DetailEncaissements { pourcentageEnRetard: number; totalNonEncaisse: number; enRetard: number; anciennete: { dansDelai: number; de46a90: number; plusDe90: number }; facturesSansDate: ElementLie[] }
export interface MarcheReception { id: string; numero: string; statut: StatutMarche; montant: number; dateReception: Date | null; factures: { statut: StatutFactureLite; montantTTC: number }[] }
export interface DetailResteAFacturer { marches: { id: string; numero: string; reste: number; joursDepuisReception: number }[]; total: number }
export function voyantEncaissements(factures: FactureEcheances[], aujourdHui: Date): Voyant<DetailEncaissements>
export function voyantResteAFacturer(marches: MarcheReception[], aujourdHui: Date): Voyant<DetailResteAFacturer>
```

Seuils (Journal 2026-11-12) :
- **Encaissements** : base = factures `EMISE` ou `EN_ATTENTE` sans `datePaiement`. Ancienneté = `joursDepuis(dateEmission)` : ≤ 45 dans le délai, 46-90, > 90. `pourcentageEnRetard` = montant en retard ÷ total non encaissé, arrondi à l'entier (0 si total nul). **Rouge** si ≥ 40 % ou une facture > 90 j ; **ambre** si ≥ 20 % ; sinon vert.
- **Reste à facturer** : marchés avec `dateReception` non nulle, statut ni `RESILIE` ni `ANNULE`. `reste = montant − montantFacture(m)`, compté seulement si `reste > montant × (TOLERANCE_FACTURE − 1)`. **Rouge** si un marché a un reste et plus de 30 j depuis la réception ; **ambre** si plus de 15 j ; sinon vert.

- [ ] **Step 1 : tests qui échouent**, avec ces valeurs exactes :
  - `'19 % en retard : vert'`, `'20 % : ambre'`, `'40 % : rouge'` ;
  - `'une facture à 91 j suffit pour le rouge, même à 5 %'` ;
  - `'facture sans dateEmission : dans le total, dans facturesSansDate, ni en retard ni dans le délai'` ;
  - `'aucune facture : vert, 0 %'` ;
  - `'facture PAYEE ou avec datePaiement : ignorée'` ;
  - `'reste à facturer à 16 j : ambre ; à 31 j : rouge ; à 15 j : vert'` ;
  - `'marché facturé à 99 % : pas de reste (tolérance 2 %)'` ;
  - `'marché RESILIE réceptionné : ignoré'`.
- [ ] **Step 2 : lancer** `npm run test:unit -- tests/unit/tableau-de-bord-voyants.spec.ts` — attendu : échec.
- [ ] **Step 3 : implémenter** les deux fonctions, et modifier la signature de `montantFacture`.
- [ ] **Step 4 : relancer ce fichier puis `tests/unit/pilotage-calculs.spec.ts`** — attendu : tous passent, Pilotage inchangé.
- [ ] **Step 5 : commit** `feat(tableau-de-bord): voyants encaissements et reste à facturer`

---

### Task 4 : voyants cautions, dépôts et taux de succès (2, 3, 4)

**Files :**
- Modify : `lib/tableau-de-bord/voyants.ts`
- Test : `tests/unit/tableau-de-bord-voyants.spec.ts`

**Interfaces :**
- Consumes : `CautionEcheances`, `cautionEncoreNecessaire` (tâche 2), `calculerIssueOffres`, `LotPilotage` (Pilotage), `Voyant`, `EtatVoyant` (tâche 3).
- Produces :

```ts
export interface OpportuniteDepot { id: string; reference: string | null; objet: string; statut: StatutOpportunite; dateLimite: Date | null; aUnDossier: boolean; piecesObligatoires: { statut: StatutPiece }[] }
export function voyantCautions(cautions: CautionEcheances[], aujourdHui: Date): Voyant<{ sous30: number; plusProcheDansJours: number | null; elements: ElementLie[] }>
export function voyantDepots(opps: OpportuniteDepot[], aujourdHui: Date): Voyant<{ nonPrets: number; depotsSous14: number; elements: ElementLie[] }>
export function voyantTauxSucces(lots: LotPilotage[], aujourdHui: Date): Voyant<{ taux6Mois: number | null; taux24Mois: number | null; resultats6Mois: number; ecartPoints: number | null }>
export const MIN_RESULTATS_TAUX = 5
```

Règles :
- **Cautions** : seulement `cautionEncoreNecessaire`, statut `ACTIVE` ou `EXPIREE`. **Rouge** si une caution a `dateEcheance` ≤ J+7 (passée comprise) ; **ambre** si ≤ J+30 ; sinon vert.
- **Dépôts** : opportunités de `STATUTS_AVANT_SOUMISSION` avec `dateLimite` entre J et J+14. Prête = `aUnDossier` et toutes les `piecesObligatoires` au statut `COMPLET` ou `VALIDE` (communes + pièces de chaque dossier ; aucune pièce obligatoire = non prête). **Rouge** si une opportunité sans dossier, ou une non prête à J+3 ou avant ; **ambre** si une non prête ; sinon vert.
- **Taux de succès** : `calculerIssueOffres` sur [J − 6 mois, J] puis sur [J − 24 mois, J]. **Gris** si `gagnes + perdus` sur 6 mois < 5 ou si le taux sur 24 mois est `null`. `ecartPoints = taux24 − taux6`. **Rouge** si ≥ 20 ; **ambre** si ≥ 10 ; sinon vert.

- [ ] **Step 1 : tests qui échouent** :
  - `'caution nécessaire à J+6 : rouge'`, `'à J+18 : ambre'`, `'expirée hier : rouge'`, `'caution de soumission sur opportunité PERDUE à J+2 : ignorée'` ;
  - `'dépôt à J+4 avec une pièce obligatoire ABSENT : ambre'`, `'à J+3 : rouge'`, `'à J+10 sans dossier : rouge'`, `'pièce facultative ABSENT : prête'`, `'dépôt à J+15 : ignoré'` ;
  - `'4 résultats sur 6 mois : gris'` ; `'6 mois 33 %, 24 mois 45 % : ambre, écart 12'` ; `'écart 20 : rouge'` ; `'écart 9 : vert'`.
- [ ] **Step 2 : lancer** — attendu : échec des nouveaux tests.
- [ ] **Step 3 : implémenter** les trois fonctions.
- [ ] **Step 4 : relancer** — attendu : tous passent.
- [ ] **Step 5 : commit** `feat(tableau-de-bord): voyants cautions, dépôts et taux de succès`

---

### Task 5 : pipeline des offres

**Files :**
- Create : `lib/tableau-de-bord/pipeline.ts`
- Test : `tests/unit/tableau-de-bord-pipeline.spec.ts`

**Interfaces :**
- Produces : `PHASES_PIPELINE` (tableau ordonné de `{ statut: StatutOpportunite; libelle: string; inclut: StatutOpportunite[] }`) ; `calculerPipeline(opps: { statut: StatutOpportunite; montantEstime: number | null }[]): { phases: { statut: StatutOpportunite; libelle: string; nombre: number; montant: number; href: string }[]; total: { nombre: number; montant: number } }`.

Phases, dans l'ordre : En analyse (`EN_ANALYSE`, `IDENTIFIEE`), Go (`GO`), Dossier en préparation (`DOSSIER_EN_PREPARATION`), Offre soumise (`OFFRE_SOUMISE`, `SOUMISE`), En attente d'attribution (`EN_ATTENTE_ATTRIBUTION`), Attribuée provisoirement (`ATTRIBUE_PROVISOIREMENT`). `href` = `/opportunites?statut=<statut>`. Montant nul compté 0. `GAGNEE`, `PERDUE` et `NO_GO` sont exclus.

- [ ] **Step 1 : tests qui échouent** — `'IDENTIFIEE compte dans En analyse, SOUMISE dans Offre soumise'`, `'GAGNEE, PERDUE, NO_GO exclus du total'`, `'montant null compté 0'`, `'six phases toujours présentes, même à 0'`.
- [ ] **Step 2 : lancer** — attendu : échec.
- [ ] **Step 3 : implémenter.**
- [ ] **Step 4 : relancer** — attendu : tous passent.
- [ ] **Step 5 : commit** `feat(tableau-de-bord): pipeline des offres par phase`

---

### Task 6 : droits par rôle et action serveur

**Files :**
- Create : `lib/tableau-de-bord/droits.ts`, `lib/actions/tableau-de-bord.ts`
- Test : `tests/unit/tableau-de-bord-droits.spec.ts`

**Interfaces :**
- Consumes : tout ce qui précède ; `capturerOperation` ; `requireRead`, `getMarcheStatutRestriction`.
- Produces :

```ts
// droits.ts
export interface DroitsTableauDeBord { finances: boolean; restrictionMarche: 'EN_EXECUTION' | undefined }
export function droitsTableauDeBord(role: string | null | undefined): DroitsTableauDeBord
// tableau-de-bord.ts ('use server')
export type BlocTableauDeBord<T> = { status: 'success'; value: T } | { status: 'error'; message: string }
export interface TableauDeBordData {
  aTraiter: BlocTableauDeBord<ResultatATraiter>
  pipeline: BlocTableauDeBord<ReturnType<typeof calculerPipeline>>
  voyants: {
    encaissements: BlocTableauDeBord<Voyant<DetailEncaissements>> | null   // null = rôle sans finances
    cautions: BlocTableauDeBord<ReturnType<typeof voyantCautions>>
    tauxSucces: BlocTableauDeBord<ReturnType<typeof voyantTauxSucces>>
    depots: BlocTableauDeBord<ReturnType<typeof voyantDepots>>
    resteAFacturer: BlocTableauDeBord<Voyant<DetailResteAFacturer>> | null
  }
}
export async function getTableauDeBordData(): Promise<TableauDeBordData>
```

Règles de l'action :
- `requireRead()`, puis `droitsTableauDeBord(session.user.role)`. `finances` vaut vrai pour ADMIN et AVANCE seulement.
- **Requêtes filtrées en base**, sans chargement complet : opportunités des statuts `PHASE_STATUTS['en-cours']` ; marchés des statuts `EN_ATTENTE_LIVRAISON_OS`, `EN_EXECUTION`, `EXECUTE_ATTENTE_GARANTIES` (ou `restrictionMarche` si définie) ; cautions `ACTIVE` ou `EXPIREE` avec `dateEcheance` ≤ J+30, avec leur rattachement ; si `finances` : factures `EMISE` ou `EN_ATTENTE` sans `datePaiement`, et marchés avec `dateReception` non nulle. Pour les lots, reprendre la lecture de `getPilotageData` (`lib/actions/pilotage.ts`), limitée aux 24 derniers mois.
- Pour EXPLOITATION, les cautions et les lignes de marché sont limitées aux marchés `EN_EXECUTION`.
- Chaque bloc passe par `capturerOperation` ; une erreur est journalisée (`console.error('[getTableauDeBordData] Bloc <nom> indisponible', …)`) et renvoie `{ status: 'error', message }`.
- Sans `finances`, `construireATraiter` reçoit `factures: null`, et `encaissements` et `resteAFacturer` valent `null`. **Aucune requête sur `Facture` n'est faite.**

- [ ] **Step 1 : tests qui échouent** : `droitsTableauDeBord` pour ADMIN, AVANCE (`finances: true`), EXPLOITATION (`finances: false`, `restrictionMarche: 'EN_EXECUTION'`), VISITEUR et `undefined` (`finances: false`).
- [ ] **Step 2 : lancer** — attendu : échec.
- [ ] **Step 3 : implémenter `droits.ts`, puis l'action.** Vérifier la syntaxe Prisma des filtres de relation avec `context7-cli` (Prisma 7).
- [ ] **Step 4 : relancer les tests unitaires, puis `npx tsc --noEmit` et `npm run lint`** — attendu : 0 erreur TypeScript, et le nombre d'avertissements ESLint ne dépasse pas le plafond de la CI (172).
- [ ] **Step 5 : vérification sur la base de test** (skill `base-test`, jamais `.env`) : un script temporaire, non commité, qui appelle les fonctions de lecture avec le compte administrateur de test et affiche le nombre d'éléments de chaque bloc. Attendu : aucun bloc en erreur. Supprimer le script.
- [ ] **Step 6 : commit** `feat(tableau-de-bord): action serveur unique et droits par rôle`

---

### Task 7 : vérification et intégration

- [ ] **Step 1 :** `npm run test:unit` en entier — attendu : tous passent, y compris `pilotage-calculs.spec.ts`.
- [ ] **Step 2 :** `npx tsc --noEmit`, `npm run lint`, `npm run build` (avec `.env.test` chargé) — attendu : succès.
- [ ] **Step 3 :** `superpowers:verification-before-completion`, puis `code-review` sur la branche (normes du dépôt et conformité au Journal du 2026-11-12).
- [ ] **Step 4 :** contrôle avant push (dépôt public) : `git diff origin/main --stat`, et aucune valeur réelle, chemin local ni information d'infrastructure dans le diff.
- [ ] **Step 5 :** PR « Données du tableau de bord (livraison 6) » ; fusion en squash **seulement avec l'accord d'Abel**. La fusion déclenche le déploiement en production, sans effet visible puisque `/` n'est pas modifiée.
