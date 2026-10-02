import type { StatutOpportunite } from '@prisma/client'

/** Statuts de l'opportunité dans lesquels la section « Cautions » est affichée : de la préparation du dossier à l'issue. */
export const STATUTS_CAUTIONS_OPPORTUNITE: StatutOpportunite[] = [
  'DOSSIER_EN_PREPARATION',
  'OFFRE_SOUMISE',
  'SOUMISE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
  'GAGNEE',
  'PERDUE',
]

export function cautionsOpportuniteVisibles(statut: StatutOpportunite): boolean {
  return STATUTS_CAUTIONS_OPPORTUNITE.includes(statut)
}
