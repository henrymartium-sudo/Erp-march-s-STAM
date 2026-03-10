'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'
import { formatMontantFCFA, fmtAbrege } from '@/lib/utils/format'
import type { OpportunitesStats } from '@/lib/analytics/types'

interface Props {
  data: OpportunitesStats
}

const COLORS = ['#1E3A5F', '#C49A1A', '#2563EB', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6']

export function OpportunitesSection({ data }: Props) {
  if (data.totalOpportunites === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#1E3A5F]">Pipeline Opportunités</h3>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Aucune opportunité sur cette période.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const kpis = [
    { label: 'Total opportunités', value: data.totalOpportunites.toString() },
    { label: 'En cours', value: data.totalEnCours.toString() },
    { label: 'Gagnées', value: data.totalGagnees.toString() },
    { label: 'Taux de conversion', value: `${data.tauxConversion} %` },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#1E3A5F]">Pipeline Opportunités</h3>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold text-[#1E3A5F]">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Bar : répartition par statut */}
        {data.parStatut.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Répartition par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[260px]">
                <BarChart data={data.parStatut} layout="vertical">
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={145} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [`${val}`, 'Opportunités']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {data.parStatut.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Bar : Top 10 Autorités Contractantes */}
        {data.topAC.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top 10 Autorités Contractantes</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[260px]">
                <BarChart data={data.topAC} layout="vertical">
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="nom" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val, name) => [
                      `${val}`,
                      name === 'count' ? 'Total' : 'Gagnées',
                    ]}
                  />
                  <Bar dataKey="count" name="count" radius={[0, 4, 4, 0]}>
                    {data.topAC.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Montants estimés / proposés */}
      {(data.montantEstimeTotal > 0 || data.montantProposeTotal > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Montants du pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Montant estimé total</p>
                <p className="text-lg font-bold text-[#1E3A5F]">
                  {formatMontantFCFA(data.montantEstimeTotal)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Montant proposé total</p>
                <p className="text-lg font-bold text-[#C49A1A]">
                  {data.montantProposeTotal > 0
                    ? formatMontantFCFA(data.montantProposeTotal)
                    : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
