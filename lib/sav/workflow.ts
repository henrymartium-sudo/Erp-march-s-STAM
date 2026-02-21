import type { StatutIntervention } from '@prisma/client'

// ============================================================================
// TRANSITIONS AUTORISÉES
// ============================================================================

const TRANSITIONS: Record<StatutIntervention, StatutIntervention[]> = {
  SIGNALE: ['DIAGNOSTIC', 'CLOS'],       // Peut passer direct en CLOS si résolu immédiatement
  DIAGNOSTIC: ['EN_COURS', 'RESOLU'],
  EN_COURS: ['RESOLU'],
  RESOLU: ['CLOS'],
  CLOS: [],                              // Terminal
}

/**
 * Vérifie si une transition de statut d'intervention est autorisée.
 */
export function isTransitionInterventionValid(
  from: StatutIntervention,
  to: StatutIntervention
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Retourne la liste des statuts accessibles depuis un statut donné.
 */
export function getAvailableStatutsIntervention(
  from: StatutIntervention
): StatutIntervention[] {
  return TRANSITIONS[from] ?? []
}

/**
 * Retourne true si le statut est terminal (aucune transition possible).
 */
export function isStatutInterventionTerminal(statut: StatutIntervention): boolean {
  return TRANSITIONS[statut].length === 0
}

// ============================================================================
// CALCULS MÉTIER
// ============================================================================

/**
 * Calcule la durée d'immobilisation en jours.
 * Retourne null si l'immobilisation n'est pas renseignée ou si le véhicule n'est pas encore sorti.
 */
export function calculerDureeImmobilisation(
  immobiliseAt: Date | string | null,
  resolveAt: Date | string | null
): number | null {
  if (!immobiliseAt) return null
  const debut = new Date(immobiliseAt)
  const fin = resolveAt ? new Date(resolveAt) : new Date()
  const diffMs = fin.getTime() - debut.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

/**
 * Détermine si une intervention est couverte par la garantie.
 * Basé sur la dateFinGarantie du véhicule comparée à la date du signalement.
 *
 * @param dateFinGarantie - Date de fin de garantie du véhicule (null = pas de garantie renseignée)
 * @param dateReference - Date de référence (généralement la date de signalement de l'intervention)
 */
export function estSousGarantie(
  dateFinGarantie: Date | string | null,
  dateReference: Date | string
): boolean {
  if (!dateFinGarantie) return false
  return new Date(dateFinGarantie) > new Date(dateReference)
}
