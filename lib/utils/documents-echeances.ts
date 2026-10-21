/** Seuil (en jours) à partir duquel une échéance de validité est signalée « bientôt ». */
export const JOURS_ALERTE_VALIDITE = 30

const JOUR_MS = 24 * 60 * 60 * 1000

export type StatutValidite = 'expire' | 'bientot' | 'ok' | 'aucune'

/** Début du jour (UTC) de `aujourdhui` et dernière milliseconde du jour J+30. */
export function bornesEcheance(aujourdhui: Date): { debutJour: Date; limiteBientot: Date } {
  const debut = Date.UTC(
    aujourdhui.getUTCFullYear(),
    aujourdhui.getUTCMonth(),
    aujourdhui.getUTCDate()
  )
  return {
    debutJour: new Date(debut),
    limiteBientot: new Date(debut + (JOURS_ALERTE_VALIDITE + 1) * JOUR_MS - 1),
  }
}

export function statutValidite(dateValidite: Date | null, aujourdhui: Date): StatutValidite {
  if (!dateValidite) return 'aucune'
  const { debutJour, limiteBientot } = bornesEcheance(aujourdhui)
  const t = dateValidite.getTime()
  if (t < debutJour.getTime()) return 'expire'
  if (t <= limiteBientot.getTime()) return 'bientot'
  return 'ok'
}

export const LIBELLE_NON_RENSEIGNE = 'Non renseigné'

/** Nombre décroissant, puis ordre alphabétique ; « Non renseigné » toujours en dernier. */
export function trierRecapitulatif(
  lignes: { libelle: string; nombre: number }[]
): { libelle: string; nombre: number }[] {
  return [...lignes].sort((a, b) => {
    const aNr = a.libelle === LIBELLE_NON_RENSEIGNE
    const bNr = b.libelle === LIBELLE_NON_RENSEIGNE
    if (aNr !== bNr) return aNr ? 1 : -1
    if (b.nombre !== a.nombre) return b.nombre - a.nombre
    return a.libelle.localeCompare(b.libelle, 'fr')
  })
}
