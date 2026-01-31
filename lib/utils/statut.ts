import { StatutMarche } from '@prisma/client'

// ============================================================================
// LABELS FRANÇAIS POUR LES STATUTS
// ============================================================================

export const STATUT_LABELS: Record<StatutMarche, string> = {
  OPPORTUNITE_IDENTIFIEE: 'Opportunité identifiée',
  DOSSIER_EN_PREPARATION: 'Dossier en préparation',
  OFFRE_DEPOSEE: 'Offre déposée',
  EN_ATTENTE_ATTRIBUTION: 'En attente d\'attribution',
  ATTRIBUE_PROVISOIREMENT: 'Attribué provisoirement',
  ATTRIBUE_DEFINITIVEMENT: 'Attribué définitivement',
  EN_ATTENTE_LIVRAISON_OS: 'En attente livraison/OS',
  EN_EXECUTION: 'En exécution',
  EXECUTE_ATTENTE_GARANTIES: 'Exécuté - Attente garanties',
  CLOTURE: 'Clôturé',
  RESILIE_ANNULE_INFRUCTUEUX: 'Résilié/Annulé/Infructueux',
}

// ============================================================================
// COULEURS TAILWIND POUR LES BADGES DE STATUT
// ============================================================================

export const STATUT_COLORS: Record<StatutMarche, string> = {
  OPPORTUNITE_IDENTIFIEE: 'bg-blue-100 text-blue-800 border-blue-200',
  DOSSIER_EN_PREPARATION: 'bg-purple-100 text-purple-800 border-purple-200',
  OFFRE_DEPOSEE: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  EN_ATTENTE_ATTRIBUTION: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ATTRIBUE_PROVISOIREMENT: 'bg-orange-100 text-orange-800 border-orange-200',
  ATTRIBUE_DEFINITIVEMENT: 'bg-green-100 text-green-800 border-green-200',
  EN_ATTENTE_LIVRAISON_OS: 'bg-teal-100 text-teal-800 border-teal-200',
  EN_EXECUTION: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  EXECUTE_ATTENTE_GARANTIES: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CLOTURE: 'bg-gray-100 text-gray-800 border-gray-200',
  RESILIE_ANNULE_INFRUCTUEUX: 'bg-red-100 text-red-800 border-red-200',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getStatutLabel(statut: StatutMarche): string {
  return STATUT_LABELS[statut] || statut
}

export function getStatutColor(statut: StatutMarche): string {
  return STATUT_COLORS[statut] || 'bg-gray-100 text-gray-800 border-gray-200'
}
