import { normalizeText } from '@/lib/utils/search'

export interface SuggestionVehicule {
  marque: string
  modele: string
  prixUnitaire: number
}

/** Une suggestion par couple marque/modèle ; `lignes` va de la plus récente à la plus ancienne, la plus récente gagne. */
export function construireSuggestions(lignes: SuggestionVehicule[]): SuggestionVehicule[] {
  const vues = new Set<string>()
  const resultat: SuggestionVehicule[] = []
  for (const l of lignes) {
    const cle = `${normalizeText(l.marque)}|${normalizeText(l.modele)}`
    if (vues.has(cle)) continue
    vues.add(cle)
    resultat.push(l)
  }
  return resultat
}
