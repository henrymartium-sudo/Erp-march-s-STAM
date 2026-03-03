'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatutBadge } from './statut-badge'
import { getHistoriqueStatuts, type HistoriqueStatutWithUser } from '@/lib/actions/marches'
import { ListSkeleton } from '@/components/ui/skeleton'
import { formatDateLong } from '@/lib/utils/format'
import { ArrowRight, History } from 'lucide-react'
import type { StatutMarche } from '@prisma/client'

interface MarcheHistoriqueStatutsProps {
  marcheId: string
}

export function MarcheHistoriqueStatuts({ marcheId }: MarcheHistoriqueStatutsProps) {
  const [historique, setHistorique] = useState<HistoriqueStatutWithUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistoriqueStatuts(marcheId).then((data) => {
      setHistorique(data)
      setLoading(false)
    })
  }, [marcheId])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          Historique des statuts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ListSkeleton count={3} />
        ) : historique.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucun historique de changement de statut.
          </p>
        ) : (
          <div className="relative space-y-0">
            {/* Ligne verticale */}
            <div className="absolute left-3 top-3 bottom-3 w-px bg-border" />

            {historique.map((entry, index) => (
              <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Point sur la timeline */}
                <div className="relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-background border-2 border-border mt-0.5">
                  <div className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-stam-accent' : 'bg-muted-foreground'}`} />
                </div>

                {/* Contenu */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <StatutBadge statut={entry.ancienStatut as StatutMarche} size="sm" />
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <StatutBadge statut={entry.nouveauStatut as StatutMarche} size="sm" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateLong(entry.createdAt.toString())} · {entry.user.name}
                  </p>
                  {entry.commentaire && (
                    <p className="text-sm text-foreground/80 mt-1 bg-muted/50 rounded px-2 py-1">
                      {entry.commentaire}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
