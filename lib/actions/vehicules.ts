'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import {
  createVehiculeSchema,
  updateVehiculeSchema,
  filterVehiculesSchema,
  type FilterVehiculesInput,
} from '@/lib/validations/vehicule'
import {
  requireAuth,
  requireMarcheWrite,
  requireDelete,
} from '@/lib/utils/permissions'
import type { ActionResult } from '@/types'
import type { Vehicule, StatutVehicule } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import type { PaginatedResponse } from '@/types/pagination'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'

// ============================================================================
// Types pour les résultats de lecture
// ============================================================================

export interface VehiculeWithRelations extends Vehicule {
  marche?: {
    id: string
    numero: string
    objet: string
    statut: string
  } | null
}

// ============================================================================
// CREATE
// ============================================================================

export async function createVehicule(
  data: unknown
): Promise<ActionResult<Vehicule>> {
  try {
    // 1. Vérification d'authentification et de permissions
    const session = await requireMarcheWrite()

    // 2. Validation avec Zod
    const validatedData = createVehiculeSchema.parse(data)

    // 3. Création dans Prisma
    const vehicule = await prisma.vehicule.create({
      data: validatedData,
    })

    // 4. Revalidation du cache Next.js
    revalidatePath('/vehicules')
    if (validatedData.marcheId) {
      revalidatePath(`/marches/${validatedData.marcheId}`)
    }

    // 5. Retour succès
    return { success: true, data: vehicule }
  } catch (error) {
    // Gestion des erreurs de permissions
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return {
        success: false,
        error: 'Vous devez être connecté pour créer un véhicule',
      }
    }
    if (error instanceof Error && error.message.includes('Non autorisé')) {
      return {
        success: false,
        error: "Vous n'avez pas les permissions pour créer un véhicule",
      }
    }

    // Gestion des erreurs Zod
    if (error instanceof ZodError) {
      const errorMessages = error.issues.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      )
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
          error: 'Un véhicule avec cette immatriculation existe déjà',
        }
      }
      if (error.code === 'P2003') {
        return {
          success: false,
          error: 'Le marché associé est introuvable',
        }
      }
    }

    // Erreur générique
    console.error('Erreur lors de la création du véhicule:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la création du véhicule',
    }
  }
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateVehicule(
  data: unknown
): Promise<ActionResult<Vehicule>> {
  try {
    // 1. Vérification d'authentification et de permissions
    await requireMarcheWrite()

    // 2. Validation avec Zod
    const validatedData = updateVehiculeSchema.parse(data)
    const { id, ...updateData } = validatedData as { id: string; [key: string]: unknown }

    if (!id) {
      return {
        success: false,
        error: "L'ID du véhicule est obligatoire",
      }
    }

    // 3. Mise à jour dans Prisma
    const vehicule = await prisma.vehicule.update({
      where: { id },
      data: updateData,
    })

    // 4. Revalidation du cache
    revalidatePath('/vehicules')
    revalidatePath(`/vehicules/${id}`)
    if (vehicule.marcheId) {
      revalidatePath(`/marches/${vehicule.marcheId}`)
    }

    return { success: true, data: vehicule }
  } catch (error) {
    // Gestion des erreurs de permissions
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return {
        success: false,
        error: 'Vous devez être connecté pour modifier un véhicule',
      }
    }
    if (error instanceof Error && error.message.includes('Non autorisé')) {
      return {
        success: false,
        error: "Vous n'avez pas les permissions pour modifier un véhicule",
      }
    }

    // Gestion des erreurs Zod
    if (error instanceof ZodError) {
      const errorMessages = error.issues.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      )
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
          error: 'Véhicule introuvable',
        }
      }
      if (error.code === 'P2002') {
        return {
          success: false,
          error: 'Un véhicule avec cette immatriculation existe déjà',
        }
      }
      if (error.code === 'P2003') {
        return {
          success: false,
          error: 'Le marché associé est introuvable',
        }
      }
    }

    // Erreur générique
    console.error('Erreur lors de la modification du véhicule:', error)
    return {
      success: false,
      error:
        'Une erreur inattendue est survenue lors de la modification du véhicule',
    }
  }
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteVehicule(id: string): Promise<ActionResult> {
  try {
    // 1. Vérification d'authentification et de permissions (ADMIN ou AVANCE uniquement)
    await requireDelete()

    // 2. Récupérer le véhicule pour avoir le marcheId pour revalidation
    const vehicule = await prisma.vehicule.findUnique({
      where: { id },
      select: { marcheId: true },
    })

    // 3. Suppression dans Prisma
    await prisma.vehicule.delete({
      where: { id },
    })

    // 4. Revalidation du cache
    revalidatePath('/vehicules')
    if (vehicule?.marcheId) {
      revalidatePath(`/marches/${vehicule.marcheId}`)
    }

    return { success: true, data: undefined }
  } catch (error) {
    // Gestion des erreurs de permissions
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return {
        success: false,
        error: 'Vous devez être connecté pour supprimer un véhicule',
      }
    }
    if (error instanceof Error && error.message.includes('Non autorisé')) {
      return {
        success: false,
        error: "Vous n'avez pas les permissions pour supprimer un véhicule",
      }
    }

    // Gestion des erreurs Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return {
          success: false,
          error: 'Véhicule introuvable',
        }
      }
    }

    // Erreur générique
    console.error('Erreur lors de la suppression du véhicule:', error)
    return {
      success: false,
      error:
        'Une erreur inattendue est survenue lors de la suppression du véhicule',
    }
  }
}

// ============================================================================
// READ (Single)
// ============================================================================

export async function getVehiculeById(
  id: string
): Promise<VehiculeWithRelations | null> {
  try {
    // Vérification d'authentification (lecture accessible à tous les utilisateurs connectés)
    await requireAuth()

    const vehicule = await prisma.vehicule.findUnique({
      where: { id },
      include: {
        marche: {
          select: {
            id: true,
            numero: true,
            objet: true,
            statut: true,
          },
        },
      },
    })

    return vehicule
  } catch (error) {
    console.error('Erreur lors de la récupération du véhicule:', error)
    return null
  }
}

// ============================================================================
// READ (Multiple with filters and pagination)
// ============================================================================

export async function getVehicules(
  filters: FilterVehiculesInput = {}
): Promise<ActionResult<PaginatedResponse<VehiculeWithRelations>>> {
  try {
    // Vérification d'authentification (lecture accessible à tous les utilisateurs connectés)
    await requireAuth()

    // Validation des filtres
    const validatedFilters = filterVehiculesSchema.parse(filters)
    const {
      search,
      marque,
      statut,
      marcheId,
      annee,
      page,
      limit,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = validatedFilters

    // Calcul skip/take pour Prisma
    const { skip, take } = getPrismaSkipTake({ page, limit })

    // Construction de la clause WHERE
    const where: Prisma.VehiculeWhereInput = {
      ...(search && {
        OR: [
          { immatriculation: { contains: search, mode: 'insensitive' } },
          { marque: { contains: search, mode: 'insensitive' } },
          { modele: { contains: search, mode: 'insensitive' } },
          { bonLivraisonRef: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(marque && { marque: { contains: marque, mode: 'insensitive' } }),
      ...(statut && { statut }),
      ...(marcheId && { marcheId }),
      ...(annee && { annee }),
    }

    // Exécution parallèle : données + count
    const [vehicules, total] = await Promise.all([
      prisma.vehicule.findMany({
        where,
        include: {
          marche: {
            select: {
              id: true,
              numero: true,
              objet: true,
              statut: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take,
      }),
      prisma.vehicule.count({ where }),
    ])

    // Calcul métadonnées pagination
    const pagination = calculatePagination(total, page, limit)

    return {
      success: true,
      data: {
        data: vehicules,
        pagination,
      },
    }
  } catch (error) {
    // Gestion des erreurs de permissions
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return { success: false, error: 'Vous devez être connecté pour consulter les véhicules' }
    }

    // Gestion des erreurs Zod
    if (error instanceof ZodError) {
      const errorMessages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
      return {
        success: false,
        error: `Erreur de validation des filtres : ${errorMessages.join(', ')}`,
      }
    }

    // Erreur générique
    console.error('Erreur lors de la récupération des véhicules:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la récupération des véhicules',
    }
  }
}

/**
 * Fonction wrapper pour les composants qui veulent juste un tableau de véhicules
 * (sans pagination) - utilisée par Dashboard, Forms, etc.
 */
export async function getVehiculesArray(
  filters: FilterVehiculesInput = {}
): Promise<VehiculeWithRelations[]> {
  const result = await getVehicules({ ...filters, limit: 10000 })
  return result.success ? result.data.data : []
}

// ============================================================================
// STATISTIQUES
// ============================================================================

export interface VehiculesStats {
  total: number
  parStatut: Record<StatutVehicule, number>
  livres: number
  enAttenteLivraison: number
  enService: number
}

export async function getVehiculesStats(): Promise<ActionResult<VehiculesStats>> {
  try {
    await requireAuth()

    // Récupérer tous les véhicules pour calculer les stats
    const vehicules = await prisma.vehicule.findMany({
      select: {
        statut: true,
      },
    })

    // Initialiser les compteurs par statut
    const parStatut: Record<StatutVehicule, number> = {
      EN_ATTENTE_LIVRAISON: 0,
      LIVRE: 0,
      RECEPTION_PROVISOIRE: 0,
      RECEPTION_DEFINITIVE: 0,
      GARANTIE: 0,
      HORS_SERVICE: 0,
    }

    // Calculer les stats
    vehicules.forEach((vehicule) => {
      parStatut[vehicule.statut]++
    })

    const stats: VehiculesStats = {
      total: vehicules.length,
      parStatut,
      livres: parStatut.LIVRE,
      enAttenteLivraison: parStatut.EN_ATTENTE_LIVRAISON,
      enService: parStatut.RECEPTION_DEFINITIVE + parStatut.GARANTIE,
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de véhicules:', error)
    return {
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
    }
  }
}

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Récupérer les véhicules associés à un marché
 */
export async function getVehiculesByMarcheId(
  marcheId: string
): Promise<Vehicule[]> {
  try {
    await requireAuth()

    const vehicules = await prisma.vehicule.findMany({
      where: { marcheId },
      orderBy: { createdAt: 'desc' },
    })

    return vehicules
  } catch (error) {
    console.error(
      'Erreur lors de la récupération des véhicules du marché:',
      error
    )
    return []
  }
}

/**
 * Vérifier si une immatriculation existe déjà
 */
export async function checkImmatriculationExists(
  immatriculation: string,
  excludeId?: string
): Promise<boolean> {
  try {
    await requireAuth()

    const count = await prisma.vehicule.count({
      where: {
        immatriculation: {
          equals: immatriculation.toUpperCase(),
          mode: 'insensitive',
        },
        ...(excludeId && { id: { not: excludeId } }),
      },
    })

    return count > 0
  } catch (error) {
    console.error("Erreur lors de la vérification de l'immatriculation:", error)
    return false
  }
}
