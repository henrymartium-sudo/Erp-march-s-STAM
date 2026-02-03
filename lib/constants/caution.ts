import type { TypeCaution, StatutCaution } from '@prisma/client'

// ============================================================================
// LABELS
// ============================================================================

export const TYPE_CAUTION_LABELS: Record<TypeCaution, string> = {
  PROVISOIRE: 'Provisoire',
  DEFINITIVE: 'Définitive',
  AVANCE: 'Avance',
  RETENUE_GARANTIE: 'Retenue de garantie',
}

export const STATUT_CAUTION_LABELS: Record<StatutCaution, string> = {
  ACTIVE: 'Active',
  EXPIREE: 'Expirée',
  LIBEREE: 'Libérée',
  APPELEE: 'Appelée',
}

// ============================================================================
// COULEURS (pour les badges)
// ============================================================================

export const TYPE_CAUTION_COLORS: Record<
  TypeCaution,
  'blue' | 'green' | 'purple' | 'orange'
> = {
  PROVISOIRE: 'blue',
  DEFINITIVE: 'green',
  AVANCE: 'purple',
  RETENUE_GARANTIE: 'orange',
}

export const STATUT_CAUTION_COLORS: Record<
  StatutCaution,
  'default' | 'destructive' | 'success' | 'warning'
> = {
  ACTIVE: 'success',
  EXPIREE: 'destructive',
  LIBEREE: 'default',
  APPELEE: 'warning',
}

// ============================================================================
// OPTIONS POUR LES SELECTS
// ============================================================================

export const TYPE_CAUTION_OPTIONS = [
  { value: 'PROVISOIRE', label: 'Provisoire' },
  { value: 'DEFINITIVE', label: 'Définitive' },
  { value: 'AVANCE', label: 'Avance' },
  { value: 'RETENUE_GARANTIE', label: 'Retenue de garantie' },
] as const

export const STATUT_CAUTION_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIREE', label: 'Expirée' },
  { value: 'LIBEREE', label: 'Libérée' },
  { value: 'APPELEE', label: 'Appelée' },
] as const

// ============================================================================
// SEUILS D'ALERTE (en jours)
// ============================================================================

export const ALERTE_CAUTION_SEUILS = {
  CRITIQUE: 7, // 7 jours avant échéance
  ATTENTION: 30, // 30 jours avant échéance
  INFO: 60, // 60 jours avant échéance
} as const

// ============================================================================
// RÈGLES MÉTIER
// ============================================================================

// Durées typiques par type de caution (en jours)
export const DUREES_TYPIQUES_CAUTION: Record<TypeCaution, { min: number; max: number }> = {
  PROVISOIRE: { min: 30, max: 180 }, // 1 à 6 mois
  DEFINITIVE: { min: 90, max: 730 }, // 3 mois à 2 ans
  AVANCE: { min: 90, max: 365 }, // 3 mois à 1 an
  RETENUE_GARANTIE: { min: 365, max: 1095 }, // 1 à 3 ans
}

// Pourcentages typiques du montant du marché
export const POURCENTAGES_TYPIQUES_CAUTION: Record<TypeCaution, { min: number; max: number }> = {
  PROVISOIRE: { min: 1, max: 3 }, // 1-3% du montant du marché
  DEFINITIVE: { min: 3, max: 5 }, // 3-5% du montant du marché
  AVANCE: { min: 10, max: 20 }, // 10-20% du montant de l'avance
  RETENUE_GARANTIE: { min: 5, max: 10 }, // 5-10% du montant du marché
}

// ============================================================================
// DESCRIPTIONS
// ============================================================================

export const TYPE_CAUTION_DESCRIPTIONS: Record<TypeCaution, string> = {
  PROVISOIRE:
    'Garantie bancaire exigée lors du dépôt de l\'offre, valable jusqu\'à l\'attribution du marché',
  DEFINITIVE:
    'Garantie bancaire de bonne exécution du marché, remplace la caution provisoire après attribution',
  AVANCE:
    'Garantie bancaire couvrant l\'avance financière accordée par le maître d\'ouvrage',
  RETENUE_GARANTIE:
    'Garantie bancaire permettant de libérer la retenue de garantie prélevée sur les paiements',
}

export const STATUT_CAUTION_DESCRIPTIONS: Record<StatutCaution, string> = {
  ACTIVE: 'La caution est en cours de validité et protège le marché',
  EXPIREE: 'La date d\'échéance est dépassée, la caution n\'est plus valable',
  LIBEREE: 'La caution a été libérée par le maître d\'ouvrage (obligations remplies)',
  APPELEE: 'La caution a été appelée suite à une défaillance contractuelle',
}
