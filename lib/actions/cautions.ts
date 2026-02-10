'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import {
  createCautionServerSchema,
  updateCautionServerSchema,
  cautionFiltersSchema,
} from '@/lib/validations/caution'
import { requireAuth, requireMarcheWrite, requireDelete } from '@/lib/utils/permissions'
import type { ActionResult } from '@/types'
import type { Caution, TypeCaution, StatutCaution } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'

// ============================================================================
// TYPES
// ============================================================================

export type CautionWithRelations = Caution & {
  marche: {
    id: string
    numero: string
    objet: string
    montant: Prisma.Decimal
  }
}

// ============================================================================
// CREATE
// ============================================================================

export async function createCaution(data: unknown): Promise<ActionResult<Caution>> {
  try {
    // 1. Vérification d'authentification et de permissions
    const session = await requireMarcheWrite()

    // 2. Validation avec Zod
    const validatedData = createCautionServerSchema.parse(data)

    // 3. Vérification que le marché existe (si marcheId est fourni)
    if (validatedData.marcheId && validatedData.marcheId !== '') {
      const marche = await prisma.marche.findUnique({
        where: { id: validatedData.marcheId },
      })

      if (!marche) {
        return {
          success: false,
          error: 'Le marché associé n\'existe pas',
        }
      }
    }

    // 4. Création dans Prisma avec userId
    // Si marcheId est vide, on ne l'envoie pas à Prisma (undefined)
    const cautionData: any = {
      reference: validatedData.reference,
      type: validatedData.type,
      montant: validatedData.montant,
      dateEmission: validatedData.dateEmission,
      dateEcheance: validatedData.dateEcheance,
      statut: validatedData.statut,
      banqueNom: validatedData.banqueNom,
      banqueContact: validatedData.banqueContact,
      userId: session.user.id,
    }

    // N'ajouter marcheId que s'il est fourni
    if (validatedData.marcheId && validatedData.marcheId !== '') {
      cautionData.marcheId = validatedData.marcheId
    }

    const caution = await prisma.caution.create({
      data: cautionData,
    })

    // 5. Revalidation du cache Next.js
    revalidatePath('/cautions')
    if (validatedData.marcheId && validatedData.marcheId !== '') {
      revalidatePath(`/marches/${validatedData.marcheId}`)
    }

    // 6. Retour succès
    return { success: true, data: caution }
  } catch (error) {
    // Gestion des erreurs de permissions
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return { success: false, error: 'Vous devez être connecté pour créer une caution' }
    }
    if (error instanceof Error && error.message.includes('Non autorisé')) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour créer une caution',
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
          error: 'Une caution avec cette référence existe déjà',
        }
      }
      if (error.code === 'P2003') {
        return {
          success: false,
          error: 'Le marché associé n\'existe pas',
        }
      }
    }

    // Erreur générique
    console.error('Erreur lors de la création de la caution:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la création de la caution',
    }
  }
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateCaution(data: unknown): Promise<ActionResult<Caution>> {
  try {
    // 1. Vérification d'authentification et de permissions
    await requireMarcheWrite()

    // 2. Validation avec Zod
    const validatedData = updateCautionServerSchema.parse(data)
    const { id, ...updateData } = validatedData

    // 3. Vérification que la caution existe
    const existingCaution = await prisma.caution.findUnique({
      where: { id },
    })

    if (!existingCaution) {
      return {
        success: false,
        error: 'La caution n\'existe pas',
      }
    }

    // 4. Si marcheId est modifié, vérifier que le nouveau marché existe
    if (updateData.marcheId && updateData.marcheId !== existingCaution.marcheId) {
      const marche = await prisma.marche.findUnique({
        where: { id: updateData.marcheId },
      })

      if (!marche) {
        return {
          success: false,
          error: 'Le marché associé n\'existe pas',
        }
      }
    }

    // 5. Mise à jour dans Prisma
    const caution = await prisma.caution.update({
      where: { id },
      data: updateData,
    })

    // 6. Revalidation du cache Next.js
    revalidatePath('/cautions')
    revalidatePath(`/cautions/${id}`)
    revalidatePath(`/marches/${caution.marcheId}`)
    if (existingCaution.marcheId !== caution.marcheId) {
      revalidatePath(`/marches/${existingCaution.marcheId}`)
    }

    // 7. Retour succès
    return { success: true, data: caution }
  } catch (error) {
    // Gestion des erreurs de permissions
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return { success: false, error: 'Vous devez être connecté pour modifier une caution' }
    }
    if (error instanceof Error && error.message.includes('Non autorisé')) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour modifier une caution',
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
          error: 'Une caution avec cette référence existe déjà',
        }
      }
      if (error.code === 'P2025') {
        return {
          success: false,
          error: 'La caution n\'existe pas',
        }
      }
    }

    // Erreur générique
    console.error('Erreur lors de la modification de la caution:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la modification de la caution',
    }
  }
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteCaution(id: string): Promise<ActionResult<Caution>> {
  try {
    // 1. Vérification d'authentification et de permissions
    await requireDelete()

    // 2. Vérification que la caution existe
    const existingCaution = await prisma.caution.findUnique({
      where: { id },
    })

    if (!existingCaution) {
      return {
        success: false,
        error: 'La caution n\'existe pas',
      }
    }

    // 3. Suppression dans Prisma
    const caution = await prisma.caution.delete({
      where: { id },
    })

    // 4. Revalidation du cache Next.js
    revalidatePath('/cautions')
    revalidatePath(`/marches/${caution.marcheId}`)

    // 5. Retour succès
    return { success: true, data: caution }
  } catch (error) {
    // Gestion des erreurs de permissions
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return { success: false, error: 'Vous devez être connecté pour supprimer une caution' }
    }
    if (error instanceof Error && error.message.includes('Non autorisé')) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour supprimer une caution',
      }
    }

    // Gestion des erreurs Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return {
          success: false,
          error: 'La caution n\'existe pas',
        }
      }
    }

    // Erreur générique
    console.error('Erreur lors de la suppression de la caution:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la suppression de la caution',
    }
  }
}

// ============================================================================
// GET (Single)
// ============================================================================

export async function getCaution(id: string): Promise<ActionResult<CautionWithRelations>> {
  try {
    // 1. Vérification d'authentification
    await requireAuth()

    // 2. Récupération avec relations
    const caution = await prisma.caution.findUnique({
      where: { id },
      include: {
        marche: {
          select: {
            id: true,
            numero: true,
            objet: true,
            montant: true,
          },
        },
      },
    })

    // 3. Vérification existence
    if (!caution) {
      return {
        success: false,
        error: 'La caution n\'existe pas',
      }
    }

    // 4. Retour succès
    return { success: true, data: caution }
  } catch (error) {
    // Gestion des erreurs de permissions
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return { success: false, error: 'Vous devez être connecté pour consulter une caution' }
    }

    // Erreur générique
    console.error('Erreur lors de la récupération de la caution:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la récupération de la caution',
    }
  }
}

// ============================================================================
// GET ALL (avec filtres et pagination)
// ============================================================================

export async function getCautions(filters?: unknown): Promise<
  ActionResult<{
    cautions: CautionWithRelations[]
    total: number
  }>
> {
  try {
    // 1. Vérification d'authentification
    await requireAuth()

    // 2. Construction des filtres Prisma
    const where: Prisma.CautionWhereInput = {}

    if (filters) {
      const validatedFilters = cautionFiltersSchema.parse(filters)

      if (validatedFilters.type) {
        where.type = validatedFilters.type
      }

      if (validatedFilters.statut) {
        where.statut = validatedFilters.statut
      }

      if (validatedFilters.marcheId) {
        where.marcheId = validatedFilters.marcheId
      }

      if (validatedFilters.dateEmissionDebut || validatedFilters.dateEmissionFin) {
        where.dateEmission = {}
        if (validatedFilters.dateEmissionDebut) {
          where.dateEmission.gte = validatedFilters.dateEmissionDebut
        }
        if (validatedFilters.dateEmissionFin) {
          where.dateEmission.lte = validatedFilters.dateEmissionFin
        }
      }

      if (validatedFilters.dateEcheanceDebut || validatedFilters.dateEcheanceFin) {
        where.dateEcheance = {}
        if (validatedFilters.dateEcheanceDebut) {
          where.dateEcheance.gte = validatedFilters.dateEcheanceDebut
        }
        if (validatedFilters.dateEcheanceFin) {
          where.dateEcheance.lte = validatedFilters.dateEcheanceFin
        }
      }

      if (validatedFilters.search) {
        where.OR = [
          { reference: { contains: validatedFilters.search, mode: 'insensitive' } },
          { banqueNom: { contains: validatedFilters.search, mode: 'insensitive' } },
          { marche: { numero: { contains: validatedFilters.search, mode: 'insensitive' } } },
          { marche: { objet: { contains: validatedFilters.search, mode: 'insensitive' } } },
        ]
      }
    }

    // 3. Récupération des cautions avec relations
    const [cautions, total] = await Promise.all([
      prisma.caution.findMany({
        where,
        include: {
          marche: {
            select: {
              id: true,
              numero: true,
              objet: true,
              montant: true,
            },
          },
        },
        orderBy: {
          dateEcheance: 'asc', // Tri par date d'échéance (plus proche en premier)
        },
      }),
      prisma.caution.count({ where }),
    ])

    // 4. Retour succès
    return {
      success: true,
      data: {
        cautions,
        total,
      },
    }
  } catch (error) {
    // Gestion des erreurs de permissions
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return { success: false, error: 'Vous devez être connecté pour consulter les cautions' }
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
    console.error('Erreur lors de la récupération des cautions:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la récupération des cautions',
    }
  }
}

// ============================================================================
// GET CAUTIONS PAR MARCHÉ
// ============================================================================

export async function getCautionsByMarche(
  marcheId: string
): Promise<ActionResult<CautionWithRelations[]>> {
  try {
    // 1. Vérification d'authentification
    await requireAuth()

    // 2. Récupération des cautions du marché
    const cautions = await prisma.caution.findMany({
      where: { marcheId },
      include: {
        marche: {
          select: {
            id: true,
            numero: true,
            objet: true,
            montant: true,
          },
        },
      },
      orderBy: {
        dateEcheance: 'asc',
      },
    })

    // 3. Retour succès
    return { success: true, data: cautions }
  } catch (error) {
    // Gestion des erreurs de permissions
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return {
        success: false,
        error: 'Vous devez être connecté pour consulter les cautions d\'un marché',
      }
    }

    // Erreur générique
    console.error('Erreur lors de la récupération des cautions du marché:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la récupération des cautions',
    }
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface CautionsStats {
  total: number
  actives: number
  expirees: number
  aVenir: number
  montantTotal: number
  montantActif: number
  parType: Record<TypeCaution, number>
  prochesEcheance: number // Cautions expirant dans moins de 30 jours
}

export async function getCautionsStats(): Promise<ActionResult<CautionsStats>> {
  try {
    // Vérification d'authentification
    await requireAuth()

    // Récupérer toutes les cautions
    const cautions = await prisma.caution.findMany({
      select: {
        type: true,
        statut: true,
        montant: true,
        dateEmission: true,
        dateEcheance: true,
      },
    })

    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Initialiser les compteurs par type
    const parType: Record<TypeCaution, number> = {
      SOUMISSION: 0,
      CAPACITE_FINANCIERE: 0,
      BONNE_EXECUTION: 0,
      AVANCE_DEMARRAGE: 0,
      RETENUE_GARANTIE: 0,
    }

    let actives = 0
    let expirees = 0
    let aVenir = 0
    let montantTotal = 0
    let montantActif = 0
    let prochesEcheance = 0

    // Calculer les stats
    cautions.forEach((caution) => {
      parType[caution.type]++
      montantTotal += Number(caution.montant)

      const echeance = caution.dateEcheance

      // Caution active = statut ACTIVE
      if (caution.statut === 'ACTIVE') {
        actives++
        montantActif += Number(caution.montant)

        // Proche échéance = expire dans moins de 30 jours
        if (echeance <= in30Days && echeance > now) {
          prochesEcheance++
        }
      } else if (caution.statut === 'EXPIREE') {
        expirees++
      }

      // À venir = date d'émission future
      if (caution.dateEmission > now) {
        aVenir++
      }
    })

    const stats: CautionsStats = {
      total: cautions.length,
      actives,
      expirees,
      aVenir,
      montantTotal,
      montantActif,
      parType,
      prochesEcheance,
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de cautions:', error)
    return {
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
    }
  }
}
