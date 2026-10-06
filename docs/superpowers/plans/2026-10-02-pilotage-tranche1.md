# Pilotage — tranche 1 : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer la page `/pilotage` (ADMIN + AVANCE) affichant la conversion attribué → facturé, le cumul des échecs, l'écart de prix face au gagnant et un bloc qualité des données, et y déplacer l'onglet « Analyses » de Reporting.

**Architecture:** Les calculs sont des fonctions **pures** dans `lib/pilotage/calculs.ts` (aucun accès Prisma), testées en unitaire. Une Server Action `lib/actions/pilotage.ts` lit la base, convertit les lignes Prisma en enregistrements simples et appelle ces fonctions. La page `/pilotage` (RSC + un composant client pour la période) affiche les indicateurs puis l'actuel `AnalytiquesTab`, déplacé tel quel.

**Tech Stack:** Next.js 15 App Router, Server Actions, Prisma 7, shadcn/ui, Tailwind, date-fns, tests unitaires et E2E via Playwright (`npm run test:unit`, `npx playwright test`).

**Spec:** `docs/superpowers/specs/2026-10-02-pilotage-tranche1-design.md`

## Global Constraints

- Accès `/pilotage` et à ses Server Actions : `requireRole(['ADMIN', 'AVANCE'])` (`lib/utils/permissions.ts`).
- Aucune migration Prisma, aucun envoi d'e-mail, aucune écriture en base dans cette tranche.
- Conversion : numérateur = factures `EMISE`, `EN_ATTENTE`, `PAYEE` en **TTC** ; dénominateur = `montant` contractuel des marchés attribués un jour (résiliés/annulés après attribution compris).
- Garde-fou : TTC facturé > montant contractuel × 1,02 → signalé en qualité des données.
- Écart de prix : affiché seulement si n ≥ 3 cas, sinon « Pas assez de données (n = …) ».
- Seuil visuel de la conversion : alerte sous 30 %.
- Toute exclusion d'un calcul est comptée dans la qualité des données (jamais silencieuse).
- Montants affichés avec `formatMontant` existant ; libellés en français ; shadcn/ui uniquement, pas de nouvelle dépendance.
- Dépôt public : aucune donnée réelle, aucun chemin local dans le code, les tests ou les commits.
- Tests E2E contre la base de test locale uniquement (`.env.test`), jamais contre la production.

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `lib/pilotage/calculs.ts` (créé) | Types d'entrée et fonctions pures des 4 blocs |
| `tests/unit/pilotage-calculs.spec.ts` (créé) | Tests unitaires des fonctions pures |
| `lib/actions/pilotage.ts` (créé) | Server Action : lecture Prisma → enregistrements → calculs |
| `app/(dashboard)/pilotage/page.tsx` (créé) | Page serveur, contrôle de rôle, en-tête |
| `app/(dashboard)/pilotage/PilotageClient.tsx` (créé) | Période, appels, affichage des indicateurs + `AnalytiquesTab` |
| `components/pilotage/IndicateurCard.tsx` (créé) | Carte d'indicateur + détail dépliable |
| `components/pilotage/QualiteDonnees.tsx` (créé) | Bloc qualité des données |
| `app/(dashboard)/admin/reporting/AnalytiquesTab.tsx` → `components/analytique/AnalytiquesTab.tsx` (déplacé) | Analyses existantes |
| `app/(dashboard)/admin/reporting/page.tsx` (modifié) | Retrait de l'onglet « Analyses » |
| `components/layout/dashboard-shell.tsx` (modifié) | Entrée de menu « Pilotage » |
| `lib/actions/analytics.ts`, `lib/actions/analytics-exports.ts`, `lib/analytics/types.ts` (modifiés) | Accès AVANCE ; retrait de `tauxRecouvrement` |
| `tests/v1/pilotage.spec.ts` (créé) | E2E accès, affichage, détail, viewports |

---

### Task 1 : Conversion attribué → facturé (fonction pure)

**Files:**
- Create: `lib/pilotage/calculs.ts`
- Test: `tests/unit/pilotage-calculs.spec.ts`

**Interfaces:**
- Produces :
  - `type StatutFactureLite = 'BROUILLON' | 'EMISE' | 'EN_ATTENTE' | 'PAYEE' | 'REJETEE' | 'ANNULEE'`
  - `interface MarchePilotage { id: string; numero: string; objet: string; statut: string; montant: number; dateAttribution: Date | null; dateDepotOffre: Date | null; attribueUnJour: boolean; factures: { statut: StatutFactureLite; montantTTC: number }[]; motifRenseigne: boolean; dateFinPrevue: Date | null }`
  - `interface Periode { dateDebut: Date; dateFin: Date }`
  - `interface ResultatConversion { valeurAttribuee: number; facture: number; encaisse: number; perduApresAttribution: number; taux: number | null; tauxEncaisse: number | null; alerte: boolean; marches: { id: string; numero: string; objet: string; montant: number; facture: number; perdu: boolean }[]; exclusSansDate: string[] }`
  - `function calculerConversion(marches: MarchePilotage[], periode: Periode): ResultatConversion`
  - `const SEUIL_CONVERSION = 30`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
// tests/unit/pilotage-calculs.spec.ts
import { test, expect } from '@playwright/test'
import { calculerConversion, type MarchePilotage } from '../../lib/pilotage/calculs'

const PERIODE = { dateDebut: new Date('2026-01-01'), dateFin: new Date('2026-12-31T23:59:59') }

function marche(p: Partial<MarchePilotage>): MarchePilotage {
  return {
    id: p.id ?? 'm1', numero: p.numero ?? 'M-1', objet: 'Objet', statut: p.statut ?? 'EN_EXECUTION',
    montant: p.montant ?? 1000, dateAttribution: p.dateAttribution === undefined ? new Date('2026-03-01') : p.dateAttribution,
    dateDepotOffre: p.dateDepotOffre ?? null, attribueUnJour: p.attribueUnJour ?? true,
    factures: p.factures ?? [], motifRenseigne: p.motifRenseigne ?? false, dateFinPrevue: p.dateFinPrevue ?? null,
  }
}

test.describe('calculerConversion', () => {
  test('compte les factures émises, en attente et payées, ignore brouillon/rejetée/annulée', () => {
    const r = calculerConversion([marche({ factures: [
      { statut: 'EMISE', montantTTC: 100 }, { statut: 'EN_ATTENTE', montantTTC: 100 },
      { statut: 'PAYEE', montantTTC: 200 }, { statut: 'BROUILLON', montantTTC: 999 },
      { statut: 'REJETEE', montantTTC: 999 }, { statut: 'ANNULEE', montantTTC: 999 },
    ] })], PERIODE)
    expect(r.valeurAttribuee).toBe(1000)
    expect(r.facture).toBe(400)
    expect(r.encaisse).toBe(200)
    expect(r.taux).toBe(40)
    expect(r.tauxEncaisse).toBe(20)
    expect(r.alerte).toBe(false)
  })

  test('un marché résilié après attribution reste au dénominateur et compte en perdu', () => {
    const r = calculerConversion([
      marche({ id: 'a', montant: 1000, factures: [{ statut: 'PAYEE', montantTTC: 250 }] }),
      marche({ id: 'b', statut: 'RESILIE', montant: 1000 }),
    ], PERIODE)
    expect(r.valeurAttribuee).toBe(2000)
    expect(r.perduApresAttribution).toBe(1000)
    expect(r.taux).toBe(13) // 250 / 2000 = 12,5 → arrondi 13
    expect(r.alerte).toBe(true)
  })

  test('un marché annulé avant attribution est exclu', () => {
    const r = calculerConversion([marche({ statut: 'ANNULE', attribueUnJour: false })], PERIODE)
    expect(r.valeurAttribuee).toBe(0)
    expect(r.taux).toBeNull()
  })

  test('hors période exclu ; attribué sans date signalé', () => {
    const r = calculerConversion([
      marche({ id: 'hors', dateAttribution: new Date('2025-06-01') }),
      marche({ id: 'sansdate', numero: 'M-SD', dateAttribution: null }),
    ], PERIODE)
    expect(r.valeurAttribuee).toBe(0)
    expect(r.exclusSansDate).toEqual(['M-SD'])
  })
})
```

- [ ] **Step 2 : Lancer les tests, vérifier l'échec**

Run : `npx playwright test -c playwright.unit.config.ts pilotage-calculs`
Attendu : FAIL — module `lib/pilotage/calculs` introuvable.

- [ ] **Step 3 : Implémentation minimale**

```ts
// lib/pilotage/calculs.ts
// Calculs du module Pilotage — fonctions pures, sans accès base (testées en unitaire).

export type StatutFactureLite = 'BROUILLON' | 'EMISE' | 'EN_ATTENTE' | 'PAYEE' | 'REJETEE' | 'ANNULEE'

export interface Periode { dateDebut: Date; dateFin: Date }

export interface MarchePilotage {
  id: string
  numero: string
  objet: string
  statut: string
  montant: number
  /** dateAttributionDefinitive, ou date du passage en statut attribué dans l'historique */
  dateAttribution: Date | null
  dateDepotOffre: Date | null
  /** vrai si le marché a atteint ATTRIBUE_DEFINITIVEMENT ou un statut ultérieur, même s'il a été résilié/annulé ensuite */
  attribueUnJour: boolean
  factures: { statut: StatutFactureLite; montantTTC: number }[]
  /** motif de résiliation / annulation / infructueux renseigné selon le statut */
  motifRenseigne: boolean
  dateFinPrevue: Date | null
}

export interface ResultatConversion {
  valeurAttribuee: number
  facture: number
  encaisse: number
  perduApresAttribution: number
  taux: number | null
  tauxEncaisse: number | null
  alerte: boolean
  marches: { id: string; numero: string; objet: string; montant: number; facture: number; perdu: boolean }[]
  exclusSansDate: string[]
}

export const SEUIL_CONVERSION = 30
const STATUTS_FACTURES_COMPTEES: StatutFactureLite[] = ['EMISE', 'EN_ATTENTE', 'PAYEE']
const STATUTS_PERDUS = ['RESILIE', 'ANNULE']

function dansPeriode(d: Date, p: Periode): boolean {
  return d >= p.dateDebut && d <= p.dateFin
}

function pourcentage(num: number, den: number): number | null {
  return den > 0 ? Math.round((num / den) * 100) : null
}

export function montantFacture(m: MarchePilotage): number {
  return m.factures
    .filter((f) => STATUTS_FACTURES_COMPTEES.includes(f.statut))
    .reduce((s, f) => s + f.montantTTC, 0)
}

export function calculerConversion(marches: MarchePilotage[], periode: Periode): ResultatConversion {
  const exclusSansDate: string[] = []
  const retenus: ResultatConversion['marches'] = []
  let valeurAttribuee = 0, facture = 0, encaisse = 0, perduApresAttribution = 0

  for (const m of marches) {
    if (!m.attribueUnJour) continue
    if (!m.dateAttribution) { exclusSansDate.push(m.numero); continue }
    if (!dansPeriode(m.dateAttribution, periode)) continue

    const fac = montantFacture(m)
    const perdu = STATUTS_PERDUS.includes(m.statut)
    valeurAttribuee += m.montant
    facture += fac
    encaisse += m.factures.filter((f) => f.statut === 'PAYEE').reduce((s, f) => s + f.montantTTC, 0)
    if (perdu) perduApresAttribution += m.montant
    retenus.push({ id: m.id, numero: m.numero, objet: m.objet, montant: m.montant, facture: fac, perdu })
  }

  const taux = pourcentage(facture, valeurAttribuee)
  return {
    valeurAttribuee, facture, encaisse, perduApresAttribution,
    taux, tauxEncaisse: pourcentage(encaisse, valeurAttribuee),
    alerte: taux !== null && taux < SEUIL_CONVERSION,
    marches: retenus, exclusSansDate,
  }
}
```

- [ ] **Step 4 : Lancer les tests, vérifier le succès**

Run : `npx playwright test -c playwright.unit.config.ts pilotage-calculs`
Attendu : 4 passed.

- [ ] **Step 5 : Commit**

```bash
git add lib/pilotage/calculs.ts tests/unit/pilotage-calculs.spec.ts
git commit -m "feat(pilotage): calcul de la conversion attribué → facturé"
```

---

### Task 2 : Cumul des échecs et écart de prix (fonctions pures)

**Files:**
- Modify: `lib/pilotage/calculs.ts` (ajout en fin de fichier)
- Test: `tests/unit/pilotage-calculs.spec.ts` (ajout)

**Interfaces:**
- Consumes : `Periode`, `MarchePilotage`, `pourcentage` (interne) de la Task 1.
- Produces :
  - `interface LotPilotage { id: string; opportuniteId: string; libelle: string; resultat: 'EN_COURS' | 'ATTRIBUE_PROVISOIREMENT' | 'GAGNE' | 'PERDU' | 'INFRUCTUEUX'; montantPropose: number | null; montantOffreConcurrent: number | null; dateDepot: Date | null; soumis: boolean; motifRenseigne: boolean }`
  - `interface ResultatEchecs { lotsSoumis: number; lotsGagnes: number; lotsPerdus: number; lotsInfructueux: number; valeurPerdue: number; marchesAnnulesOuResilies: number; valeurMarchesPerdus: number; tauxEchec: number | null; tauxSucces: number | null; exclusSansDate: string[]; detail: { id: string; libelle: string; resultat: string }[] }`
  - `function calculerEchecs(lots: LotPilotage[], marches: MarchePilotage[], periode: Periode): ResultatEchecs`
  - `interface ResultatEcartPrix { n: number; ecartMoyen: number | null; suffisant: boolean; cas: { id: string; libelle: string; notreOffre: number; offreGagnante: number; ecart: number }[] }`
  - `function calculerEcartPrix(lots: LotPilotage[], periode: Periode): ResultatEcartPrix`
  - `const MIN_CAS_ECART = 3`

Règles :
- Unité des offres = le **lot** (règle T9 « Résultats par lot ») : un lot est soumis si son opportunité a atteint `OFFRE_SOUMISE` ou au-delà (`soumis` calculé par la Server Action). Période = `dateDepot` (= `dateLimite` de l'opportunité).
- Échecs d'offre = lots `PERDU` + `INFRUCTUEUX`. `tauxEchec = (perdus + infructueux) / soumis`. `tauxSucces = gagnés / (gagnés + perdus)` (règle T9 existante, infructueux à part).
- Échecs d'exécution = marchés `ANNULE` ou `RESILIE` ayant `attribueUnJour`, période sur `dateAttribution` (même règle que la Task 1).
- Écart = (notre offre − offre gagnante) / offre gagnante, sur les lots `PERDU` de la période avec les deux montants > 0. Moyenne arrondie à l'entier (%). `suffisant = n >= MIN_CAS_ECART`.

- [ ] **Step 1 : Écrire les tests qui échouent** (ajouter au fichier existant ; fusionner les nouveaux noms dans l'`import` existant en tête de fichier)

```ts
import { calculerEchecs, calculerEcartPrix, type LotPilotage } from '../../lib/pilotage/calculs'

function lot(p: Partial<LotPilotage>): LotPilotage {
  return {
    id: p.id ?? 'l1', opportuniteId: 'o1', libelle: p.libelle ?? 'Lot 1', resultat: p.resultat ?? 'PERDU',
    montantPropose: p.montantPropose === undefined ? 1100 : p.montantPropose,
    montantOffreConcurrent: p.montantOffreConcurrent === undefined ? 1000 : p.montantOffreConcurrent,
    dateDepot: p.dateDepot === undefined ? new Date('2026-02-01') : p.dateDepot,
    soumis: p.soumis ?? true, motifRenseigne: p.motifRenseigne ?? false,
  }
}

test.describe('calculerEchecs', () => {
  test('cumule perdus + infructueux sur les lots soumis, succès selon la règle par lot', () => {
    const r = calculerEchecs([
      lot({ id: '1', resultat: 'GAGNE' }), lot({ id: '2', resultat: 'PERDU' }),
      lot({ id: '3', resultat: 'INFRUCTUEUX' }), lot({ id: '4', resultat: 'EN_COURS' }),
      lot({ id: '5', resultat: 'PERDU', soumis: false }),
    ], [], PERIODE)
    expect(r.lotsSoumis).toBe(4)
    expect(r.tauxEchec).toBe(50)  // (1 perdu + 1 infructueux) / 4
    expect(r.tauxSucces).toBe(50) // 1 gagné / (1 gagné + 1 perdu)
  })

  test('compte les marchés annulés ou résiliés après attribution', () => {
    const r = calculerEchecs([], [
      marche({ id: 'a', statut: 'RESILIE', montant: 500 }),
      marche({ id: 'b', statut: 'ANNULE', attribueUnJour: false }),
    ], PERIODE)
    expect(r.marchesAnnulesOuResilies).toBe(1)
    expect(r.valeurMarchesPerdus).toBe(500)
  })

  test('lot soumis sans date de dépôt signalé', () => {
    const r = calculerEchecs([lot({ libelle: 'Lot X', dateDepot: null })], [], PERIODE)
    expect(r.lotsSoumis).toBe(0)
    expect(r.exclusSansDate).toEqual(['Lot X'])
  })
})

test.describe('calculerEcartPrix', () => {
  test('moyenne des écarts sur les lots perdus renseignés', () => {
    const r = calculerEcartPrix([
      lot({ id: '1', montantPropose: 1100, montantOffreConcurrent: 1000 }), // +10 %
      lot({ id: '2', montantPropose: 1200, montantOffreConcurrent: 1000 }), // +20 %
      lot({ id: '3', montantPropose: 900, montantOffreConcurrent: 1000 }),  // -10 %
      lot({ id: '4', montantOffreConcurrent: null }),                       // ignoré
      lot({ id: '5', resultat: 'GAGNE' }),                                  // ignoré
    ], PERIODE)
    expect(r.n).toBe(3)
    expect(r.ecartMoyen).toBe(7) // (10 + 20 - 10) / 3 = 6,67 → 7
    expect(r.suffisant).toBe(true)
  })

  test('moins de 3 cas : insuffisant', () => {
    const r = calculerEcartPrix([lot({})], PERIODE)
    expect(r.n).toBe(1)
    expect(r.suffisant).toBe(false)
  })
})
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run : `npx playwright test -c playwright.unit.config.ts pilotage-calculs`
Attendu : FAIL — `calculerEchecs` n'est pas exporté.

- [ ] **Step 3 : Implémentation**

```ts
// ── Échecs et écart de prix ─────────────────────────────────────────────────

export interface LotPilotage {
  id: string
  opportuniteId: string
  /** « <référence opportunité> — Lot <n> » pour l'affichage */
  libelle: string
  resultat: 'EN_COURS' | 'ATTRIBUE_PROVISOIREMENT' | 'GAGNE' | 'PERDU' | 'INFRUCTUEUX'
  montantPropose: number | null
  montantOffreConcurrent: number | null
  /** dateLimite de l'opportunité */
  dateDepot: Date | null
  /** opportunité au statut OFFRE_SOUMISE ou ultérieur */
  soumis: boolean
  motifRenseigne: boolean
}

export interface ResultatEchecs {
  lotsSoumis: number
  lotsGagnes: number
  lotsPerdus: number
  lotsInfructueux: number
  valeurPerdue: number
  marchesAnnulesOuResilies: number
  valeurMarchesPerdus: number
  tauxEchec: number | null
  tauxSucces: number | null
  exclusSansDate: string[]
  /** lots perdus / infructueux et marchés annulés ou résiliés de la période (drill-down) */
  detail: { id: string; libelle: string; resultat: string }[]
}

export interface ResultatEcartPrix {
  n: number
  ecartMoyen: number | null
  suffisant: boolean
  cas: { id: string; libelle: string; notreOffre: number; offreGagnante: number; ecart: number }[]
}

export const MIN_CAS_ECART = 3

export function calculerEchecs(lots: LotPilotage[], marches: MarchePilotage[], periode: Periode): ResultatEchecs {
  const exclusSansDate: string[] = []
  const detail: ResultatEchecs['detail'] = []
  let soumis = 0, gagnes = 0, perdus = 0, infructueux = 0, valeurPerdue = 0

  for (const l of lots) {
    if (!l.soumis) continue
    if (!l.dateDepot) { exclusSansDate.push(l.libelle); continue }
    if (!dansPeriode(l.dateDepot, periode)) continue
    soumis++
    if (l.resultat === 'GAGNE') gagnes++
    if (l.resultat === 'PERDU') { perdus++; valeurPerdue += l.montantPropose ?? 0; detail.push({ id: l.id, libelle: l.libelle, resultat: 'Perdu' }) }
    if (l.resultat === 'INFRUCTUEUX') { infructueux++; detail.push({ id: l.id, libelle: l.libelle, resultat: 'Infructueux' }) }
  }

  let marchesAnnulesOuResilies = 0, valeurMarchesPerdus = 0
  for (const m of marches) {
    if (!m.attribueUnJour || !STATUTS_PERDUS.includes(m.statut)) continue
    if (!m.dateAttribution || !dansPeriode(m.dateAttribution, periode)) continue
    marchesAnnulesOuResilies++
    valeurMarchesPerdus += m.montant
    detail.push({ id: m.id, libelle: m.numero, resultat: m.statut === 'RESILIE' ? 'Résilié' : 'Annulé' })
  }

  return {
    lotsSoumis: soumis, lotsGagnes: gagnes, lotsPerdus: perdus, lotsInfructueux: infructueux, valeurPerdue,
    marchesAnnulesOuResilies, valeurMarchesPerdus,
    tauxEchec: pourcentage(perdus + infructueux, soumis),
    tauxSucces: pourcentage(gagnes, gagnes + perdus),
    exclusSansDate,
    detail,
  }
}

export function calculerEcartPrix(lots: LotPilotage[], periode: Periode): ResultatEcartPrix {
  const cas: ResultatEcartPrix['cas'] = []
  for (const l of lots) {
    if (l.resultat !== 'PERDU' || !l.dateDepot || !dansPeriode(l.dateDepot, periode)) continue
    if (!l.montantPropose || !l.montantOffreConcurrent) continue
    const ecart = ((l.montantPropose - l.montantOffreConcurrent) / l.montantOffreConcurrent) * 100
    cas.push({ id: l.id, libelle: l.libelle, notreOffre: l.montantPropose, offreGagnante: l.montantOffreConcurrent, ecart: Math.round(ecart) })
  }
  const n = cas.length
  const somme = cas.reduce((s, c) => s + ((c.notreOffre - c.offreGagnante) / c.offreGagnante) * 100, 0)
  return { n, ecartMoyen: n > 0 ? Math.round(somme / n) : null, suffisant: n >= MIN_CAS_ECART, cas }
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run : `npx playwright test -c playwright.unit.config.ts pilotage-calculs`
Attendu : 9 passed.

- [ ] **Step 5 : Commit**

```bash
git add lib/pilotage/calculs.ts tests/unit/pilotage-calculs.spec.ts
git commit -m "feat(pilotage): cumul des échecs par lot et écart de prix face au gagnant"
```

---

### Task 3 : Qualité des données (fonction pure)

**Files:**
- Modify: `lib/pilotage/calculs.ts` (ajout)
- Test: `tests/unit/pilotage-calculs.spec.ts` (ajout)

**Interfaces:**
- Consumes : `MarchePilotage`, `LotPilotage`, `montantFacture`, `ResultatConversion`, `ResultatEchecs` des Tasks 1-2.
- Produces :
  - `interface ElementQualite { cle: 'SANS_FACTURE' | 'ECHEANCE_DEPASSEE' | 'ECHEC_SANS_MOTIF' | 'SANS_DATE' | 'FACTURE_SUPERIEURE'; libelle: string; elements: string[] }`
  - `function calculerQualite(marches: MarchePilotage[], lots: LotPilotage[], conversion: ResultatConversion, echecs: ResultatEchecs, aujourdHui: Date): ElementQualite[]`
  - `const TOLERANCE_FACTURE = 1.02`

Règles (chaque `elements` = numéros de marché ou libellés de lot) :
- `SANS_FACTURE` : marchés attribués un jour, non annulés/résiliés, statut `EN_EXECUTION`, `EXECUTE_ATTENTE_GARANTIES` ou `CLOTURE`, sans aucune facture comptée.
- `ECHEANCE_DEPASSEE` : `dateFinPrevue < aujourdHui` et statut `ATTRIBUE_DEFINITIVEMENT`, `EN_ATTENTE_LIVRAISON_OS` ou `EN_EXECUTION`.
- `ECHEC_SANS_MOTIF` : marchés `ANNULE`/`RESILIE`/`INFRUCTUEUX` sans motif + lots `PERDU`/`INFRUCTUEUX` sans motif.
- `SANS_DATE` : `conversion.exclusSansDate` ∪ `echecs.exclusSansDate`.
- `FACTURE_SUPERIEURE` : `montantFacture(m) > m.montant * TOLERANCE_FACTURE`.

- [ ] **Step 1 : Écrire le test qui échoue** (ajouter `calculerQualite` à l'`import` en tête de fichier)

```ts
import { calculerQualite } from '../../lib/pilotage/calculs'

test('calculerQualite signale chaque anomalie', () => {
  const marches = [
    marche({ numero: 'SANSFAC', statut: 'EN_EXECUTION' }),
    marche({ numero: 'RETARD', statut: 'EN_EXECUTION', dateFinPrevue: new Date('2026-01-01'), factures: [{ statut: 'EMISE', montantTTC: 10 }] }),
    marche({ numero: 'RESIL', statut: 'RESILIE', motifRenseigne: false }),
    marche({ numero: 'SURFAC', montant: 1000, factures: [{ statut: 'PAYEE', montantTTC: 1030 }] }),
  ]
  const lots = [lot({ libelle: 'Lot sans motif', resultat: 'PERDU', motifRenseigne: false })]
  const conversion = calculerConversion(marches, PERIODE)
  const echecs = calculerEchecs(lots, marches, PERIODE)
  const q = calculerQualite(marches, lots, conversion, echecs, new Date('2026-10-02'))
  const par = Object.fromEntries(q.map((e) => [e.cle, e.elements]))
  expect(par.SANS_FACTURE).toEqual(['SANSFAC'])
  expect(par.ECHEANCE_DEPASSEE).toEqual(['RETARD'])
  expect(par.ECHEC_SANS_MOTIF).toEqual(['RESIL', 'Lot sans motif'])
  expect(par.SANS_DATE).toEqual([])
  expect(par.FACTURE_SUPERIEURE).toEqual(['SURFAC'])
})
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run : `npx playwright test -c playwright.unit.config.ts pilotage-calculs`
Attendu : FAIL — `calculerQualite` n'est pas exporté.

- [ ] **Step 3 : Implémentation**

```ts
// ── Qualité des données ─────────────────────────────────────────────────────

export interface ElementQualite {
  cle: 'SANS_FACTURE' | 'ECHEANCE_DEPASSEE' | 'ECHEC_SANS_MOTIF' | 'SANS_DATE' | 'FACTURE_SUPERIEURE'
  libelle: string
  elements: string[]
}

export const TOLERANCE_FACTURE = 1.02
const STATUTS_DEVANT_ETRE_FACTURES = ['EN_EXECUTION', 'EXECUTE_ATTENTE_GARANTIES', 'CLOTURE']
const STATUTS_EN_COURS_EXECUTION = ['ATTRIBUE_DEFINITIVEMENT', 'EN_ATTENTE_LIVRAISON_OS', 'EN_EXECUTION']
const STATUTS_ECHEC_MARCHE = ['ANNULE', 'RESILIE', 'INFRUCTUEUX']

export function calculerQualite(
  marches: MarchePilotage[],
  lots: LotPilotage[],
  conversion: ResultatConversion,
  echecs: ResultatEchecs,
  aujourdHui: Date,
): ElementQualite[] {
  return [
    {
      cle: 'SANS_FACTURE',
      libelle: 'Marchés en exécution ou clôturés sans facture',
      elements: marches
        .filter((m) => STATUTS_DEVANT_ETRE_FACTURES.includes(m.statut) && montantFacture(m) === 0)
        .map((m) => m.numero),
    },
    {
      cle: 'ECHEANCE_DEPASSEE',
      libelle: 'Échéance dépassée sans changement de statut',
      elements: marches
        .filter((m) => STATUTS_EN_COURS_EXECUTION.includes(m.statut) && m.dateFinPrevue !== null && m.dateFinPrevue < aujourdHui)
        .map((m) => m.numero),
    },
    {
      cle: 'ECHEC_SANS_MOTIF',
      libelle: 'Échecs sans motif renseigné',
      elements: [
        ...marches.filter((m) => STATUTS_ECHEC_MARCHE.includes(m.statut) && !m.motifRenseigne).map((m) => m.numero),
        ...lots.filter((l) => (l.resultat === 'PERDU' || l.resultat === 'INFRUCTUEUX') && !l.motifRenseigne).map((l) => l.libelle),
      ],
    },
    {
      cle: 'SANS_DATE',
      libelle: 'Exclus des calculs faute de date (attribution ou dépôt)',
      elements: [...conversion.exclusSansDate, ...echecs.exclusSansDate],
    },
    {
      cle: 'FACTURE_SUPERIEURE',
      libelle: 'Facturé TTC supérieur au montant contractuel (+2 %)',
      elements: marches.filter((m) => montantFacture(m) > m.montant * TOLERANCE_FACTURE).map((m) => m.numero),
    },
  ]
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run : `npx playwright test -c playwright.unit.config.ts pilotage-calculs`
Attendu : 10 passed.

- [ ] **Step 5 : Commit**

```bash
git add lib/pilotage/calculs.ts tests/unit/pilotage-calculs.spec.ts
git commit -m "feat(pilotage): bloc qualité des données"
```

---

### Task 4 : Server Action `getPilotageData`

**Files:**
- Create: `lib/actions/pilotage.ts`

**Interfaces:**
- Consumes : toutes les fonctions et types de `lib/pilotage/calculs.ts`.
- Produces :
  - `interface PilotageData { conversion: ResultatConversion; echecs: ResultatEchecs; ecartPrix: ResultatEcartPrix; qualite: ElementQualite[] }`
  - `async function getPilotageData(periode: { dateDebut: string; dateFin: string }): Promise<PilotageData>` (dates ISO, validées par Zod)

Règles de lecture :
- `attribueUnJour` = `dateAttributionDefinitive !== null` **ou** statut ∈ {`ATTRIBUE_DEFINITIVEMENT`, `EN_ATTENTE_LIVRAISON_OS`, `EN_EXECUTION`, `EXECUTE_ATTENTE_GARANTIES`, `CLOTURE`} **ou** un `HistoriqueStatut.nouveauStatut` ∈ cette même liste.
- `dateAttribution` = `dateAttributionDefinitive` ?? `createdAt` du premier historique vers un statut de la liste ?? `null`.
- `motifRenseigne` selon le statut : `RESILIE` → `motifsResiliation`, `ANNULE` → `motifsAnnulation`, `INFRUCTUEUX` → `motifsInfructueux` ; chaîne non vide après `trim()`.
- Marchés : exclure `OPPORTUNITE_IDENTIFIEE` (règle métier de `analytics.ts`).
- Lots : `soumis` = statut de l'opportunité ∈ {`SOUMISE`, `OFFRE_SOUMISE`, `EN_ATTENTE_ATTRIBUTION`, `ATTRIBUE_PROVISOIREMENT`, `GAGNEE`, `PERDUE`} ; `libelle` = `${opportunite.reference ?? opportunite.objet} — Lot ${numero}`.
- Les calculs filtrent la période eux-mêmes : on charge tous les marchés et lots (volume : quelques centaines de lignes).

- [ ] **Step 1 : Écrire l'implémentation**

```ts
// lib/actions/pilotage.ts
'use server'

import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/permissions'
import {
  calculerConversion, calculerEchecs, calculerEcartPrix, calculerQualite,
  type MarchePilotage, type LotPilotage, type StatutFactureLite,
  type ResultatConversion, type ResultatEchecs, type ResultatEcartPrix, type ElementQualite,
} from '@/lib/pilotage/calculs'

export interface PilotageData {
  conversion: ResultatConversion
  echecs: ResultatEchecs
  ecartPrix: ResultatEcartPrix
  qualite: ElementQualite[]
}

const periodeSchema = z.object({ dateDebut: z.string().datetime(), dateFin: z.string().datetime() })

const STATUTS_ATTRIBUES = ['ATTRIBUE_DEFINITIVEMENT', 'EN_ATTENTE_LIVRAISON_OS', 'EN_EXECUTION', 'EXECUTE_ATTENTE_GARANTIES', 'CLOTURE']
const STATUTS_OPP_SOUMISES = ['SOUMISE', 'OFFRE_SOUMISE', 'EN_ATTENTE_ATTRIBUTION', 'ATTRIBUE_PROVISOIREMENT', 'GAGNEE', 'PERDUE']

function renseigne(s: string | null | undefined): boolean {
  return !!s && s.trim().length > 0
}

export async function getPilotageData(input: { dateDebut: string; dateFin: string }): Promise<PilotageData> {
  await requireRole(['ADMIN', 'AVANCE'])
  const p = periodeSchema.parse(input)
  const periode = { dateDebut: new Date(p.dateDebut), dateFin: new Date(p.dateFin) }

  const marchesRaw = await prisma.marche.findMany({
    where: { statut: { not: 'OPPORTUNITE_IDENTIFIEE' } },
    select: {
      id: true, numero: true, objet: true, statut: true, montant: true,
      dateAttributionDefinitive: true, dateDepotOffre: true, dateFinPrevue: true,
      motifsResiliation: true, motifsAnnulation: true, motifsInfructueux: true,
      factures: { select: { statut: true, montantTTC: true } },
      historiqueStatuts: {
        where: { nouveauStatut: { in: STATUTS_ATTRIBUES as never } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  })

  const marches: MarchePilotage[] = marchesRaw.map((m) => {
    const premierPassage = m.historiqueStatuts[0]?.createdAt ?? null
    const motif = m.statut === 'RESILIE' ? m.motifsResiliation
      : m.statut === 'ANNULE' ? m.motifsAnnulation
      : m.statut === 'INFRUCTUEUX' ? m.motifsInfructueux : null
    return {
      id: m.id, numero: m.numero, objet: m.objet, statut: m.statut, montant: Number(m.montant),
      dateAttribution: m.dateAttributionDefinitive ?? premierPassage,
      dateDepotOffre: m.dateDepotOffre,
      attribueUnJour: m.dateAttributionDefinitive !== null || STATUTS_ATTRIBUES.includes(m.statut) || premierPassage !== null,
      factures: m.factures.map((f) => ({ statut: f.statut as StatutFactureLite, montantTTC: Number(f.montantTTC) })),
      motifRenseigne: renseigne(motif),
      dateFinPrevue: m.dateFinPrevue,
    }
  })

  const lotsRaw = await prisma.lot.findMany({
    select: {
      id: true, numero: true, resultat: true, montantPropose: true, montantOffreConcurrent: true, motifPerte: true,
      opportunite: { select: { id: true, reference: true, objet: true, statut: true, dateLimite: true } },
    },
  })

  const lots: LotPilotage[] = lotsRaw.map((l) => ({
    id: l.id,
    opportuniteId: l.opportunite.id,
    libelle: `${l.opportunite.reference ?? l.opportunite.objet} — Lot ${l.numero}`,
    resultat: l.resultat,
    montantPropose: l.montantPropose === null ? null : Number(l.montantPropose),
    montantOffreConcurrent: l.montantOffreConcurrent === null ? null : Number(l.montantOffreConcurrent),
    dateDepot: l.opportunite.dateLimite,
    soumis: STATUTS_OPP_SOUMISES.includes(l.opportunite.statut),
    motifRenseigne: renseigne(l.motifPerte),
  }))

  const conversion = calculerConversion(marches, periode)
  const echecs = calculerEchecs(lots, marches, periode)
  return {
    conversion,
    echecs,
    ecartPrix: calculerEcartPrix(lots, periode),
    qualite: calculerQualite(marches, lots, conversion, echecs, new Date()),
  }
}
```

- [ ] **Step 2 : Vérifier les types**

Run : `npm run typecheck`
Attendu : exit 0. Si `as never` est refusé sur `nouveauStatut.in`, importer `StatutMarche` de `@prisma/client` et typer `STATUTS_ATTRIBUES: StatutMarche[]` (comme `analytics.ts`).

- [ ] **Step 3 : Commit**

```bash
git add lib/actions/pilotage.ts
git commit -m "feat(pilotage): Server Action getPilotageData (ADMIN, AVANCE)"
```

---

### Task 5 : Page `/pilotage`, composants et déplacement de l'onglet Analyses

**Files:**
- Create: `app/(dashboard)/pilotage/page.tsx`, `app/(dashboard)/pilotage/PilotageClient.tsx`
- Create: `components/pilotage/IndicateurCard.tsx`, `components/pilotage/QualiteDonnees.tsx`
- Move: `app/(dashboard)/admin/reporting/AnalytiquesTab.tsx` → `components/analytique/AnalytiquesTab.tsx` (`git mv`, contenu inchangé)
- Modify: `app/(dashboard)/admin/reporting/page.tsx` (retrait de l'import, du `TabsTrigger` et du `TabsContent` « analyses » ; sous-titre → « Gestion des règles de reporting email »)
- Modify: `components/layout/dashboard-shell.tsx:64` (ajout de l'entrée Pilotage avant Reporting)
- Modify: `lib/actions/analytics.ts`, `lib/actions/analytics-exports.ts` (chaque `requireRole(['ADMIN'])` → `requireRole(['ADMIN', 'AVANCE'])`)

**Interfaces:**
- Consumes : `getPilotageData`, `PilotageData` (Task 4) ; `PeriodSelector` (`components/analytique/PeriodSelector`) ; `formatMontant` (chercher son import dans `components/marches/marche-factures-section.tsx` et reprendre le même chemin).
- Produces : `IndicateurCard({ titre, valeur, sousLignes, explication, alerte, detail })`, `QualiteDonnees({ elements })`.

**Skills à charger avant d'écrire l'UI :** `dataviz` puis `ui-ux-pro-max` (rangée de KPI, seuils, accessibilité). Respecter shadcn/ui et la palette existante (`globals.css`), pas de mode sombre.

- [ ] **Step 1 : Menu**

Dans `components/layout/dashboard-shell.tsx`, importer `Gauge` depuis `lucide-react` et insérer avant la ligne Reporting :

```ts
  { href: '/pilotage',              label: 'Pilotage',         icon: Gauge,         roles: ['ADMIN', 'AVANCE'] },
```

- [ ] **Step 2 : Page serveur**

```tsx
// app/(dashboard)/pilotage/page.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { PilotageClient } from './PilotageClient'

export default async function PilotagePage() {
  const session = await auth()
  if (!session?.user || !['ADMIN', 'AVANCE'].includes(session.user.role)) redirect('/')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pilotage</h1>
        <p className="text-sm text-muted-foreground">
          Indicateurs de décision : ce que la valeur gagnée devient, et pourquoi on perd.
        </p>
      </div>
      <PilotageClient />
    </div>
  )
}
```

Vérifier le chemin réel d'`auth` et le nom du champ de rôle en lisant `app/(dashboard)/admin/reporting/page.tsx` (même contrôle) et l'aligner.

- [ ] **Step 3 : Carte d'indicateur**

```tsx
// components/pilotage/IndicateurCard.tsx
'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  titre: string
  valeur: string
  sousLignes: string[]
  explication: string
  alerte?: boolean
  detail?: ReactNode
}

export function IndicateurCard({ titre, valeur, sousLignes, explication, alerte, detail }: Props) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <Card className={alerte ? 'border-destructive/40' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titre}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold tabular-nums">{valeur}</span>
          {alerte && <AlertTriangle className="h-5 w-5 text-destructive" aria-label="Sous le seuil" />}
        </div>
        {sousLignes.map((l) => <p key={l} className="text-sm text-muted-foreground tabular-nums">{l}</p>)}
        <p className="text-xs text-muted-foreground">{explication}</p>
        {detail && (
          <>
            <Button variant="ghost" size="sm" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert}>
              <ChevronDown className={`h-4 w-4 transition-transform ${ouvert ? 'rotate-180' : ''}`} />
              Voir le détail
            </Button>
            {ouvert && <div className="max-h-64 overflow-auto text-sm">{detail}</div>}
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4 : Bloc qualité**

```tsx
// components/pilotage/QualiteDonnees.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ElementQualite } from '@/lib/pilotage/calculs'

export function QualiteDonnees({ elements }: { elements: ElementQualite[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Qualité des données</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {elements.map((e) => (
          <details key={e.cle} className="rounded-lg border p-3">
            <summary className="flex cursor-pointer justify-between gap-2 text-sm">
              <span>{e.libelle}</span>
              <span className={`font-semibold tabular-nums ${e.elements.length ? 'text-warning' : 'text-muted-foreground'}`}>
                {e.elements.length}
              </span>
            </summary>
            {e.elements.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                {e.elements.map((x) => <li key={x}>{x}</li>)}
              </ul>
            )}
          </details>
        ))}
      </CardContent>
    </Card>
  )
}
```

Si la classe `text-warning` n'existe pas dans `tailwind.config.ts`, utiliser le token d'avertissement existant (chercher `warning` dans `tailwind.config.ts`).

- [ ] **Step 5 : Composant client**

```tsx
// app/(dashboard)/pilotage/PilotageClient.tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { startOfYear, endOfDay } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { PeriodSelector } from '@/components/analytique/PeriodSelector'
import { AnalytiquesTab } from '@/components/analytique/AnalytiquesTab'
import { IndicateurCard } from '@/components/pilotage/IndicateurCard'
import { QualiteDonnees } from '@/components/pilotage/QualiteDonnees'
import { getPilotageData, type PilotageData } from '@/lib/actions/pilotage'
import { SEUIL_CONVERSION, MIN_CAS_ECART } from '@/lib/pilotage/calculs'
import { formatMontant } from '@/lib/utils/format' // aligner sur l'import réel (voir Interfaces)
import type { Periode } from '@/lib/analytics/types'

const pct = (v: number | null) => (v === null ? '—' : `${v} %`)

export function PilotageClient() {
  const [periode, setPeriode] = useState<Periode>({ dateDebut: startOfYear(new Date()), dateFin: endOfDay(new Date()) })
  const [data, setData] = useState<PilotageData | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        setErreur(null)
        setData(await getPilotageData({ dateDebut: periode.dateDebut.toISOString(), dateFin: periode.dateFin.toISOString() }))
      } catch {
        setErreur('Impossible de calculer les indicateurs. Réessayez ou élargissez la période.')
      }
    })
  }, [periode])

  return (
    <div className="space-y-6">
      <PeriodSelector periode={periode} onChange={setPeriode} />
      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
      {enCours || !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <IndicateurCard
              titre="Conversion attribué → facturé"
              valeur={pct(data.conversion.taux)}
              alerte={data.conversion.alerte}
              sousLignes={[
                `Facturé ${formatMontant(data.conversion.facture)} sur ${formatMontant(data.conversion.valeurAttribuee)}`,
                `dont encaissé : ${pct(data.conversion.tauxEncaisse)}`,
                `Perdu après attribution : ${formatMontant(data.conversion.perduApresAttribution)}`,
              ]}
              explication={`Part de la valeur attribuée déjà facturée (TTC). Alerte sous ${SEUIL_CONVERSION} %.`}
              detail={
                <ul className="space-y-1">
                  {data.conversion.marches.map((m) => (
                    <li key={m.id} className="flex justify-between gap-2">
                      <span className="truncate">{m.numero}{m.perdu ? ' (perdu)' : ''}</span>
                      <span className="tabular-nums">{formatMontant(m.facture)} / {formatMontant(m.montant)}</span>
                    </li>
                  ))}
                </ul>
              }
            />
            <IndicateurCard
              titre="Cumul des échecs"
              valeur={pct(data.echecs.tauxEchec)}
              sousLignes={[
                `${data.echecs.lotsPerdus} lot(s) perdu(s), ${data.echecs.lotsInfructueux} infructueux sur ${data.echecs.lotsSoumis} soumis`,
                `${data.echecs.marchesAnnulesOuResilies} marché(s) annulé(s) ou résilié(s) après attribution`,
                `Taux de succès (par lot) : ${pct(data.echecs.tauxSucces)}`,
              ]}
              explication="Lots perdus et infructueux rapportés aux lots soumis sur la période (date de dépôt)."
              detail={data.echecs.detail.length > 0 ? (
                <ul className="space-y-1">
                  {data.echecs.detail.map((d) => (
                    <li key={d.id} className="flex justify-between gap-2">
                      <span className="truncate">{d.libelle}</span>
                      <span>{d.resultat}</span>
                    </li>
                  ))}
                </ul>
              ) : undefined}
            />
            <IndicateurCard
              titre="Écart de prix face au gagnant"
              valeur={data.ecartPrix.suffisant ? `${data.ecartPrix.ecartMoyen! > 0 ? '+' : ''}${data.ecartPrix.ecartMoyen} %` : 'Pas assez de données'}
              sousLignes={[`n = ${data.ecartPrix.n} lot(s) perdu(s) avec montant concurrent (minimum ${MIN_CAS_ECART})`]}
              explication="Positif : notre offre était plus chère que celle du gagnant."
              detail={data.ecartPrix.n > 0 ? (
                <ul className="space-y-1">
                  {data.ecartPrix.cas.map((c) => (
                    <li key={c.id} className="flex justify-between gap-2">
                      <span className="truncate">{c.libelle}</span>
                      <span className="tabular-nums">{c.ecart > 0 ? '+' : ''}{c.ecart} %</span>
                    </li>
                  ))}
                </ul>
              ) : undefined}
            />
          </div>
          <QualiteDonnees elements={data.qualite} />
        </>
      )}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Analyses détaillées</h2>
        <AnalytiquesTab />
      </section>
    </div>
  )
}
```

Avant d'écrire : lire la signature réelle de `PeriodSelector` (props) et adapter l'appel ; si `AnalytiquesTab` contient déjà son propre `PeriodSelector`, le laisser tel quel (il garde sa période indépendante).

- [ ] **Step 6 : Déplacer l'onglet Analyses et ouvrir à AVANCE**

```bash
git mv "app/(dashboard)/admin/reporting/AnalytiquesTab.tsx" components/analytique/AnalytiquesTab.tsx
```

Mettre à jour le commentaire d'en-tête du fichier déplacé, retirer l'onglet de `admin/reporting/page.tsx`, puis dans `lib/actions/analytics.ts` et `lib/actions/analytics-exports.ts` remplacer chaque `requireRole(['ADMIN'])` par `requireRole(['ADMIN', 'AVANCE'])`.

- [ ] **Step 7 : Vérifier**

Run : `npm run typecheck && npm run lint && npm run test:unit`
Attendu : 0 erreur de type, lint sous le plafond (172), tests unitaires verts.

- [ ] **Step 8 : Commit**

```bash
git add -A "app/(dashboard)/pilotage" components/pilotage components/analytique/AnalytiquesTab.tsx "app/(dashboard)/admin/reporting" components/layout/dashboard-shell.tsx lib/actions/analytics.ts lib/actions/analytics-exports.ts
git commit -m "feat(pilotage): page /pilotage, indicateurs et déplacement des analyses"
```

---

### Task 6 : Retrait de `tauxRecouvrement`

**Files:**
- Modify: `lib/analytics/types.ts` (champ `tauxRecouvrement` de `FinancialStats`)
- Modify: `lib/actions/analytics.ts:215-217`
- Modify: `lib/actions/analytics-exports.ts` (lignes Excel 75 et 188, PDF 449)

**Interfaces:** aucune nouvelle ; supprime `FinancialStats.tauxRecouvrement`.

- [ ] **Step 1 : Supprimer le champ, son calcul et ses 3 usages d'export**

Dans les exports, remplacer la ligne « Taux de recouvrement » par la conversion n'est **pas** demandé dans cette tranche : supprimer simplement la ligne.

- [ ] **Step 2 : Vérifier qu'il ne reste aucun usage**

Run : `git grep -n tauxRecouvrement -- lib components app`
Attendu : aucune sortie.

Run : `npm run typecheck`
Attendu : exit 0.

- [ ] **Step 3 : Commit**

```bash
git add lib/analytics/types.ts lib/actions/analytics.ts lib/actions/analytics-exports.ts
git commit -m "refactor(analytics): retirer tauxRecouvrement, remplacé par la conversion du pilotage"
```

---

### Task 7 : Tests E2E et responsive

**Files:**
- Create: `tests/v1/pilotage.spec.ts`

**Interfaces:** Consumes `login`, `logout`, `TEST_USERS` de `tests/helpers/auth.ts`.

Préalable : suivre la mémoire projet « E2E Playwright contre `dev-test` sur la machine 4 Go » (redémarrer `dev-test` avant le run, chauffer les routes).

- [ ] **Step 1 : Écrire le test**

```ts
// tests/v1/pilotage.spec.ts
import { test, expect } from '@playwright/test'
import { login, logout, TEST_USERS } from '../helpers/auth'

test.describe('Pilotage', () => {
  test('AVANCE accède à la page et voit les 3 indicateurs et la qualité des données', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/pilotage')
    await expect(page.getByRole('heading', { name: 'Pilotage' })).toBeVisible()
    await expect(page.getByText('Conversion attribué → facturé')).toBeVisible()
    await expect(page.getByText('Cumul des échecs')).toBeVisible()
    await expect(page.getByText('Écart de prix face au gagnant')).toBeVisible()
    await expect(page.getByText('Qualité des données')).toBeVisible()
    await logout(page)
  })

  test('VISITEUR est redirigé', async ({ page }) => {
    await login(page, TEST_USERS.visiteur)
    await page.goto('/pilotage')
    await expect(page).not.toHaveURL(/\/pilotage/)
    await logout(page)
  })

  test("l'onglet Analyses a quitté Reporting", async ({ page }) => {
    await login(page, TEST_USERS.admin)
    await page.goto('/admin/reporting')
    await expect(page.getByRole('tab', { name: 'Analyses' })).toHaveCount(0)
    await logout(page)
  })

  for (const [nom, taille] of [['desktop', { width: 1920, height: 1080 }], ['tablette', { width: 768, height: 1024 }], ['mobile', { width: 375, height: 667 }]] as const) {
    test(`aucun débordement horizontal en ${nom}`, async ({ page }) => {
      await page.setViewportSize(taille)
      await login(page, TEST_USERS.admin)
      await page.goto('/pilotage')
      await expect(page.getByText('Conversion attribué → facturé')).toBeVisible()
      const deborde = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(deborde).toBe(false)
      await logout(page)
    })
  }
})
```

- [x] **Step 2 : Lancer contre la base de test**

Run : `npx playwright test tests/v1/pilotage.spec.ts --project=chromium` contre le build local de production et la base `.env.test` ; `AUTH_TRUST_HOST` et la heap Node sont configurés dans le processus uniquement.
Résultat : 8 tests Chromium réussis.

- [x] **Step 3 : Navigation clavier** : couverte par Playwright sur les trois indicateurs ; Entrée ouvre et referme le panneau, `aria-expanded` suit l'état.

**Revue UI/UX et dataviz (2026-10-06) :** correction du contraste des compteurs qualité, des cibles tactiles sur mobile/tablette et de l'état d'erreur (reprise explicite, disparition du squelette bloqué). L'évolution compare désormais les mêmes dates calendaires de l'année précédente, en points, sur décision d'Abel. Le build local de production réussit avec une heap Node portée à 4 Go pour ce processus seulement. Après activation temporaire d'`AUTH_TRUST_HOST` (le serveur local rejetait `localhost` sinon), les huit scénarios E2E Chromium passent contre le build local de production et la base de test. Le serveur `next dev` épuisait sa mémoire sur cette machine ; aucun timeout n'a été augmenté.

**Revue visuelle Playwright (2026-10-06) :** pages inspectées à 1920×1080, 768×1024 et 375×667 sur le serveur local et la base de test. La grille passe de 3 à 2+1 puis 1 colonne ; les filtres se replient sans débordement horizontal. Le drill-down, la référence annuelle et le bloc qualité restent lisibles. Console navigateur : 0 erreur, 0 avertissement. Aucun écart visuel bloquant observé.

**Isolation d'erreur par bloc :** chaque lecture source (marchés / lots) et chaque calcul est capturé séparément. L'action renvoie un état explicite par indicateur ; un bloc en erreur est journalisé côté serveur et n'empêche pas les autres résultats d'être affichés. Le bouton de reprise relance les calculs. Tests unitaires Pilotage : 16/16 réussis, dont le test de non-propagation d'une erreur vers les autres blocs. Les E2E existants passent 8/8 ; ils vérifient l'erreur de chargement globale et la reprise, pas une panne isolée d'une source.

- [ ] **Step 4 : Commit**

```bash
git add tests/v1/pilotage.spec.ts
git commit -m "test(pilotage): E2E accès, contenu et responsive"
```

---

### Task 8 : Rapprochement sur copie des données réelles (avant toute mise en production)

**Files:** aucun fichier du dépôt. Script et résultats dans le dossier `scratch` hors dépôt (jamais commités : données réelles).

- [x] **Step 1** : Restaurer la dernière sauvegarde de production dans une copie PostgreSQL 17 locale isolée ; la base de test PostgreSQL 15 sur le port 5433 est restée intacte.
- [x] **Step 2** : Calculer à la main en SQL, pour l'année civile : valeur attribuée, facturé TTC (EMISE/EN_ATTENTE/PAYEE), encaissé, lots soumis/perdus/infructueux, écart moyen sur lots perdus renseignés et contrôles qualité.
- [x] **Step 3** : Ouvrir `/pilotage` sur le build local avec la même période ; tous les chiffres et les six compteurs qualité correspondent au SQL.
- [x] **Step 4** : Présenter à Abel le tableau de rapprochement et la liste détaillée qualité ; les indicateurs, compteurs et dossiers signalés ont été présentés et validés dans le fil. Aucun écart n'a été signalé.
- [x] **Step 5** : Supprimer le clone temporaire PostgreSQL 17 et son volume anonyme ; le conteneur et le volume de test PostgreSQL 15 sont restés intacts, donc aucun re-seed n'était nécessaire.

---

### Mise en production (après validation de la Task 8)

Branche `feat/pilotage-tranche1` → audit « dépôt public » du diff et des messages → push → PR → gate `qualite` verte → accord explicite d'Abel → fusion (déploiement production automatique) → vérification de `/pilotage` en production en lecture seule. Retour arrière : revert du commit de fusion.
