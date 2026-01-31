'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { createMarcheSchema, updateMarcheSchema } from '@/lib/validations/marche'
import type { ActionResult } from '@/types'
import type { Marche, TypeMarche, StatutMarche } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'

// ============================================================================
// CREATE
// ============================================================================

export async function createMarche(data: unknown): Promise<ActionResult<Marche>> {
  try {
    // 1. Validation avec Zod
    const validatedData = createMarcheSchema.parse(data)

    // 2. Création dans Prisma
    const marche = await prisma.marche.create({
      data: {
        ...validatedData,
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

    // 3. Revalidation du cache Next.js
    revalidatePath('/marches')

    // 4. Retour succès
    return { success: true, data: marche }
  } catch (error) {
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
    // 1. Validation avec Zod
    const validatedData = updateMarcheSchema.parse(data)
    const { id, ...updateData } = validatedData

    // 2. Recalcul de dateFinPrevue si nécessaire
    let dateFinPrevue = updateData.dateFinPrevue
    if (updateData.dateOrdreService && updateData.delaiExecution) {
      dateFinPrevue = new Date(
        updateData.dateOrdreService.getTime() +
          updateData.delaiExecution * 24 * 60 * 60 * 1000
      )
    }

    // 3. Mise à jour dans Prisma
    const marche = await prisma.marche.update({
      where: { id },
      data: {
        ...updateData,
        dateFinPrevue,
      },
    })

    // 4. Revalidation du cache
    revalidatePath('/marches')
    revalidatePath(`/marches/${id}`)

    // 5. Retour succès
    return { success: true, data: marche }
  } catch (error) {
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
    // Suppression dans Prisma
    await prisma.marche.delete({
      where: { id },
    })

    // Revalidation du cache
    revalidatePath('/marches')

    return { success: true, data: undefined }
  } catch (error) {
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
    const marche = await prisma.marche.findUnique({
      where: { id },
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
  limit?: number
  offset?: number
}

export async function getAllMarches(
  options: GetMarchesOptions = {}
): Promise<Marche[]> {
  try {
    const { statut, type, limit, offset } = options

    const marches = await prisma.marche.findMany({
      where: {
        ...(statut && { statut }),
        ...(type && { type }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      ...(limit && { take: limit }),
      ...(offset && { skip: offset }),
    })

    return marches
  } catch (error) {
    console.error('Erreur lors de la récupération des marchés:', error)
    return []
  }
}
