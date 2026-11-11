// Onglets de /pilotage, lus et écrits dans l'adresse (?onglet=indicateurs|veille|analyses).

export const ONGLETS_PILOTAGE = ['indicateurs', 'veille', 'analyses'] as const
export type OngletPilotage = (typeof ONGLETS_PILOTAGE)[number]

/** Valeur absente ou inconnue : Indicateurs. */
export function lireOnglet(valeur: string | null): OngletPilotage {
  return (ONGLETS_PILOTAGE as readonly string[]).includes(valeur ?? '') ? (valeur as OngletPilotage) : 'indicateurs'
}

/** Chaîne de recherche (sans `?`) avec `onglet` posé, les autres paramètres gardés. */
export function avecOnglet(recherche: string, onglet: OngletPilotage): string {
  const params = new URLSearchParams(recherche)
  params.set('onglet', onglet)
  return params.toString()
}

/** Ancienne adresse /veille → /pilotage, onglet Veille. Un paramètre répété : première valeur ; absent : omis. */
export function urlVeilleVersPilotage(debut?: string | string[], fin?: string | string[]): string {
  const params = new URLSearchParams({ onglet: 'veille' })
  const d = Array.isArray(debut) ? debut[0] : debut
  const f = Array.isArray(fin) ? fin[0] : fin
  if (d) params.set('debut', d)
  if (f) params.set('fin', f)
  return `/pilotage?${params.toString()}`
}
