'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { updatePieceStatutSchema } from '@/lib/validations/dossier-offre'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { piecesModifiables } from '@/lib/utils/lots'
import { recalculerProgressionOpportunite } from '@/lib/actions/dossiers-offre'
import type { ActionResult } from '@/types'
import type { StatutPiece } from '@prisma/client'

// ============================================================================
// UPDATE PIECE COMMUNE STATUT
// ============================================================================

export async function updatePieceCommuneStatut(
  id: string,
  statut: StatutPiece
): Promise<ActionResult<null>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const parsed = updatePieceStatutSchema.safeParse({ id, statut })
    if (!parsed.success) {
      return { success: false, error: 'Données invalides' }
    }

    const piece = await prisma.pieceOffre.findUnique({
      where: { id },
      select: {
        opportuniteId: true,
        opportunite: { select: { statut: true } },
      },
    })

    if (!piece) {
      return { success: false, error: 'Pièce introuvable' }
    }

    if (!piece.opportuniteId) {
      return { success: false, error: "Cette pièce n'est pas une pièce commune." }
    }

    if (piece.opportunite && !piecesModifiables(piece.opportunite.statut)) {
      return { success: false, error: 'Le dossier est déposé : les pièces ne sont plus modifiables.' }
    }

    await prisma.pieceOffre.update({ where: { id }, data: { statut } })

    if (piece.opportuniteId) {
      await recalculerProgressionOpportunite(piece.opportuniteId)
      revalidatePath(`/opportunites/${piece.opportuniteId}`)
    }

    return { success: true, data: null }
  } catch (error) {
    console.error('Erreur updatePieceCommuneStatut:', error)
    return { success: false, error: 'Impossible de mettre à jour la pièce' }
  }
}
