'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import {
  createCautionServerSchema,
  updateCautionServerSchema,
  cautionFiltersSchema,
} from '@/lib/validations/caution'
import { requireAuth, requireMarcheWrite, requireDelete } from '@/lib/utils/permissions'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import type { ActionResult } from '@/types'
import type { Caution, TypeCaution, StatutCaution } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { addDays } from 'date-fns'
import type { PaginatedResponse } from '@/types/pagination'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'
import { ALERTE_CAUTION_SEUILS } from '@/lib/constants/caution'
import type { NiveauAlerte } from '@/lib/utils/caution'
import {
  MESSAGE_TYPE_MARCHE_ISSU_OPPORTUNITE,
  TYPES_CAUTION_MARCHE_ISSU_OPPORTUNITE,
  TYPES_CAUTION_OPPORTUNITE,
  cautionsOpportuniteVisibles,
  typeCautionAutoriseSurMarche,
  typeCautionAutoriseSurOpportunite,
  verdictRattachementMarche,
  verdictRattachementOpportunite,
} from '@/lib/utils/cautions-opportunite'
import { serializeCaution } from '@/lib/utils/serialize'
import type { SerializedCaution } from '@/types/serialized'

// ============================================================================
// TYPES
// ============================================================================

export type CautionWithRelations = Caution & {
  marche: {
    id: string
    numero: string
    objet: string
    montant: Prisma.Decimal
  } | null
}

export type ContexteCautionsMarche = {
  /** Vrai si le marché a une opportunité d'origine (lien dans l'un ou l'autre sens). */
  issuDOpportunite: boolean
  opportunite: { id: string; objet: string } | null
}

/** Origine d'un marché, qui détermine les types de caution qu'il porte ; `null` si le marché n'existe pas. */
async function contexteMarche(marcheId: string): Promise<ContexteCautionsMarche | null> {
  const marche = await prisma.marche.findUnique({
    where: { id: marcheId },
    select: { opportunite: { select: { id: true, objet: true } } },
  })
  if (!marche) return null
  // Les deux chemins de création posent les deux liens ; on lit les deux par prudence pour d'éventuelles données anciennes
  const opportunite =
    marche.opportunite ??
    (await prisma.opportunite.findFirst({ where: { marcheId }, select: { id: true, objet: true } }))
  return { issuDOpportunite: opportunite !== null, opportunite }
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
      const contexte = await contexteMarche(validatedData.marcheId)

      if (!contexte) {
        return {
          success: false,
          error: 'Le marché associé n\'existe pas',
        }
      }
      // Marché issu d'une opportunité : soumission et capacité financière se gèrent depuis l'opportunité
      if (!typeCautionAutoriseSurMarche(validatedData.type, contexte.issuDOpportunite)) {
        return { success: false, error: MESSAGE_TYPE_MARCHE_ISSU_OPPORTUNITE }
      }
    }

    // 3 bis. Rattachement à une opportunité : exclusif avec le marché, types et statut contrôlés côté serveur
    const opportuniteId = validatedData.opportuniteId || undefined
    if (opportuniteId) {
      if (validatedData.marcheId) {
        return {
          success: false,
          error: 'Une caution est rattachée à une opportunité ou à un marché, pas aux deux',
        }
      }
      if (!typeCautionAutoriseSurOpportunite(validatedData.type)) {
        return {
          success: false,
          error: 'Seules la caution de soumission et la caution de capacité financière se créent depuis une opportunité',
        }
      }
      const opportunite = await prisma.opportunite.findUnique({
        where: { id: opportuniteId },
        select: { statut: true },
      })
      if (!opportunite) {
        return { success: false, error: 'L\'opportunité associée n\'existe pas' }
      }
      if (!cautionsOpportuniteVisibles(opportunite.statut)) {
        return {
          success: false,
          error: 'Les cautions se saisissent à partir du statut « Dossier en préparation »',
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
    if (opportuniteId) {
      cautionData.opportuniteId = opportuniteId
    }

    const caution = await prisma.caution.create({
      data: cautionData,
    })

    // 5. Revalidation du cache Next.js
    revalidatePath('/cautions')
    if (validatedData.marcheId && validatedData.marcheId !== '') {
      revalidatePath(`/marches/${validatedData.marcheId}`)
    }
    if (opportuniteId) {
      revalidatePath(`/opportunites/${opportuniteId}`)
    }

    // Audit log
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.CAUTION,
      entityId:   caution.id,
      metadata:   {
        reference: caution.reference,
        type: caution.type,
        montant: caution.montant?.toString(),
        ...(opportuniteId ? { opportuniteId } : {}),
      },
    })

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
    const session = await requireMarcheWrite()

    // 2. Validation avec Zod
    const validatedData = updateCautionServerSchema.parse(data)
    // Le rattachement à une opportunité ne se modifie pas ici ; un lien vide (« ») ne change rien
    const { id, opportuniteId: _opportuniteId, ...fields } = validatedData
    const updateData = { ...fields, marcheId: fields.marcheId || undefined }

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

    // 3 bis. Une caution d'opportunité reste du côté de l'opportunité : pas de marché, types limités
    if (existingCaution.opportuniteId) {
      if (updateData.marcheId) {
        return {
          success: false,
          error: 'Une caution est rattachée à une opportunité ou à un marché, pas aux deux',
        }
      }
      if (updateData.type && !typeCautionAutoriseSurOpportunite(updateData.type)) {
        return {
          success: false,
          error: 'Une caution d\'opportunité est une caution de soumission ou de capacité financière',
        }
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

    // 4 bis. Marché issu d'une opportunité : types limités. Le type d'une caution existante n'est remis en cause
    // que s'il change ou si la caution change de marché (une caution déjà saisie reste modifiable)
    const marcheCibleId = updateData.marcheId ?? existingCaution.marcheId
    const typeFinal = updateData.type ?? existingCaution.type
    if (
      marcheCibleId &&
      (typeFinal !== existingCaution.type || marcheCibleId !== existingCaution.marcheId)
    ) {
      const contexte = await contexteMarche(marcheCibleId)
      if (contexte && !typeCautionAutoriseSurMarche(typeFinal, contexte.issuDOpportunite)) {
        return { success: false, error: MESSAGE_TYPE_MARCHE_ISSU_OPPORTUNITE }
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
    if (caution.opportuniteId) {
      revalidatePath(`/opportunites/${caution.opportuniteId}`)
    }

    // Audit log
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.CAUTION,
      entityId:   caution.id,
      metadata:   { reference: caution.reference, statut: caution.statut },
    })

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
    const session = await requireDelete()

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

    // Audit log
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.CAUTION,
      entityId:   id,
    })

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

/**
 * Traduit un niveau d'alerte en clause Prisma équivalente.
 *
 * Le niveau d'alerte n'est pas stocké en base : il est dérivé de `statut` et
 * `dateEcheance` par getNiveauAlerte() (lib/utils/caution.ts). Les bornes
 * ci-dessous reprennent exactement cette fonction, afin que le filtre serveur
 * renvoie précisément les cautions affichées avec ce niveau :
 *   joursRestants = differenceInDays(dateEcheance, maintenant)
 *   joursRestants <= n  <=>  dateEcheance < maintenant + (n + 1) jours
 */
function buildNiveauAlerteWhere(niveau: NiveauAlerte): Prisma.CautionWhereInput {
  const now = new Date()
  const borne = (jours: number) => addDays(now, jours + 1)

  switch (niveau) {
    // Statut terminal EXPIREE, ou caution active dont l'échéance est atteinte
    case 'EXPIRE':
      return {
        OR: [
          { statut: 'EXPIREE' },
          { statut: 'ACTIVE', dateEcheance: { lt: borne(0) } },
        ],
      }
    case 'CRITIQUE':
      return {
        statut: 'ACTIVE',
        dateEcheance: { gte: borne(0), lt: borne(ALERTE_CAUTION_SEUILS.CRITIQUE) },
      }
    case 'ATTENTION':
      return {
        statut: 'ACTIVE',
        dateEcheance: {
          gte: borne(ALERTE_CAUTION_SEUILS.CRITIQUE),
          lt: borne(ALERTE_CAUTION_SEUILS.ATTENTION),
        },
      }
    case 'INFO':
      return {
        statut: 'ACTIVE',
        dateEcheance: {
          gte: borne(ALERTE_CAUTION_SEUILS.ATTENTION),
          lt: borne(ALERTE_CAUTION_SEUILS.INFO),
        },
      }
    // Aucune alerte : caution soldée (libérée/appelée) ou échéance lointaine
    case 'AUCUN':
      return {
        OR: [
          { statut: { in: ['LIBEREE', 'APPELEE'] } },
          { statut: 'ACTIVE', dateEcheance: { gte: borne(ALERTE_CAUTION_SEUILS.INFO) } },
        ],
      }
  }
}

export async function getCautions(filters?: unknown): Promise<
  ActionResult<PaginatedResponse<CautionWithRelations>>
> {
  try {
    // 1. Vérification d'authentification
    await requireAuth()

    // 2. Validation et extraction des filtres
    let validatedFilters: any = {}
    let page = 1
    let limit: number | undefined

    if (filters) {
      validatedFilters = cautionFiltersSchema.parse(filters)
      page = validatedFilters.page || 1
      limit = validatedFilters.limit
    }

    // Calcul skip/take pour Prisma
    const { skip, take } = getPrismaSkipTake({ page, limit })

    // 3. Construction des filtres Prisma
    const where: Prisma.CautionWhereInput = {}

    if (filters) {

      if (validatedFilters.type) {
        where.type = validatedFilters.type
      }

      if (validatedFilters.statut) {
        where.statut = validatedFilters.statut
      }

      // Niveau d'alerte : condition composée, placée dans AND pour ne pas
      // écraser le OR utilisé par la recherche textuelle.
      if (validatedFilters.niveauAlerte) {
        where.AND = [buildNiveauAlerteWhere(validatedFilters.niveauAlerte)]
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

    // 4. Récupération des cautions avec relations et pagination
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
        skip,
        take,
      }),
      prisma.caution.count({ where }),
    ])

    // 5. Calcul métadonnées pagination
    const pagination = calculatePagination(total, page, limit)

    // 6. Retour succès
    return {
      success: true,
      data: {
        data: cautions,
        pagination,
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

/**
 * Fonction wrapper pour les composants qui veulent juste un tableau de cautions
 * (sans pagination) - utilisée par Dashboard, Alertes, etc.
 */
export async function getCautionsArray(filters?: unknown): Promise<CautionWithRelations[]> {
  const result = await getCautions(filters ? { ...(filters as object), limit: 10000 } : { limit: 10000 });
  return result.success ? result.data.data : [];
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

/**
 * Cautions rattachées à une opportunité (lecture : tous les rôles authentifiés).
 */
export async function getCautionsByOpportunite(
  opportuniteId: string
): Promise<ActionResult<Caution[]>> {
  try {
    await requireAuth()

    const cautions = await prisma.caution.findMany({
      where: { opportuniteId },
      orderBy: { dateEcheance: 'asc' },
    })

    return { success: true, data: cautions }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return {
        success: false,
        error: "Vous devez être connecté pour consulter les cautions d'une opportunité",
      }
    }

    console.error("Erreur lors de la récupération des cautions de l'opportunité:", error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la récupération des cautions',
    }
  }
}

/**
 * Cautions des opportunités liées à un marché (lecture : tous les rôles authentifiés).
 * Le lien existe dans les deux sens (marché → opportunité d'origine, opportunité → marché) ;
 * on lit les deux pour ne rien manquer.
 */
export async function getCautionsOpportuniteByMarche(
  marcheId: string
): Promise<ActionResult<(Caution & { opportunite: { id: string; objet: string } | null })[]>> {
  try {
    await requireAuth()

    const cautions = await prisma.caution.findMany({
      where: {
        opportunite: {
          OR: [{ marcheId }, { marches: { some: { id: marcheId } } }],
        },
      },
      include: { opportunite: { select: { id: true, objet: true } } },
      orderBy: { dateEcheance: 'asc' },
    })

    return { success: true, data: cautions }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return {
        success: false,
        error: "Vous devez être connecté pour consulter les cautions de l'opportunité",
      }
    }

    console.error("Erreur lors de la récupération des cautions de l'opportunité du marché:", error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la récupération des cautions',
    }
  }
}

// ============================================================================
// RATTACHEMENT À UNE OPPORTUNITÉ
// ============================================================================

function erreurRattachement(error: unknown, defaut: string): { success: false; error: string } {
  if (error instanceof Error && error.message.includes('Non authentifié')) {
    return { success: false, error: 'Vous devez être connecté pour modifier une caution' }
  }
  if (error instanceof Error && error.message.includes('Non autorisé')) {
    return { success: false, error: 'Vous n\'avez pas les permissions pour modifier une caution' }
  }
  console.error(defaut, error)
  return { success: false, error: defaut }
}

/**
 * Cautions que l'on peut rattacher à une opportunité : sans lien et d'un type d'avant dépôt.
 */
export async function getCautionsRattachablesOpportunite(): Promise<ActionResult<SerializedCaution[]>> {
  try {
    await requireMarcheWrite()

    const cautions = await prisma.caution.findMany({
      where: {
        marcheId: null,
        opportuniteId: null,
        type: { in: TYPES_CAUTION_OPPORTUNITE },
      },
      orderBy: { dateEcheance: 'asc' },
    })

    return { success: true, data: cautions.map(serializeCaution) }
  } catch (error) {
    return erreurRattachement(error, 'Impossible de charger les cautions disponibles')
  }
}

/**
 * Rattache une caution existante et sans lien à une opportunité.
 */
export async function rattacherCautionOpportunite(
  cautionId: string,
  opportuniteId: string
): Promise<ActionResult<Caution>> {
  try {
    const session = await requireMarcheWrite()

    const caution = await prisma.caution.findUnique({ where: { id: cautionId } })
    if (!caution) {
      return { success: false, error: 'La caution n\'existe pas' }
    }

    const verdict = verdictRattachementOpportunite(caution)
    if (!verdict.ok) {
      return { success: false, error: verdict.error }
    }

    const opportunite = await prisma.opportunite.findUnique({
      where: { id: opportuniteId },
      select: { statut: true },
    })
    if (!opportunite) {
      return { success: false, error: 'L\'opportunité n\'existe pas' }
    }
    if (!cautionsOpportuniteVisibles(opportunite.statut)) {
      return {
        success: false,
        error: 'Les cautions se rattachent à partir du statut « Dossier en préparation »',
      }
    }

    // Conditionnel : si quelqu'un l'a rattachée entre-temps, rien n'est modifié
    const { count } = await prisma.caution.updateMany({
      where: { id: cautionId, marcheId: null, opportuniteId: null },
      data: { opportuniteId },
    })
    if (count === 0) {
      return { success: false, error: 'Cette caution vient d\'être rattachée ailleurs' }
    }

    const rattachee = await prisma.caution.findUniqueOrThrow({ where: { id: cautionId } })

    revalidatePath('/cautions')
    revalidatePath(`/cautions/${cautionId}`)
    revalidatePath(`/opportunites/${opportuniteId}`)

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.CAUTION,
      entityId:   cautionId,
      metadata:   { reference: rattachee.reference, rattachement: 'opportunite', opportuniteId },
    })

    return { success: true, data: rattachee }
  } catch (error) {
    return erreurRattachement(error, 'Une erreur inattendue est survenue lors du rattachement de la caution')
  }
}

/**
 * Détache une caution de son opportunité : elle redevient sans lien, sans être supprimée.
 */
export async function detacherCautionOpportunite(cautionId: string): Promise<ActionResult<Caution>> {
  try {
    const session = await requireMarcheWrite()

    const caution = await prisma.caution.findUnique({ where: { id: cautionId } })
    if (!caution) {
      return { success: false, error: 'La caution n\'existe pas' }
    }
    if (!caution.opportuniteId) {
      return { success: false, error: 'Cette caution n\'est rattachée à aucune opportunité' }
    }

    const { count } = await prisma.caution.updateMany({
      where: { id: cautionId, opportuniteId: caution.opportuniteId },
      data: { opportuniteId: null },
    })
    if (count === 0) {
      return { success: false, error: 'Cette caution vient d\'être modifiée, rechargez la page' }
    }

    const detachee = await prisma.caution.findUniqueOrThrow({ where: { id: cautionId } })

    revalidatePath('/cautions')
    revalidatePath(`/cautions/${cautionId}`)
    revalidatePath(`/opportunites/${caution.opportuniteId}`)

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.CAUTION,
      entityId:   cautionId,
      metadata:   { reference: detachee.reference, detachement: 'opportunite', opportuniteId: caution.opportuniteId },
    })

    return { success: true, data: detachee }
  } catch (error) {
    return erreurRattachement(error, 'Une erreur inattendue est survenue lors du détachement de la caution')
  }
}

// ============================================================================
// CAUTIONS D'UN MARCHÉ : ORIGINE, RATTACHEMENT, DÉTACHEMENT
// ============================================================================

/**
 * Origine du marché (lecture : tous les rôles authentifiés) : détermine les types de caution proposés
 * et le renvoi vers l'opportunité d'origine.
 */
export async function getContexteCautionsMarche(
  marcheId: string
): Promise<ActionResult<ContexteCautionsMarche>> {
  try {
    await requireAuth()

    const contexte = await contexteMarche(marcheId)
    if (!contexte) {
      return { success: false, error: 'Le marché n\'existe pas' }
    }
    return { success: true, data: contexte }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Non authentifié')) {
      return { success: false, error: 'Vous devez être connecté pour consulter les cautions d\'un marché' }
    }
    console.error('Erreur lors de la lecture de l\'origine du marché:', error)
    return { success: false, error: 'Une erreur inattendue est survenue lors de la lecture du marché' }
  }
}

/**
 * Cautions que l'on peut rattacher à un marché : sans lien et d'un type compatible avec son origine.
 */
export async function getCautionsRattachablesMarche(
  marcheId: string
): Promise<ActionResult<SerializedCaution[]>> {
  try {
    await requireMarcheWrite()

    const contexte = await contexteMarche(marcheId)
    if (!contexte) {
      return { success: false, error: 'Le marché n\'existe pas' }
    }

    const cautions = await prisma.caution.findMany({
      where: {
        marcheId: null,
        opportuniteId: null,
        ...(contexte.issuDOpportunite ? { type: { in: TYPES_CAUTION_MARCHE_ISSU_OPPORTUNITE } } : {}),
      },
      orderBy: { dateEcheance: 'asc' },
    })

    return { success: true, data: cautions.map(serializeCaution) }
  } catch (error) {
    return erreurRattachement(error, 'Impossible de charger les cautions disponibles')
  }
}

/**
 * Rattache une caution existante et sans lien à un marché.
 */
export async function rattacherCautionMarche(
  cautionId: string,
  marcheId: string
): Promise<ActionResult<Caution>> {
  try {
    const session = await requireMarcheWrite()

    const caution = await prisma.caution.findUnique({ where: { id: cautionId } })
    if (!caution) {
      return { success: false, error: 'La caution n\'existe pas' }
    }

    const contexte = await contexteMarche(marcheId)
    if (!contexte) {
      return { success: false, error: 'Le marché n\'existe pas' }
    }

    const verdict = verdictRattachementMarche(caution, contexte.issuDOpportunite)
    if (!verdict.ok) {
      return { success: false, error: verdict.error }
    }

    // Conditionnel : si quelqu'un l'a rattachée entre-temps, rien n'est modifié
    const { count } = await prisma.caution.updateMany({
      where: { id: cautionId, marcheId: null, opportuniteId: null },
      data: { marcheId },
    })
    if (count === 0) {
      return { success: false, error: 'Cette caution vient d\'être rattachée ailleurs' }
    }

    const rattachee = await prisma.caution.findUniqueOrThrow({ where: { id: cautionId } })

    revalidatePath('/cautions')
    revalidatePath(`/cautions/${cautionId}`)
    revalidatePath(`/marches/${marcheId}`)

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.CAUTION,
      entityId:   cautionId,
      metadata:   { reference: rattachee.reference, rattachement: 'marche', marcheId },
    })

    return { success: true, data: rattachee }
  } catch (error) {
    return erreurRattachement(error, 'Une erreur inattendue est survenue lors du rattachement de la caution')
  }
}

/**
 * Détache une caution de son marché : elle redevient sans lien, sans être supprimée.
 */
export async function detacherCautionMarche(cautionId: string): Promise<ActionResult<Caution>> {
  try {
    const session = await requireMarcheWrite()

    const caution = await prisma.caution.findUnique({ where: { id: cautionId } })
    if (!caution) {
      return { success: false, error: 'La caution n\'existe pas' }
    }
    if (!caution.marcheId) {
      return { success: false, error: 'Cette caution n\'est rattachée à aucun marché' }
    }

    const { count } = await prisma.caution.updateMany({
      where: { id: cautionId, marcheId: caution.marcheId },
      data: { marcheId: null },
    })
    if (count === 0) {
      return { success: false, error: 'Cette caution vient d\'être modifiée, rechargez la page' }
    }

    const detachee = await prisma.caution.findUniqueOrThrow({ where: { id: cautionId } })

    revalidatePath('/cautions')
    revalidatePath(`/cautions/${cautionId}`)
    revalidatePath(`/marches/${caution.marcheId}`)

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.CAUTION,
      entityId:   cautionId,
      metadata:   { reference: detachee.reference, detachement: 'marche', marcheId: caution.marcheId },
    })

    return { success: true, data: detachee }
  } catch (error) {
    return erreurRattachement(error, 'Une erreur inattendue est survenue lors du détachement de la caution')
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
