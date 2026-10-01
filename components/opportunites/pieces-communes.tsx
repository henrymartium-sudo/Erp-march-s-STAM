import { ChecklistView } from '@/components/dossiers-offre/checklist-view'
import { updatePieceCommuneStatut } from '@/lib/actions/pieces-communes'
import { calculerProgression } from '@/lib/utils/lots'
import type { PieceOffre, StatutOpportunite } from '@prisma/client'

interface PiecesCommunesProps {
  pieces: PieceOffre[]
  canWrite: boolean
  statutOpportunite: StatutOpportunite
}

/** Pièces communes à tous les lots : même checklist que les dossiers, branchée sur l'action des pièces communes. */
export function PiecesCommunes({ pieces, canWrite, statutOpportunite }: PiecesCommunesProps) {
  return (
    <ChecklistView
      pieces={pieces}
      progression={calculerProgression(pieces)}
      canWrite={canWrite}
      statutOpportunite={statutOpportunite}
      titre="Pièces communes"
      messageVide="Les pièces communes seront créées au passage en « Dossier en préparation »."
      onUpdate={updatePieceCommuneStatut}
    />
  )
}
