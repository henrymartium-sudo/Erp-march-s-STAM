'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { StatutMarche } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { requireMarcheWrite } from '@/lib/utils/permissions'
import { isTransitionValid, COMMENTAIRE_OBLIGATOIRE } from '@/lib/utils/workflow-statuts'
import { STATUT_LABELS } from '@/lib/utils/statut'
import type { ActionResult } from '@/types'

const changerStatutSchema = z.object({
  marcheId: z.string().min(1),
  newStatut: z.nativeEnum(StatutMarche),
  commentaire: z.string().optional(),
})

export async function changerStatutMarche(
  data: unknown
): Promise<ActionResult<{ statut: StatutMarche }>> {
  try {
    const session = await requireMarcheWrite()
    const { marcheId, newStatut, commentaire } = changerStatutSchema.parse(data)

    // 1. Récupérer le statut actuel
    const marche = await prisma.marche.findUnique({
      where: { id: marcheId },
      select: {
        statut: true,
        _count: { select: { cautions: { where: { statut: 'ACTIVE' } } } },
      },
    })

    if (!marche) {
      return { success: false, error: 'Marché introuvable.' }
    }

    // 2. Vérifier la transition
    if (!isTransitionValid(marche.statut, newStatut)) {
      return {
        success: false,
        error: `Transition interdite : "${STATUT_LABELS[marche.statut]}" → "${STATUT_LABELS[newStatut]}".`,
      }
    }

    // 3. Commentaire obligatoire pour les statuts critiques
    if (COMMENTAIRE_OBLIGATOIRE.includes(newStatut) && !commentaire?.trim()) {
      return {
        success: false,
        error: 'Un commentaire est obligatoire pour cette transition.',
      }
    }

    // 4. Bloquer CLOTURE si cautions actives
    if (newStatut === 'CLOTURE' && marche._count.cautions > 0) {
      return {
        success: false,
        error: `Impossible de clôturer : ${marche._count.cautions} caution(s) encore active(s). Libérez-les d'abord.`,
      }
    }

    // 5. Transaction : mise à jour statut + historique
    await prisma.$transaction([
      prisma.marche.update({
        where: { id: marcheId },
        data: { statut: newStatut },
      }),
      prisma.historiqueStatut.create({
        data: {
          marcheId,
          ancienStatut: marche.statut,
          nouveauStatut: newStatut,
          commentaire: commentaire?.trim() || null,
          userId: session.user.id as string,
        },
      }),
    ])

    revalidatePath(`/marches/${marcheId}`)

    return { success: true, data: { statut: newStatut } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Données invalides.' }
    }
    console.error('changerStatutMarche error:', error)
    return { success: false, error: 'Erreur lors du changement de statut.' }
  }
}
