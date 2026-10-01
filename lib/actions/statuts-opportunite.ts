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
import { STATUTS_PILOTES_PAR_LOTS, lotsSansMontantPropose, messageMontantsLotsManquants } from '@/lib/utils/lots'
import { STATUT_OPPORTUNITE_LABELS } from '@/lib/validations/opportunite'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import { CHECKLIST_STANDARD } from '@/lib/templates/checklist-offre'
import type { ActionResult } from '@/types'

const changerStatutOpportuniteSchema = z.object({
  opportuniteId:          z.string().min(1),
  newStatut:              z.nativeEnum(StatutOpportunite),
  commentaire:            z.string().optional(),
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

    // Statuts désormais pilotés par les résultats des lots (les opportunités sans lot — cas
    // impossible après reprise — gardent l'ancien comportement).
    if (STATUTS_PILOTES_PAR_LOTS.includes(newStatut) && newStatut !== opportunite.statut) {
      const nbLots = await prisma.lot.count({ where: { opportuniteId } })
      if (nbLots > 0) {
        return { success: false, error: 'Après attribution, le statut se déduit des résultats saisis sur chaque lot.' }
      }
    }

    // Pas d'offre sans prix : chaque lot doit porter un montant proposé avant la soumission. Les opportunités sans lot
    // (cas impossible après reprise) gardent l'ancien comportement.
    if (newStatut === 'OFFRE_SOUMISE' && newStatut !== opportunite.statut) {
      const lots = await prisma.lot.findMany({ where: { opportuniteId }, select: { numero: true, montantPropose: true } })
      const sansMontant = lotsSansMontantPropose(lots)
      if (sansMontant.length > 0) return { success: false, error: messageMontantsLotsManquants(sansMontant) }
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
    if (newStatut === 'OFFRE_SOUMISE') {
      updateData.periodeValiditeDebut = periodeValiditeDebut ?? null
      updateData.periodeValiditeFin = periodeValiditeFin ?? null
    }
    if (newStatut === 'ATTRIBUE_PROVISOIREMENT') {
      updateData.echeanceAttributionProv = echeanceAttributionProv ?? null
    }

    // 5. Mise à jour du statut, et auto-création d'un dossier par lot + pièces communes si
    //    transition vers DOSSIER_EN_PREPARATION — dans une seule transaction pour ne jamais
    //    laisser l'opportunité passée en DOSSIER_EN_PREPARATION sans ses dossiers/pièces.
    await prisma.$transaction(async (tx) => {
      await tx.opportunite.update({
        where: { id: opportuniteId },
        data: updateData,
      })

      if (newStatut !== 'DOSSIER_EN_PREPARATION') return

      let lots = await tx.lot.findMany({ where: { opportuniteId }, include: { dossier: true }, orderBy: { numero: 'asc' } })
      if (lots.length === 0) {
        const lot = await tx.lot.create({ data: { opportuniteId, numero: 1, intitule: 'Lot unique' } })
        lots = [{ ...lot, dossier: null }]
      }
      const piecesLot = CHECKLIST_STANDARD.filter((p) => p.portee === 'LOT')
      for (const lot of lots) {
        if (lot.dossier) continue
        await tx.dossierOffre.create({
          data: {
            titre: `Dossier — ${opportunite.objet} — Lot ${lot.numero}`,
            opportuniteId,
            lotId: lot.id,
            pieces: { create: piecesLot.map(({ nom, description, obligatoire, ordre }) => ({ nom, description, obligatoire, ordre, statut: 'ABSENT' as const })) },
          },
        })
      }
      const nbCommunes = await tx.pieceOffre.count({ where: { opportuniteId } })
      if (nbCommunes === 0) {
        await tx.pieceOffre.createMany({
          data: CHECKLIST_STANDARD.filter((p) => p.portee === 'COMMUNE').map(({ nom, description, obligatoire, ordre }) => ({
            opportuniteId, nom, description, obligatoire, ordre, statut: 'ABSENT' as const,
          })),
        })
      }
    }, { maxWait: 10000, timeout: 20000 })

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
