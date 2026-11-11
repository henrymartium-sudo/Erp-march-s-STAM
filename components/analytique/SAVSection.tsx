// components/analytique/SAVSection.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { SAVStats } from '@/lib/analytics/types'
import { formatMontantFCFA } from '@/lib/utils/format'
import { ListeAnalyse } from '@/components/analytique/ListeAnalyse'

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
      <h3 className="text-lg font-semibold text-stam-primary">SAV &amp; Interventions</h3>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold text-stam-primary">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.parType.length > 0 && (
        <ListeAnalyse
          titre="Interventions par type"
          lignes={data.parType.map((t) => ({
            cle: t.type,
            libelle: t.label,
            valeur: `${t.count} · ${formatMontantFCFA(t.cout)}`,
          }))}
        />
      )}

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
                      <td className="py-1.5 text-right font-semibold text-stam-primary">{v.count}</td>
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
