/**
 * Constantes et labels pour les marchés publics
 * Centralise tous les labels, couleurs et configurations liées aux marchés
 */

import type { TypeMarche, StatutMarche } from '@prisma/client'

// ============================================================================
// LABELS DES TYPES DE MARCHÉS
// ============================================================================

export const TYPE_MARCHE_LABELS: Record<TypeMarche, string> = {
  TRAVAUX: 'Travaux',
  FOURNITURES: 'Fournitures',
  SERVICES: 'Services',
  PRESTATIONS_INTELLECTUELLES: 'Prestations intellectuelles',
} as const

// ============================================================================
// LABELS DES STATUTS
// ============================================================================

export const STATUT_LABELS: Record<StatutMarche, string> = {
  OPPORTUNITE_IDENTIFIEE: 'Opportunité identifiée',
  DOSSIER_EN_PREPARATION: 'Dossier en préparation',
  OFFRE_DEPOSEE: 'Offre déposée',
  EN_ATTENTE_ATTRIBUTION: 'En attente d\'attribution',
  ATTRIBUE_PROVISOIREMENT: 'Attribué provisoirement',
  ATTRIBUE_DEFINITIVEMENT: 'Attribué définitivement',
  EN_ATTENTE_LIVRAISON_OS: 'En attente de livraison / OS',
  EN_EXECUTION: 'En exécution',
  EXECUTE_ATTENTE_GARANTIES: 'Exécuté - en attente garanties',
  CLOTURE: 'Clôturé',
  RESILIE: 'Résilié',
  ANNULE: 'Annulé',
  INFRUCTUEUX: 'Infructueux',
} as const

// ============================================================================
// COULEURS DES STATUTS (pour badges et affichage)
// ============================================================================

export const STATUT_COLORS: Record<
  StatutMarche,
  {
    badge: string // Classes Tailwind pour le badge
    bg: string // Couleur de fond
    border: string // Couleur de bordure
    text: string // Couleur du texte
  }
> = {
  OPPORTUNITE_IDENTIFIEE: {
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    bg: 'bg-blue-50/50',
    border: 'border-blue-200',
    text: 'text-blue-800',
  },
  DOSSIER_EN_PREPARATION: {
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    bg: 'bg-indigo-50/50',
    border: 'border-indigo-200',
    text: 'text-indigo-800',
  },
  OFFRE_DEPOSEE: {
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    bg: 'bg-purple-50/50',
    border: 'border-purple-200',
    text: 'text-purple-800',
  },
  EN_ATTENTE_ATTRIBUTION: {
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    bg: 'bg-yellow-50/50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
  },
  ATTRIBUE_PROVISOIREMENT: {
    badge: 'bg-lime-100 text-lime-800 border-lime-200',
    bg: 'bg-lime-50/50',
    border: 'border-lime-200',
    text: 'text-lime-800',
  },
  ATTRIBUE_DEFINITIVEMENT: {
    badge: 'bg-green-100 text-green-800 border-green-200',
    bg: 'bg-green-50/50',
    border: 'border-green-200',
    text: 'text-green-800',
  },
  EN_ATTENTE_LIVRAISON_OS: {
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
    bg: 'bg-teal-50/50',
    border: 'border-teal-200',
    text: 'text-teal-800',
  },
  EN_EXECUTION: {
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    bg: 'bg-cyan-50/50',
    border: 'border-cyan-200',
    text: 'text-cyan-800',
  },
  EXECUTE_ATTENTE_GARANTIES: {
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
    bg: 'bg-sky-50/50',
    border: 'border-sky-200',
    text: 'text-sky-800',
  },
  CLOTURE: {
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
    bg: 'bg-gray-50/50',
    border: 'border-gray-200',
    text: 'text-gray-800',
  },
  RESILIE: {
    badge: 'bg-red-100 text-red-800 border-red-200',
    bg: 'bg-red-50/50',
    border: 'border-red-200',
    text: 'text-red-800',
  },
  ANNULE: {
    badge: 'bg-gray-100 text-gray-800 border-gray-300',
    bg: 'bg-gray-50/50',
    border: 'border-gray-300',
    text: 'text-gray-800',
  },
  INFRUCTUEUX: {
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    bg: 'bg-orange-50/50',
    border: 'border-orange-200',
    text: 'text-orange-800',
  },
} as const

// ============================================================================
// GROUPES DE STATUTS (pour filtres et affichage)
// ============================================================================

export const STATUTS_ACTIFS: StatutMarche[] = [
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
] as const

export const STATUTS_TERMINES: StatutMarche[] = [
  'RESILIE',
  'ANNULE',
  'INFRUCTUEUX',
] as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Vérifie si un statut est dans la catégorie "Terminés"
 */
export function isStatutTermine(statut: StatutMarche): boolean {
  return STATUTS_TERMINES.includes(statut)
}

/**
 * Vérifie si un statut est dans la catégorie "Actifs"
 */
export function isStatutActif(statut: StatutMarche): boolean {
  return STATUTS_ACTIFS.includes(statut)
}

/**
 * Retourne les classes CSS pour un badge de statut
 */
export function getStatutBadgeClasses(statut: StatutMarche): string {
  return STATUT_COLORS[statut].badge
}

/**
 * Retourne les classes CSS de fond pour une card de statut
 */
export function getStatutCardClasses(statut: StatutMarche): string {
  const colors = STATUT_COLORS[statut]
  return `${colors.bg} ${colors.border}`
}

// ============================================================================
// ALIAS EXPORTS (pour compatibilité avec les composants)
// ============================================================================

/**
 * Alias pour STATUT_LABELS (utilisé dans les composants dashboard)
 */
export const STATUT_MARCHE_LABELS = STATUT_LABELS

/**
 * Couleurs simplifiées pour les graphiques (barres)
 * Mappe chaque statut à une classe Tailwind de couleur de fond
 */
export const STATUT_MARCHE_COLORS: Record<StatutMarche, string> = {
  OPPORTUNITE_IDENTIFIEE: 'bg-blue-500',
  DOSSIER_EN_PREPARATION: 'bg-indigo-500',
  OFFRE_DEPOSEE: 'bg-purple-500',
  EN_ATTENTE_ATTRIBUTION: 'bg-yellow-500',
  ATTRIBUE_PROVISOIREMENT: 'bg-lime-500',
  ATTRIBUE_DEFINITIVEMENT: 'bg-green-500',
  EN_ATTENTE_LIVRAISON_OS: 'bg-teal-500',
  EN_EXECUTION: 'bg-cyan-500',
  EXECUTE_ATTENTE_GARANTIES: 'bg-sky-500',
  CLOTURE: 'bg-gray-500',
  RESILIE: 'bg-red-500',
  ANNULE: 'bg-gray-400',
  INFRUCTUEUX: 'bg-orange-500',
} as const
