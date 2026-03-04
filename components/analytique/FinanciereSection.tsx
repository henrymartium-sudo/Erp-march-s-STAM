// components/analytique/FinanciereSection.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Legend } from 'recharts'
import type { FinancialStats } from '@/lib/analytics/types'

function fmt(val: number) {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}G`
  if (val >= 1_000_000) return `${Math.round(val / 1_000_000)}M`
  if (val >= 1_000) return `${Math.round(val / 1_000)}k`
  return `${val}`
}

const STATUT_COLORS: Record<string, string> = {
  PAYEE: '#10B981',
  VALIDEE: '#2563EB',
  EMISE: '#C49A1A',
  EN_ATTENTE: '#F59E0B',
  ANNULEE: '#EF4444',
}

interface Props { data: FinancialStats }

export function FinanciereSection({ data }: Props) {
  if (data.caContractualise === 0 && data.caEncaisse === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Analyse Financière</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Aucune donnée financière sur cette période.</p>
        </CardContent>
      </Card>
    )
  }

  const kpis = [
    { label: 'CA contractualisé', value: fmt(data.caContractualise) + ' FCFA' },
    { label: 'CA encaissé', value: fmt(data.caEncaisse) + ' FCFA' },
    { label: 'CA en attente', value: fmt(data.caEnAttente) + ' FCFA' },
    { label: 'Cautions actives', value: fmt(data.cautionsActives) + ' FCFA' },
  ]

  // Données pour BarChart CA comparatif
  const caData = [
    { label: 'Contractualisé', montant: data.caContractualise, fill: '#1E3A5F' },
    { label: 'Encaissé',        montant: data.caEncaisse,       fill: '#10B981' },
    { label: 'En attente',      montant: data.caEnAttente,      fill: '#C49A1A' },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#1E3A5F]">Analyse Financière</h3>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold text-[#1E3A5F] truncate" title={value}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* BarChart CA contractualisé vs encaissé vs en attente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">CA contractualisé vs encaissé vs en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px]">
              <BarChart data={caData}>
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => fmt(v)} />
                <Tooltip formatter={(val: number) => [`${fmt(val)} FCFA`, 'Montant']} />
                <Bar dataKey="montant" radius={[4, 4, 0, 0]}>
                  {caData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* BarChart factures par statut */}
        {data.facturesParStatut.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Factures par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[250px]">
                <BarChart data={data.facturesParStatut} layout="vertical">
                  <XAxis type="number" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="statut" width={110} fontSize={10} />
                  <Tooltip formatter={(val, name) => [val, name === 'count' ? 'Factures' : 'Montant']} />
                  <Bar dataKey="count" name="count" radius={[0, 4, 4, 0]}>
                    {data.facturesParStatut.map((entry, i) => (
                      <Cell key={i} fill={STATUT_COLORS[entry.statut] ?? '#8B5CF6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
