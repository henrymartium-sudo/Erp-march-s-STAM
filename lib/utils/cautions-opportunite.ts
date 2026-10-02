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

/** Types qu'un marché issu d'une opportunité porte : ceux d'après attribution (soumission et capacité financière se gèrent sur l'opportunité). */
export const TYPES_CAUTION_MARCHE_ISSU_OPPORTUNITE: TypeCaution[] = [
  'BONNE_EXECUTION',
  'AVANCE_DEMARRAGE',
  'RETENUE_GARANTIE',
]

export const MESSAGE_TYPE_MARCHE_ISSU_OPPORTUNITE =
  "Ce marché est issu d'une opportunité : les cautions de soumission et de capacité financière se gèrent depuis l'opportunité"

export function typeCautionAutoriseSurMarche(type: TypeCaution, issuDOpportunite: boolean): boolean {
  return !issuDOpportunite || TYPES_CAUTION_MARCHE_ISSU_OPPORTUNITE.includes(type)
}

/** Types à proposer pour un marché ; `undefined` = les cinq (marché sans opportunité d'origine). */
export function typesCautionProposesSurMarche(issuDOpportunite: boolean): TypeCaution[] | undefined {
  return issuDOpportunite ? TYPES_CAUTION_MARCHE_ISSU_OPPORTUNITE : undefined
}

/** Une caution se rattache à un marché si elle est sans lien et d'un type compatible avec l'origine de ce marché. */
export function verdictRattachementMarche(
  caution: { type: TypeCaution; marcheId: string | null; opportuniteId: string | null },
  issuDOpportunite: boolean
): VerdictRattachement {
  if (caution.opportuniteId) {
    return { ok: false, error: 'Cette caution est déjà rattachée à une opportunité' }
  }
  if (caution.marcheId) {
    return { ok: false, error: 'Cette caution est déjà rattachée à un marché' }
  }
  if (!typeCautionAutoriseSurMarche(caution.type, issuDOpportunite)) {
    return { ok: false, error: MESSAGE_TYPE_MARCHE_ISSU_OPPORTUNITE }
  }
  return { ok: true }
}
