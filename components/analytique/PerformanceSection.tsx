// components/analytique/PerformanceSection.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { PerformanceStats } from '@/lib/analytics/types'
import { formatMontantFCFA } from '@/lib/utils/format'
import { DrillDownSheet } from '@/components/shared/DrillDownSheet'
import { getMarchesByStatut, type DrillDownItem } from '@/lib/actions/drill-down'

const COLORS = ['#1E3A5F', '#C49A1A', '#2563EB', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B']

interface Props { data: PerformanceStats }

export function PerformanceSection({ data }: Props) {
  const [drillDown, setDrillDown] = useState<{
    title: string; items: DrillDownItem[]; isLoading: boolean
  } | null>(null)

  async function handlePieClick(entry: any) {
    const statut: string = entry?.statut
    const label: string = entry?.label ?? ''
    if (!statut) return
    setDrillDown({ title: `Marchés — ${label}`, items: [], isLoading: true })
    const items = await getMarchesByStatut(statut)
    setDrillDown({ title: `Marchés — ${label}`, items, isLoading: false })
  }
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
          { label: 'Montant total', value: formatMontantFCFA(data.montantTotal) },
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
                  cursor="pointer"
                  onClick={handlePieClick}
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

      <DrillDownSheet
        open={!!drillDown}
        onClose={() => setDrillDown(null)}
        title={drillDown?.title ?? ''}
        items={drillDown?.items ?? []}
        isLoading={drillDown?.isLoading ?? false}
      />
    </div>
  )
}
