import type { StatutMarche } from '@prisma/client'
import { isTerminal } from './workflow-statuts'

/**
 * Utilitaire d'indicateurs d'urgence basé sur la date de fin prévue
 */

export type UrgencyLevel = 'green' | 'orange' | 'red' | 'overdue'

export interface UrgencyInfo {
  level: UrgencyLevel
  daysRemaining: number
  label: string
}

/**
 * Calcule le niveau d'urgence selon la date de fin prévue.
 *
 * Règles :
 * - dépassé  → overdue  (slate foncé)
 * - < 15 j   → red      (rouge)
 * - 15–30 j  → orange   (orange)
 * - > 30 j   → green    (vert)
 */
export function getUrgency(deadline: Date): UrgencyInfo {
  const now = new Date()
  const diffMs = deadline.getTime() - now.getTime()
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (daysRemaining < 0) {
    return {
      level: 'overdue',
      daysRemaining,
      label: `Dépassé de ${Math.abs(daysRemaining)} j`,
    }
  }

  if (daysRemaining < 15) {
    return {
      level: 'red',
      daysRemaining,
      label: `${daysRemaining} j restants`,
    }
  }

  if (daysRemaining <= 30) {
    return {
      level: 'orange',
      daysRemaining,
      label: `${daysRemaining} j restants`,
    }
  }

  return {
    level: 'green',
    daysRemaining,
    label: `${daysRemaining} j restants`,
  }
}

/**
 * Urgence d'un marché en tenant compte de son statut.
 * Un marché en statut terminal (CLOTURE, RESILIE, ANNULE, INFRUCTUEUX)
 * n'a plus d'échéance active : aucun badge d'urgence.
 * Même logique que getNiveauAlerte(statut, date) côté cautions.
 */
export function getMarcheUrgency(
  statut: StatutMarche,
  dateFinPrevue: Date | string | null | undefined
): UrgencyInfo | null {
  if (!dateFinPrevue || isTerminal(statut)) return null
  return getUrgency(new Date(dateFinPrevue))
}

/**
 * Classes CSS Tailwind pour chaque niveau d'urgence
 */
export const URGENCY_STYLES: Record<UrgencyLevel, string> = {
  green: 'bg-stam-success-bg text-stam-success border-stam-success/20',
  orange: 'bg-stam-warning-bg text-stam-warning border-stam-warning/20',
  red: 'bg-stam-danger-bg text-stam-danger border-stam-danger/20',
  overdue: 'bg-muted text-muted-foreground border-border',
}
