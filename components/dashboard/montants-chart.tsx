'use client'

/**
 * Widget Montants Mensuels - Bar Chart des marchés sur 12 mois
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { MontantMensuel } from '@/lib/dashboard/types'

interface MontantsChartProps {
  data: MontantMensuel[]
}

/**
 * Formatter compact pour les montants (1M, 10M, 100M)
 */
function formatMontantCompact(value: number): string {
  if (value === 0) return '0'

  const millions = value / 1_000_000

  if (millions >= 1) {
    return `${Math.round(millions)}M`
  }

  const milliers = value / 1_000
  if (milliers >= 1) {
    return `${Math.round(milliers)}k`
  }

  return `${value}`
}

/**
 * Formatter détaillé pour le tooltip (avec FCFA)
 */
function formatMontantTooltip(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Tooltip personnalisé pour afficher le montant exact
 */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length || !payload[0]) {
    return null
  }

  const data = payload[0]

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="grid gap-2">
        <div className="flex flex-col">
          <span className="text-[0.70rem] uppercase text-muted-foreground">
            {data.payload.mois}
          </span>
          <span className="font-bold text-foreground">
            {formatMontantTooltip(data.value)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function MontantsChart({ data }: MontantsChartProps) {
  // Si pas de données, afficher message
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

  // Config pour ChartContainer (requis par shadcn)
  const chartConfig = {
    montant: {
      label: 'Montant',
      color: 'hsl(var(--primary))',
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Montants Mensuels</CardTitle>
        <CardDescription>
          Évolution des montants de marchés sur les 12 derniers mois
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
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
              <Bar
                dataKey="montant"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
