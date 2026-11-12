/**
 * Dates du tableau de bord, comparées au jour calendaire UTC (Togo = UTC+0).
 * `aujourdHui` est toujours un paramètre : jamais `new Date()` en dur.
 */

export const JOURS_SEMAINE = 7
export const JOURS_MOIS = 30

export type Horizon = 'retard' | 'semaine' | 'mois'

const MS_JOUR = 24 * 60 * 60 * 1000

function jourUTC(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Jours écoulés depuis `date` (positif si `date` est passée). */
export function joursDepuis(date: Date, aujourdHui: Date): number {
  return Math.round((jourUTC(aujourdHui) - jourUTC(date)) / MS_JOUR)
}

/** Horizon d'une échéance : en retard, dans les 7 jours, dans les 30 jours, ou hors liste. */
export function horizonDe(echeance: Date, aujourdHui: Date): Horizon | null {
  const jours = -joursDepuis(echeance, aujourdHui)
  if (jours < 0) return 'retard'
  if (jours <= JOURS_SEMAINE) return 'semaine'
  if (jours <= JOURS_MOIS) return 'mois'
  return null
}
