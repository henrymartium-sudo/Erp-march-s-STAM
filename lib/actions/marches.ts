'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { createMarcheSchema, updateMarcheSchema } from '@/lib/validations/marche'
import { requireAuth, requireMarcheWrite, requireDelete } from '@/lib/utils/permissions'
import type { ActionResult } from '@/types'
import type { Marche, TypeMarche, StatutMarche } from '@prisma/client'
import { isTransitionValid } from '@/lib/utils/workflow-statuts'
import { STATUT_LABELS } from '@/lib/utils/statut'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import type { PaginatedResponse } from '@/types/pagination'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'
import { publishEvent } from '@/lib/alertes/engine/publish-event'
import { buildMarcheWhere, type MarcheFilterParams } from '@/lib/utils/filters'
import { ALERT_EVENT_TYPES } from '@/lib/alertes/types'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'

// ============================================================================
// CREATE
// ============================================================================

export async function createMarche(data: unknown): Promise<ActionResult<Marche>> {
  try {
    // 1. Vérification d'authentification et de permissions
    const session = await requireMarcheWrite()

    // 2. Validation avec Zod
    const validatedData = createMarcheSchema.parse(data)

    // 3. Extraction des vehiculeIds avant le spread Prisma
    const { vehiculeIds, ...marcheData } = validatedData

    // 4. Création dans Prisma avec userId
    const marche = await prisma.marche.create({
      data: {
        ...marcheData,
        userId: session.user.id,
        // Calcul de dateFinPrevue si dateOrdreService est fournie
        dateFinPrevue:
          marcheData.dateOrdreService
            ? new Date(
                marcheData.dateOrdreService.getTime() +
                  marcheData.delaiExecution * 24 * 60 * 60 * 1000
              )
            : undefined,
      },
    })

    // 5. Création des associations véhicules
    if (vehiculeIds && vehiculeIds.length > 0) {
      await prisma.marcheVehicule.createMany({
        data: vehiculeIds.map((vehiculeId) => ({
          marcheId: marche.id,
          vehiculeId,
        })),
      })
    }

    // 6. Revalidation du cache Next.js
    revalidatePath('/marches')

    // Audit log
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.MARCHE,
      entityId:   marche.id,
      metadata:   { numero: marche.numero, objet: marche.objet, montant: marche.montant?.toString() },
    })

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
    const session = await requireMarcheWrite()

    // 2. Validation avec Zod
    const validatedData = updateMarcheSchema.parse(data)
    const { id, vehiculeIds, commentaireStatut, ...updateData } = validatedData

    // 3. Validation du workflow de statut
    let ancienStatut: StatutMarche | undefined
    if (updateData.statut) {
      const currentMarche = await prisma.marche.findUnique({
        where: { id },
        select: { statut: true },
      })
      if (currentMarche && currentMarche.statut !== updateData.statut) {
        if (!isTransitionValid(currentMarche.statut, updateData.statut)) {
          return {
            success: false,
            error: `Transition de statut invalide : "${STATUT_LABELS[currentMarche.statut]}" → "${STATUT_LABELS[updateData.statut]}" n'est pas autorisée.`,
          }
        }
        ancienStatut = currentMarche.statut
      }
    }

    // 4. Recalcul de dateFinPrevue si nécessaire
    let dateFinPrevue = updateData.dateFinPrevue
    if (updateData.dateOrdreService && updateData.delaiExecution) {
      dateFinPrevue = new Date(
        updateData.dateOrdreService.getTime() +
          updateData.delaiExecution * 24 * 60 * 60 * 1000
      )
    }

    // 5. Mise à jour dans Prisma
    const marche = await prisma.marche.update({
      where: { id },
      data: {
        ...updateData,
        dateFinPrevue,
      },
    })

    // 6. Mise à jour des associations véhicules (si vehiculeIds fourni)
    if (vehiculeIds !== undefined) {
      await prisma.marcheVehicule.deleteMany({ where: { marcheId: id } })
      if (vehiculeIds.length > 0) {
        await prisma.marcheVehicule.createMany({
          data: vehiculeIds.map((vehiculeId) => ({
            marcheId: id,
            vehiculeId,
          })),
        })
      }
    }

    // 7. Revalidation du cache
    revalidatePath('/marches')
    revalidatePath(`/marches/${id}`)

    // Audit log
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.MARCHE,
      entityId:   marche.id,
      metadata:   { numero: marche.numero, statut: marche.statut },
    })

    // 8. Enregistrer l'historique du statut si changement
    if (ancienStatut && updateData.statut && ancienStatut !== updateData.statut) {
      await prisma.historiqueStatut.create({
        data: {
          marcheId: id,
          ancienStatut,
          nouveauStatut: updateData.statut,
          commentaire: commentaireStatut || null,
          userId: session.user.id,
        },
      })
    }

    // 9. Publier l'événement si le statut a changé
    if (ancienStatut && updateData.statut && ancienStatut !== updateData.statut) {
      await publishEvent(ALERT_EVENT_TYPES.MARCHE_STATUS_CHANGED, 'marches', marche.id, {
        ancienStatut,
        nouveauStatut: marche.statut,
        numero: marche.numero,
        objet: marche.objet,
      })
    }

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
    const session = await requireDelete()

    // 2. Suppression dans Prisma
    await prisma.marche.delete({
      where: { id },
    })

    // 3. Revalidation du cache
    revalidatePath('/marches')

    // Audit log
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.MARCHE,
      entityId:   id,
    })

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
        marcheVehicules: {
          include: {
            vehicule: {
              select: {
                id: true,
                immatriculation: true,
                marque: true,
                modele: true,
                annee: true,
                statut: true,
              },
            },
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

export interface GetMarchesOptions extends MarcheFilterParams {
  page?: number
  limit?: number
  // Compatibilité : accepte aussi les enum directement (pour appels internes)
  statut?: StatutMarche | string
  type?: TypeMarche | string
}

export async function getAllMarches(
  options: GetMarchesOptions = {}
): Promise<PaginatedResponse<Marche>> {
  try {
    // Vérification d'authentification (lecture accessible à tous les utilisateurs connectés)
    await requireAuth()

    const { page, limit, ...filterParams } = options

    // Calcul skip/take pour Prisma
    const { skip, take } = getPrismaSkipTake({ page, limit })

    // Construction des filtres via buildMarcheWhere
    const where = buildMarcheWhere(filterParams as MarcheFilterParams)

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

// ============================================================================
// HISTORIQUE STATUTS
// ============================================================================

export type HistoriqueStatutWithUser = {
  id: string
  marcheId: string
  ancienStatut: StatutMarche
  nouveauStatut: StatutMarche
  commentaire: string | null
  userId: string
  createdAt: Date
  user: { name: string; email: string }
}

export async function getHistoriqueStatuts(marcheId: string): Promise<HistoriqueStatutWithUser[]> {
  try {
    await requireAuth()
    const historique = await prisma.historiqueStatut.findMany({
      where: { marcheId },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return historique as HistoriqueStatutWithUser[]
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error)
    return []
  }
}
