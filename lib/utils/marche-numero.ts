/**
 * Détection du numéro de marché provisoire.
 *
 * La conversion Opportunité → Marché (createMarcheFromOpportunite)
 * génère un numéro « MARCHE-{année}-{compteur} » en attendant que le
 * vrai numéro administratif soit saisi. Tant que le numéro commence
 * par ce préfixe, l'UI affiche un badge « Numéro provisoire ».
 */
export const PREFIXE_NUMERO_PROVISOIRE = 'MARCHE-'

export function isNumeroProvisoire(numero: string): boolean {
  return numero.startsWith(PREFIXE_NUMERO_PROVISOIRE)
}
