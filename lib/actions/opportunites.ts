'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { createOpportuniteSchema, updateOpportuniteSchema } from '@/lib/validations/opportunite'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'
import {
  PHASE_STATUTS,
  buildOpportuniteOrderBy,
  buildOpportuniteWhere,
  type OpportuniteFilters,
  type OpportunitePhase,
} from '@/lib/utils/opportunite-filters'
import { serializeLot, type SerializedLot } from '@/lib/utils/serialize'
import { preparerMarcheDepuisLots } from '@/lib/utils/lots'
import type { ActionResult } from '@/types'
import type { PaginatedResponse } from '@/types/pagination'
import type { Opportunite, Marche, Lot, PieceOffre, StatutOpportunite, StatutMarche } from '@prisma/client'

// ============================================================================
// TYPES
// ============================================================================

export type OpportuniteWithMarche = Opportunite & {
  marche: Pick<Marche, 'id' | 'numero' | 'objet'> | null
}

export type OpportuniteDetail = OpportuniteWithMarche & {
  lots: SerializedLot[]
  piecesCommunes: PieceOffre[]
}

/** Ligne de la liste : pour chaque lot, seule la progression de son dossier est chargée. */
export type OpportuniteListItem = OpportuniteWithMarche & {
  lots: { montantPropose: Lot['montantPropose']; dossier: { progression: number } | null }[]
}

export interface GetOpportunitesOptions extends OpportuniteFilters {
  page?: number
  limit?: number
}

// ============================================================================
// READ
// ============================================================================

export async function getOpportunites(
  options: GetOpportunitesOptions = {}
): Promise<ActionResult<PaginatedResponse<OpportuniteListItem>>> {
  try {
    await requireAuth()

    const { page, limit, ...filters } = options
    const { skip, take } = getPrismaSkipTake({ page, limit })

    const where = buildOpportuniteWhere(filters)

    const [opportunites, total] = await Promise.all([
      prisma.opportunite.findMany({
        where,
        include: {
          marche: {
            select: { id: true, numero: true, objet: true },
          },
          lots: {
            select: { montantPropose: true, dossier: { select: { progression: true } } },
          },
        },
        orderBy: buildOpportuniteOrderBy(filters.tri, filters.echeance),
        skip,
        take,
      }),
      prisma.opportunite.count({ where }),
    ])

    return {
      success: true,
      data: { data: opportunites, pagination: calculatePagination(total, page, limit) },
    }
  } catch (error) {
    console.error('Erreur getOpportunites:', error)
    return { success: false, error: 'Impossible de charger les opportunités' }
  }
}

/**
 * Nombre d'opportunités par phase (onglets de la liste), indépendamment des autres filtres.
 */
export async function getOpportunitesPhaseCounts(): Promise<
  ActionResult<Record<OpportunitePhase, number>>
> {
  try {
    await requireAuth()

    const grouped = await prisma.opportunite.groupBy({
      by: ['statut'],
      _count: { _all: true },
    })

    const counts: Record<OpportunitePhase, number> = { 'en-cours': 0, gagnees: 0, perdues: 0, toutes: 0 }
    for (const g of grouped) {
      counts.toutes += g._count._all
      for (const phase of ['en-cours', 'gagnees', 'perdues'] as const) {
        if (PHASE_STATUTS[phase].includes(g.statut)) counts[phase] += g._count._all
      }
    }

    return { success: true, data: counts }
  } catch (error) {
    console.error('Erreur getOpportunitesPhaseCounts:', error)
    return { success: false, error: 'Impossible de charger les compteurs' }
  }
}

export async function getOpportunite(
  id: string
): Promise<ActionResult<OpportuniteDetail>> {
  try {
    await requireAuth()

    const opportunite = await prisma.opportunite.findUnique({
      where: { id },
      include: {
        marche: {
          select: { id: true, numero: true, objet: true },
        },
        lots: {
          orderBy: { numero: 'asc' },
          include: { dossier: { include: { pieces: { orderBy: { ordre: 'asc' } } } } },
        },
        piecesCommunes: { orderBy: { ordre: 'asc' } },
      },
    })

    if (!opportunite) {
      return { success: false, error: 'Opportunité introuvable' }
    }

    return {
      success: true,
      data: { ...opportunite, lots: opportunite.lots.map(serializeLot) },
    }
  } catch (error) {
    console.error('Erreur getOpportunite:', error)
    return { success: false, error: "Impossible de charger l'opportunité" }
  }
}

export async function getOpportunitesStats(): Promise<
  ActionResult<{ total: number; parStatut: Record<string, number> }>
> {
  try {
    await requireAuth()

    const grouped = await prisma.opportunite.groupBy({
      by: ['statut'],
      _count: { _all: true },
    })

    const parStatut: Record<string, number> = {}
    for (const g of grouped) {
      parStatut[g.statut] = g._count._all
    }

    const total = grouped.reduce((sum, g) => sum + g._count._all, 0)

    return { success: true, data: { total, parStatut } }
  } catch (error) {
    console.error('Erreur getOpportunitesStats:', error)
    return { success: false, error: 'Impossible de charger les statistiques' }
  }
}

// ============================================================================
// CREATE
// ============================================================================

export async function createOpportunite(
  data: unknown
): Promise<ActionResult<Opportunite>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const parsed = createOpportuniteSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }

    const userId = (session.user as { id?: string } | undefined)?.id
    if (!userId) return { success: false, error: 'Utilisateur introuvable' }
    const userEmail = (session.user as { email?: string } | undefined)?.email

    const opportunite = await prisma.opportunite.create({
      data: {
        ...parsed.data,
        userId,
      },
    })

    await logAction({
      userId,
      userEmail,
      action: AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.OPPORTUNITE,
      entityId: opportunite.id,
      metadata: { objet: opportunite.objet },
    })

    revalidatePath('/opportunites')
    return { success: true, data: opportunite }
  } catch (error) {
    console.error('Erreur createOpportunite:', error)
    return { success: false, error: "Impossible de créer l'opportunité" }
  }
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateOpportunite(
  id: string,
  data: unknown
): Promise<ActionResult<Opportunite>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const parsed = updateOpportuniteSchema.safeParse({ ...data as object, id })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }

    const { id: _id, ...updateData } = parsed.data
    const userId = (session.user as { id?: string } | undefined)?.id
    const userEmail = (session.user as { email?: string } | undefined)?.email

    const opportunite = await prisma.opportunite.update({
      where: { id },
      data: updateData,
    })

    await logAction({
      userId,
      userEmail,
      action: AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.OPPORTUNITE,
      entityId: id,
      metadata: { objet: opportunite.objet },
    })

    revalidatePath('/opportunites')
    revalidatePath(`/opportunites/${id}`)
    return { success: true, data: opportunite }
  } catch (error) {
    console.error('Erreur updateOpportunite:', error)
    return { success: false, error: "Impossible de mettre à jour l'opportunité" }
  }
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteOpportunite(
  id: string
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }
    const userId = (session.user as { id?: string } | undefined)?.id
    const userEmail = (session.user as { email?: string } | undefined)?.email

    await prisma.opportunite.delete({ where: { id } })

    await logAction({
      userId,
      userEmail,
      action: AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.OPPORTUNITE,
      entityId: id,
    })

    revalidatePath('/opportunites')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('Erreur deleteOpportunite:', error)
    return { success: false, error: "Impossible de supprimer l'opportunité" }
  }
}

// ============================================================================
// CRÉER UN MARCHÉ DEPUIS UNE OPPORTUNITÉ GAGNÉE
// ============================================================================

export async function createMarcheFromOpportunite(
  opportuniteId: string
): Promise<ActionResult<{ marcheId: string }>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const userId = (session.user as { id?: string } | undefined)?.id
    if (!userId) return { success: false, error: 'Utilisateur introuvable' }
    const userEmail = (session.user as { email?: string } | undefined)?.email

    // 1. Vérifier que l'opportunité est bien GAGNEE
    const opportunite = await prisma.opportunite.findUnique({
      where: { id: opportuniteId },
      select: {
        id: true,
        statut: true,
        objet: true,
        autoriteContractante: true,
        reference: true,
        marcheId: true,
        lots: { select: { numero: true, resultat: true, montantPropose: true }, orderBy: { numero: 'asc' } },
      },
    })

    if (!opportunite) {
      return { success: false, error: 'Opportunité introuvable.' }
    }

    if (opportunite.marcheId) {
      return { success: false, error: 'Un marché est déjà lié à cette opportunité.' }
    }

    if (opportunite.statut !== 'GAGNEE') {
      return {
        success: false,
        error: 'Seule une opportunité en statut GAGNÉE peut générer un marché.',
      }
    }

    const depuisLots = preparerMarcheDepuisLots(opportunite.objet, opportunite.lots)
    if (!depuisLots) {
      return { success: false, error: "Aucun lot gagné : le marché ne peut pas être créé." }
    }

    // 2. Générer un numéro de marché temporaire unique
    const count = await prisma.marche.count()
    const numeroTemp = `MARCHE-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

    // 3. Créer le marché en transaction
    const marche = await prisma.$transaction(async (tx) => {
      const newMarche = await tx.marche.create({
        data: {
          numero:                  numeroTemp,
          objet:                   depuisLots.objet,
          type:                    'FOURNITURES',
          montant:                 depuisLots.montant,
          dateNotification:        new Date(),
          delaiExecution:          0,
          statut:                  'ATTRIBUE_DEFINITIVEMENT' as StatutMarche,
          autoriteContractanteNom: opportunite.autoriteContractante,
          userId,
          opportuniteId,
        },
      })

      // Lier l'opportunité au marché (sens inverse)
      await tx.opportunite.update({
        where: { id: opportuniteId },
        data: { marcheId: newMarche.id },
      })

      return newMarche
    })

    await logAction({
      userId,
      userEmail,
      action: AUDIT_ACTION.CREATE,
      entityType: 'MARCHE',
      entityId: marche.id,
      metadata: {
        source: 'opportunite',
        opportuniteId,
        objet: marche.objet,
      },
    })

    revalidatePath(`/opportunites/${opportuniteId}`)
    revalidatePath('/marches')

    return { success: true, data: { marcheId: marche.id } }
  } catch (error) {
    console.error('createMarcheFromOpportunite error:', error)
    return { success: false, error: 'Erreur lors de la création du marché.' }
  }
}
