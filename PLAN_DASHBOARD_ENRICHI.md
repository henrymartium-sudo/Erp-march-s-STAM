# 📊 Plan Construction Dashboard Enrichi - ERP Marchés STAM

## 🎯 Objectif

Transformer le dashboard actuel en un **tableau de bord de pilotage** avec indicateurs clés, graphiques et alertes visuelles pour faciliter la prise de décision.

---

## 📋 Vue d'Ensemble

### Widgets à implémenter

| # | Widget | Type | Priorité | Complexité | Temps |
|---|--------|------|----------|------------|-------|
| **W1** | KPI Cards (4 cartes) | Statistiques | 🔴 HAUTE | ⭐ Facile | 1h |
| **W2** | Graphique Statuts Marchés | Chart (Donut) | 🔴 HAUTE | ⭐⭐ Moyen | 2h |
| **W3** | Timeline Échéances | Liste + Badge | 🟠 MOYENNE | ⭐ Facile | 1h30 |
| **W4** | Marchés Récents | Table mini | 🟠 MOYENNE | ⭐ Facile | 1h |
| **W5** | Graphique Montants Mensuels | Chart (Bar) | 🟡 BASSE | ⭐⭐ Moyen | 2h |
| **W6** | Alertes Critiques | Alert Cards | 🔴 HAUTE | ⭐ Facile | 1h |

**Durée totale estimée** : 8h30

---

## 🏗️ Architecture Technique

### Structure des fichiers

```
app/(dashboard)/
├── page.tsx                          # Page dashboard (EXISTANTE - à enrichir)
├── _components/                      # Composants dashboard (NOUVEAU dossier)
│   ├── kpi-cards.tsx                # W1 - Cartes KPI
│   ├── statuts-chart.tsx            # W2 - Graphique statuts
│   ├── echeances-timeline.tsx       # W3 - Timeline échéances
│   ├── recent-marches.tsx           # W4 - Marchés récents
│   ├── montants-chart.tsx           # W5 - Graphique montants
│   └── critical-alerts.tsx          # W6 - Alertes critiques

lib/
├── dashboard/
│   ├── stats.ts                     # NOUVEAU - Fonctions calcul stats
│   └── types.ts                     # NOUVEAU - Types dashboard
└── charts/
    └── config.ts                    # NOUVEAU - Config Recharts

components/ui/
└── chart.tsx                        # NOUVEAU - Composant Chart (shadcn)
```

### Stack technique

- **Graphiques** : Recharts (compatible shadcn/ui)
- **Icônes** : lucide-react (déjà installé)
- **Layout** : Grid responsive Tailwind
- **Couleurs** : Palette shadcn cohérente
- **Données** : Server Actions (pattern existant)

---

## 📐 Design & Layout

### Grille Dashboard (Desktop 1920px)

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard - ERP Marchés STAM                    [Export ⬇] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 50       │  │ 7        │  │ 10       │  │ 245M     │    │
│  │ Marchés  │  │ Cautions │  │ En cours │  │ Total    │    │
│  │ 📊       │  │ 🏦       │  │ 🚀       │  │ 💰       │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                               │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │ Répartition Statuts     │  │ Échéances Prochaines    │   │
│  │ ┌───────────────┐       │  │ ┌─────────────────────┐ │   │
│  │ │   [Donut]     │       │  │ │ • Caution X         │ │   │
│  │ │   Chart       │       │  │ │   ⚠️ J-5           │ │   │
│  │ │               │       │  │ │ • Marché Y          │ │   │
│  │ └───────────────┘       │  │ │   🔔 J-15          │ │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Marchés Récents (5 derniers)                           │ │
│  │ ┌────────┬─────────────────┬───────────┬──────────┐    │ │
│  │ │ Numéro │ Objet           │ Montant   │ Statut   │    │ │
│  │ ├────────┼─────────────────┼───────────┼──────────┤    │ │
│  │ │ M-001  │ Toyota Hilux... │ 45M CFA   │ En cours │    │ │
│  │ └────────┴─────────────────┴───────────┴──────────┘    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Responsive (Mobile 375px)

```
┌─────────────────────┐
│  Dashboard       ☰  │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ 50 Marchés   📊 │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ 7 Cautions   🏦 │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ 10 En cours  🚀 │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ 245M Total   💰 │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ Statuts         │ │
│ │ [Donut Chart]   │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ Échéances       │ │
│ │ • Caution X ⚠️  │ │
│ │ • Marché Y 🔔   │ │
│ └─────────────────┘ │
└─────────────────────┘
```

---

## 🚀 Plan d'Implémentation Étape par Étape

### **Phase 1 : Setup & Infrastructure** (30 min)

#### Étape 1.1 : Installer Recharts
```bash
npm install recharts
npx shadcn@latest add chart
```

#### Étape 1.2 : Créer la structure de dossiers
```bash
mkdir -p app/\(dashboard\)/_components
mkdir -p lib/dashboard lib/charts
```

#### Étape 1.3 : Créer les types TypeScript

**Fichier** : `lib/dashboard/types.ts`

```typescript
export interface DashboardStats {
  totalMarches: number
  totalCautions: number
  marchesEnCours: number
  montantTotal: number
}

export interface StatutCount {
  statut: string
  label: string
  count: number
  pourcentage: number
  couleur: string
}

export interface EcheanceItem {
  id: string
  type: 'MARCHE' | 'CAUTION'
  reference: string
  titre: string
  dateEcheance: Date
  joursRestants: number
  criticite: 'CRITIQUE' | 'ATTENTION' | 'INFO'
}

export interface MarcheRecent {
  id: string
  numero: string
  objet: string
  montant: number
  statut: string
  dateNotification: Date
}

export interface MontantMensuel {
  mois: string
  montant: number
}
```

---

### **Phase 2 : Calculs & Server Actions** (1h30)

#### Étape 2.1 : Créer les fonctions de calcul

**Fichier** : `lib/dashboard/stats.ts`

```typescript
import { prisma } from '@/lib/db/prisma'
import { StatutMarche } from '@prisma/client'
import { differenceInDays, format, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { DashboardStats, StatutCount, EcheanceItem, MarcheRecent, MontantMensuel } from './types'

// Mapping des labels de statuts
const STATUT_LABELS: Record<StatutMarche, string> = {
  OPPORTUNITE_IDENTIFIEE: 'Opportunité',
  DOSSIER_EN_PREPARATION: 'Préparation',
  OFFRE_DEPOSEE: 'Offre déposée',
  EN_ATTENTE_ATTRIBUTION: 'Attente attribution',
  ATTRIBUE_PROVISOIREMENT: 'Attribué prov.',
  ATTRIBUE_DEFINITIVEMENT: 'Attribué déf.',
  EN_ATTENTE_LIVRAISON_OS: 'Attente OS',
  EN_EXECUTION: 'En exécution',
  EXECUTE_ATTENTE_GARANTIES: 'Attente garanties',
  CLOTURE: 'Clôturé',
  RESILIE: 'Résilié',
  ANNULE: 'Annulé',
  INFRUCTUEUX: 'Infructueux',
}

// Couleurs pour les statuts
const STATUT_COLORS: Record<StatutMarche, string> = {
  OPPORTUNITE_IDENTIFIEE: 'hsl(210, 100%, 50%)',
  DOSSIER_EN_PREPARATION: 'hsl(200, 100%, 45%)',
  OFFRE_DEPOSEE: 'hsl(180, 80%, 40%)',
  EN_ATTENTE_ATTRIBUTION: 'hsl(45, 100%, 50%)',
  ATTRIBUE_PROVISOIREMENT: 'hsl(30, 100%, 50%)',
  ATTRIBUE_DEFINITIVEMENT: 'hsl(120, 60%, 40%)',
  EN_ATTENTE_LIVRAISON_OS: 'hsl(100, 60%, 45%)',
  EN_EXECUTION: 'hsl(140, 70%, 40%)',
  EXECUTE_ATTENTE_GARANTIES: 'hsl(160, 60%, 45%)',
  CLOTURE: 'hsl(0, 0%, 60%)',
  RESILIE: 'hsl(0, 70%, 50%)',
  ANNULE: 'hsl(0, 60%, 40%)',
  INFRUCTUEUX: 'hsl(10, 50%, 50%)',
}

/**
 * Récupère les statistiques globales du dashboard
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [totalMarches, totalCautions, marchesEnCours, sumResult] = await Promise.all([
    prisma.marche.count(),
    prisma.caution.count(),
    prisma.marche.count({
      where: {
        statut: {
          in: [
            'EN_EXECUTION',
            'EN_ATTENTE_LIVRAISON_OS',
            'ATTRIBUE_DEFINITIVEMENT',
            'EXECUTE_ATTENTE_GARANTIES',
          ],
        },
      },
    }),
    prisma.marche.aggregate({
      _sum: {
        montant: true,
      },
    }),
  ])

  return {
    totalMarches,
    totalCautions,
    marchesEnCours,
    montantTotal: Number(sumResult._sum.montant || 0),
  }
}

/**
 * Récupère la répartition des marchés par statut
 */
export async function getStatutDistribution(): Promise<StatutCount[]> {
  const marches = await prisma.marche.groupBy({
    by: ['statut'],
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
  })

  const total = marches.reduce((sum, m) => sum + m._count.id, 0)

  return marches.map((m) => ({
    statut: m.statut,
    label: STATUT_LABELS[m.statut],
    count: m._count.id,
    pourcentage: Math.round((m._count.id / total) * 100),
    couleur: STATUT_COLORS[m.statut],
  }))
}

/**
 * Récupère les échéances prochaines (cautions + marchés)
 */
export async function getUpcomingEcheances(limit = 10): Promise<EcheanceItem[]> {
  const now = new Date()

  // Cautions arrivant à échéance
  const cautions = await prisma.caution.findMany({
    where: {
      dateEcheance: {
        gte: now,
      },
      statut: 'ACTIVE',
    },
    orderBy: {
      dateEcheance: 'asc',
    },
    take: limit,
    select: {
      id: true,
      reference: true,
      type: true,
      dateEcheance: true,
    },
  })

  // Marchés avec date de fin proche
  const marches = await prisma.marche.findMany({
    where: {
      dateFinPrevue: {
        gte: now,
      },
      statut: {
        in: ['EN_EXECUTION', 'EN_ATTENTE_LIVRAISON_OS', 'ATTRIBUE_DEFINITIVEMENT'],
      },
    },
    orderBy: {
      dateFinPrevue: 'asc',
    },
    take: limit,
    select: {
      id: true,
      numero: true,
      objet: true,
      dateFinPrevue: true,
    },
  })

  const echeances: EcheanceItem[] = [
    ...cautions.map((c) => {
      const joursRestants = differenceInDays(c.dateEcheance, now)
      return {
        id: c.id,
        type: 'CAUTION' as const,
        reference: c.reference,
        titre: `Caution ${c.type}`,
        dateEcheance: c.dateEcheance,
        joursRestants,
        criticite: joursRestants <= 7 ? 'CRITIQUE' : joursRestants <= 30 ? 'ATTENTION' : 'INFO',
      }
    }),
    ...marches
      .filter((m) => m.dateFinPrevue)
      .map((m) => {
        const joursRestants = differenceInDays(m.dateFinPrevue!, now)
        return {
          id: m.id,
          type: 'MARCHE' as const,
          reference: m.numero,
          titre: m.objet.substring(0, 50) + (m.objet.length > 50 ? '...' : ''),
          dateEcheance: m.dateFinPrevue!,
          joursRestants,
          criticite: joursRestants <= 30 ? 'ATTENTION' : 'INFO',
        }
      }),
  ]

  // Trier par date d'échéance et limiter
  return echeances
    .sort((a, b) => a.dateEcheance.getTime() - b.dateEcheance.getTime())
    .slice(0, limit)
}

/**
 * Récupère les marchés récents
 */
export async function getRecentMarches(limit = 5): Promise<MarcheRecent[]> {
  const marches = await prisma.marche.findMany({
    orderBy: {
      dateNotification: 'desc',
    },
    take: limit,
    select: {
      id: true,
      numero: true,
      objet: true,
      montant: true,
      statut: true,
      dateNotification: true,
    },
  })

  return marches.map((m) => ({
    id: m.id,
    numero: m.numero,
    objet: m.objet,
    montant: Number(m.montant),
    statut: STATUT_LABELS[m.statut],
    dateNotification: m.dateNotification,
  }))
}

/**
 * Récupère les montants de marchés par mois (12 derniers mois)
 */
export async function getMontantsMensuels(): Promise<MontantMensuel[]> {
  const now = new Date()
  const months: MontantMensuel[] = []

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = startOfMonth(date)
    const end = endOfMonth(date)

    const result = await prisma.marche.aggregate({
      where: {
        dateNotification: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        montant: true,
      },
    })

    months.push({
      mois: format(date, 'MMM yyyy', { locale: fr }),
      montant: Number(result._sum.montant || 0),
    })
  }

  return months
}
```

---

### **Phase 3 : Composants UI** (5h)

#### Étape 3.1 : KPI Cards (W1) - 1h

**Fichier** : `app/(dashboard)/_components/kpi-cards.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Shield, TrendingUp, DollarSign } from 'lucide-react'
import type { DashboardStats } from '@/lib/dashboard/types'

interface KPICardsProps {
  stats: DashboardStats
}

export function KPICards({ stats }: KPICardsProps) {
  const kpis = [
    {
      title: 'Total Marchés',
      value: stats.totalMarches,
      icon: BarChart3,
      trend: null,
    },
    {
      title: 'Total Cautions',
      value: stats.totalCautions,
      icon: Shield,
      trend: null,
    },
    {
      title: 'Marchés En Cours',
      value: stats.marchesEnCours,
      icon: TrendingUp,
      trend: `${Math.round((stats.marchesEnCours / stats.totalMarches) * 100)}%`,
    },
    {
      title: 'Montant Total',
      value: new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        notation: 'compact',
        compactDisplay: 'short',
      }).format(stats.montantTotal),
      icon: DollarSign,
      trend: null,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              {kpi.trend && (
                <p className="text-xs text-muted-foreground">
                  {kpi.trend} du total
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

#### Étape 3.2 : Graphique Statuts (W2) - 2h

**Fichier** : `app/(dashboard)/_components/statuts-chart.tsx`

```typescript
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import type { StatutCount } from '@/lib/dashboard/types'

interface StatutsChartProps {
  data: StatutCount[]
}

export function StatutsChart({ data }: StatutsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition par Statut</CardTitle>
        <CardDescription>Distribution des marchés par statut</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{}}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ label, pourcentage }) => `${label}: ${pourcentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.couleur} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
```

#### Étape 3.3 : Timeline Échéances (W3) - 1h30

**Fichier** : `app/(dashboard)/_components/echeances-timeline.tsx`

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, AlertTriangle, Info } from 'lucide-react'
import { formatDistance } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { EcheanceItem } from '@/lib/dashboard/types'
import Link from 'next/link'

interface EcheancessTimelineProps {
  echeances: EcheanceItem[]
}

const CRITICITE_CONFIG = {
  CRITIQUE: {
    variant: 'destructive' as const,
    icon: AlertTriangle,
    label: 'Critique',
  },
  ATTENTION: {
    variant: 'default' as const,
    icon: Calendar,
    label: 'Attention',
  },
  INFO: {
    variant: 'secondary' as const,
    icon: Info,
    label: 'Info',
  },
}

export function EcheancessTimeline({ echeances }: EcheancessTimelineProps) {
  if (echeances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Échéances Prochaines</CardTitle>
          <CardDescription>Aucune échéance à venir</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Échéances Prochaines</CardTitle>
        <CardDescription>{echeances.length} échéance(s) à venir</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {echeances.map((echeance) => {
            const config = CRITICITE_CONFIG[echeance.criticite]
            const Icon = config.icon

            return (
              <Link
                key={echeance.id}
                href={echeance.type === 'MARCHE' ? `/marches/${echeance.id}` : `/cautions/${echeance.id}`}
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-none">{echeance.reference}</p>
                    <Badge variant={config.variant}>
                      J-{echeance.joursRestants}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{echeance.titre}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistance(echeance.dateEcheance, new Date(), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
```

#### Étape 3.4 : Marchés Récents (W4) - 1h

**Fichier** : `app/(dashboard)/_components/recent-marches.tsx`

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/date'
import type { MarcheRecent } from '@/lib/dashboard/types'
import Link from 'next/link'

interface RecentMarchesProps {
  marches: MarcheRecent[]
}

export function RecentMarches({ marches }: RecentMarchesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Marchés Récents</CardTitle>
        <CardDescription>Les 5 derniers marchés notifiés</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Objet</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marches.map((marche) => (
              <TableRow key={marche.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/marches/${marche.id}`}
                    className="hover:underline"
                  >
                    {marche.numero}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {marche.objet}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF',
                    notation: 'compact',
                  }).format(marche.montant)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{marche.statut}</Badge>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatDate(marche.dateNotification)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

---

### **Phase 4 : Intégration Dashboard Page** (1h)

#### Étape 4.1 : Mettre à jour la page dashboard

**Fichier** : `app/(dashboard)/page.tsx`

```typescript
import { requireAuth } from '@/lib/auth/require-auth'
import { KPICards } from './_components/kpi-cards'
import { StatutsChart } from './_components/statuts-chart'
import { EcheancessTimeline } from './_components/echeances-timeline'
import { RecentMarches } from './_components/recent-marches'
import {
  getDashboardStats,
  getStatutDistribution,
  getUpcomingEcheances,
  getRecentMarches,
} from '@/lib/dashboard/stats'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  await requireAuth()

  // Charger toutes les données en parallèle
  const [stats, statutDistribution, echeances, recentMarches] = await Promise.all([
    getDashboardStats(),
    getStatutDistribution(),
    getUpcomingEcheances(10),
    getRecentMarches(5),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de vos marchés publics
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards stats={stats} />

      {/* Charts & Timeline */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatutsChart data={statutDistribution} />
        <EcheancessTimeline echeances={echeances} />
      </div>

      {/* Recent Marches Table */}
      <RecentMarches marches={recentMarches} />
    </div>
  )
}
```

---

## ✅ Checklist d'Acceptation

### Fonctionnalités

- [ ] **KPI Cards** affichent les bonnes statistiques (50 marchés, 7 cautions, etc.)
- [ ] **Graphique Statuts** montre la répartition correcte (18 clôturés, 11 infructueux, etc.)
- [ ] **Timeline Échéances** liste les prochaines échéances triées par date
- [ ] **Marchés Récents** affiche les 5 derniers avec liens cliquables
- [ ] **Couleurs** sont cohérentes avec la palette shadcn/ui
- [ ] **Responsive** : layout s'adapte sur mobile (375px), tablette (768px), desktop (1920px)

### Performance

- [ ] Temps de chargement dashboard < 2s (avec 50 marchés)
- [ ] Requêtes Prisma optimisées (Promise.all pour parallélisation)
- [ ] Pas de waterfalls de requêtes

### Accessibilité

- [ ] Navigation clavier fonctionnelle
- [ ] Contraste texte/background conforme WCAG AA
- [ ] Alt text pour icônes (via aria-label)

### Code Quality

- [ ] TypeScript strict (pas de `any`)
- [ ] Composants réutilisables
- [ ] Server Actions avec gestion d'erreurs
- [ ] Comments JSDoc pour fonctions complexes

---

## 🎨 Palette de Couleurs

### Statuts Marchés

| Statut | Couleur HSL | Preview |
|--------|-------------|---------|
| Opportunité | `hsl(210, 100%, 50%)` | 🔵 |
| Préparation | `hsl(200, 100%, 45%)` | 🔵 |
| Offre déposée | `hsl(180, 80%, 40%)` | 🩵 |
| Attente attribution | `hsl(45, 100%, 50%)` | 🟡 |
| Attribué provisoirement | `hsl(30, 100%, 50%)` | 🟠 |
| Attribué définitivement | `hsl(120, 60%, 40%)` | 🟢 |
| En exécution | `hsl(140, 70%, 40%)` | 🟢 |
| Clôturé | `hsl(0, 0%, 60%)` | ⚪ |
| Infructueux | `hsl(10, 50%, 50%)` | 🔴 |

---

## 📊 Tests de Validation

### Test 1 : Données Correctes

```bash
# Vérifier que les KPI correspondent aux données réelles
- Total marchés = 50 ✅
- Total cautions = 7 ✅
- Marchés en cours = 10 ✅
```

### Test 2 : Graphique Statuts

```bash
# Vérifier la répartition dans le graphique donut
- CLOTURE: 18 (36%)
- INFRUCTUEUX: 11 (22%)
- ANNULE: 5 (10%)
- EN_EXECUTION: 10 (20%)
- Autres: 6 (12%)
```

### Test 3 : Responsive

```bash
# Tester sur 3 résolutions
1. Mobile (375px) : Grille 1 colonne ✅
2. Tablette (768px) : Grille 2 colonnes ✅
3. Desktop (1920px) : Grille 4 colonnes ✅
```

---

## 🚀 Pour Démarrer

### Commande de lancement

```bash
# Phase 1 : Installation
npm install recharts
npx shadcn@latest add chart

# Phase 2 : Créer les fichiers
mkdir -p app/\(dashboard\)/_components lib/dashboard lib/charts

# Phase 3 : Copier les fichiers fournis ci-dessus

# Phase 4 : Tester localement
npm run dev
# Ouvrir http://localhost:3000 et vérifier le dashboard
```

---

**Durée totale estimée** : 8h30
**Complexité** : ⭐⭐ Moyenne
**Priorité** : 🔴 HAUTE

---

**Prêt à commencer ?** 🚀
