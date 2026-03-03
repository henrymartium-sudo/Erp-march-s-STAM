import { StatutMarche } from '@prisma/client'

/**
 * Transitions autorisées pour chaque statut.
 * Statuts terminaux : tableau vide (aucune transition possible).
 */
const TRANSITIONS: Record<StatutMarche, StatutMarche[]> = {
  OPPORTUNITE_IDENTIFIEE:   ['DOSSIER_EN_PREPARATION', 'ANNULE'],
  DOSSIER_EN_PREPARATION:   ['OFFRE_DEPOSEE', 'ANNULE'],
  OFFRE_DEPOSEE:            ['EN_ATTENTE_ATTRIBUTION', 'INFRUCTUEUX', 'ANNULE'],
  EN_ATTENTE_ATTRIBUTION:   ['ATTRIBUE_PROVISOIREMENT', 'INFRUCTUEUX', 'ANNULE'],
  ATTRIBUE_PROVISOIREMENT:  ['ATTRIBUE_DEFINITIVEMENT', 'ANNULE'],
  ATTRIBUE_DEFINITIVEMENT:  ['EN_ATTENTE_LIVRAISON_OS', 'ANNULE'],
  EN_ATTENTE_LIVRAISON_OS:  ['EN_EXECUTION', 'ANNULE'],
  EN_EXECUTION:             ['EXECUTE_ATTENTE_GARANTIES', 'RESILIE', 'ANNULE'],
  EXECUTE_ATTENTE_GARANTIES:['CLOTURE'],
  // Terminaux
  CLOTURE:                  [],
  INFRUCTUEUX:              [],
  ANNULE:                   [],
  RESILIE:                  [],
}

/**
 * Retourne true si la transition de `from` vers `to` est autorisée.
 * Un statut identique (pas de changement) est toujours valide.
 */
export function isTransitionValid(from: StatutMarche, to: StatutMarche): boolean {
  if (from === to) return true
  return TRANSITIONS[from].includes(to)
}

/**
 * Retourne les statuts accessibles depuis un statut donné,
 * incluant le statut actuel (pour pouvoir le conserver).
 */
export function getAvailableStatuts(from: StatutMarche): StatutMarche[] {
  return [from, ...TRANSITIONS[from]]
}

/**
 * Retourne true si le statut est terminal (aucune transition possible).
 */
export function isTerminal(statut: StatutMarche): boolean {
  return TRANSITIONS[statut].length === 0
}

/**
 * Statuts nécessitant un commentaire obligatoire lors de la transition.
 */
export const COMMENTAIRE_OBLIGATOIRE: StatutMarche[] = [
  'RESILIE',
  'ANNULE',
  'INFRUCTUEUX',
  'CLOTURE',
]

/**
 * Séquence du chemin principal (hors terminaux latéraux).
 */
export const CHEMIN_PRINCIPAL: StatutMarche[] = [
  'OPPORTUNITE_IDENTIFIEE',
  'DOSSIER_EN_PREPARATION',
  'OFFRE_DEPOSEE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
  'ATTRIBUE_DEFINITIVEMENT',
  'EN_ATTENTE_LIVRAISON_OS',
  'EN_EXECUTION',
  'EXECUTE_ATTENTE_GARANTIES',
  'CLOTURE',
]

/**
 * Statuts terminaux "latéraux" (branches hors chemin principal).
 */
export const TERMINAUX_LATERAUX: StatutMarche[] = [
  'RESILIE',
  'ANNULE',
  'INFRUCTUEUX',
]
