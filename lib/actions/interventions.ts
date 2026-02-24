'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import {
  createInterventionSchema,
  updateInterventionStatutSchema,
  updateCommentaireContractuelSchema,
  filterInterventionsSchema,
  type FilterInterventionsInput,
} from '@/lib/validations/intervention'
import {
  requireAuth,
  requireDelete,
  canWriteSAV,
  canWriteCommentaireContractuel,
} from '@/lib/utils/permissions'
import { isTransitionInterventionValid, estSousGarantie } from '@/lib/sav/workflow'
import type { ActionResult } from '@/types'
import type { Intervention } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'
import type { PaginatedResponse } from '@/types/pagination'
import { publishEvent } from '@/lib/alertes/engine/publish-event'
import { ALERT_EVENT_TYPES } from '@/lib/alertes/types'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'

// ============================================================================
// Types
// ============================================================================

export interface InterventionWithVehicule extends Intervention {
  vehicule: {
    id: string
    immatriculation: string
    marque: string
    modele: string
  }
}

// ============================================================================
// CREATE
// ============================================================================

export async function createIntervention(data: unknown): Promise<ActionResult<Intervention>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string }).role
    if (!canWriteSAV(role)) {
      return { success: false, error: "Vous n'avez pas les permissions pour créer une intervention" }
    }

    const validated = createInterventionSchema.parse(data)

    // Détection automatique garantie
    const vehicule = await prisma.vehicule.findUnique({
      where: { id: validated.vehiculeId },
      select: { dateFinGarantie: true },
    })

    const sousGarantie = vehicule?.dateFinGarantie
      ? estSousGarantie(vehicule.dateFinGarantie, validated.signaleAt ?? new Date())
      : validated.sousGarantie

    const intervention = await prisma.intervention.create({
      data: {
        ...validated,
        sousGarantie,
        cout: validated.cout != null ? new Prisma.Decimal(validated.cout) : null,
      },
    })

    revalidatePath('/vehicules')
    revalidatePath(`/vehicules/${validated.vehiculeId}`)
    revalidatePath('/vehicules/sav')

    // Publier l'événement SAV_TICKET_CREATED (fire-and-forget, ne bloque pas)
    await publishEvent(ALERT_EVENT_TYPES.SAV_TICKET_CREATED, 'sav', intervention.id, {
      vehiculeId: intervention.vehiculeId,
      type: intervention.type,
      statut: intervention.statut,
      sousGarantie: intervention.sousGarantie,
    })

    // Audit log
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.INTERVENTION,
      entityId:   intervention.id,
      metadata:   { vehiculeId: intervention.vehiculeId, type: intervention.type },
    })

    return { success: true, data: intervention }
  } catch (error) {
    if (error instanceof ZodError) {
      const msgs = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
      return { success: false, error: `Erreur de validation : ${msgs.join(', ')}` }
    }
    console.error('Erreur création intervention:', error)
    return { success: false, error: "Une erreur inattendue est survenue lors de la création de l'intervention" }
  }
}

// ============================================================================
// UPDATE STATUT
// ============================================================================

export async function updateInterventionStatut(data: unknown): Promise<ActionResult<Intervention>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string }).role
    if (!canWriteSAV(role)) {
      return { success: false, error: "Vous n'avez pas les permissions pour modifier cette intervention" }
    }

    const validated = updateInterventionStatutSchema.parse(data)

    // Récupérer le statut actuel
    const current = await prisma.intervention.findUnique({
      where: { id: validated.id },
      select: { statut: true, vehiculeId: true },
    })

    if (!current) return { success: false, error: 'Intervention introuvable' }

    // Vérifier la transition
    if (!isTransitionInterventionValid(current.statut, validated.statut)) {
      return {
        success: false,
        error: `Transition invalide : ${current.statut} → ${validated.statut}`,
      }
    }

    const intervention = await prisma.intervention.update({
      where: { id: validated.id },
      data: {
        statut: validated.statut,
        immobiliseAt: validated.immobiliseAt ?? undefined,
        resolveAt: validated.resolveAt ?? undefined,
      },
    })

    // Publier l'événement d'escalade si passage à EN_COURS (véhicule immobilisé)
    if (validated.statut === 'EN_COURS' && current.statut !== 'EN_COURS') {
      await publishEvent(ALERT_EVENT_TYPES.SAV_TICKET_ESCALATED, 'sav', intervention.id, {
        vehiculeId: current.vehiculeId,
        ancienStatut: current.statut,
        nouveauStatut: validated.statut,
      })
    }

    // Mettre à jour statutSAV du véhicule selon le nouveau statut
    if (validated.statut === 'EN_COURS') {
      await prisma.vehicule.update({
        where: { id: current.vehiculeId },
        data: { statutSAV: 'IMMOBILISE' },
      })
    } else if (validated.statut === 'RESOLU' || validated.statut === 'CLOS') {
      // Vérifier si d'autres interventions actives existent sur ce véhicule
      const autresEnCours = await prisma.intervention.count({
        where: {
          vehiculeId: current.vehiculeId,
          statut: { in: ['EN_COURS', 'SIGNALE', 'DIAGNOSTIC'] },
          id: { not: validated.id },
        },
      })
      if (autresEnCours === 0) {
        await prisma.vehicule.update({
          where: { id: current.vehiculeId },
          data: { statutSAV: 'EN_SERVICE' },
        })
      }
    }

    revalidatePath(`/vehicules/${current.vehiculeId}`)
    revalidatePath('/vehicules/sav')

    // Audit log
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.INTERVENTION,
      entityId:   intervention.id,
      metadata:   { ancienStatut: current.statut, nouveauStatut: intervention.statut },
    })

    return { success: true, data: intervention }
  } catch (error) {
    if (error instanceof ZodError) {
      const msgs = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
      return { success: false, error: `Erreur de validation : ${msgs.join(', ')}` }
    }
    console.error('Erreur update statut intervention:', error)
    return { success: false, error: "Une erreur inattendue est survenue lors de la mise à jour du statut" }
  }
}

// ============================================================================
// UPDATE COMMENTAIRE CONTRACTUEL (ADMIN/AVANCE seulement)
// ============================================================================

export async function updateCommentaireContractuel(data: unknown): Promise<ActionResult<Intervention>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string }).role
    if (!canWriteCommentaireContractuel(role)) {
      return { success: false, error: "Seuls les rôles ADMIN et AVANCE peuvent ajouter un commentaire contractuel" }
    }

    const validated = updateCommentaireContractuelSchema.parse(data)

    const intervention = await prisma.intervention.update({
      where: { id: validated.id },
      data: { commentaireContractuel: validated.commentaireContractuel },
    })

    revalidatePath('/vehicules/sav')

    return { success: true, data: intervention }
  } catch (error) {
    console.error('Erreur update commentaire:', error)
    return { success: false, error: "Une erreur inattendue est survenue" }
  }
}

// ============================================================================
// DELETE (ADMIN/AVANCE seulement)
// ============================================================================

export async function deleteIntervention(id: string): Promise<ActionResult> {
  try {
    await requireDelete()

    const intervention = await prisma.intervention.findUnique({
      where: { id },
      select: { vehiculeId: true },
    })

    if (!intervention) return { success: false, error: 'Intervention introuvable' }

    await prisma.intervention.delete({ where: { id } })

    revalidatePath(`/vehicules/${intervention.vehiculeId}`)
    revalidatePath('/vehicules/sav')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Erreur suppression intervention:', error)
    return { success: false, error: "Erreur lors de la suppression de l'intervention" }
  }
}

// ============================================================================
// READ — Par véhicule
// ============================================================================

export async function getInterventionsByVehiculeId(
  vehiculeId: string
): Promise<Intervention[]> {
  try {
    await requireAuth()
    return prisma.intervention.findMany({
      where: { vehiculeId },
      orderBy: { signaleAt: 'desc' },
    })
  } catch (error) {
    console.error('Erreur lecture interventions:', error)
    return []
  }
}

// ============================================================================
// READ — Liste globale paginée
// ============================================================================

export async function getInterventionsGlobales(
  filters: FilterInterventionsInput = {}
): Promise<ActionResult<PaginatedResponse<InterventionWithVehicule>>> {
  try {
    await requireAuth()

    const validated = filterInterventionsSchema.parse(filters)
    const { vehiculeId, type, statut, sousGarantie, page, limit } = validated
    const { skip, take } = getPrismaSkipTake({ page, limit })

    const where: Prisma.InterventionWhereInput = {
      ...(vehiculeId && { vehiculeId }),
      ...(type && { type }),
      ...(statut && { statut }),
      ...(sousGarantie !== undefined && { sousGarantie }),
    }

    const [interventions, total] = await Promise.all([
      prisma.intervention.findMany({
        where,
        include: {
          vehicule: {
            select: { id: true, immatriculation: true, marque: true, modele: true },
          },
        },
        orderBy: { signaleAt: 'desc' },
        skip,
        take,
      }),
      prisma.intervention.count({ where }),
    ])

    const pagination = calculatePagination(total, page, limit)

    return {
      success: true,
      data: { data: interventions as InterventionWithVehicule[], pagination },
    }
  } catch (error) {
    console.error('Erreur lecture interventions globales:', error)
    return { success: false, error: 'Erreur lors de la récupération des interventions' }
  }
}
