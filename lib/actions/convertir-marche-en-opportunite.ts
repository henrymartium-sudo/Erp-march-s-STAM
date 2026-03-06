'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import { StatutMarche } from '@prisma/client'
import type { ActionResult } from '@/types'

const STATUTS_PRE_ATTRIBUTION: StatutMarche[] = [
  'OPPORTUNITE_IDENTIFIEE',
  'DOSSIER_EN_PREPARATION',
  'OFFRE_DEPOSEE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
]

export async function convertirMarcheEnOpportunite(
  marcheId: string
): Promise<ActionResult<{ opportuniteId: string }>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const userId = (session.user as { id?: string } | undefined)?.id
    if (!userId) return { success: false, error: 'Utilisateur introuvable' }

    const marche = await prisma.marche.findUnique({
      where: { id: marcheId },
      select: {
        id: true,
        statut: true,
        objet: true,
        autoriteContractanteNom: true,
        montant: true,
        opportuniteId: true,
      },
    })

    if (!marche) {
      return { success: false, error: 'Marché introuvable.' }
    }

    if (!STATUTS_PRE_ATTRIBUTION.includes(marche.statut)) {
      return {
        success: false,
        error: 'Seuls les marchés en statut pré-attribution peuvent être convertis.',
      }
    }

    if (marche.opportuniteId) {
      return {
        success: false,
        error: 'Ce marché est déjà lié à une opportunité.',
      }
    }

    // Créer l'opportunité pré-remplie en EN_ANALYSE et lier le marché
    const opportunite = await prisma.$transaction(async (tx) => {
      const opp = await tx.opportunite.create({
        data: {
          objet:                marche.objet,
          autoriteContractante: marche.autoriteContractanteNom,
          montantEstime:        marche.montant,
          statut:               'EN_ANALYSE',
          userId,
          marcheId:             marche.id,
        },
      })

      await tx.marche.update({
        where: { id: marcheId },
        data: { opportuniteId: opp.id },
      })

      return opp
    })

    await logAction({
      action: AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.OPPORTUNITE,
      entityId: opportunite.id,
      metadata: { source: 'conversion_marche', marcheId },
    })

    revalidatePath(`/marches/${marcheId}`)
    revalidatePath('/opportunites')

    return { success: true, data: { opportuniteId: opportunite.id } }
  } catch (error) {
    console.error('convertirMarcheEnOpportunite error:', error)
    return { success: false, error: 'Erreur lors de la conversion.' }
  }
}
