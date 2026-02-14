'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { createMarcheSchema, updateMarcheSchema } from '@/lib/validations/marche'
import { requireAuth, requireMarcheWrite, requireDelete } from '@/lib/utils/permissions'
import type { ActionResult } from '@/types'
import type { Marche, TypeMarche, StatutMarche } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import type { PaginatedResponse } from '@/types/pagination'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'

// ============================================================================
// CREATE
// ============================================================================

export async function createMarche(data: unknown): Promise<ActionResult<Marche>> {
  try {
    // 1. Vérification d'authentification et de permissions
    const session = await requireMarcheWrite()

    // 2. Validation avec Zod
    const validatedData = createMarcheSchema.parse(data)

    // 3. Création dans Prisma avec userId
    const marche = await prisma.marche.create({
      data: {
        ...validatedData,
        userId: session.user.id,
        // Calcul de dateFinPrevue si dateOrdreService est fournie
        dateFinPrevue:
          validatedData.dateOrdreService
            ? new Date(
                validatedData.dateOrdreService.getTime() +
                  validatedData.delaiExecution * 24 * 60 * 60 * 1000
              )
            : undefined,
      },
    })

    // 4. Revalidation du cache Next.js
    revalidatePath('/marches')

    // 5. Retour succès
    return { success: true, data: marche }
  } catch (error) {
    // Gestion des erreurs de permissions
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return { success: false, error: 'Vous devez être connecté pour créer un marché' }
    }
    if (error instanceof Error && error.message.includes('Non autorisé')) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour créer un marché',
      }
    }

    // Gestion des erreurs Zod
    if (error instanceof ZodError) {
      const errorMessages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
      return {
        success: false,
        error: `Erreur de validation : ${errorMessages.join(', ')}`,
      }
    }

    // Gestion des erreurs Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          success: false,
          error: 'Un marché avec ce numéro existe déjà',
        }
      }
    }

    // Erreur générique
    console.error('Erreur lors de la création du marché:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la création du marché',
    }
  }
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateMarche(data: unknown): Promise<ActionResult<Marche>> {
  try {
    // 1. Vérification d'authentification et de permissions
    await requireMarcheWrite()

    // 2. Validation avec Zod
    const validatedData = updateMarcheSchema.parse(data)
    const { id, ...updateData } = validatedData

    // 3. Recalcul de dateFinPrevue si nécessaire
    let dateFinPrevue = updateData.dateFinPrevue
    if (updateData.dateOrdreService && updateData.delaiExecution) {
      dateFinPrevue = new Date(
        updateData.dateOrdreService.getTime() +
          updateData.delaiExecution * 24 * 60 * 60 * 1000
      )
    }

    // 4. Mise à jour dans Prisma
    const marche = await prisma.marche.update({
      where: { id },
      data: {
        ...updateData,
        dateFinPrevue,
      },
    })

    // 5. Revalidation du cache
    revalidatePath('/marches')
    revalidatePath(`/marches/${id}`)

    // 6. Retour succès
    return { success: true, data: marche }
  } catch (error) {
    // Gestion des erreurs de permissions
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return { success: false, error: 'Vous devez être connecté pour modifier un marché' }
    }
    if (error instanceof Error && error.message.includes('Non autorisé')) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour modifier un marché',
      }
    }

    // Gestion des erreurs Zod
    if (error instanceof ZodError) {
      const errorMessages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
      return {
        success: false,
        error: `Erreur de validation : ${errorMessages.join(', ')}`,
      }
    }

    // Gestion des erreurs Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return {
          success: false,
          error: 'Marché introuvable',
        }
      }
      if (error.code === 'P2002') {
        return {
          success: false,
          error: 'Un marché avec ce numéro existe déjà',
        }
      }
    }

    // Erreur générique
    console.error('Erreur lors de la modification du marché:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la modification du marché',
    }
  }
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteMarche(id: string): Promise<ActionResult> {
  try {
    // 1. Vérification d'authentification et de permissions (ADMIN ou AVANCE uniquement)
    await requireDelete()

    // 2. Suppression dans Prisma
    await prisma.marche.delete({
      where: { id },
    })

    // 3. Revalidation du cache
    revalidatePath('/marches')

    return { success: true, data: undefined }
  } catch (error) {
    // Gestion des erreurs de permissions
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return { success: false, error: 'Vous devez être connecté pour supprimer un marché' }
    }
    if (error instanceof Error && error.message.includes('Non autorisé')) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour supprimer un marché',
      }
    }

    // Gestion des erreurs Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return {
          success: false,
          error: 'Marché introuvable',
        }
      }
    }

    // Erreur générique
    console.error('Erreur lors de la suppression du marché:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la suppression du marché',
    }
  }
}

// ============================================================================
// READ (Single)
// ============================================================================

export async function getMarcheById(id: string): Promise<Marche | null> {
  try {
    // Vérification d'authentification (lecture accessible à tous les utilisateurs connectés)
    await requireAuth()

    const marche = await prisma.marche.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })
    return marche
  } catch (error) {
    console.error('Erreur lors de la récupération du marché:', error)
    return null
  }
}

// ============================================================================
// READ (Multiple with filters)
// ============================================================================

export interface GetMarchesOptions {
  statut?: StatutMarche
  type?: TypeMarche
  page?: number
  limit?: number
}

export async function getAllMarches(
  options: GetMarchesOptions = {}
): Promise<PaginatedResponse<Marche>> {
  try {
    // Vérification d'authentification (lecture accessible à tous les utilisateurs connectés)
    await requireAuth()

    const { statut, type, page, limit } = options

    // Calcul skip/take pour Prisma
    const { skip, take } = getPrismaSkipTake({ page, limit })

    // Construction des filtres
    const where = {
      ...(statut && { statut }),
      ...(type && { type }),
    }

    // Exécution parallèle : données + count
    const [marches, total] = await Promise.all([
      prisma.marche.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      prisma.marche.count({ where }),
    ])

    // Calcul métadonnées pagination
    const pagination = calculatePagination(total, page, limit)

    return {
      data: marches,
      pagination,
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des marchés:', error)
    // Retour vide en cas d'erreur
    return {
      data: [],
      pagination: calculatePagination(0, 1, options.limit),
    }
  }
}

/**
 * Fonction wrapper pour les composants qui veulent juste un tableau de marchés
 * (sans pagination) - utilisée par Dashboard, Forms, etc.
 */
export async function getAllMarchesArray(
  options: GetMarchesOptions = {}
): Promise<Marche[]> {
  const response = await getAllMarches({ ...options, limit: 10000 });
  return response.data;
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface MarchesStats {
  total: number
  parStatut: Record<StatutMarche, number>
  enCours: number
  montantTotal: number
  montantEnCours: number
}

export async function getMarchesStats(): Promise<ActionResult<MarchesStats>> {
  try {
    // Vérification d'authentification
    await requireAuth()

    // Récupérer tous les marchés pour calculer les stats
    const marches = await prisma.marche.findMany({
      select: {
        statut: true,
        montant: true,
      },
    })

    // Initialiser les compteurs par statut
    const parStatut: Record<StatutMarche, number> = {
      OPPORTUNITE_IDENTIFIEE: 0,
      DOSSIER_EN_PREPARATION: 0,
      OFFRE_DEPOSEE: 0,
      EN_ATTENTE_ATTRIBUTION: 0,
      ATTRIBUE_PROVISOIREMENT: 0,
      ATTRIBUE_DEFINITIVEMENT: 0,
      EN_ATTENTE_LIVRAISON_OS: 0,
      EN_EXECUTION: 0,
      EXECUTE_ATTENTE_GARANTIES: 0,
      CLOTURE: 0,
      RESILIE: 0,
      ANNULE: 0,
      INFRUCTUEUX: 0,
    }

    let montantTotal = 0
    let montantEnCours = 0

    // Statuts considérés comme "en cours"
    const statutsEnCours: StatutMarche[] = [
      'EN_EXECUTION',
      'EN_ATTENTE_LIVRAISON_OS',
      'ATTRIBUE_DEFINITIVEMENT',
    ]

    // Calculer les stats
    marches.forEach((marche) => {
      parStatut[marche.statut]++
      montantTotal += Number(marche.montant || 0)

      if (statutsEnCours.includes(marche.statut)) {
        montantEnCours += Number(marche.montant || 0)
      }
    })

    const stats: MarchesStats = {
      total: marches.length,
      parStatut,
      enCours: statutsEnCours.reduce((sum, statut) => sum + parStatut[statut], 0),
      montantTotal,
      montantEnCours,
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error)
    return {
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
    }
  }
}
