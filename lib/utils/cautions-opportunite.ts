import type { StatutOpportunite, TypeCaution } from '@prisma/client'

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

/** Types de caution qu'une opportunité porte : ceux reçus avant le dépôt de l'offre. */
export const TYPES_CAUTION_OPPORTUNITE: TypeCaution[] = ['SOUMISSION', 'CAPACITE_FINANCIERE']

export function typeCautionAutoriseSurOpportunite(type: TypeCaution): boolean {
  return TYPES_CAUTION_OPPORTUNITE.includes(type)
}
