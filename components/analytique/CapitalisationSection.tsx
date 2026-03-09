// components/analytique/CapitalisationSection.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import type { CapitalisationStats } from '@/lib/analytics/types'
import { formatMontantFCFA, fmtAbrege } from '@/lib/utils/format'

const COLORS = ['#1E3A5F', '#C49A1A', '#2563EB', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B']

interface Props { data: CapitalisationStats }

export function CapitalisationSection({ data }: Props) {
  const topAC = data.topAC ?? []
  const parSegment = data.parSegment ?? []
  const saisonnalite = data.saisonnalite ?? []

  if (topAC.length === 0 && parSegment.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Capitalisation Stratégique</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Aucune donnée de capitalisation sur cette période.</p>
        </CardContent>
      </Card>
    )
  }

  const bestAC = topAC[0]
  const bestWinRate = topAC.length > 0 ? Math.max(...topAC.map((ac) => ac.winRate)) : 0
  const segmentRentable = parSegment.length > 0
    ? parSegment.reduce((a, b) => (a.montant > b.montant ? a : b)).label
    : '—'

  const kpis = [
    { label: 'Nb Autorités Contractantes', value: topAC.length.toString() },
    { label: 'Meilleur win rate', value: `${bestWinRate}%` },
    { label: 'Segment le + rentable', value: segmentRentable },
    { label: 'Top organisme', value: bestAC?.nom ?? '—' },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#1E3A5F]">Capitalisation Stratégique</h3>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold text-[#1E3A5F] truncate" title={value}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* BarChart top 10 autorités contractantes (montants + win rate) */}
        {topAC.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top 10 Autorités Contractantes</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[260px]">
                <BarChart data={topAC.slice(0, 10)} layout="vertical">
                  <XAxis type="number" fontSize={10} tickFormatter={fmtAbrege} />
                  <YAxis
                    type="category"
                    dataKey="nom"
                    width={130}
                    fontSize={9}
                    tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + '…' : v}
                  />
                  <Tooltip
                    formatter={(val: number, name: string) => [
                      name === 'montant' ? formatMontantFCFA(val as number) : `${val}%`,
                      name === 'montant' ? 'Montant' : 'Win rate',
                    ]}
                  />
                  <Bar dataKey="montant" name="montant" radius={[0, 4, 4, 0]}>
                    {topAC.slice(0, 10).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* BarChart win rate par segment */}
        {parSegment.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Win rate par segment (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[260px]">
                <BarChart data={parSegment} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} unit="%" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={130}
                    fontSize={10}
                    tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + '…' : v}
                  />
                  <Tooltip formatter={(val) => [`${val}%`, 'Win rate']} />
                  <Bar dataKey="winRate" fill="#C49A1A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* LineChart saisonnalité appels d'offres */}
      {saisonnalite.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Saisonnalité des appels d&apos;offres (par mois)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[200px]">
              <LineChart data={saisonnalite}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  fontSize={10}
                  tickFormatter={(v) => v.length > 6 ? v.slice(0, 6) : v}
                />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip formatter={(val) => [`${val}`, "Appels d'offres"]} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#C49A1A"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#C49A1A' }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
