import { StatutOpportunite } from '@prisma/client'

/**
 * Transitions autorisées pour chaque statut d'opportunité.
 * Statuts terminaux : tableau vide (aucune transition possible).
 * IDENTIFIEE et SOUMISE sont des valeurs legacy (Grandfather Clause) — traitées comme terminaux.
 */
const TRANSITIONS_OPPORTUNITE: Record<StatutOpportunite, StatutOpportunite[]> = {
  // Legacy — plus créables, traitées comme terminaux
  IDENTIFIEE:              [],
  SOUMISE:                 [],
  // Workflow actif
  EN_ANALYSE:              ['GO', 'NO_GO'],
  GO:                      ['DOSSIER_EN_PREPARATION', 'NO_GO'],
  NO_GO:                   [],
  DOSSIER_EN_PREPARATION:  ['OFFRE_SOUMISE'],
  OFFRE_SOUMISE:           ['EN_ATTENTE_ATTRIBUTION'],
  EN_ATTENTE_ATTRIBUTION:  ['ATTRIBUE_PROVISOIREMENT', 'PERDUE'],
  ATTRIBUE_PROVISOIREMENT: ['GAGNEE', 'PERDUE'],
  GAGNEE:                  [],
  PERDUE:                  [],
}

export function isTransitionValidOpportunite(
  from: StatutOpportunite,
  to: StatutOpportunite
): boolean {
  if (from === to) return true
  return TRANSITIONS_OPPORTUNITE[from].includes(to)
}

export function getAvailableStatutsOpportunite(
  from: StatutOpportunite
): StatutOpportunite[] {
  return [from, ...TRANSITIONS_OPPORTUNITE[from]]
}

export function isTerminalOpportunite(statut: StatutOpportunite): boolean {
  return TRANSITIONS_OPPORTUNITE[statut].length === 0
}

/**
 * Statuts nécessitant un commentaire obligatoire lors de la transition.
 */
export const COMMENTAIRE_OBLIGATOIRE_OPPORTUNITE: StatutOpportunite[] = [
  'NO_GO',
  'PERDUE',
]

/**
 * Chemin principal (hors terminaux latéraux).
 */
export const CHEMIN_PRINCIPAL_OPPORTUNITE: StatutOpportunite[] = [
  'EN_ANALYSE',
  'GO',
  'DOSSIER_EN_PREPARATION',
  'OFFRE_SOUMISE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
  'GAGNEE',
]

/**
 * Statuts terminaux.
 */
export const TERMINAUX_OPPORTUNITE: StatutOpportunite[] = [
  'NO_GO',
  'PERDUE',
  'GAGNEE',
]
