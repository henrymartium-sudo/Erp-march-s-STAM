'use client'

/**
 * Widget CA Effectif — Bar Chart des marchés actifs avec filtre période
 * Marchés concernés : EN_EXECUTION + EXECUTE_ATTENTE_GARANTIES + CLOTURE
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { CAEffectifPoint } from '@/lib/dashboard/types'

interface EffectiveRevenueChartProps {
  data: CAEffectifPoint[]
}

type Period = 'mois' | 'trimestre' | 'annee'

const PERIOD_LABELS: Record<Period, string> = {
  mois: 'Mois',
  trimestre: 'Trimestre',
  annee: 'Année',
}

function formatMontantCompact(value: number): string {
  if (value === 0) return '0'
  const millions = value / 1_000_000
  if (millions >= 1) return `${Math.round(millions)}M`
  const milliers = value / 1_000
  if (milliers >= 1) return `${Math.round(milliers)}k`
  return `${value}`
}

function formatMontantTooltip(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length || !payload[0]) return null
  const data = payload[0]
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="grid gap-2">
        <div className="flex flex-col">
          <span className="text-[0.70rem] uppercase text-muted-foreground">
            {data.payload.displayLabel}
          </span>
          <span className="font-bold text-foreground">
            {formatMontantTooltip(data.value)}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Agrège les données mensuelles par trimestre ou par année.
 */
function aggregateData(
  data: CAEffectifPoint[],
  period: Period
): Array<{ displayLabel: string; montant: number }> {
  if (period === 'mois') {
    return data.map((d) => ({ displayLabel: d.moisLabel, montant: d.montant }))
  }

  const map = new Map<string, number>()

  for (const point of data) {
    const parts = point.label.split('-').map(Number)
    const year = parts[0] ?? 0
    const month = parts[1] ?? 1
    let key: string

    if (period === 'trimestre') {
      const q = Math.ceil(month / 3)
      key = `T${q} ${year}`
    } else {
      key = `${year}`
    }

    map.set(key, (map.get(key) ?? 0) + point.montant)
  }

  return Array.from(map.entries()).map(([displayLabel, montant]) => ({
    displayLabel,
    montant,
  }))
}

export function EffectiveRevenueChart({ data }: EffectiveRevenueChartProps) {
  const [period, setPeriod] = useState<Period>('mois')

  const aggregated = useMemo(() => aggregateData(data, period), [data, period])

  const chartConfig = {
    montant: {
      label: 'CA effectif',
      color: 'hsl(160, 70%, 40%)',
    },
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CA Effectif</CardTitle>
          <CardDescription>Aucune donnée disponible</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div>
          <CardTitle>CA Effectif</CardTitle>
          <CardDescription>
            Marchés en exécution, exécutés et clôturés
          </CardDescription>
        </div>
        {/* Filtre période */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 shrink-0">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={aggregated}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="displayLabel"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatMontantCompact}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="montant"
                fill="hsl(160, 70%, 40%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
