'use client'

import Link from 'next/link'
import { Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  STATUT_OPPORTUNITE_LABELS,
  STATUT_OPPORTUNITE_COLORS,
} from '@/lib/validations/opportunite'

interface OpportunitesWidgetProps {
  total: number
  parStatut: Record<string, number>
}

const STATUTS_ACTIFS = ['IDENTIFIEE', 'EN_ANALYSE', 'GO', 'SOUMISE'] as const

export function OpportunitesWidget({ total, parStatut }: OpportunitesWidgetProps) {
  const actives = STATUTS_ACTIFS.reduce((sum, s) => sum + (parStatut[s] ?? 0), 0)
  const gagnees = parStatut['GAGNEE'] ?? 0
  const perdues = parStatut['PERDUE'] ?? 0
  const noGo = parStatut['NO_GO'] ?? 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Pipeline Opportunités
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/opportunites">Voir tout</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{total}</div>
        <p className="text-xs text-muted-foreground mb-4">{actives} actives</p>

        <div className="grid grid-cols-2 gap-2">
          {STATUTS_ACTIFS.map((s) => (
            parStatut[s] ? (
              <div key={s} className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1">
                <Badge variant={STATUT_OPPORTUNITE_COLORS[s] as 'success' | 'warning' | 'danger' | 'info' | 'muted'} className="text-xs">
                  {STATUT_OPPORTUNITE_LABELS[s]}
                </Badge>
                <span className="text-sm font-semibold">{parStatut[s]}</span>
              </div>
            ) : null
          ))}
        </div>

        {(gagnees > 0 || perdues > 0 || noGo > 0) && (
          <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-muted-foreground">
            {gagnees > 0 && <span className="text-green-600 font-medium">✓ {gagnees} gagnée{gagnees > 1 ? 's' : ''}</span>}
            {perdues > 0 && <span>{perdues} perdue{perdues > 1 ? 's' : ''}</span>}
            {noGo > 0 && <span>{noGo} no go</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
