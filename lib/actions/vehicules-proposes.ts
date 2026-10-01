'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { vehiculesLotSchema } from '@/lib/validations/vehicule-propose'
import { calculerMontantVehicules, vehiculesModifiables } from '@/lib/utils/lots'
import { construireSuggestions, type SuggestionVehicule } from '@/lib/utils/vehicules-proposes'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import type { ActionResult } from '@/types'

async function sessionEcriture() {
  const session = await requireAuth()
  const user = session.user as { id?: string; email?: string; role?: string } | undefined
  if (!canWrite(user?.role)) return null
  return user
}

const versNombre = (v: unknown): number | null => (v == null ? null : Number(v))

/**
 * Remplace la liste des véhicules proposés d'un lot et recalcule son montant proposé dans la même transaction.
 * Liste vide : le montant proposé est conservé (retour à la saisie manuelle).
 */
export async function setVehiculesProposes(data: unknown): Promise<ActionResult<{ montantPropose: number | null }>> {
  try {
    const user = await sessionEcriture()
    if (!user) return { success: false, error: 'Permissions insuffisantes' }
    const parsed = vehiculesLotSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    const { lotId, vehicules } = parsed.data

    const res = await prisma.$transaction(async (tx) => {
      const lot = await tx.lot.findUnique({ where: { id: lotId }, select: { opportuniteId: true } })
      if (!lot) throw new Error('LOT_INTROUVABLE')

      // Verrou de la ligne opportunité : sérialise avec les autres écritures sur ses lots (comme setResultatLot).
      await tx.$queryRaw`SELECT id FROM opportunites WHERE id = ${lot.opportuniteId} FOR UPDATE`
      const opportunite = await tx.opportunite.findUnique({
        where: { id: lot.opportuniteId },
        select: { statut: true, createdAt: true, marche: { select: { createdAt: true } } },
      })
      if (!opportunite) throw new Error('LOT_INTROUVABLE')
      if (!vehiculesModifiables(opportunite)) throw new Error('NON_MODIFIABLE')

      // Lu après le verrou : l'ancien montant tracé à l'audit est celui qui est réellement remplacé.
      const lotCourant = await tx.lot.findUnique({ where: { id: lotId }, select: { montantPropose: true } })
      if (!lotCourant) throw new Error('LOT_INTROUVABLE')
      const ancien = versNombre(lotCourant.montantPropose)
      const montantCalcule = calculerMontantVehicules(vehicules)
      await tx.vehiculePropose.deleteMany({ where: { lotId } })
      if (vehicules.length > 0) {
        await tx.vehiculePropose.createMany({ data: vehicules.map((v, ordre) => ({ lotId, ...v, ordre })) })
      }
      if (montantCalcule !== null) {
        await tx.lot.update({ where: { id: lotId }, data: { montantPropose: montantCalcule } })
      }
      return {
        opportuniteId: lot.opportuniteId,
        ancien,
        nouveau: montantCalcule ?? ancien,
        apresDepot: opportunite.statut !== 'DOSSIER_EN_PREPARATION',
      }
    }, { maxWait: 10000, timeout: 20000 })

    await logAction({
      userId: user.id, userEmail: user.email, action: AUDIT_ACTION.UPDATE, entityType: AUDIT_ENTITY.LOT, entityId: lotId,
      metadata: { source: 'vehicules_proposes', nbVehicules: vehicules.length, ancienMontantPropose: res.ancien, nouveauMontantPropose: res.nouveau, apresDepot: res.apresDepot },
    })
    revalidatePath(`/opportunites/${res.opportuniteId}`)
    revalidatePath('/opportunites')
    return { success: true, data: { montantPropose: res.nouveau } }
  } catch (error) {
    const msg = (error as Error).message
    if (msg === 'LOT_INTROUVABLE') return { success: false, error: 'Lot introuvable.' }
    if (msg === 'NON_MODIFIABLE') {
      return { success: false, error: "Les véhicules proposés ne sont plus modifiables : l'opportunité n'est pas en préparation ou au-delà, est clôturée, ou son marché est déjà créé." }
    }
    console.error('setVehiculesProposes error:', error)
    return { success: false, error: 'Erreur lors de l’enregistrement des véhicules proposés.' }
  }
}

/** Couples marque/modèle déjà saisis, avec le dernier prix unitaire utilisé (les plus récents d'abord). */
export async function listerSuggestionsVehicules(): Promise<ActionResult<SuggestionVehicule[]>> {
  try {
    const user = await sessionEcriture()
    if (!user) return { success: false, error: 'Permissions insuffisantes' }
    const lignes = await prisma.vehiculePropose.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { marque: true, modele: true, prixUnitaire: true },
    })
    return {
      success: true,
      data: construireSuggestions(lignes.map((l) => ({ marque: l.marque, modele: l.modele, prixUnitaire: Number(l.prixUnitaire) }))),
    }
  } catch (error) {
    console.error('listerSuggestionsVehicules error:', error)
    return { success: false, error: 'Impossible de charger les suggestions.' }
  }
}
