'use server'

import { revalidatePath } from 'next/cache'
import type { StatutOpportunite } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { lotSchema, resultatLotSchema } from '@/lib/validations/lot'
import { agregerStatutOpportunite, resultatsLotsFiges, STATUTS_EDITION_LOTS, STATUTS_SAISIE_RESULTAT } from '@/lib/utils/lots'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import type { ActionResult } from '@/types'

async function sessionEcriture() {
  const session = await requireAuth()
  const user = session.user as { id?: string; email?: string; role?: string } | undefined
  if (!canWrite(user?.role)) return null
  return user
}

export async function createLot(data: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await sessionEcriture()
    if (!user) return { success: false, error: 'Permissions insuffisantes' }
    const parsed = lotSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }

    const opp = await prisma.opportunite.findUnique({ where: { id: parsed.data.opportuniteId }, select: { statut: true } })
    if (!opp) return { success: false, error: 'Opportunité introuvable.' }
    if (!STATUTS_EDITION_LOTS.includes(opp.statut)) {
      return { success: false, error: "Les lots ne sont plus modifiables après le dépôt de l'offre." }
    }
    const lot = await prisma.lot.create({ data: parsed.data })
    await logAction({ userId: user.id, userEmail: user.email, action: AUDIT_ACTION.CREATE, entityType: AUDIT_ENTITY.LOT, entityId: lot.id })
    revalidatePath(`/opportunites/${parsed.data.opportuniteId}`)
    return { success: true, data: { id: lot.id } }
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return { success: false, error: 'Ce numéro de lot existe déjà.' }
    console.error('createLot error:', error)
    return { success: false, error: 'Erreur lors de la création du lot.' }
  }
}

export async function updateLot(id: string, data: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await sessionEcriture()
    if (!user) return { success: false, error: 'Permissions insuffisantes' }
    const parsed = lotSchema.omit({ opportuniteId: true }).safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    const lot = await prisma.lot.findUnique({ where: { id }, select: { opportuniteId: true, opportunite: { select: { statut: true } } } })
    if (!lot) return { success: false, error: 'Lot introuvable.' }
    if (!STATUTS_EDITION_LOTS.includes(lot.opportunite.statut)) {
      return { success: false, error: "Les lots ne sont plus modifiables après le dépôt de l'offre." }
    }
    // Montant proposé calculé depuis les véhicules : la saisie manuelle est ignorée dès qu'il y en a (design §4).
    // Sous le verrou de l'opportunité (comme setVehiculesProposes) : sinon une saisie de véhicules validée entre le
    // décompte et la mise à jour serait écrasée par le montant manuel.
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM opportunites WHERE id = ${lot.opportuniteId} FOR UPDATE`
      const nbVehicules = await tx.vehiculePropose.count({ where: { lotId: id } })
      const sansMontantPropose = { ...parsed.data }
      delete sansMontantPropose.montantPropose
      await tx.lot.update({ where: { id }, data: nbVehicules > 0 ? sansMontantPropose : parsed.data })
    }, { maxWait: 10000, timeout: 20000 })
    await logAction({ userId: user.id, userEmail: user.email, action: AUDIT_ACTION.UPDATE, entityType: AUDIT_ENTITY.LOT, entityId: id })
    revalidatePath(`/opportunites/${lot.opportuniteId}`)
    return { success: true, data: { id } }
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return { success: false, error: 'Ce numéro de lot existe déjà.' }
    console.error('updateLot error:', error)
    return { success: false, error: 'Erreur lors de la modification du lot.' }
  }
}

export async function deleteLot(id: string): Promise<ActionResult<null>> {
  try {
    const user = await sessionEcriture()
    if (!user) return { success: false, error: 'Permissions insuffisantes' }
    const lot = await prisma.lot.findUnique({ where: { id }, select: { opportuniteId: true, opportunite: { select: { statut: true } } } })
    if (!lot) return { success: false, error: 'Lot introuvable.' }
    if (!STATUTS_EDITION_LOTS.includes(lot.opportunite.statut)) {
      return { success: false, error: "Les lots ne sont plus modifiables après le dépôt de l'offre." }
    }
    await prisma.lot.delete({ where: { id } }) // cascade : dossier du lot + ses pièces
    await logAction({ userId: user.id, userEmail: user.email, action: AUDIT_ACTION.DELETE, entityType: AUDIT_ENTITY.LOT, entityId: id })
    revalidatePath(`/opportunites/${lot.opportuniteId}`)
    return { success: true, data: null }
  } catch (error) {
    console.error('deleteLot error:', error)
    return { success: false, error: 'Erreur lors de la suppression du lot.' }
  }
}

/** Fixe le résultat d'un lot et recalcule le statut de l'opportunité dans la même transaction (design §5). */
export async function setResultatLot(
  data: unknown
): Promise<ActionResult<{ statutOpportunite: StatutOpportunite }>> {
  try {
    const user = await sessionEcriture()
    if (!user) return { success: false, error: 'Permissions insuffisantes' }
    const parsed = resultatLotSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    const { lotId, resultat, motifPerte, concurrentGagnant, montantOffreConcurrent } = parsed.data

    const res = await prisma.$transaction(async (tx) => {
      const lot = await tx.lot.findUnique({ where: { id: lotId }, select: { opportuniteId: true } })
      if (!lot) throw new Error('LOT_INTROUVABLE')

      // Verrouille la ligne opportunité avant lecture/agrégation pour sérialiser les
      // setResultatLot concurrents sur des lots de la même opportunité (pas de lost update).
      await tx.$queryRaw`SELECT id FROM opportunites WHERE id = ${lot.opportuniteId} FOR UPDATE`
      const opportunite = await tx.opportunite.findUnique({ where: { id: lot.opportuniteId }, select: { statut: true, createdAt: true, marche: { select: { createdAt: true } } } })
      if (!opportunite) throw new Error('LOT_INTROUVABLE')
      if (!STATUTS_SAISIE_RESULTAT.includes(opportunite.statut)) throw new Error('STATUT_INVALIDE')
      if (resultatsLotsFiges(opportunite)) throw new Error('MARCHE_LIE')

      const perdu = resultat === 'PERDU'
      await tx.lot.update({
        where: { id: lotId },
        data: {
          resultat,
          motifPerte: perdu ? motifPerte ?? null : null,
          concurrentGagnant: perdu ? concurrentGagnant ?? null : null,
          montantOffreConcurrent: perdu ? montantOffreConcurrent ?? null : null,
        },
      })
      const lots = await tx.lot.findMany({ where: { opportuniteId: lot.opportuniteId }, select: { resultat: true } })
      const statut = agregerStatutOpportunite(lots.map((l) => l.resultat)) ?? opportunite.statut
      if (statut !== opportunite.statut) {
        await tx.opportunite.update({ where: { id: lot.opportuniteId }, data: { statut } })
      }
      return { opportuniteId: lot.opportuniteId, ancien: opportunite.statut, statut }
    }, { maxWait: 10000, timeout: 20000 })

    await logAction({
      userId: user.id, userEmail: user.email, action: AUDIT_ACTION.UPDATE, entityType: AUDIT_ENTITY.LOT, entityId: lotId,
      metadata: { resultat, ancienStatutOpportunite: res.ancien, nouveauStatutOpportunite: res.statut },
    })
    if (res.statut !== res.ancien) {
      await logAction({
        userId: user.id, userEmail: user.email, action: AUDIT_ACTION.UPDATE, entityType: AUDIT_ENTITY.OPPORTUNITE, entityId: res.opportuniteId,
        metadata: { ancienStatut: res.ancien, nouveauStatut: res.statut, commentaire: null, source: 'resultat_lot', lotId },
      })
    }
    revalidatePath(`/opportunites/${res.opportuniteId}`)
    revalidatePath('/opportunites')
    return { success: true, data: { statutOpportunite: res.statut } }
  } catch (error) {
    const msg = (error as Error).message
    if (msg === 'LOT_INTROUVABLE') return { success: false, error: 'Lot introuvable.' }
    if (msg === 'STATUT_INVALIDE') return { success: false, error: "Le résultat se saisit après le dépôt, en attente d'attribution." }
    if (msg === 'MARCHE_LIE') return { success: false, error: 'Un marché est déjà créé pour cette opportunité : les résultats des lots ne sont plus modifiables.' }
    console.error('setResultatLot error:', error)
    return { success: false, error: 'Erreur lors de la saisie du résultat.' }
  }
}
