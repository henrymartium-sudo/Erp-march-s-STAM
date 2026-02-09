import { differenceInDays, formatDistance, isBefore, isAfter, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { TypeCaution, StatutCaution } from '@prisma/client'
import {
  TYPE_CAUTION_LABELS,
  STATUT_CAUTION_LABELS,
  TYPE_CAUTION_COLORS,
  STATUT_CAUTION_COLORS,
  TYPE_CAUTION_DESCRIPTIONS,
  STATUT_CAUTION_DESCRIPTIONS,
  ALERTE_CAUTION_SEUILS,
  DUREES_TYPIQUES_CAUTION,
  POURCENTAGES_TYPIQUES_CAUTION,
} from '@/lib/constants/caution'

// ============================================================================
// LABELS & COULEURS
// ============================================================================

export function getTypeCautionLabel(type: TypeCaution): string {
  return TYPE_CAUTION_LABELS[type]
}

export function getStatutCautionLabel(statut: StatutCaution): string {
  return STATUT_CAUTION_LABELS[statut]
}

export function getTypeCautionColor(type: TypeCaution) {
  return TYPE_CAUTION_COLORS[type]
}

export function getStatutCautionColor(statut: StatutCaution) {
  return STATUT_CAUTION_COLORS[statut]
}

export function getTypeCautionDescription(type: TypeCaution): string {
  return TYPE_CAUTION_DESCRIPTIONS[type]
}

export function getStatutCautionDescription(statut: StatutCaution): string {
  return STATUT_CAUTION_DESCRIPTIONS[statut]
}

// ============================================================================
// CALCULS DE DATES
// ============================================================================

/**
 * Calcule le nombre de jours restants jusqu'à l'échéance
 */
export function getJoursRestants(dateEcheance: Date): number {
  return differenceInDays(dateEcheance, new Date())
}

/**
 * Retourne true si la caution est expirée (date échéance dépassée)
 */
export function isExpired(dateEcheance: Date): boolean {
  return isBefore(dateEcheance, new Date())
}

/**
 * Retourne true si la caution expire bientôt (selon le seuil fourni en jours)
 */
export function isExpiringSoon(dateEcheance: Date, seuil: number = 30): boolean {
  const joursRestants = getJoursRestants(dateEcheance)
  return joursRestants > 0 && joursRestants <= seuil
}

/**
 * Formate la durée restante en français (ex: "dans 15 jours", "il y a 3 jours")
 */
export function formatDureeRestante(dateEcheance: Date): string {
  return formatDistance(dateEcheance, new Date(), {
    addSuffix: true,
    locale: fr,
  })
}

/**
 * Calcule la durée totale de la caution (en jours)
 */
export function getDureeCaution(dateEmission: Date, dateEcheance: Date): number {
  return differenceInDays(dateEcheance, dateEmission)
}

// ============================================================================
// NIVEAU D'ALERTE
// ============================================================================

export type NiveauAlerte = 'AUCUN' | 'INFO' | 'ATTENTION' | 'CRITIQUE' | 'EXPIRE'

/**
 * Détermine le niveau d'alerte selon le statut et la date d'échéance
 */
export function getNiveauAlerte(statut: StatutCaution, dateEcheance: Date): NiveauAlerte {
  // Si déjà expirée, libérée ou appelée, statut terminal
  if (statut === 'EXPIREE') return 'EXPIRE'
  if (statut === 'LIBEREE' || statut === 'APPELEE') return 'AUCUN'

  // Pour les cautions actives, calculer selon jours restants
  const joursRestants = getJoursRestants(dateEcheance)

  if (joursRestants <= 0) return 'EXPIRE'
  if (joursRestants <= ALERTE_CAUTION_SEUILS.CRITIQUE) return 'CRITIQUE'
  if (joursRestants <= ALERTE_CAUTION_SEUILS.ATTENTION) return 'ATTENTION'
  if (joursRestants <= ALERTE_CAUTION_SEUILS.INFO) return 'INFO'

  return 'AUCUN'
}

/**
 * Retourne la couleur associée au niveau d'alerte
 */
export function getCouleurNiveauAlerte(niveau: NiveauAlerte): string {
  switch (niveau) {
    case 'CRITIQUE':
      return 'text-red-600'
    case 'ATTENTION':
      return 'text-orange-600'
    case 'INFO':
      return 'text-yellow-600'
    case 'EXPIRE':
      return 'text-red-800'
    case 'AUCUN':
    default:
      return 'text-gray-600'
  }
}

/**
 * Retourne le message d'alerte selon le niveau
 */
export function getMessageAlerte(niveau: NiveauAlerte, joursRestants: number): string {
  switch (niveau) {
    case 'CRITIQUE':
      return `⚠️ Échéance dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''} !`
    case 'ATTENTION':
      return `⚡ Échéance dans ${joursRestants} jours`
    case 'INFO':
      return `ℹ️ Échéance dans ${joursRestants} jours`
    case 'EXPIRE':
      return '❌ Caution expirée'
    case 'AUCUN':
    default:
      return '✅ Caution valide'
  }
}

// ============================================================================
// VALIDATION MÉTIER
// ============================================================================

/**
 * Vérifie si la durée de la caution est cohérente avec son type
 */
export function isDureeCoherente(
  type: TypeCaution,
  dateEmission: Date,
  dateEcheance: Date
): boolean {
  const duree = getDureeCaution(dateEmission, dateEcheance)
  const { min, max } = DUREES_TYPIQUES_CAUTION[type]
  return duree >= min && duree <= max
}

/**
 * Vérifie si le montant de la caution est cohérent avec le montant du marché
 */
export function isMontantCoherent(
  type: TypeCaution,
  montantCaution: number,
  montantMarche: number
): boolean {
  const pourcentage = (montantCaution / montantMarche) * 100
  const { min, max } = POURCENTAGES_TYPIQUES_CAUTION[type]
  return pourcentage >= min && pourcentage <= max
}

/**
 * Calcule le montant suggéré de caution selon le type et le montant du marché
 */
export function getMontantSuggere(type: TypeCaution, montantMarche: number): number {
  const { min, max } = POURCENTAGES_TYPIQUES_CAUTION[type]
  const pourcentageMoyen = (min + max) / 2
  return (montantMarche * pourcentageMoyen) / 100
}

/**
 * Calcule la date d'échéance suggérée selon le type de caution
 */
export function getDateEcheanceSuggeree(type: TypeCaution, dateEmission: Date): Date {
  const { min, max } = DUREES_TYPIQUES_CAUTION[type]
  const dureeMoyenne = Math.round((min + max) / 2)
  return addDays(dateEmission, dureeMoyenne)
}

// ============================================================================
// FORMATAGE
// ============================================================================

/**
 * Formate un montant en euros
 */
export function formatMontant(montant: number | string): string {
  const num = typeof montant === 'string' ? parseFloat(montant) : montant
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(num)
}

/**
 * Formate une date en français
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

/**
 * Formate une date courte (DD/MM/YYYY)
 */
export function formatDateCourte(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

// ============================================================================
// TRI & FILTRAGE
// ============================================================================

/**
 * Compare deux cautions pour tri par date d'échéance (plus proche en premier)
 */
export function comparerParEcheance(
  a: { dateEcheance: Date },
  b: { dateEcheance: Date }
): number {
  return a.dateEcheance.getTime() - b.dateEcheance.getTime()
}

/**
 * Compare deux cautions pour tri par montant (décroissant)
 */
export function comparerParMontant(
  a: { montant: number | { toNumber: () => number } },
  b: { montant: number | { toNumber: () => number } }
): number {
  const montantA = typeof a.montant === 'number'
    ? a.montant
    : (a.montant && typeof a.montant.toNumber === 'function' ? a.montant.toNumber() : 0)
  const montantB = typeof b.montant === 'number'
    ? b.montant
    : (b.montant && typeof b.montant.toNumber === 'function' ? b.montant.toNumber() : 0)
  return montantB - montantA
}
