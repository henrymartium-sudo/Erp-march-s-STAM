// components/analytique/SAVSection.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import type { SAVStats } from '@/lib/analytics/types'
import { formatMontantFCFA } from '@/lib/utils/format'

const TYPE_COLORS = ['#1E3A5F', '#C49A1A', '#2563EB', '#10B981', '#EF4444', '#8B5CF6']
const STATUT_COLORS: Record<string, string> = {
  RESOLU: '#10B981',
  EN_COURS: '#2563EB',
  EN_ATTENTE: '#F59E0B',
  ANNULE: '#EF4444',
}

interface Props { data: SAVStats }

export function SAVSection({ data }: Props) {
  if (data.totalInterventions === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>SAV &amp; Interventions</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Aucune intervention SAV sur cette période.</p>
        </CardContent>
      </Card>
    )
  }

  const kpis = [
    { label: 'Nb interventions', value: data.totalInterventions.toString() },
    { label: 'Délai moyen résolution', value: `${data.delaiMoyenResolutionJours}j` },
    { label: 'Coût total', value: formatMontantFCFA(data.coutTotal) },
    { label: 'Taux de résolution', value: `${data.tauxResolution}%` },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#1E3A5F]">SAV &amp; Interventions</h3>

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
        {/* BarChart interventions par type */}
        {data.parType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Interventions par type</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[250px]">
                <BarChart data={data.parType} layout="vertical">
                  <XAxis type="number" fontSize={11} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={130}
                    fontSize={10}
                    tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + '…' : v}
                  />
                  <Tooltip
                    formatter={(val: number, name: string, props) => [
                      name === 'count'
                        ? `${val} interventions — Coût : ${formatMontantFCFA(props.payload.cout)}`
                        : val,
                      '',
                    ]}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {data.parType.map((_, i) => (
                      <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* BarChart délais de résolution — par statut */}
        {data.parStatut.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Interventions par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[250px]">
                <BarChart data={data.parStatut} layout="vertical">
                  <XAxis type="number" fontSize={11} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={130}
                    fontSize={10}
                  />
                  <Tooltip formatter={(val) => [`${val}`, 'Interventions']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {data.parStatut.map((entry, i) => (
                      <Cell key={i} fill={STATUT_COLORS[entry.statut] ?? COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tableau top véhicules défaillants */}
      {data.topVehicules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top véhicules défaillants</CardTitle>
            <CardDescription>Véhicules avec le plus d&apos;interventions sur la période</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="pb-2 text-left">Immatriculation</th>
                    <th className="pb-2 text-left">Marque / Modèle</th>
                    <th className="pb-2 text-right">Nb interv.</th>
                    <th className="pb-2 text-right">Coût total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topVehicules.map((v, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5 font-mono font-medium">{v.immatriculation}</td>
                      <td className="py-1.5 text-muted-foreground">{v.marque} {v.modele}</td>
                      <td className="py-1.5 text-right font-semibold text-[#1E3A5F]">{v.count}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{formatMontantFCFA(v.cout)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const COLORS = ['#1E3A5F', '#C49A1A', '#2563EB', '#10B981', '#EF4444', '#8B5CF6']
