# V2 Reporting Analytique — Plan d'Implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter un onglet "Analyses" dans `/admin/reporting` avec 4 sections analytiques (Performance, Financière, Capitalisation, SAV) filtrables par période, exportables en PDF et Excel.

**Architecture:** Extension de la page `/admin/reporting` existante via shadcn Tabs. Nouvelles Server Actions Prisma (`groupBy`, `aggregate`) dans `lib/actions/analytics.ts`. Composants Client dans `components/analytique/` suivant exactement les patterns Recharts du dashboard existant.

**Tech Stack:** Next.js 15 App Router · Prisma `groupBy`/`aggregate` · Recharts 2.15.0 · shadcn/ui Tabs (à installer) · @react-pdf/renderer · ExcelJS · date-fns

---

## Task 1 : Installer shadcn Tabs + créer les types analytics

**Files:**
- Créer : `components/ui/tabs.tsx` (via shadcn CLI)
- Créer : `lib/analytics/types.ts`

**Étape 1 : Installer le composant Tabs shadcn**

```bash
npx shadcn@latest add tabs
```

Attendu : `components/ui/tabs.tsx` créé.

**Étape 2 : Créer `lib/analytics/types.ts`**

```typescript
// lib/analytics/types.ts

export interface Periode {
  dateDebut: Date
  dateFin: Date
}

// ── Performance ──────────────────────────────────────────────────────────────

export interface PerformanceStats {
  totalMarches: number
  marchesGagnes: number       // statuts "attribués" et après
  marchesDeposes: number      // OFFRE_DEPOSEE et après (hors INFRUCTUEUX/ANNULE)
  winRate: number             // 0-100
  montantTotal: number
  montantMoyen: number
  delaiMoyenJours: number
  parStatut: { statut: string; label: string; count: number }[]
  parType: { type: string; label: string; count: number; montant: number; winRate: number }[]
  topConcurrents: { nom: string; count: number }[]
}

// ── Financière ────────────────────────────────────────────────────────────────

export interface FinancialStats {
  caContractualise: number    // SUM montant marchés EN_EXECUTION + CLOTURE + EXECUTE_ATTENTE
  caEncaisse: number          // SUM montantTTC factures PAYEE
  caEnAttente: number         // SUM montantTTC factures EMISE + EN_ATTENTE
  cautionsActives: number     // SUM montant cautions ACTIVE
  cautionsLiberees: number    // SUM montant cautions LIBEREE
  tauxRecouvrement: number    // caEncaisse / caContractualise * 100
  facturesParStatut: { statut: string; count: number; montant: number }[]
}

// ── Capitalisation ────────────────────────────────────────────────────────────

export interface CapitalisationStats {
  topAC: {
    nom: string
    total: number
    gagnes: number
    montant: number
    winRate: number
  }[]
  parSegment: {
    type: string
    label: string
    total: number
    gagnes: number
    montant: number
    winRate: number
  }[]
  saisonnalite: { mois: string; label: string; count: number }[]
}

// ── SAV ───────────────────────────────────────────────────────────────────────

export interface SAVStats {
  totalInterventions: number
  interventionsResolues: number
  tauxResolution: number      // 0-100
  delaiMoyenResolutionJours: number
  coutTotal: number
  parType: { type: string; label: string; count: number; cout: number }[]
  parStatut: { statut: string; label: string; count: number }[]
  topVehicules: {
    vehiculeId: string
    immatriculation: string
    marque: string
    modele: string
    count: number
    cout: number
  }[]
}

// ── Données complètes ─────────────────────────────────────────────────────────

export interface AllAnalyticsData {
  performance: PerformanceStats
  financiere: FinancialStats
  capitalisation: CapitalisationStats
  sav: SAVStats
}
```

**Étape 3 : Commit**

```bash
git add components/ui/tabs.tsx lib/analytics/types.ts
git commit -m "feat(analytique): installer Tabs + types analytics"
```

---

## Task 2 : Server Action `getPerformanceStats`

**Files:**
- Créer : `lib/actions/analytics.ts`

**Étape 1 : Créer `lib/actions/analytics.ts` avec `getPerformanceStats`**

```typescript
'use server'

import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/permissions'
import type { Periode, PerformanceStats, FinancialStats, CapitalisationStats, SAVStats } from '@/lib/analytics/types'
import { STATUT_LABELS, TYPE_MARCHE_LABELS } from '@/lib/constants/marche'
import { StatutMarche, StatutFacture } from '@prisma/client'
import { format, startOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

// Statuts considérés comme "marchés déposés" (soumissionnés)
const STATUTS_DEPOSES: StatutMarche[] = [
  StatutMarche.OFFRE_DEPOSEE,
  StatutMarche.EN_ATTENTE_ATTRIBUTION,
  StatutMarche.ATTRIBUE_PROVISOIREMENT,
  StatutMarche.ATTRIBUE_DEFINITIVEMENT,
  StatutMarche.EN_ATTENTE_LIVRAISON_OS,
  StatutMarche.EN_EXECUTION,
  StatutMarche.EXECUTE_ATTENTE_GARANTIES,
  StatutMarche.CLOTURE,
  StatutMarche.RESILIE,
]

// Statuts considérés comme "marchés gagnés" (attribués)
const STATUTS_GAGNES: StatutMarche[] = [
  StatutMarche.ATTRIBUE_DEFINITIVEMENT,
  StatutMarche.EN_ATTENTE_LIVRAISON_OS,
  StatutMarche.EN_EXECUTION,
  StatutMarche.EXECUTE_ATTENTE_GARANTIES,
  StatutMarche.CLOTURE,
]

export async function getPerformanceStats(periode: Periode): Promise<PerformanceStats> {
  await requireRole(['ADMIN'])

  const where = {
    dateNotification: { gte: periode.dateDebut, lte: periode.dateFin },
  }

  // 1. Répartition par statut
  const parStatutRaw = await prisma.marche.groupBy({
    by: ['statut'],
    where,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  })

  // 2. Répartition par type + montants
  const parTypeRaw = await prisma.marche.groupBy({
    by: ['type', 'statut'],
    where,
    _count: { id: true },
    _sum: { montant: true },
  })

  // 3. Agrégats globaux + délai moyen
  const aggregate = await prisma.marche.aggregate({
    where,
    _count: { id: true },
    _sum: { montant: true },
    _avg: { delaiExecution: true },
  })

  // 4. Top concurrents (champ concurrentGagnant)
  const concurrentsRaw = await prisma.marche.groupBy({
    by: ['concurrentGagnant'],
    where: {
      ...where,
      concurrentGagnant: { not: null },
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })

  // Post-traitement statuts
  const parStatut = parStatutRaw.map((s) => ({
    statut: s.statut,
    label: STATUT_LABELS[s.statut],
    count: s._count.id,
  }))

  // Post-traitement types — win rate par type
  const typeMap = new Map<string, { total: number; gagnes: number; montant: number }>()
  for (const row of parTypeRaw) {
    const existing = typeMap.get(row.type) || { total: 0, gagnes: 0, montant: 0 }
    existing.total += row._count.id
    existing.montant += Number(row._sum.montant || 0)
    if (STATUTS_GAGNES.includes(row.statut as StatutMarche)) {
      existing.gagnes += row._count.id
    }
    typeMap.set(row.type, existing)
  }

  const parType = Array.from(typeMap.entries()).map(([type, data]) => ({
    type,
    label: TYPE_MARCHE_LABELS[type as keyof typeof TYPE_MARCHE_LABELS] || type,
    count: data.total,
    montant: data.montant,
    winRate: data.total > 0 ? Math.round((data.gagnes / data.total) * 100) : 0,
  }))

  // Calcul win rate global
  const totalDeposes = parStatutRaw
    .filter((s) => STATUTS_DEPOSES.includes(s.statut as StatutMarche))
    .reduce((sum, s) => sum + s._count.id, 0)
  const totalGagnes = parStatutRaw
    .filter((s) => STATUTS_GAGNES.includes(s.statut as StatutMarche))
    .reduce((sum, s) => sum + s._count.id, 0)

  return {
    totalMarches: aggregate._count.id,
    marchesGagnes: totalGagnes,
    marchesDeposes: totalDeposes,
    winRate: totalDeposes > 0 ? Math.round((totalGagnes / totalDeposes) * 100) : 0,
    montantTotal: Number(aggregate._sum.montant || 0),
    montantMoyen: aggregate._count.id > 0
      ? Math.round(Number(aggregate._sum.montant || 0) / aggregate._count.id)
      : 0,
    delaiMoyenJours: Math.round(aggregate._avg.delaiExecution || 0),
    parStatut,
    parType,
    topConcurrents: concurrentsRaw
      .filter((c) => c.concurrentGagnant)
      .map((c) => ({ nom: c.concurrentGagnant!, count: c._count.id })),
  }
}
```

**Étape 2 : Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

**Étape 3 : Commit**

```bash
git add lib/actions/analytics.ts
git commit -m "feat(analytique): SA getPerformanceStats"
```

---

## Task 3 : Server Actions `getFinancialStats`, `getCapitalisationStats`, `getSAVStats`

**Files:**
- Modifier : `lib/actions/analytics.ts`

**Étape 1 : Ajouter `getFinancialStats`**

Ajouter à la fin de `lib/actions/analytics.ts` :

```typescript
export async function getFinancialStats(periode: Periode): Promise<FinancialStats> {
  await requireRole(['ADMIN'])

  const wherePeriode = {
    dateNotification: { gte: periode.dateDebut, lte: periode.dateFin },
  }

  // CA contractualisé = SUM montant marchés "effectifs"
  const caContractualise = await prisma.marche.aggregate({
    where: {
      ...wherePeriode,
      statut: {
        in: [
          StatutMarche.EN_EXECUTION,
          StatutMarche.EXECUTE_ATTENTE_GARANTIES,
          StatutMarche.CLOTURE,
          StatutMarche.ATTRIBUE_DEFINITIVEMENT,
        ],
      },
    },
    _sum: { montant: true },
  })

  // Factures sur la période (dateEmission dans la période)
  const whereFactures = {
    marche: wherePeriode,
  }

  const facturesParStatutRaw = await prisma.facture.groupBy({
    by: ['statut'],
    where: whereFactures,
    _count: { id: true },
    _sum: { montantTTC: true },
  })

  const caEncaisse = facturesParStatutRaw
    .filter((f) => f.statut === StatutFacture.PAYEE)
    .reduce((sum, f) => sum + Number(f._sum.montantTTC || 0), 0)

  const caEnAttente = facturesParStatutRaw
    .filter((f) => [StatutFacture.EMISE, StatutFacture.EN_ATTENTE].includes(f.statut as StatutFacture))
    .reduce((sum, f) => sum + Number(f._sum.montantTTC || 0), 0)

  // Cautions
  const cautionsActives = await prisma.caution.aggregate({
    where: { statut: 'ACTIVE' },
    _sum: { montant: true },
  })
  const cautionsLiberees = await prisma.caution.aggregate({
    where: { statut: 'LIBEREE' },
    _sum: { montant: true },
  })

  const caContractualiseVal = Number(caContractualise._sum.montant || 0)

  return {
    caContractualise: caContractualiseVal,
    caEncaisse,
    caEnAttente,
    cautionsActives: Number(cautionsActives._sum.montant || 0),
    cautionsLiberees: Number(cautionsLiberees._sum.montant || 0),
    tauxRecouvrement: caContractualiseVal > 0
      ? Math.round((caEncaisse / caContractualiseVal) * 100)
      : 0,
    facturesParStatut: facturesParStatutRaw.map((f) => ({
      statut: f.statut,
      count: f._count.id,
      montant: Number(f._sum.montantTTC || 0),
    })),
  }
}
```

**Étape 2 : Ajouter `getCapitalisationStats`**

```typescript
export async function getCapitalisationStats(periode: Periode): Promise<CapitalisationStats> {
  await requireRole(['ADMIN'])

  const where = {
    dateNotification: { gte: periode.dateDebut, lte: periode.dateFin },
  }

  // 1. Tous les marchés de la période (pour calcul win rate par AC et par type)
  const marches = await prisma.marche.findMany({
    where,
    select: {
      autoriteContractanteNom: true,
      type: true,
      statut: true,
      montant: true,
      datePublication: true,
    },
  })

  // Win rate par AC
  const acMap = new Map<string, { total: number; gagnes: number; montant: number }>()
  for (const m of marches) {
    const key = m.autoriteContractanteNom
    const existing = acMap.get(key) || { total: 0, gagnes: 0, montant: 0 }
    existing.total += 1
    existing.montant += Number(m.montant || 0)
    if (STATUTS_GAGNES.includes(m.statut as StatutMarche)) existing.gagnes += 1
    acMap.set(key, existing)
  }

  const topAC = Array.from(acMap.entries())
    .map(([nom, data]) => ({
      nom,
      total: data.total,
      gagnes: data.gagnes,
      montant: data.montant,
      winRate: data.total > 0 ? Math.round((data.gagnes / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 10)

  // Win rate par segment (type)
  const segmentMap = new Map<string, { total: number; gagnes: number; montant: number }>()
  for (const m of marches) {
    const existing = segmentMap.get(m.type) || { total: 0, gagnes: 0, montant: 0 }
    existing.total += 1
    existing.montant += Number(m.montant || 0)
    if (STATUTS_GAGNES.includes(m.statut as StatutMarche)) existing.gagnes += 1
    segmentMap.set(m.type, existing)
  }

  const parSegment = Array.from(segmentMap.entries()).map(([type, data]) => ({
    type,
    label: TYPE_MARCHE_LABELS[type as keyof typeof TYPE_MARCHE_LABELS] || type,
    total: data.total,
    gagnes: data.gagnes,
    montant: data.montant,
    winRate: data.total > 0 ? Math.round((data.gagnes / data.total) * 100) : 0,
  }))

  // Saisonnalité — marchés par mois (dateNotification)
  const moisMap = new Map<string, { label: string; count: number }>()
  for (const m of marches) {
    if (!m.datePublication) continue
    const key = format(m.datePublication, 'yyyy-MM')
    const label = format(m.datePublication, 'MMM yyyy', { locale: fr })
    const existing = moisMap.get(key) || { label, count: 0 }
    existing.count += 1
    moisMap.set(key, existing)
  }

  const saisonnalite = Array.from(moisMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mois, data]) => ({ mois, label: data.label, count: data.count }))

  return { topAC, parSegment, saisonnalite }
}
```

**Étape 3 : Ajouter `getSAVStats`**

```typescript
export async function getSAVStats(periode: Periode): Promise<SAVStats> {
  await requireRole(['ADMIN'])

  const where = {
    signaleAt: { gte: periode.dateDebut, lte: periode.dateFin },
  }

  // Répartition par statut
  const parStatutRaw = await prisma.intervention.groupBy({
    by: ['statut'],
    where,
    _count: { id: true },
    _sum: { cout: true },
  })

  // Répartition par type
  const parTypeRaw = await prisma.intervention.groupBy({
    by: ['type'],
    where,
    _count: { id: true },
    _sum: { cout: true },
  })

  // Toutes les interventions pour calcul délai moyen
  const interventions = await prisma.intervention.findMany({
    where,
    select: {
      statut: true,
      signaleAt: true,
      resolveAt: true,
      cout: true,
      vehiculeId: true,
      vehicule: {
        select: { immatriculation: true, marque: true, modele: true },
      },
    },
  })

  // Calcul délai moyen résolution
  const resolues = interventions.filter((i) => i.resolveAt)
  const delaiMoyen = resolues.length > 0
    ? resolues.reduce((sum, i) => {
        const jours = (i.resolveAt!.getTime() - i.signaleAt.getTime()) / (1000 * 60 * 60 * 24)
        return sum + jours
      }, 0) / resolues.length
    : 0

  // Top véhicules défaillants
  const vehiculeMap = new Map<string, {
    immatriculation: string; marque: string; modele: string
    count: number; cout: number
  }>()
  for (const i of interventions) {
    const existing = vehiculeMap.get(i.vehiculeId) || {
      immatriculation: i.vehicule.immatriculation,
      marque: i.vehicule.marque,
      modele: i.vehicule.modele,
      count: 0,
      cout: 0,
    }
    existing.count += 1
    existing.cout += Number(i.cout || 0)
    vehiculeMap.set(i.vehiculeId, existing)
  }

  const topVehicules = Array.from(vehiculeMap.entries())
    .map(([vehiculeId, data]) => ({ vehiculeId, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const INTERVENTION_TYPE_LABELS: Record<string, string> = {
    PANNE: 'Panne',
    ENTRETIEN: 'Entretien',
    RAPPEL: 'Rappel',
  }
  const INTERVENTION_STATUT_LABELS: Record<string, string> = {
    SIGNALE: 'Signalé',
    DIAGNOSTIC: 'Diagnostic',
    EN_COURS: 'En cours',
    RESOLU: 'Résolu',
    CLOS: 'Clos',
  }

  const totalInterventions = interventions.length
  const interventionsResolues = interventions.filter(
    (i) => i.statut === 'RESOLU' || i.statut === 'CLOS'
  ).length
  const coutTotal = interventions.reduce((sum, i) => sum + Number(i.cout || 0), 0)

  return {
    totalInterventions,
    interventionsResolues,
    tauxResolution: totalInterventions > 0
      ? Math.round((interventionsResolues / totalInterventions) * 100)
      : 0,
    delaiMoyenResolutionJours: Math.round(delaiMoyen * 10) / 10,
    coutTotal,
    parType: parTypeRaw.map((t) => ({
      type: t.type,
      label: INTERVENTION_TYPE_LABELS[t.type] || t.type,
      count: t._count.id,
      cout: Number(t._sum.cout || 0),
    })),
    parStatut: parStatutRaw.map((s) => ({
      statut: s.statut,
      label: INTERVENTION_STATUT_LABELS[s.statut] || s.statut,
      count: s._count.id,
    })),
    topVehicules,
  }
}
```

**Étape 4 : Ajouter la fonction combinée**

```typescript
export async function getAllAnalyticsData(periode: Periode) {
  const [performance, financiere, capitalisation, sav] = await Promise.all([
    getPerformanceStats(periode),
    getFinancialStats(periode),
    getCapitalisationStats(periode),
    getSAVStats(periode),
  ])
  return { performance, financiere, capitalisation, sav }
}
```

**Étape 5 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

**Étape 6 : Commit**

```bash
git add lib/actions/analytics.ts
git commit -m "feat(analytique): SA getFinancialStats + getCapitalisationStats + getSAVStats"
```

---

## Task 4 : Server Actions export PDF + Excel

**Files:**
- Créer : `lib/actions/analytics-exports.ts`

**Étape 1 : Créer `lib/actions/analytics-exports.ts`**

```typescript
'use server'

import { requireRole } from '@/lib/utils/permissions'
import { getAllAnalyticsData } from './analytics'
import { createExcelFile, type ExcelColumn } from '@/lib/utils/excel'
import { createPDFDocument, type PDFColumn, type PDFSummaryItem } from '@/lib/utils/pdf'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import type { ActionResult } from '@/types'
import type { Periode } from '@/lib/analytics/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

function formatMontant(val: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(val)) + ' FCFA'
}

function periodeLabel(periode: Periode) {
  return `${format(periode.dateDebut, 'dd/MM/yyyy', { locale: fr })} – ${format(periode.dateFin, 'dd/MM/yyyy', { locale: fr })}`
}

export async function exportAnalytiquesExcel(
  periode: Periode
): Promise<ActionResult<{ buffer: Buffer; filename: string }>> {
  try {
    const session = await requireRole(['ADMIN'])
    const data = await getAllAnalyticsData(periode)
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'ERP Marchés STAM'
    workbook.created = new Date()

    // ── Onglet 1 : Performance ──────────────────────────────────────────────
    const wsPerf = workbook.addWorksheet('Performance')
    wsPerf.addRow(['PERFORMANCE MARCHÉS — ' + periodeLabel(periode)])
    wsPerf.addRow([])
    wsPerf.addRow(['Total marchés', data.performance.totalMarches])
    wsPerf.addRow(['Marchés déposés', data.performance.marchesDeposes])
    wsPerf.addRow(['Marchés gagnés', data.performance.marchesGagnes])
    wsPerf.addRow(['Taux de succès', data.performance.winRate + '%'])
    wsPerf.addRow(['Montant total', formatMontant(data.performance.montantTotal)])
    wsPerf.addRow(['Montant moyen', formatMontant(data.performance.montantMoyen)])
    wsPerf.addRow(['Délai moyen exécution', data.performance.delaiMoyenJours + ' jours'])
    wsPerf.addRow([])
    wsPerf.addRow(['Statut', 'Nombre'])
    for (const s of data.performance.parStatut) wsPerf.addRow([s.label, s.count])
    wsPerf.addRow([])
    wsPerf.addRow(['Type', 'Total', 'Gagnés', 'Win Rate', 'Montant'])
    for (const t of data.performance.parType) {
      wsPerf.addRow([t.label, t.count, t.winRate + '%', formatMontant(t.montant)])
    }

    // ── Onglet 2 : Financière ───────────────────────────────────────────────
    const wsFin = workbook.addWorksheet('Financière')
    wsFin.addRow(['ANALYSE FINANCIÈRE — ' + periodeLabel(periode)])
    wsFin.addRow([])
    wsFin.addRow(['CA contractualisé', formatMontant(data.financiere.caContractualise)])
    wsFin.addRow(['CA encaissé', formatMontant(data.financiere.caEncaisse)])
    wsFin.addRow(['CA en attente', formatMontant(data.financiere.caEnAttente)])
    wsFin.addRow(['Taux de recouvrement', data.financiere.tauxRecouvrement + '%'])
    wsFin.addRow(['Cautions actives', formatMontant(data.financiere.cautionsActives)])
    wsFin.addRow(['Cautions libérées', formatMontant(data.financiere.cautionsLiberees)])
    wsFin.addRow([])
    wsFin.addRow(['Statut Facture', 'Nombre', 'Montant TTC'])
    for (const f of data.financiere.facturesParStatut) {
      wsFin.addRow([f.statut, f.count, formatMontant(f.montant)])
    }

    // ── Onglet 3 : Capitalisation ───────────────────────────────────────────
    const wsCap = workbook.addWorksheet('Capitalisation')
    wsCap.addRow(['CAPITALISATION STRATÉGIQUE — ' + periodeLabel(periode)])
    wsCap.addRow([])
    wsCap.addRow(['Top Autorités Contractantes'])
    wsCap.addRow(['Autorité', 'Total', 'Gagnés', 'Win Rate %', 'Montant'])
    for (const ac of data.capitalisation.topAC) {
      wsCap.addRow([ac.nom, ac.total, ac.gagnes, ac.winRate + '%', formatMontant(ac.montant)])
    }
    wsCap.addRow([])
    wsCap.addRow(['Par Segment'])
    wsCap.addRow(['Segment', 'Total', 'Gagnés', 'Win Rate %', 'Montant'])
    for (const s of data.capitalisation.parSegment) {
      wsCap.addRow([s.label, s.total, s.gagnes, s.winRate + '%', formatMontant(s.montant)])
    }
    wsCap.addRow([])
    wsCap.addRow(['Saisonnalité'])
    wsCap.addRow(['Mois', 'Nombre appels d\'offres'])
    for (const m of data.capitalisation.saisonnalite) {
      wsCap.addRow([m.label, m.count])
    }

    // ── Onglet 4 : SAV ──────────────────────────────────────────────────────
    const wsSAV = workbook.addWorksheet('SAV')
    wsSAV.addRow(['SAV & INTERVENTIONS — ' + periodeLabel(periode)])
    wsSAV.addRow([])
    wsSAV.addRow(['Total interventions', data.sav.totalInterventions])
    wsSAV.addRow(['Interventions résolues', data.sav.interventionsResolues])
    wsSAV.addRow(['Taux de résolution', data.sav.tauxResolution + '%'])
    wsSAV.addRow(['Délai moyen résolution', data.sav.delaiMoyenResolutionJours + ' jours'])
    wsSAV.addRow(['Coût total', formatMontant(data.sav.coutTotal)])
    wsSAV.addRow([])
    wsSAV.addRow(['Par Type', 'Nombre', 'Coût'])
    for (const t of data.sav.parType) {
      wsSAV.addRow([t.label, t.count, formatMontant(t.cout)])
    }
    wsSAV.addRow([])
    wsSAV.addRow(['Top Véhicules Défaillants'])
    wsSAV.addRow(['Immatriculation', 'Marque', 'Modèle', 'Nb interventions', 'Coût total'])
    for (const v of data.sav.topVehicules) {
      wsSAV.addRow([v.immatriculation, v.marque, v.modele, v.count, formatMontant(v.cout)])
    }

    // Génération buffer
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
    const filename = `analytiques_${format(new Date(), 'yyyy-MM-dd')}.xlsx`

    await logAction({
      userId: session.user.id,
      userEmail: session.user.email,
      action: AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata: { format: 'EXCEL', module: 'ANALYTIQUE', periode },
    })

    return { success: true, data: { buffer, filename } }
  } catch (error: any) {
    console.error('[EXPORT_ANALYTIQUES_EXCEL]', error)
    return { success: false, error: error.message || "Erreur export Excel analytiques" }
  }
}

export async function exportAnalytiquesPDF(
  periode: Periode
): Promise<ActionResult<{ buffer: Buffer; filename: string }>> {
  try {
    const session = await requireRole(['ADMIN'])
    const data = await getAllAnalyticsData(periode)

    // Rapport performance (tableau principal)
    const columns: PDFColumn[] = [
      { header: 'Autorité Contractante', key: 'nom', width: '40%', align: 'left' },
      { header: 'Total', key: 'total', width: '12%', align: 'right', format: 'number' },
      { header: 'Gagnés', key: 'gagnes', width: '12%', align: 'right', format: 'number' },
      { header: 'Win Rate', key: 'winRateStr', width: '15%', align: 'right' },
      { header: 'Montant', key: 'montant', width: '21%', align: 'right', format: 'currency' },
    ]

    const tableData = data.capitalisation.topAC.map((ac) => ({
      nom: ac.nom,
      total: ac.total,
      gagnes: ac.gagnes,
      winRateStr: ac.winRate + '%',
      montant: ac.montant,
    }))

    const summary: PDFSummaryItem[] = [
      { label: 'Période analysée', value: periodeLabel(periode) },
      { label: 'Total marchés', value: data.performance.totalMarches },
      { label: 'Taux de succès global', value: data.performance.winRate + '%' },
      { label: 'CA contractualisé', value: formatMontant(data.performance.montantTotal) },
      { label: 'CA encaissé', value: formatMontant(data.financiere.caEncaisse) },
      { label: 'Taux recouvrement', value: data.financiere.tauxRecouvrement + '%' },
      { label: 'Cautions actives', value: formatMontant(data.financiere.cautionsActives) },
      { label: 'Interventions SAV', value: data.sav.totalInterventions },
      { label: 'Taux résolution SAV', value: data.sav.tauxResolution + '%' },
    ]

    const buffer = await createPDFDocument({
      title: 'Rapport Analytique — Marchés Publics',
      subtitle: periodeLabel(periode),
      columns,
      data: tableData,
      summary,
      orientation: 'landscape',
    })

    const filename = `rapport_analytique_${format(new Date(), 'yyyy-MM-dd')}.pdf`

    await logAction({
      userId: session.user.id,
      userEmail: session.user.email,
      action: AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata: { format: 'PDF', module: 'ANALYTIQUE', periode },
    })

    return { success: true, data: { buffer, filename } }
  } catch (error: any) {
    console.error('[EXPORT_ANALYTIQUES_PDF]', error)
    return { success: false, error: error.message || "Erreur export PDF analytiques" }
  }
}
```

**Étape 2 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

**Étape 3 : Commit**

```bash
git add lib/actions/analytics-exports.ts
git commit -m "feat(analytique): SA export PDF + Excel analytiques"
```

---

## Task 5 : Composant `PeriodSelector`

**Files:**
- Créer : `components/analytique/PeriodSelector.tsx`

**Étape 1 : Créer le composant**

```tsx
// components/analytique/PeriodSelector.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Periode } from '@/lib/analytics/types'

interface PeriodSelectorProps {
  value: Periode
  onChange: (periode: Periode) => void
  disabled?: boolean
}

const PRESETS = [
  {
    label: '30 jours',
    getValue: () => ({
      dateDebut: startOfDay(subDays(new Date(), 30)),
      dateFin: endOfDay(new Date()),
    }),
  },
  {
    label: '90 jours',
    getValue: () => ({
      dateDebut: startOfDay(subDays(new Date(), 90)),
      dateFin: endOfDay(new Date()),
    }),
  },
  {
    label: '6 mois',
    getValue: () => ({
      dateDebut: startOfDay(subMonths(new Date(), 6)),
      dateFin: endOfDay(new Date()),
    }),
  },
  {
    label: '1 an',
    getValue: () => ({
      dateDebut: startOfDay(subYears(new Date(), 1)),
      dateFin: endOfDay(new Date()),
    }),
  },
] as const

export function PeriodSelector({ value, onChange, disabled }: PeriodSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selecting, setSelecting] = useState<'debut' | 'fin'>('debut')
  const [tempDebut, setTempDebut] = useState<Date | undefined>(value.dateDebut)

  const isPresetActive = (preset: typeof PRESETS[number]) => {
    const p = preset.getValue()
    return (
      Math.abs(p.dateDebut.getTime() - value.dateDebut.getTime()) < 86400000 &&
      Math.abs(p.dateFin.getTime() - value.dateFin.getTime()) < 86400000
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Période :</span>

      {/* Presets */}
      {PRESETS.map((preset) => (
        <Button
          key={preset.label}
          variant={isPresetActive(preset) ? 'default' : 'outline'}
          size="sm"
          disabled={disabled}
          onClick={() => onChange(preset.getValue())}
        >
          {preset.label}
        </Button>
      ))}

      {/* Personnalisé */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled}>
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {format(value.dateDebut, 'dd/MM/yyyy', { locale: fr })}
            {' – '}
            {format(value.dateFin, 'dd/MM/yyyy', { locale: fr })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b text-sm text-muted-foreground">
            {selecting === 'debut'
              ? 'Sélectionnez la date de début'
              : 'Sélectionnez la date de fin'}
          </div>
          <Calendar
            mode="single"
            locale={fr}
            selected={selecting === 'debut' ? tempDebut : value.dateFin}
            onSelect={(date) => {
              if (!date) return
              if (selecting === 'debut') {
                setTempDebut(startOfDay(date))
                setSelecting('fin')
              } else {
                if (tempDebut && date >= tempDebut) {
                  onChange({ dateDebut: tempDebut, dateFin: endOfDay(date) })
                  setOpen(false)
                  setSelecting('debut')
                }
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

**Étape 2 : Commit**

```bash
git add components/analytique/PeriodSelector.tsx
git commit -m "feat(analytique): composant PeriodSelector"
```

---

## Task 6 : `PerformanceSection`

**Files:**
- Créer : `components/analytique/PerformanceSection.tsx`

**Étape 1 : Créer le composant**

```tsx
// components/analytique/PerformanceSection.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { PerformanceStats } from '@/lib/analytics/types'

function fmt(val: number) {
  if (val >= 1_000_000) return `${Math.round(val / 1_000_000)}M`
  if (val >= 1_000) return `${Math.round(val / 1_000)}k`
  return `${val}`
}

const COLORS = ['#1E3A5F', '#C49A1A', '#2563EB', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B']

interface Props { data: PerformanceStats }

export function PerformanceSection({ data }: Props) {
  if (data.totalMarches === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Performance Marchés</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Aucun marché sur cette période.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#1E3A5F]">Performance Marchés</h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total marchés', value: data.totalMarches },
          { label: 'Taux de succès', value: `${data.winRate}%` },
          { label: 'Montant total', value: fmt(data.montantTotal) + ' FCFA' },
          { label: 'Délai moyen', value: `${data.delaiMoyenJours}j` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold text-[#1E3A5F]">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Donut répartition statuts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px]">
              <PieChart>
                <Pie
                  data={data.parStatut}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {data.parStatut.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [`${val}`, 'Marchés']} />
                <Legend formatter={(val) => val.length > 20 ? val.slice(0, 20) + '…' : val} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Bar win rate par type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Win rate par type (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px]">
              <BarChart data={data.parType} layout="vertical">
                <XAxis type="number" domain={[0, 100]} unit="%" fontSize={11} />
                <YAxis type="category" dataKey="label" width={120} fontSize={11} />
                <Tooltip formatter={(val) => [`${val}%`, 'Win rate']} />
                <Bar dataKey="winRate" fill="#C49A1A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top concurrents */}
      {data.topConcurrents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top concurrents identifiés</CardTitle>
            <CardDescription>Entreprises gagnantes sur les marchés non remportés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.topConcurrents.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <span>{c.nom}</span>
                  <span className="font-medium text-[#1E3A5F]">{c.count} marché{c.count > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

**Étape 2 : Commit**

```bash
git add components/analytique/PerformanceSection.tsx
git commit -m "feat(analytique): PerformanceSection (KPIs + DonutChart + BarChart)"
```

---

## Task 7 : `FinanciereSection`

**Files:**
- Créer : `components/analytique/FinanciereSection.tsx`

**Étape 1 : Créer le composant**

```tsx
// components/analytique/FinanciereSection.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { FinancialStats } from '@/lib/analytics/types'

function fmt(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M FCFA`
  if (val >= 1_000) return `${Math.round(val / 1_000)}k FCFA`
  return `${val} FCFA`
}

const STATUT_FACTURE_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EMISE: 'Émise',
  EN_ATTENTE: 'En attente',
  PAYEE: 'Payée',
  REJETEE: 'Rejetée',
  ANNULEE: 'Annulée',
}

const STATUT_COLORS: Record<string, string> = {
  PAYEE: '#10B981',
  EMISE: '#C49A1A',
  EN_ATTENTE: '#F59E0B',
  BROUILLON: '#6B7280',
  REJETEE: '#EF4444',
  ANNULEE: '#9CA3AF',
}

interface Props { data: FinancialStats }

export function FinanciereSection({ data }: Props) {
  const caData = [
    { label: 'Contractualisé', montant: data.caContractualise },
    { label: 'Encaissé', montant: data.caEncaisse },
    { label: 'En attente', montant: data.caEnAttente },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#1E3A5F]">Analyse Financière</h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'CA contractualisé', value: fmt(data.caContractualise) },
          { label: 'CA encaissé', value: fmt(data.caEncaisse) },
          { label: 'CA en attente', value: fmt(data.caEnAttente) },
          { label: 'Taux recouvrement', value: `${data.tauxRecouvrement}%` },
          { label: 'Cautions actives', value: fmt(data.cautionsActives) },
          { label: 'Cautions libérées', value: fmt(data.cautionsLiberees) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
              <p className="text-lg font-bold text-[#1E3A5F] mt-1">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Bar CA */}
        <Card>
          <CardHeader><CardTitle className="text-sm">CA : contractualisé vs encaissé</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[220px]">
              <BarChart data={caData}>
                <XAxis dataKey="label" fontSize={11} />
                <YAxis tickFormatter={(v) => fmt(v)} fontSize={10} width={70} />
                <Tooltip formatter={(v) => [fmt(Number(v)), 'Montant']} />
                <Bar dataKey="montant" radius={[4, 4, 0, 0]}>
                  {caData.map((_, i) => (
                    <Cell key={i} fill={['#1E3A5F', '#10B981', '#C49A1A'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Bar factures par statut */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Factures par statut</CardTitle></CardHeader>
          <CardContent>
            {data.facturesParStatut.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune facture sur cette période.</p>
            ) : (
              <ChartContainer config={{}} className="h-[220px]">
                <BarChart
                  data={data.facturesParStatut.map((f) => ({
                    ...f,
                    label: STATUT_FACTURE_LABELS[f.statut] || f.statut,
                  }))}
                >
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v, name) => [v, name === 'count' ? 'Factures' : 'Montant']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.facturesParStatut.map((f, i) => (
                      <Cell key={i} fill={STATUT_COLORS[f.statut] || '#6B7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

**Étape 2 : Commit**

```bash
git add components/analytique/FinanciereSection.tsx
git commit -m "feat(analytique): FinanciereSection (KPIs + BarCharts CA + Factures)"
```

---

## Task 8 : `CapitalisationSection`

**Files:**
- Créer : `components/analytique/CapitalisationSection.tsx`

**Étape 1 : Créer le composant**

```tsx
// components/analytique/CapitalisationSection.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Cell } from 'recharts'
import type { CapitalisationStats } from '@/lib/analytics/types'

function fmt(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `${Math.round(val / 1_000)}k`
  return `${val}`
}

interface Props { data: CapitalisationStats }

export function CapitalisationSection({ data }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#1E3A5F]">Capitalisation Stratégique</h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Autorités contractantes', value: data.topAC.length },
          {
            label: 'Meilleur win rate AC',
            value: data.topAC.length > 0
              ? `${Math.max(...data.topAC.map((a) => a.winRate))}%`
              : '—',
          },
          {
            label: 'Segment dominant',
            value: data.parSegment.length > 0
              ? data.parSegment.sort((a, b) => b.montant - a.montant)[0]?.label
              : '—',
          },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold text-[#1E3A5F] mt-1 truncate">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top AC */}
      {data.topAC.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top 10 Autorités Contractantes (montant)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[280px]">
              <BarChart data={data.topAC} layout="vertical">
                <XAxis type="number" tickFormatter={fmt} fontSize={10} />
                <YAxis
                  type="category"
                  dataKey="nom"
                  width={150}
                  fontSize={10}
                  tickFormatter={(v) => v.length > 22 ? v.slice(0, 22) + '…' : v}
                />
                <Tooltip
                  formatter={(v, name) =>
                    name === 'montant'
                      ? [`${fmt(Number(v))} FCFA`, 'Montant']
                      : [v, name === 'winRate' ? 'Win Rate %' : name]
                  }
                />
                <Bar dataKey="montant" fill="#1E3A5F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Win rate par segment */}
        {data.parSegment.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Win rate par segment (%)</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[220px]">
                <BarChart data={data.parSegment} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} unit="%" fontSize={11} />
                  <YAxis type="category" dataKey="label" width={130} fontSize={11} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Win rate']} />
                  <Bar dataKey="winRate" fill="#C49A1A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Saisonnalité */}
        {data.saisonnalite.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Saisonnalité des appels d'offres</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[220px]">
                <LineChart data={data.saisonnalite}>
                  <XAxis dataKey="label" fontSize={10} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v) => [v, "Appels d'offres"]} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={{ fill: '#2563EB', r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
```

**Étape 2 : Commit**

```bash
git add components/analytique/CapitalisationSection.tsx
git commit -m "feat(analytique): CapitalisationSection (Top AC + Win rate + Saisonnalité)"
```

---

## Task 9 : `SAVSection`

**Files:**
- Créer : `components/analytique/SAVSection.tsx`

**Étape 1 : Créer le composant**

```tsx
// components/analytique/SAVSection.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { SAVStats } from '@/lib/analytics/types'

function fmt(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M FCFA`
  if (val >= 1_000) return `${Math.round(val / 1_000)}k FCFA`
  return `${val} FCFA`
}

const TYPE_COLORS: Record<string, string> = {
  PANNE: '#EF4444',
  ENTRETIEN: '#10B981',
  RAPPEL: '#F59E0B',
}

interface Props { data: SAVStats }

export function SAVSection({ data }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#1E3A5F]">SAV & Interventions</h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total interventions', value: data.totalInterventions },
          { label: 'Taux de résolution', value: `${data.tauxResolution}%` },
          { label: 'Délai moyen résolution', value: `${data.delaiMoyenResolutionJours}j` },
          { label: 'Coût total', value: fmt(data.coutTotal) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold text-[#1E3A5F] mt-1">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.totalInterventions === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Aucune intervention SAV sur cette période.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Bar par type */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Interventions par type</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[200px]">
                  <BarChart data={data.parType}>
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v, name) => [v, name === 'count' ? 'Interventions' : 'Coût']} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {data.parType.map((t, i) => (
                        <Cell key={i} fill={TYPE_COLORS[t.type] || '#6B7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Bar par statut */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Interventions par statut</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[200px]">
                  <BarChart data={data.parStatut}>
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v) => [v, 'Interventions']} />
                    <Bar dataKey="count" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tableau top véhicules */}
          {data.topVehicules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top véhicules défaillants</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Immatriculation</TableHead>
                      <TableHead>Marque / Modèle</TableHead>
                      <TableHead className="text-right">Interventions</TableHead>
                      <TableHead className="text-right">Coût total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topVehicules.map((v) => (
                      <TableRow key={v.vehiculeId}>
                        <TableCell className="font-medium">{v.immatriculation}</TableCell>
                        <TableCell>{v.marque} {v.modele}</TableCell>
                        <TableCell className="text-right">{v.count}</TableCell>
                        <TableCell className="text-right">{fmt(v.cout)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
```

**Étape 2 : Commit**

```bash
git add components/analytique/SAVSection.tsx
git commit -m "feat(analytique): SAVSection (KPIs + BarCharts + Tableau véhicules)"
```

---

## Task 10 : `AnalytiquesTab` — Orchestrateur client

**Files:**
- Créer : `app/(dashboard)/admin/reporting/AnalytiquesTab.tsx`

**Étape 1 : Créer le composant**

```tsx
// app/(dashboard)/admin/reporting/AnalytiquesTab.tsx
'use client'

import { useState, useTransition } from 'react'
import { subYears, startOfDay, endOfDay } from 'date-fns'
import { PeriodSelector } from '@/components/analytique/PeriodSelector'
import { PerformanceSection } from '@/components/analytique/PerformanceSection'
import { FinanciereSection } from '@/components/analytique/FinanciereSection'
import { CapitalisationSection } from '@/components/analytique/CapitalisationSection'
import { SAVSection } from '@/components/analytique/SAVSection'
import { getAllAnalyticsData } from '@/lib/actions/analytics'
import { exportAnalytiquesPDF, exportAnalytiquesExcel } from '@/lib/actions/analytics-exports'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/lib/utils/toast'
import { FileDown, Sheet } from 'lucide-react'
import type { AllAnalyticsData, Periode } from '@/lib/analytics/types'

interface Props {
  initialData: AllAnalyticsData
  initialPeriode: Periode
}

export function AnalytiquesTab({ initialData, initialPeriode }: Props) {
  const [periode, setPeriode] = useState<Periode>(initialPeriode)
  const [data, setData] = useState<AllAnalyticsData>(initialData)
  const [isPending, startTransition] = useTransition()
  const [isExporting, startExportTransition] = useTransition()

  function handlePeriodeChange(newPeriode: Periode) {
    setPeriode(newPeriode)
    startTransition(async () => {
      const newData = await getAllAnalyticsData(newPeriode)
      setData(newData)
    })
  }

  function handleExportExcel() {
    startExportTransition(async () => {
      const result = await exportAnalytiquesExcel(periode)
      if (!result.success || !result.data) {
        toast.error(result.error || "Erreur lors de l'export Excel")
        return
      }
      const blob = new Blob([Buffer.from(result.data.buffer)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.data.filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export Excel généré')
    })
  }

  function handleExportPDF() {
    startExportTransition(async () => {
      const result = await exportAnalytiquesPDF(periode)
      if (!result.success || !result.data) {
        toast.error(result.error || "Erreur lors de l'export PDF")
        return
      }
      const blob = new Blob([Buffer.from(result.data.buffer)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.data.filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Rapport PDF généré')
    })
  }

  return (
    <div className="space-y-6">
      {/* Sélecteur de période */}
      <PeriodSelector
        value={periode}
        onChange={handlePeriodeChange}
        disabled={isPending}
      />

      {/* Sections analytiques */}
      {isPending ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <PerformanceSection data={data.performance} />
          <FinanciereSection data={data.financiere} />
          <CapitalisationSection data={data.capitalisation} />
          <SAVSection data={data.sav} />
        </div>
      )}

      {/* Boutons export */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleExportExcel}
          disabled={isPending || isExporting}
        >
          <Sheet className="mr-2 h-4 w-4" />
          {isExporting ? 'Export en cours…' : 'Exporter Excel'}
        </Button>
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={isPending || isExporting}
        >
          <FileDown className="mr-2 h-4 w-4" />
          {isExporting ? 'Export en cours…' : 'Exporter PDF'}
        </Button>
      </div>
    </div>
  )
}
```

**Étape 2 : Commit**

```bash
git add app/(dashboard)/admin/reporting/AnalytiquesTab.tsx
git commit -m "feat(analytique): AnalytiquesTab orchestrateur (période + sections + exports)"
```

---

## Task 11 : Modifier `page.tsx` — Intégration Tabs

**Files:**
- Modifier : `app/(dashboard)/admin/reporting/page.tsx`

**Étape 1 : Remplacer le contenu de `page.tsx`**

```tsx
// app/(dashboard)/admin/reporting/page.tsx
import { requireRole } from "@/lib/utils/permissions"
import { getReportingRules } from "@/lib/actions/reporting-rules"
import { getAllAnalyticsData } from "@/lib/actions/analytics"
import { ReportingRulesClient } from "./ReportingRulesClient"
import { AnalytiquesTab } from "./AnalytiquesTab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { redirect } from "next/navigation"
import { subYears, startOfDay, endOfDay } from "date-fns"

export const dynamic = "force-dynamic"

export default async function ReportingPage() {
  const session = await requireRole(["ADMIN"]).catch(() => null)
  if (!session) redirect("/")

  // Période initiale : 1 an glissant
  const initialPeriode = {
    dateDebut: startOfDay(subYears(new Date(), 1)),
    dateFin: endOfDay(new Date()),
  }

  // Fetch en parallèle
  const [rules, initialData] = await Promise.all([
    getReportingRules(),
    getAllAnalyticsData(initialPeriode),
  ])

  // Sérialiser les dates pour le Client Component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializedRules = rules.map((r) => ({
    ...r,
    scheduleConfig: r.scheduleConfig as any,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  // Sérialiser les dates de la période pour passage au Client Component
  const serializedPeriode = {
    dateDebut: initialPeriode.dateDebut,
    dateFin: initialPeriode.dateFin,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Reporting</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Règles d'envoi automatique et analyses du portefeuille
        </p>
      </div>

      <Tabs defaultValue="regles">
        <TabsList>
          <TabsTrigger value="regles">Règles email</TabsTrigger>
          <TabsTrigger value="analyses">Analyses</TabsTrigger>
        </TabsList>

        <TabsContent value="regles" className="mt-4">
          <ReportingRulesClient initialRules={serializedRules} />
        </TabsContent>

        <TabsContent value="analyses" className="mt-4">
          <AnalytiquesTab
            initialData={initialData}
            initialPeriode={serializedPeriode}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Étape 2 : Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit
```

**Étape 3 : Tester en local**

```bash
npm run dev
```

Naviguer vers `http://localhost:3000/admin/reporting` → vérifier que les 2 onglets apparaissent.

**Étape 4 : Commit**

```bash
git add app/(dashboard)/admin/reporting/page.tsx
git commit -m "feat(analytique): intégrer Tabs Règles email + Analyses dans /admin/reporting"
```

---

## Task 12 : Build de validation + push

**Étape 1 : Build de production**

```bash
npm run build
```

Attendu : Build réussi, aucune erreur TypeScript.

**Étape 2 : Corriger toute erreur éventuelle**

Si erreur TypeScript → corriger dans le fichier incriminé → relancer `npm run build`.

**Étape 3 : Push**

```bash
git push origin main
```

---

## Task 13 : Tests Playwright

**Files:**
- Créer : `tests/v1/v2-analytiques.spec.ts`

**Étape 1 : Créer le fichier de tests**

```typescript
// tests/v1/v2-analytiques.spec.ts
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

async function login(page: any) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('[name="email"]', 'admin@erp-marches.local')
  await page.fill('[name="password"]', 'Admin123!')
  await page.click('[type="submit"]')
  await page.waitForURL(`${BASE_URL}/`)
}

test.describe('V2 — Analytiques /admin/reporting', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/admin/reporting`)
  })

  test('Onglets Règles email et Analyses visibles', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Règles email' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Analyses' })).toBeVisible()
  })

  test('Onglet Règles email fonctionne (existant)', async ({ page }) => {
    await page.getByRole('tab', { name: 'Règles email' }).click()
    await expect(page.getByText('Règles de reporting').or(page.getByText('Nouvelle règle'))).toBeVisible()
  })

  test('Onglet Analyses affiche les 4 sections', async ({ page }) => {
    await page.getByRole('tab', { name: 'Analyses' }).click()
    await expect(page.getByText('Performance Marchés')).toBeVisible()
    await expect(page.getByText('Analyse Financière')).toBeVisible()
    await expect(page.getByText('Capitalisation Stratégique')).toBeVisible()
    await expect(page.getByText('SAV & Interventions')).toBeVisible()
  })

  test('Sélecteur de période — preset 30 jours', async ({ page }) => {
    await page.getByRole('tab', { name: 'Analyses' }).click()
    await page.getByRole('button', { name: '30 jours' }).click()
    // Attendre que le loading se termine
    await expect(page.getByText('Performance Marchés')).toBeVisible()
  })

  test('Sélecteur de période — preset 90 jours', async ({ page }) => {
    await page.getByRole('tab', { name: 'Analyses' }).click()
    await page.getByRole('button', { name: '90 jours' }).click()
    await expect(page.getByText('Performance Marchés')).toBeVisible()
  })

  test('Sélecteur de période — preset 6 mois', async ({ page }) => {
    await page.getByRole('tab', { name: 'Analyses' }).click()
    await page.getByRole('button', { name: '6 mois' }).click()
    await expect(page.getByText('Capitalisation Stratégique')).toBeVisible()
  })

  test('KPIs Performance visibles', async ({ page }) => {
    await page.getByRole('tab', { name: 'Analyses' }).click()
    await expect(page.getByText('Total marchés')).toBeVisible()
    await expect(page.getByText('Taux de succès')).toBeVisible()
    await expect(page.getByText('Montant total')).toBeVisible()
  })

  test('KPIs Financière visibles', async ({ page }) => {
    await page.getByRole('tab', { name: 'Analyses' }).click()
    await expect(page.getByText('CA contractualisé')).toBeVisible()
    await expect(page.getByText('CA encaissé')).toBeVisible()
    await expect(page.getByText('Taux recouvrement')).toBeVisible()
  })

  test('Boutons export visibles', async ({ page }) => {
    await page.getByRole('tab', { name: 'Analyses' }).click()
    await expect(page.getByRole('button', { name: /Exporter Excel/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Exporter PDF/i })).toBeVisible()
  })

  test('Export Excel déclenche un téléchargement', async ({ page }) => {
    await page.getByRole('tab', { name: 'Analyses' }).click()
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.getByRole('button', { name: /Exporter Excel/i }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/analytiques.*\.xlsx/)
  })

  test('Export PDF déclenche un téléchargement', async ({ page }) => {
    await page.getByRole('tab', { name: 'Analyses' }).click()
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.getByRole('button', { name: /Exporter PDF/i }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/rapport_analytique.*\.pdf/)
  })

  test('Responsive tablette 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.getByRole('tab', { name: 'Analyses' }).click()
    await expect(page.getByText('Performance Marchés')).toBeVisible()
    await expect(page.getByText('Analyse Financière')).toBeVisible()
  })

  test('Responsive mobile 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.getByRole('tab', { name: 'Analyses' }).click()
    await expect(page.getByText('Performance Marchés')).toBeVisible()
  })
})
```

**Étape 2 : Lancer les tests en production**

```bash
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app npx playwright test tests/v1/v2-analytiques.spec.ts --project=chromium
```

**Étape 3 : Corriger les échecs éventuels**

Si un test échoue → lire l'erreur → corriger le composant → rebuild → push → relancer.

**Étape 4 : Commit final**

```bash
git add tests/v1/v2-analytiques.spec.ts
git commit -m "test(v2): tests E2E Playwright analytiques — 13 tests"
```

---

## Récapitulatif

| Task | Fichiers | Durée estimée |
|---|---|---|
| 1 | shadcn Tabs + types analytics | ~30min |
| 2 | SA getPerformanceStats | ~1h |
| 3 | SA getFinancialStats + getCap + getSAV | ~2h |
| 4 | SA export PDF + Excel | ~1h30 |
| 5 | PeriodSelector | ~30min |
| 6 | PerformanceSection | ~1h |
| 7 | FinanciereSection | ~1h |
| 8 | CapitalisationSection | ~1h |
| 9 | SAVSection | ~1h |
| 10 | AnalytiquesTab | ~1h |
| 11 | page.tsx Tabs | ~30min |
| 12 | Build + push | ~30min |
| 13 | Tests Playwright | ~1h |
| **Total** | | **~13h** |
