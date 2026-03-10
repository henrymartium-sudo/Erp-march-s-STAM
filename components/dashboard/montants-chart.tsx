'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { MontantMensuel } from '@/lib/dashboard/types'
import { DrillDownSheet } from '@/components/shared/DrillDownSheet'
import { getMarchesByMois, type DrillDownItem } from '@/lib/actions/drill-down'

interface MontantsChartProps {
  data: MontantMensuel[]
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
      <div className="grid gap-1">
        <span className="text-[0.70rem] uppercase text-muted-foreground">{data.payload.mois}</span>
        <span className="font-bold text-foreground">{formatMontantTooltip(data.value)}</span>
        <span className="text-xs text-blue-600">Cliquez pour voir le détail</span>
      </div>
    </div>
  )
}

export function MontantsChart({ data }: MontantsChartProps) {
  const [drillDown, setDrillDown] = useState<{
    title: string
    items: DrillDownItem[]
    isLoading: boolean
  } | null>(null)

  async function handleBarClick(payload: any) {
    const moisIso: string | undefined = payload?.activePayload?.[0]?.payload?.moisIso
    const mois: string = payload?.activePayload?.[0]?.payload?.mois ?? ''
    if (!moisIso) return
    setDrillDown({ title: `Marchés — ${mois}`, items: [], isLoading: true })
    const items = await getMarchesByMois(moisIso)
    setDrillDown({ title: `Marchés — ${mois}`, items, isLoading: false })
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Montants Mensuels</CardTitle>
          <CardDescription>Aucune donnée disponible</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const chartConfig = {
    montant: { label: 'Montant', color: 'hsl(var(--primary))' },
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Montants Mensuels</CardTitle>
          <CardDescription>
            Évolution des montants de marchés sur les 12 derniers mois · cliquez sur une barre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
              >
                <XAxis
                  dataKey="mois"
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
                <Bar dataKey="montant" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <DrillDownSheet
        open={!!drillDown}
        onClose={() => setDrillDown(null)}
        title={drillDown?.title ?? ''}
        items={drillDown?.items ?? []}
        isLoading={drillDown?.isLoading ?? false}
      />
    </>
  )
}
