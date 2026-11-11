// components/analytique/PerformanceSection.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PerformanceStats } from '@/lib/analytics/types'
import { DrillDownSheet } from '@/components/shared/DrillDownSheet'
import { ListeAnalyse } from '@/components/analytique/ListeAnalyse'
import { getMarchesByStatut, type DrillDownItem } from '@/lib/actions/drill-down'

interface Props { data: PerformanceStats }

export function PerformanceSection({ data }: Props) {
  const [drillDown, setDrillDown] = useState<{
    title: string; items: DrillDownItem[]; isLoading: boolean
  } | null>(null)

  async function ouvrirStatut(statut: string, label: string) {
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

      <ListeAnalyse
        titre="Marchés par statut"
        lignes={data.parStatut.map((s) => ({
          cle: s.statut,
          libelle: s.label,
          valeur: String(s.count),
          onClick: () => ouvrirStatut(s.statut, s.label),
        }))}
      />

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
