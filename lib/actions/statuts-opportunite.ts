'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { StatutOpportunite } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import {
  isTransitionValidOpportunite,
  COMMENTAIRE_OBLIGATOIRE_OPPORTUNITE,
} from '@/lib/utils/workflow-statuts-opportunite'
import { STATUT_OPPORTUNITE_LABELS } from '@/lib/validations/opportunite'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import { CHECKLIST_STANDARD } from '@/lib/templates/checklist-offre'
import type { ActionResult } from '@/types'

const changerStatutOpportuniteSchema = z.object({
  opportuniteId:          z.string().min(1),
  newStatut:              z.nativeEnum(StatutOpportunite),
  commentaire:            z.string().optional(),
  // Champs optionnels si newStatut === 'PERDUE'
  motifPerte:             z.string().optional().nullable(),
  concurrentGagnant:      z.string().max(200).optional().nullable(),
  montantOffreConcurrent: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().positive().max(999999999999999).optional().nullable()
  ),
  // Champs optionnels si newStatut === 'OFFRE_SOUMISE' (MOD-6)
  periodeValiditeDebut:    z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : new Date(val as string)),
    z.date().optional().nullable()
  ),
  periodeValiditeFin:      z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : new Date(val as string)),
    z.date().optional().nullable()
  ),
  // Champ optionnel si newStatut === 'ATTRIBUTION_PROVISOIRE' (MOD-7)
  echeanceAttributionProv: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : new Date(val as string)),
    z.date().optional().nullable()
  ),
})

export async function changerStatutOpportunite(
  data: unknown
): Promise<ActionResult<{ statut: StatutOpportunite }>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }
    const userId = (session.user as { id?: string } | undefined)?.id
    const userEmail = (session.user as { email?: string } | undefined)?.email

    const parsed = changerStatutOpportuniteSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }

    const {
      opportuniteId,
      newStatut,
      commentaire,
      motifPerte,
      concurrentGagnant,
      montantOffreConcurrent,
      periodeValiditeDebut,
      periodeValiditeFin,
      echeanceAttributionProv,
    } = parsed.data

    // 1. Récupérer le statut actuel
    const opportunite = await prisma.opportunite.findUnique({
      where: { id: opportuniteId },
      select: { statut: true, objet: true },
    })

    if (!opportunite) {
      return { success: false, error: 'Opportunité introuvable.' }
    }

    // 2. Vérifier la transition
    if (!isTransitionValidOpportunite(opportunite.statut, newStatut)) {
      return {
        success: false,
        error: `Transition interdite : "${STATUT_OPPORTUNITE_LABELS[opportunite.statut]}" → "${STATUT_OPPORTUNITE_LABELS[newStatut]}".`,
      }
    }

    // 3. Commentaire obligatoire pour NO_GO et PERDUE
    if (
      COMMENTAIRE_OBLIGATOIRE_OPPORTUNITE.includes(newStatut) &&
      !commentaire?.trim()
    ) {
      return {
        success: false,
        error: 'Un commentaire est obligatoire pour cette transition.',
      }
    }

    // 4. Mise à jour
    const updateData: Record<string, unknown> = { statut: newStatut }
    if (newStatut === 'PERDUE') {
      updateData.motifPerte = motifPerte ?? null
      updateData.concurrentGagnant = concurrentGagnant ?? null
      updateData.montantOffreConcurrent = montantOffreConcurrent ?? null
    }
    if (newStatut === 'OFFRE_SOUMISE') {
      updateData.periodeValiditeDebut = periodeValiditeDebut ?? null
      updateData.periodeValiditeFin = periodeValiditeFin ?? null
    }
    if (newStatut === 'ATTRIBUE_PROVISOIREMENT') {
      updateData.echeanceAttributionProv = echeanceAttributionProv ?? null
    }

    await prisma.opportunite.update({
      where: { id: opportuniteId },
      data: updateData,
    })

    // 5. Auto-création DossierOffre si transition vers DOSSIER_EN_PREPARATION
    if (newStatut === 'DOSSIER_EN_PREPARATION') {
      const existingDossier = await prisma.dossierOffre.findFirst({
        where: { opportuniteId },
      })

      if (!existingDossier) {
        await prisma.dossierOffre.create({
          data: {
            titre: `Dossier — ${opportunite.objet}`,
            opportuniteId,
            statut: 'EN_COURS',
            progression: 0,
            pieces: {
              create: CHECKLIST_STANDARD.map((p) => ({
                nom:         p.nom,
                description: p.description,
                obligatoire: p.obligatoire,
                ordre:       p.ordre,
                statut:      'ABSENT' as const,
              })),
            },
          },
        })
        revalidatePath('/dossiers-offre')
      }
    }

    // 6. Audit log
    await logAction({
      userId,
      userEmail,
      action: AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.OPPORTUNITE,
      entityId: opportuniteId,
      metadata: {
        ancienStatut: opportunite.statut,
        nouveauStatut: newStatut,
        commentaire: commentaire?.trim() || null,
      },
    })

    revalidatePath(`/opportunites/${opportuniteId}`)
    revalidatePath('/opportunites')

    return { success: true, data: { statut: newStatut } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Données invalides.' }
    }
    console.error('changerStatutOpportunite error:', error)
    return { success: false, error: 'Erreur lors du changement de statut.' }
  }
}
