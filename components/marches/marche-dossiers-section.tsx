'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FolderCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { getDossiersOffre } from '@/lib/actions/dossiers-offre'
import {
  ETAT_DOSSIER_LABELS,
  ETAT_DOSSIER_COLORS,
} from '@/lib/validations/dossier-offre'
import { deriverEtatDossier } from '@/lib/utils/lots'
import type { DossierOffreWithPieces } from '@/lib/actions/dossiers-offre'

interface MarcheDossiersSectionProps {
  marcheId: string
}

export function MarcheDossiersSection({ marcheId }: MarcheDossiersSectionProps) {
  const [dossiers, setDossiers] = useState<DossierOffreWithPieces[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDossiersOffre({ marcheId, limit: 10 }).then((result) => {
      if (result.success) setDossiers(result.data.data)
      setLoading(false)
    })
  }, [marcheId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderCheck className="h-4 w-4" /> Dossiers d&apos;offre
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderCheck className="h-4 w-4 text-muted-foreground" />
          Dossiers d&apos;offre
          {dossiers.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {dossiers.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {dossiers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun dossier d&apos;offre pour ce marché
          </p>
        ) : (
          dossiers.map((d) => {
            const etat = d.opportunite ? deriverEtatDossier(d.opportunite.statut) : 'AUCUN'
            return (
              <Link
                key={d.id}
                href={d.opportuniteId ? `/opportunites/${d.opportuniteId}?onglet=lots` : '/opportunites'}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" title={d.titre}>{d.titre}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={d.progression} className="h-1.5 w-24" />
                    <span className="text-xs text-muted-foreground">{d.progression}%</span>
                  </div>
                </div>
                <Badge
                  variant={ETAT_DOSSIER_COLORS[etat] as 'success' | 'warning' | 'danger' | 'info' | 'muted'}
                  className="text-xs ml-2 flex-shrink-0"
                >
                  {ETAT_DOSSIER_LABELS[etat]}
                </Badge>
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
