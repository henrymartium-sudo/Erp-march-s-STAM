import { format, formatDistance, formatRelative } from 'date-fns'
import { fr } from 'date-fns/locale'

// ============================================================================
// FORMATAGE DES MONTANTS
// ============================================================================

/**
 * Formate un montant en dirhams marocains avec séparateurs de milliers
 * @param montant - Le montant à formater (number, string ou Decimal)
 * @returns Le montant formaté avec "DH" (ex: "1 234 567,00 DH")
 */
export function formatMontant(montant: number | string | any): string {
  let montantNum: number

  if (typeof montant === 'string') {
    montantNum = parseFloat(montant)
  } else if (typeof montant === 'number') {
    montantNum = montant
  } else if (montant && typeof montant.toNumber === 'function') {
    // Support pour Prisma Decimal
    montantNum = montant.toNumber()
  } else {
    montantNum = Number(montant)
  }

  if (isNaN(montantNum)) {
    return '0,00 DH'
  }

  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(montantNum)
    .replace('MAD', 'DH')
    .trim()
}

/**
 * Formate un montant sans devise (juste le nombre avec séparateurs)
 * @param montant - Le montant à formater (number, string ou Decimal)
 * @returns Le montant formaté sans devise (ex: "1 234 567,00")
 */
export function formatMontantSansDevise(montant: number | string | any): string {
  let montantNum: number

  if (typeof montant === 'string') {
    montantNum = parseFloat(montant)
  } else if (typeof montant === 'number') {
    montantNum = montant
  } else if (montant && typeof montant.toNumber === 'function') {
    // Support pour Prisma Decimal
    montantNum = montant.toNumber()
  } else {
    montantNum = Number(montant)
  }

  if (isNaN(montantNum)) {
    return '0,00'
  }

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(montantNum)
}

// ============================================================================
// FORMATAGE DES DATES
// ============================================================================

/**
 * Formate une date en format long français
 * @param date - La date à formater
 * @returns Date formatée (ex: "15 janvier 2024")
 */
export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return '-'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return '-'
  }

  return format(dateObj, 'dd MMMM yyyy', { locale: fr })
}

/**
 * Formate une date en format court
 * @param date - La date à formater
 * @returns Date formatée (ex: "15/01/2024")
 */
export function formatDateCourt(date: Date | string | null | undefined): string {
  if (!date) return '-'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return '-'
  }

  return format(dateObj, 'dd/MM/yyyy', { locale: fr })
}

/**
 * Formate une date de manière relative
 * @param date - La date à formater
 * @returns Date relative (ex: "il y a 3 jours", "dans 2 mois")
 */
export function formatDateRelative(date: Date | string | null | undefined): string {
  if (!date) return '-'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return '-'
  }

  return formatDistance(dateObj, new Date(), {
    addSuffix: true,
    locale: fr,
  })
}

/**
 * Formate une date de manière relative avec contexte
 * @param date - La date à formater
 * @returns Date relative contextuelle (ex: "aujourd'hui à 14:30", "hier à 10:00")
 */
export function formatDateRelativeComplete(
  date: Date | string | null | undefined
): string {
  if (!date) return '-'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return '-'
  }

  return formatRelative(dateObj, new Date(), { locale: fr })
}

// ============================================================================
// FORMATAGE DES DÉLAIS
// ============================================================================

/**
 * Formate un délai en jours en format lisible
 * @param jours - Nombre de jours
 * @returns Délai formaté (ex: "90 jours", "1 an", "2 ans et 3 mois")
 */
export function formatDelai(jours: number): string {
  if (jours === 0) return '0 jour'
  if (jours === 1) return '1 jour'

  // Si moins d'un mois
  if (jours < 30) {
    return `${jours} jours`
  }

  // Si moins d'un an
  if (jours < 365) {
    const mois = Math.floor(jours / 30)
    const joursRestants = jours % 30

    if (joursRestants === 0) {
      return mois === 1 ? '1 mois' : `${mois} mois`
    }

    return `${mois} mois et ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`
  }

  // Si un an ou plus
  const ans = Math.floor(jours / 365)
  const joursRestants = jours % 365
  const mois = Math.floor(joursRestants / 30)

  if (joursRestants === 0) {
    return ans === 1 ? '1 an' : `${ans} ans`
  }

  if (mois === 0) {
    return `${ans} an${ans > 1 ? 's' : ''}`
  }

  return `${ans} an${ans > 1 ? 's' : ''} et ${mois} mois`
}
