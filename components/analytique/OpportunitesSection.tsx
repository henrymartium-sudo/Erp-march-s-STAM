'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/lib/utils/toast'
import { formatMontantFCFA } from '@/lib/utils/format'
import type { OpportunitesStats, Periode } from '@/lib/analytics/types'
import { DrillDownSheet } from '@/components/shared/DrillDownSheet'
import { ListeAnalyse } from '@/components/analytique/ListeAnalyse'
import { getOpportunitesByStatut, getOpportunitesByAC, type DrillDownItem } from '@/lib/actions/drill-down'

interface Props {
  data: OpportunitesStats
  periode: Periode
}

export function OpportunitesSection({ data, periode }: Props) {
  const [drillDown, setDrillDown] = useState<{
    title: string; items: DrillDownItem[]; isLoading: boolean
  } | null>(null)

  async function ouvrir(title: string, charger: () => Promise<DrillDownItem[]>) {
    setDrillDown({ title, items: [], isLoading: true })
    try {
      setDrillDown({ title, items: await charger(), isLoading: false })
    } catch {
      setDrillDown(null)
      toast.error('Impossible de charger le détail. Réessayez.')
    }
  }

  if (data.totalOpportunites === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-stam-primary">Pipeline Opportunités</h3>
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-stam-primary">Pipeline Opportunités</h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.parStatut.length > 0 && (
          <ListeAnalyse
            titre="Opportunités par statut"
            lignes={data.parStatut.map((s) => ({
              cle: s.statut,
              libelle: s.label,
              valeur: `${s.count} · ${s.montantPropose > 0 ? formatMontantFCFA(s.montantPropose) : '—'}`,
              onClick: () => ouvrir(`Opportunités — ${s.label}`, () => getOpportunitesByStatut(s.statut, periode)),
            }))}
          />
        )}

        {data.topAC.length > 0 && (
          <ListeAnalyse
            titre="Top 10 Autorités Contractantes"
            lignes={data.topAC.map((ac) => ({
              cle: ac.nom,
              libelle: ac.nom,
              valeur: `${ac.count} · ${ac.gagnees} gagnée${ac.gagnees > 1 ? 's' : ''}`,
              onClick: () => ouvrir(`Opportunités — ${ac.nom}`, () => getOpportunitesByAC(ac.nom, periode)),
            }))}
          />
        )}
      </div>

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
