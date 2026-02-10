import type { TypeCaution, StatutCaution } from '@prisma/client'

// ============================================================================
// LABELS
// ============================================================================

export const TYPE_CAUTION_LABELS: Record<TypeCaution, string> = {
  SOUMISSION: 'Caution de soumission',
  CAPACITE_FINANCIERE: 'Caution de capacité financière',
  BONNE_EXECUTION: 'Caution de bonne exécution',
  AVANCE_DEMARRAGE: 'Caution d\'avance de démarrage',
  RETENUE_GARANTIE: 'Caution de retenue de garantie',
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
  SOUMISSION: 'blue',
  CAPACITE_FINANCIERE: 'blue', // Bleu également (capacité = garantie financière)
  BONNE_EXECUTION: 'green',
  AVANCE_DEMARRAGE: 'purple',
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
  { value: 'SOUMISSION', label: 'Caution de soumission' },
  { value: 'CAPACITE_FINANCIERE', label: 'Caution de capacité financière' },
  { value: 'BONNE_EXECUTION', label: 'Caution de bonne exécution' },
  { value: 'AVANCE_DEMARRAGE', label: 'Caution d\'avance de démarrage' },
  { value: 'RETENUE_GARANTIE', label: 'Caution de retenue de garantie' },
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
  SOUMISSION: { min: 30, max: 180 }, // 1 à 6 mois
  CAPACITE_FINANCIERE: { min: 90, max: 365 }, // 3 mois à 1 an
  BONNE_EXECUTION: { min: 90, max: 730 }, // 3 mois à 2 ans
  AVANCE_DEMARRAGE: { min: 90, max: 365 }, // 3 mois à 1 an
  RETENUE_GARANTIE: { min: 365, max: 1095 }, // 1 à 3 ans
}

// Pourcentages typiques du montant du marché
export const POURCENTAGES_TYPIQUES_CAUTION: Record<TypeCaution, { min: number; max: number }> = {
  SOUMISSION: { min: 1, max: 3 }, // 1-3% du montant du marché
  CAPACITE_FINANCIERE: { min: 5, max: 15 }, // 5-15% du montant du marché
  BONNE_EXECUTION: { min: 3, max: 5 }, // 3-5% du montant du marché
  AVANCE_DEMARRAGE: { min: 10, max: 20 }, // 10-20% du montant de l'avance
  RETENUE_GARANTIE: { min: 5, max: 10 }, // 5-10% du montant du marché
}

// ============================================================================
// DESCRIPTIONS
// ============================================================================

export const TYPE_CAUTION_DESCRIPTIONS: Record<TypeCaution, string> = {
  SOUMISSION:
    'Garantie bancaire exigée lors du dépôt de l\'offre, valable jusqu\'à l\'attribution du marché',
  CAPACITE_FINANCIERE:
    'Garantie bancaire attestant de la capacité financière de l\'entreprise à exécuter le marché',
  BONNE_EXECUTION:
    'Garantie bancaire de bonne exécution du marché, remplace la caution de soumission après attribution',
  AVANCE_DEMARRAGE:
    'Garantie bancaire couvrant l\'avance financière accordée par le maître d\'ouvrage au démarrage',
  RETENUE_GARANTIE:
    'Garantie bancaire permettant de libérer la retenue de garantie prélevée sur les paiements',
}

export const STATUT_CAUTION_DESCRIPTIONS: Record<StatutCaution, string> = {
  ACTIVE: 'La caution est en cours de validité et protège le marché',
  EXPIREE: 'La date d\'échéance est dépassée, la caution n\'est plus valable',
  LIBEREE: 'La caution a été libérée par le maître d\'ouvrage (obligations remplies)',
  APPELEE: 'La caution a été appelée suite à une défaillance contractuelle',
}
