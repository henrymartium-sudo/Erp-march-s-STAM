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

export type VerdictRattachement = { ok: true } | { ok: false; error: string }

/** Une caution se rattache à une opportunité si elle est sans lien et d'un type d'avant dépôt. */
export function verdictRattachementOpportunite(caution: {
  type: TypeCaution
  marcheId: string | null
  opportuniteId: string | null
}): VerdictRattachement {
  if (caution.opportuniteId) {
    return { ok: false, error: 'Cette caution est déjà rattachée à une opportunité' }
  }
  if (caution.marcheId) {
    return { ok: false, error: 'Cette caution est déjà rattachée à un marché' }
  }
  if (!typeCautionAutoriseSurOpportunite(caution.type)) {
    return {
      ok: false,
      error: 'Seules la caution de soumission et la caution de capacité financière se rattachent à une opportunité',
    }
  }
  return { ok: true }
}
