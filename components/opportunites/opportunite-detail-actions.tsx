'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatutOpportunite } from '@prisma/client'
import { StatutChangerOpportuniteButton } from './statut-changer-button'
import { CreerMarcheDialog, type LotLibre } from './creer-marche-dialog'

interface OpportuniteDetailActionsProps {
  opportuniteId: string
  currentStatut: StatutOpportunite
  nbLots: number
  /** Lots gagnés pas encore rattachés à un marché (vide si aucun marché n'est créable). */
  lotsLibres: LotLibre[]
  canWrite: boolean
}

export function OpportuniteDetailActions({
  opportuniteId,
  currentStatut,
  nbLots,
  lotsLibres,
  canWrite,
}: OpportuniteDetailActionsProps) {
  const router = useRouter()
  const [statut, setStatut] = useState<StatutOpportunite>(currentStatut)

  if (!canWrite) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatutChangerOpportuniteButton
        opportuniteId={opportuniteId}
        currentStatut={statut}
        nbLots={nbLots}
        onStatutChanged={setStatut}
      />
      {statut === 'GAGNEE' && lotsLibres.length > 0 && (
        <CreerMarcheDialog
          opportuniteId={opportuniteId}
          lotsLibres={lotsLibres}
          onCreated={(marcheId) => router.push(`/marches/${marcheId}`)}
        />
      )}
    </div>
  )
}
