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

function calcProgression(pieces: PieceOffre[]): number {
  if (pieces.length === 0) return 0
  const done = pieces.filter(
    (p) => p.statut === 'COMPLET' || p.statut === 'VALIDE'
  ).length
  return Math.round((done / pieces.length) * 100)
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
        include: { pieces: { orderBy: { ordre: 'asc' } } },
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
      include: { pieces: { orderBy: { ordre: 'asc' } } },
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

    // Mettre à jour le statut de la pièce
    const piece = await prisma.pieceOffre.update({
      where: { id },
      data: { statut },
    })

    // Recalculer la progression du dossier
    const allPieces = await prisma.pieceOffre.findMany({
      where: { dossierId: piece.dossierId },
    })
    const progression = calcProgression(allPieces)

    await prisma.dossierOffre.update({
      where: { id: piece.dossierId },
      data: { progression },
    })

    revalidatePath(`/dossiers-offre/${piece.dossierId}`)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('Erreur updatePieceStatut:', error)
    return { success: false, error: 'Impossible de mettre à jour la pièce' }
  }
}
