'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { createFactureSchema, updateFactureSchema } from '@/lib/validations/facture'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'
import type { ActionResult } from '@/types'
import type { PaginatedResponse } from '@/types/pagination'
import type { Facture, Marche, StatutFacture } from '@prisma/client'

// ============================================================================
// TYPES
// ============================================================================

export type FactureWithMarche = Facture & {
  marche: Pick<Marche, 'id' | 'numero' | 'objet' | 'autoriteContractanteNom'>
}

export interface GetFacturesOptions {
  marcheId?: string
  statut?: StatutFacture
  page?: number
  limit?: number
}

// ============================================================================
// READ
// ============================================================================

export async function getFactures(
  options: GetFacturesOptions = {}
): Promise<ActionResult<PaginatedResponse<FactureWithMarche>>> {
  try {
    await requireAuth()

    const { marcheId, statut, page, limit } = options
    const { skip, take } = getPrismaSkipTake({ page, limit })

    const where = {
      ...(marcheId && { marcheId }),
      ...(statut && { statut }),
    }

    const [factures, total] = await Promise.all([
      prisma.facture.findMany({
        where,
        include: {
          marche: {
            select: {
              id: true,
              numero: true,
              objet: true,
              autoriteContractanteNom: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.facture.count({ where }),
    ])

    return {
      success: true,
      data: { data: factures, pagination: calculatePagination(total, page, limit) },
    }
  } catch (error) {
    console.error('Erreur getFactures:', error)
    return { success: false, error: 'Impossible de charger les factures' }
  }
}

export async function getFacture(
  id: string
): Promise<ActionResult<FactureWithMarche>> {
  try {
    await requireAuth()

    const facture = await prisma.facture.findUnique({
      where: { id },
      include: {
        marche: {
          select: {
            id: true,
            numero: true,
            objet: true,
            autoriteContractanteNom: true,
          },
        },
      },
    })

    if (!facture) return { success: false, error: 'Facture introuvable' }

    return { success: true, data: facture }
  } catch (error) {
    console.error('Erreur getFacture:', error)
    return { success: false, error: 'Impossible de charger la facture' }
  }
}

// ============================================================================
// CREATE
// ============================================================================

export async function createFacture(
  data: unknown
): Promise<ActionResult<Facture>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    const userId = (session.user as { id?: string } | undefined)?.id

    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const validated = createFactureSchema.parse(data)

    // Vérifier que le marché existe
    const marche = await prisma.marche.findUnique({ where: { id: validated.marcheId } })
    if (!marche) return { success: false, error: 'Marché introuvable' }

    const facture = await prisma.facture.create({
      data: {
        numero:       validated.numero,
        marcheId:     validated.marcheId,
        montantHT:    validated.montantHT,
        tva:          validated.tva ?? 18,
        montantTTC:   validated.montantTTC,
        statut:       validated.statut ?? 'BROUILLON',
        dateEmission: validated.dateEmission ?? null,
        dateEcheance: validated.dateEcheance ?? null,
        datePaiement: validated.datePaiement ?? null,
        reference:    validated.reference ?? null,
        notes:        validated.notes ?? null,
      },
    })

    await logAction({
      userId,
      userEmail: session.user?.email,
      action:     AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.FACTURE,
      entityId:   facture.id,
      metadata:   { numero: facture.numero, marcheId: facture.marcheId },
    })

    revalidatePath('/factures')
    revalidatePath(`/marches/${validated.marcheId}`)

    return { success: true, data: facture }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodErr = error as { issues: Array<{ message: string }> }
      return { success: false, error: zodErr.issues[0]?.message ?? 'Validation échouée' }
    }
    if (
      error && typeof error === 'object' && 'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return { success: false, error: 'Ce numéro de facture existe déjà' }
    }
    console.error('Erreur createFacture:', error)
    return { success: false, error: 'Impossible de créer la facture' }
  }
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateFacture(
  id: string,
  data: unknown
): Promise<ActionResult<Facture>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    const userId = (session.user as { id?: string } | undefined)?.id

    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const existing = await prisma.facture.findUnique({ where: { id } })
    if (!existing) return { success: false, error: 'Facture introuvable' }

    const validated = updateFactureSchema.parse({ ...(data as object), id })

    const facture = await prisma.facture.update({
      where: { id },
      data: {
        ...(validated.numero      !== undefined && { numero:       validated.numero }),
        ...(validated.montantHT   !== undefined && { montantHT:    validated.montantHT }),
        ...(validated.tva         !== undefined && { tva:          validated.tva }),
        ...(validated.montantTTC  !== undefined && { montantTTC:   validated.montantTTC }),
        ...(validated.statut      !== undefined && { statut:       validated.statut }),
        ...(validated.dateEmission !== undefined && { dateEmission: validated.dateEmission ?? null }),
        ...(validated.dateEcheance !== undefined && { dateEcheance: validated.dateEcheance ?? null }),
        ...(validated.datePaiement !== undefined && { datePaiement: validated.datePaiement ?? null }),
        ...(validated.reference   !== undefined && { reference:    validated.reference ?? null }),
        ...(validated.notes       !== undefined && { notes:        validated.notes ?? null }),
      },
    })

    await logAction({
      userId,
      userEmail: session.user?.email,
      action:     AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.FACTURE,
      entityId:   id,
      metadata:   { numero: facture.numero, statut: facture.statut },
    })

    revalidatePath('/factures')
    revalidatePath(`/factures/${id}`)
    revalidatePath(`/marches/${facture.marcheId}`)

    return { success: true, data: facture }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodErr = error as { issues: Array<{ message: string }> }
      return { success: false, error: zodErr.issues[0]?.message ?? 'Validation échouée' }
    }
    if (
      error && typeof error === 'object' && 'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return { success: false, error: 'Ce numéro de facture existe déjà' }
    }
    console.error('Erreur updateFacture:', error)
    return { success: false, error: 'Impossible de modifier la facture' }
  }
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteFacture(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    const userId = (session.user as { id?: string } | undefined)?.id

    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const facture = await prisma.facture.findUnique({ where: { id } })
    if (!facture) return { success: false, error: 'Facture introuvable' }

    if (facture.statut === 'PAYEE') {
      return { success: false, error: 'Impossible de supprimer une facture payée' }
    }

    await prisma.facture.delete({ where: { id } })

    await logAction({
      userId,
      userEmail: session.user?.email,
      action:     AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.FACTURE,
      entityId:   id,
      metadata:   { numero: facture.numero },
    })

    revalidatePath('/factures')
    revalidatePath(`/marches/${facture.marcheId}`)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Erreur deleteFacture:', error)
    return { success: false, error: 'Impossible de supprimer la facture' }
  }
}

// ============================================================================
// STATS PAR MARCHÉ
// ============================================================================

export async function getFacturesStatsByMarche(marcheId: string) {
  try {
    await requireAuth()

    const factures = await prisma.facture.findMany({
      where: { marcheId },
      select: { montantHT: true, montantTTC: true, statut: true },
    })

    const total = factures.length
    const montantTotalHT = factures.reduce((s, f) => s + Number(f.montantHT), 0)
    const montantTotalTTC = factures.reduce((s, f) => s + Number(f.montantTTC), 0)
    const montantPaye = factures
      .filter((f) => f.statut === 'PAYEE')
      .reduce((s, f) => s + Number(f.montantTTC), 0)

    return { success: true, data: { total, montantTotalHT, montantTotalTTC, montantPaye } }
  } catch {
    return { success: false, error: 'Erreur stats factures' }
  }
}
