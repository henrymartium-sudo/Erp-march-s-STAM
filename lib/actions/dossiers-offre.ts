'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import {
  createDossierOffreSchema,
  updateDossierOffreSchema,
  updatePieceStatutSchema,
} from '@/lib/validations/dossier-offre'
import { CHECKLIST_STANDARD } from '@/lib/templates/checklist-offre'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { calculerProgression, piecesModifiables } from '@/lib/utils/lots'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'
import type { ActionResult } from '@/types'
import type { PaginatedResponse } from '@/types/pagination'
import type { DossierOffre, PieceOffre } from '@prisma/client'

// ============================================================================
// TYPES
// ============================================================================

export type DossierOffreWithPieces = DossierOffre & {
  pieces: PieceOffre[]
  opportunite?: { statut: import('@prisma/client').StatutOpportunite } | null
}

export interface GetDossiersOptions {
  marcheId?: string
  opportuniteId?: string
  page?: number
  limit?: number
}

// ============================================================================
// HELPERS
// ============================================================================

/** Recalcule la progression de chaque dossier d'une opportunité (pièces du lot + pièces communes). */
export async function recalculerProgressionOpportunite(opportuniteId: string): Promise<void> {
  const [communes, dossiers] = await Promise.all([
    prisma.pieceOffre.findMany({ where: { opportuniteId }, select: { statut: true } }),
    prisma.dossierOffre.findMany({ where: { opportuniteId }, select: { id: true, pieces: { select: { statut: true } } } }),
  ])
  await Promise.all(
    dossiers.map((d) =>
      prisma.dossierOffre.update({ where: { id: d.id }, data: { progression: calculerProgression([...d.pieces, ...communes]) } })
    )
  )
}

// ============================================================================
// READ
// ============================================================================

export async function getDossiersOffre(
  options: GetDossiersOptions = {}
): Promise<ActionResult<PaginatedResponse<DossierOffreWithPieces>>> {
  try {
    await requireAuth()

    const { marcheId, opportuniteId, page, limit } = options
    const { skip, take } = getPrismaSkipTake({ page, limit })

    const where = {
      ...(marcheId      && { marcheId }),
      ...(opportuniteId && { opportuniteId }),
    }

    const [dossiers, total] = await Promise.all([
      prisma.dossierOffre.findMany({
        where,
        include: {
          pieces: { orderBy: { ordre: 'asc' } },
          opportunite: { select: { statut: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.dossierOffre.count({ where }),
    ])

    return {
      success: true,
      data: { data: dossiers, pagination: calculatePagination(total, page, limit) },
    }
  } catch (error) {
    console.error('Erreur getDossiersOffre:', error)
    return { success: false, error: 'Impossible de charger les dossiers' }
  }
}

export async function getDossierOffre(
  id: string
): Promise<ActionResult<DossierOffreWithPieces>> {
  try {
    await requireAuth()

    const dossier = await prisma.dossierOffre.findUnique({
      where: { id },
      include: {
        pieces: { orderBy: { ordre: 'asc' } },
        opportunite: { select: { statut: true } },
      },
    })

    if (!dossier) {
      return { success: false, error: 'Dossier introuvable' }
    }

    return { success: true, data: dossier }
  } catch (error) {
    console.error('Erreur getDossierOffre:', error)
    return { success: false, error: 'Impossible de charger le dossier' }
  }
}

// ============================================================================
// CREATE
// ============================================================================

export async function createDossierOffre(
  data: unknown
): Promise<ActionResult<DossierOffre>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }
    const userId = (session.user as { id?: string } | undefined)?.id
    const userEmail = (session.user as { email?: string } | undefined)?.email

    const parsed = createDossierOffreSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }

    const { useTemplate, ...dossierData } = parsed.data

    const dossier = await prisma.dossierOffre.create({
      data: {
        ...dossierData,
        progression: 0,
        ...(useTemplate && {
          pieces: {
            create: CHECKLIST_STANDARD.map((p) => ({
              nom:         p.nom,
              description: p.description,
              obligatoire: p.obligatoire,
              ordre:       p.ordre,
              statut:      'ABSENT' as const,
            })),
          },
        }),
      },
    })

    await logAction({
      userId,
      userEmail,
      action: AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.DOSSIER_OFFRE,
      entityId: dossier.id,
      metadata: { titre: dossier.titre },
    })

    revalidatePath('/dossiers-offre')
    return { success: true, data: dossier }
  } catch (error) {
    console.error('Erreur createDossierOffre:', error)
    return { success: false, error: 'Impossible de créer le dossier' }
  }
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateDossierOffre(
  id: string,
  data: unknown
): Promise<ActionResult<DossierOffre>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const parsed = updateDossierOffreSchema.safeParse({ ...(data as object), id })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }

    const { id: _id, ...updateData } = parsed.data
    const userId = (session.user as { id?: string } | undefined)?.id
    const userEmail = (session.user as { email?: string } | undefined)?.email

    const dossier = await prisma.dossierOffre.update({
      where: { id },
      data: updateData,
    })

    await logAction({
      userId,
      userEmail,
      action: AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.DOSSIER_OFFRE,
      entityId: id,
      metadata: { titre: dossier.titre },
    })

    revalidatePath('/dossiers-offre')
    revalidatePath(`/dossiers-offre/${id}`)
    return { success: true, data: dossier }
  } catch (error) {
    console.error('Erreur updateDossierOffre:', error)
    return { success: false, error: 'Impossible de mettre à jour le dossier' }
  }
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteDossierOffre(
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

    await prisma.dossierOffre.delete({ where: { id } })

    await logAction({
      userId,
      userEmail,
      action: AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.DOSSIER_OFFRE,
      entityId: id,
    })

    revalidatePath('/dossiers-offre')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('Erreur deleteDossierOffre:', error)
    return { success: false, error: 'Impossible de supprimer le dossier' }
  }
}

// ============================================================================
// UPDATE PIECE STATUT
// ============================================================================

export async function updatePieceStatut(
  id: string,
  statut: 'ABSENT' | 'INCOMPLET' | 'COMPLET' | 'VALIDE'
): Promise<ActionResult<void>> {
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
        dossierId: true,
        dossier: { select: { opportuniteId: true, opportunite: { select: { statut: true } } } },
      },
    })

    if (!piece) {
      return { success: false, error: 'Pièce introuvable' }
    }

    if (!piece.dossierId) {
      return { success: false, error: 'Cette pièce est une pièce commune.' }
    }

    const statutOpportunite = piece.dossier?.opportunite?.statut
    if (statutOpportunite && !piecesModifiables(statutOpportunite)) {
      return { success: false, error: 'Le dossier est déposé : les pièces ne sont plus modifiables.' }
    }

    await prisma.pieceOffre.update({ where: { id }, data: { statut } })

    const opportuniteId = piece.dossier?.opportuniteId
    if (opportuniteId) {
      await recalculerProgressionOpportunite(opportuniteId)
    } else if (piece.dossierId) {
      // Dossier legacy sans opportunité rattachée : recalculer uniquement ce dossier
      const allPieces = await prisma.pieceOffre.findMany({
        where: { dossierId: piece.dossierId },
        select: { statut: true },
      })
      await prisma.dossierOffre.update({
        where: { id: piece.dossierId },
        data: { progression: calculerProgression(allPieces) },
      })
    }

    if (piece.dossierId) {
      revalidatePath(`/dossiers-offre/${piece.dossierId}`)
    }
    return { success: true, data: undefined }
  } catch (error) {
    console.error('Erreur updatePieceStatut:', error)
    return { success: false, error: 'Impossible de mettre à jour la pièce' }
  }
}
