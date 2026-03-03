import type { Prisma, StatutMarche, TypeMarche, TypeCaution, StatutCaution } from '@prisma/client'

// ============================================================================
// TYPES — Paramètres de filtre (correspondant aux searchParams URL)
// ============================================================================

export interface MarcheFilterParams {
  statut?: string
  type?: string
  search?: string
  montantMin?: string
  montantMax?: string
  dateCreationDebut?: string
  dateCreationFin?: string
}

export interface CautionFilterParams {
  type?: string
  statut?: string
  niveauAlerte?: string
  search?: string
  montantMin?: string
  montantMax?: string
  dateEcheanceDebut?: string
  dateEcheanceFin?: string
}

// ============================================================================
// HELPERS — Détection des filtres actifs
// ============================================================================

/** Retourne true si au moins un filtre (hors pagination) est actif */
export function hasMarcheFilters(params: MarcheFilterParams): boolean {
  return !!(
    params.statut ||
    params.type ||
    params.search ||
    params.montantMin ||
    params.montantMax ||
    params.dateCreationDebut ||
    params.dateCreationFin
  )
}

export function hasCautionFilters(params: CautionFilterParams): boolean {
  return !!(
    params.type ||
    params.statut ||
    params.niveauAlerte ||
    params.search ||
    params.montantMin ||
    params.montantMax ||
    params.dateEcheanceDebut ||
    params.dateEcheanceFin
  )
}

/** Compte le nombre de filtres actifs (hors recherche textuelle) pour affichage badge */
export function countMarcheActiveFilters(params: MarcheFilterParams): number {
  let count = 0
  if (params.statut) count++
  if (params.type) count++
  if (params.montantMin || params.montantMax) count++
  if (params.dateCreationDebut || params.dateCreationFin) count++
  return count
}

export function countCautionActiveFilters(params: CautionFilterParams): number {
  let count = 0
  if (params.type) count++
  if (params.statut) count++
  if (params.niveauAlerte) count++
  if (params.montantMin || params.montantMax) count++
  if (params.dateEcheanceDebut || params.dateEcheanceFin) count++
  return count
}

// ============================================================================
// BUILDERS — Clauses WHERE Prisma
// ============================================================================

/**
 * Construit la clause WHERE Prisma pour les marchés à partir des params URL.
 * Utilisé dans getAllMarches() et les exports.
 */
export function buildMarcheWhere(params: MarcheFilterParams): Prisma.MarcheWhereInput {
  const where: Prisma.MarcheWhereInput = {}

  if (params.statut) {
    where.statut = params.statut as StatutMarche
  }

  if (params.type) {
    where.type = params.type as TypeMarche
  }

  if (params.search) {
    where.OR = [
      { numero: { contains: params.search, mode: 'insensitive' } },
      { objet: { contains: params.search, mode: 'insensitive' } },
      { autoriteContractanteNom: { contains: params.search, mode: 'insensitive' } },
    ]
  }

  const montantMin = params.montantMin ? parseFloat(params.montantMin) : undefined
  const montantMax = params.montantMax ? parseFloat(params.montantMax) : undefined

  if (montantMin !== undefined || montantMax !== undefined) {
    where.montant = {
      ...(montantMin !== undefined && { gte: montantMin }),
      ...(montantMax !== undefined && { lte: montantMax }),
    }
  }

  if (params.dateCreationDebut || params.dateCreationFin) {
    where.createdAt = {
      ...(params.dateCreationDebut && { gte: new Date(params.dateCreationDebut) }),
      ...(params.dateCreationFin && { lte: new Date(params.dateCreationFin + 'T23:59:59') }),
    }
  }

  return where
}

/**
 * Construit la clause WHERE Prisma pour les cautions à partir des params URL.
 * Utilisé dans getCautions() et les exports.
 */
export function buildCautionWhere(params: CautionFilterParams): Prisma.CautionWhereInput {
  const where: Prisma.CautionWhereInput = {}

  if (params.type) {
    where.type = params.type as TypeCaution
  }

  if (params.statut) {
    where.statut = params.statut as StatutCaution
  }

  if (params.search) {
    where.OR = [
      { reference: { contains: params.search, mode: 'insensitive' } },
      { banqueNom: { contains: params.search, mode: 'insensitive' } },
      { marche: { numero: { contains: params.search, mode: 'insensitive' } } },
      { marche: { objet: { contains: params.search, mode: 'insensitive' } } },
    ]
  }

  const montantMin = params.montantMin ? parseFloat(params.montantMin) : undefined
  const montantMax = params.montantMax ? parseFloat(params.montantMax) : undefined

  if (montantMin !== undefined || montantMax !== undefined) {
    where.montant = {
      ...(montantMin !== undefined && { gte: montantMin }),
      ...(montantMax !== undefined && { lte: montantMax }),
    }
  }

  // Filtre niveau d'alerte (calculé via dateEcheance)
  if (params.niveauAlerte) {
    const now = new Date()
    if (params.niveauAlerte === 'CRITIQUE') {
      // Expire dans 0-7 jours
      const in7days = new Date(now)
      in7days.setDate(in7days.getDate() + 7)
      where.statut = 'ACTIVE'
      where.dateEcheance = { gte: now, lte: in7days }
    } else if (params.niveauAlerte === 'ATTENTION') {
      // Expire dans 8-30 jours
      const in8days = new Date(now)
      in8days.setDate(in8days.getDate() + 8)
      const in30days = new Date(now)
      in30days.setDate(in30days.getDate() + 30)
      where.statut = 'ACTIVE'
      where.dateEcheance = { gte: in8days, lte: in30days }
    }
  }

  if (params.dateEcheanceDebut || params.dateEcheanceFin) {
    where.dateEcheance = {
      ...(params.dateEcheanceDebut && { gte: new Date(params.dateEcheanceDebut) }),
      ...(params.dateEcheanceFin && { lte: new Date(params.dateEcheanceFin + 'T23:59:59') }),
    }
  }

  return where
}

// ============================================================================
// SERIALIZATION — Conversion filtres ↔ JSON (pour sauvegarde)
// ============================================================================

/** Convertit les searchParams URL en objet JSON sérialisable pour SavedFilter.filtres */
export function serializeMarcheFilters(params: MarcheFilterParams): Record<string, string> {
  const result: Record<string, string> = {}
  if (params.statut) result.statut = params.statut
  if (params.type) result.type = params.type
  if (params.search) result.search = params.search
  if (params.montantMin) result.montantMin = params.montantMin
  if (params.montantMax) result.montantMax = params.montantMax
  if (params.dateCreationDebut) result.dateCreationDebut = params.dateCreationDebut
  if (params.dateCreationFin) result.dateCreationFin = params.dateCreationFin
  return result
}

export function serializeCautionFilters(params: CautionFilterParams): Record<string, string> {
  const result: Record<string, string> = {}
  if (params.type) result.type = params.type
  if (params.statut) result.statut = params.statut
  if (params.niveauAlerte) result.niveauAlerte = params.niveauAlerte
  if (params.search) result.search = params.search
  if (params.montantMin) result.montantMin = params.montantMin
  if (params.montantMax) result.montantMax = params.montantMax
  if (params.dateEcheanceDebut) result.dateEcheanceDebut = params.dateEcheanceDebut
  if (params.dateEcheanceFin) result.dateEcheanceFin = params.dateEcheanceFin
  return result
}
