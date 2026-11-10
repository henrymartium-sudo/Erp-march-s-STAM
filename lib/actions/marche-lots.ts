'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { calculerRetraitLot, retraitMarcheAutorise } from '@/lib/utils/lots'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION } from '@/lib/audit/constants'
import type { ActionResult } from '@/types'

export interface ApercuRetraitLot {
  montant: number
  objet: string
  objetConserve: boolean
}

const retraitSchema = z.object({
  lotId: z.string().min(1),
  montant: z.number().finite().min(0, 'Le montant ne peut pas être négatif.').max(9_999_999_999_999),
})

type Contexte =
  | { refus: string }
  | {
      opportuniteId: string
      marcheId: string
      ancienMontant: number
      ancienObjet: string
      calcul: ApercuRetraitLot
    }

/** Relit le lot, son marché et ses lots, puis applique les règles de retrait ; commun à l'aperçu et au retrait. */
async function lireContexteRetrait(tx: Prisma.TransactionClient, lotId: string): Promise<Contexte> {
  const lot = await tx.lot.findUnique({
    where: { id: lotId },
    select: { marcheId: true, opportuniteId: true },
  })
  if (!lot) return { refus: 'Lot introuvable.' }
  if (!lot.marcheId) return { refus: "Ce lot n'est rattaché à aucun marché." }

  const marche = await tx.marche.findUnique({
    where: { id: lot.marcheId },
    select: {
      statut: true,
      objet: true,
      montant: true,
      _count: { select: { factures: true } },
      lots: { select: { id: true, numero: true, resultat: true, montantPropose: true, marcheId: true }, orderBy: { numero: 'asc' } },
    },
  })
  if (!marche) return { refus: 'Marché introuvable.' }

  const refus = retraitMarcheAutorise({ statut: marche.statut, nbFactures: marche._count.factures })
  if (refus) return { refus }

  const opportunite = await tx.opportunite.findUnique({
    where: { id: lot.opportuniteId },
    select: { objet: true, _count: { select: { lots: true } } },
  })
  if (!opportunite) return { refus: 'Opportunité introuvable.' }

  const calcul = calculerRetraitLot({
    objetOpportunite: opportunite.objet,
    nbLotsTotal: opportunite._count.lots,
    marche: { objet: marche.objet, montant: Number(marche.montant) },
    lotsDuMarche: marche.lots,
    lotRetireId: lotId,
  })
  if ('refus' in calcul) return { refus: calcul.refus }

  return {
    opportuniteId: lot.opportuniteId,
    marcheId: lot.marcheId,
    ancienMontant: Number(marche.montant),
    ancienObjet: marche.objet,
    calcul,
  }
}

/** Montant et objet proposés si l'on retire ce lot de son marché (lecture seule, mêmes contrôles que le retrait). */
export async function apercuRetraitLot(lotId: string): Promise<ActionResult<ApercuRetraitLot>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) return { success: false, error: 'Permissions insuffisantes' }
    if (typeof lotId !== 'string' || lotId === '') return { success: false, error: 'Lot invalide.' }

    const contexte = await prisma.$transaction((tx) => lireContexteRetrait(tx, lotId))
    if ('refus' in contexte) return { success: false, error: contexte.refus }
    return { success: true, data: contexte.calcul }
  } catch (error) {
    console.error('apercuRetraitLot error:', error)
    return { success: false, error: 'Erreur lors du calcul du retrait.' }
  }
}

/** Retire un lot de son marché : le lot redevient libre, le montant confirmé est posé, le numéro du marché n'est jamais modifié. */
export async function retirerLotDuMarche(data: unknown): Promise<ActionResult<{ marcheId: string }>> {
  try {
    const session = await requireAuth()
    const user = session.user as { id?: string; email?: string; role?: string } | undefined
    if (!canWrite(user?.role)) return { success: false, error: 'Permissions insuffisantes' }
    if (!user?.id) return { success: false, error: 'Utilisateur introuvable' }

    const parsed = retraitSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    const { lotId, montant } = parsed.data

    const lot = await prisma.lot.findUnique({ where: { id: lotId }, select: { opportuniteId: true } })
    if (!lot) return { success: false, error: 'Lot introuvable.' }

    const resultat = await prisma.$transaction(async (tx) => {
      // Même verrou que la création d'un marché et les résultats de lots : les opérations sur les lots d'une opportunité se succèdent.
      await tx.$queryRaw`SELECT id FROM opportunites WHERE id = ${lot.opportuniteId} FOR UPDATE`
      const contexte = await lireContexteRetrait(tx, lotId)
      if ('refus' in contexte) return contexte

      const detaches = await tx.lot.updateMany({
        where: { id: lotId, marcheId: contexte.marcheId },
        data: { marcheId: null },
      })
      if (detaches.count !== 1) throw new Error('Détachement du lot incomplet')

      await tx.marche.update({
        where: { id: contexte.marcheId },
        data: {
          montant: montant,
          ...(contexte.calcul.objetConserve ? {} : { objet: contexte.calcul.objet }),
        },
      })
      return contexte
    }, { maxWait: 10000, timeout: 20000 })

    if ('refus' in resultat) return { success: false, error: resultat.refus }

    await logAction({
      userId: user.id,
      userEmail: user.email,
      action: AUDIT_ACTION.UPDATE,
      entityType: 'MARCHE',
      entityId: resultat.marcheId,
      metadata: {
        source: 'retrait_lot',
        lotId,
        ancienMontant: resultat.ancienMontant,
        nouveauMontant: montant,
        ancienObjet: resultat.ancienObjet,
        nouvelObjet: resultat.calcul.objetConserve ? resultat.ancienObjet : resultat.calcul.objet,
      },
    })

    revalidatePath(`/marches/${resultat.marcheId}`)
    revalidatePath(`/opportunites/${resultat.opportuniteId}`)
    revalidatePath('/marches')

    return { success: true, data: { marcheId: resultat.marcheId } }
  } catch (error) {
    console.error('retirerLotDuMarche error:', error)
    return { success: false, error: 'Erreur lors du retrait du lot.' }
  }
}
