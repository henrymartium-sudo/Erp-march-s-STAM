/**
 * Filtres de la liste Opportunités — logique partagée entre la page et les exports,
 * pour que l'export reprenne exactement la vue affichée.
 */

import type { Prisma, StatutOpportunite } from '@prisma/client'

// ============================================================================
// PHASES DU PIPELINE
// ============================================================================

export type OpportunitePhase = 'en-cours' | 'gagnees' | 'perdues' | 'toutes'

export const DEFAULT_PHASE: OpportunitePhase = 'en-cours'

export const PHASE_LABELS: Record<OpportunitePhase, string> = {
  'en-cours': 'En cours',
  gagnees: 'Gagnées',
  perdues: 'Perdues / No-Go',
  toutes: 'Toutes',
}

/** Statuts de chaque phase. Les statuts legacy (IDENTIFIEE, SOUMISE) restent rattachés à leur phase. */
export const PHASE_STATUTS: Record<Exclude<OpportunitePhase, 'toutes'>, StatutOpportunite[]> = {
  'en-cours': [
    'IDENTIFIEE',
    'EN_ANALYSE',
    'GO',
    'DOSSIER_EN_PREPARATION',
    'SOUMISE',
    'OFFRE_SOUMISE',
    'EN_ATTENTE_ATTRIBUTION',
    'ATTRIBUE_PROVISOIREMENT',
  ],
  gagnees: ['GAGNEE'],
  perdues: ['PERDUE', 'NO_GO'],
}

/** Statuts pour lesquels la date limite de dépôt est encore une échéance à tenir. */
export const STATUTS_AVANT_SOUMISSION: StatutOpportunite[] = [
  'IDENTIFIEE',
  'EN_ANALYSE',
  'GO',
  'DOSSIER_EN_PREPARATION',
]

// ============================================================================
// FILTRES
// ============================================================================

export type OpportuniteEcheance = 'a-venir' | '7-jours' | 'depassee'
export type OpportuniteTri = 'echeance' | 'recent' | 'montant'

export const ECHEANCE_LABELS: Record<OpportuniteEcheance, string> = {
  'a-venir': 'À venir',
  '7-jours': 'Dans les 7 jours',
  depassee: 'Dépassée',
}

export const TRI_LABELS: Record<OpportuniteTri, string> = {
  echeance: 'Date limite',
  recent: 'Plus récentes',
  montant: 'Montant',
}

export interface OpportuniteFilters {
  phase?: OpportunitePhase
  statut?: StatutOpportunite
  search?: string
  echeance?: OpportuniteEcheance
  tri?: OpportuniteTri
}

const ALL_STATUTS = new Set<string>([
  ...PHASE_STATUTS['en-cours'],
  ...PHASE_STATUTS.gagnees,
  ...PHASE_STATUTS.perdues,
])

/** Normalise des paramètres d'URL bruts en filtres typés (valeurs inconnues ignorées). */
export function parseOpportuniteFilters(params: Record<string, string | undefined>): OpportuniteFilters {
  const phase = params.phase && params.phase in PHASE_LABELS
    ? (params.phase as OpportunitePhase)
    : DEFAULT_PHASE
  const statut = params.statut && ALL_STATUTS.has(params.statut)
    ? (params.statut as StatutOpportunite)
    : undefined
  const echeance = params.echeance && params.echeance in ECHEANCE_LABELS
    ? (params.echeance as OpportuniteEcheance)
    : undefined
  const tri = params.tri && params.tri in TRI_LABELS
    ? (params.tri as OpportuniteTri)
    : 'echeance'
  const search = params.search?.trim() || undefined

  return { phase, statut, echeance, tri, search }
}

/** Clause `where` Prisma. Un statut précis prime sur la phase. */
export function buildOpportuniteWhere(
  filters: OpportuniteFilters,
  now: Date = new Date()
): Prisma.OpportuniteWhereInput {
  const and: Prisma.OpportuniteWhereInput[] = []

  if (filters.statut) {
    and.push({ statut: filters.statut })
  } else if (filters.phase && filters.phase !== 'toutes') {
    and.push({ statut: { in: PHASE_STATUTS[filters.phase] } })
  }

  if (filters.search) {
    const q = filters.search
    and.push({
      OR: [
        { objet: { contains: q, mode: 'insensitive' } },
        { reference: { contains: q, mode: 'insensitive' } },
        { autoriteContractante: { contains: q, mode: 'insensitive' } },
      ],
    })
  }

  if (filters.echeance === 'depassee') {
    and.push({ dateLimite: { lt: now } })
  } else if (filters.echeance === 'a-venir') {
    and.push({ dateLimite: { gte: now } })
  } else if (filters.echeance === '7-jours') {
    const dans7Jours = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    and.push({ dateLimite: { gte: now, lte: dans7Jours } })
  }

  return and.length > 0 ? { AND: and } : {}
}

/**
 * Ordre de tri Prisma. Les dates/montants absents passent en fin de liste.
 * Tri par date limite : sur des échéances à venir, la plus proche d'abord (urgences en tête) ;
 * sinon la plus récente d'abord, pour ne pas ouvrir la liste sur de vieilles échéances.
 */
export function buildOpportuniteOrderBy(
  tri: OpportuniteTri = 'echeance',
  echeance?: OpportuniteEcheance
): Prisma.OpportuniteOrderByWithRelationInput[] {
  switch (tri) {
    case 'recent':
      return [{ createdAt: 'desc' }]
    case 'montant':
      return [{ montantEstime: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
    case 'echeance':
    default: {
      const sort = echeance === 'a-venir' || echeance === '7-jours' ? 'asc' : 'desc'
      return [{ dateLimite: { sort, nulls: 'last' } }, { createdAt: 'desc' }]
    }
  }
}
