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

/** Numéro provisoire suivant de l'année : plus grand compteur existant + 1 (un trou n'est pas réutilisé). */
export function prochainNumeroProvisoire(annee: number, numeros: string[]): string {
  const prefixe = `${PREFIXE_NUMERO_PROVISOIRE}${annee}-`
  const compteurs = numeros
    .filter((n) => n.startsWith(prefixe) && /^\d+$/.test(n.slice(prefixe.length)))
    .map((n) => Number(n.slice(prefixe.length)))
  const suivant = compteurs.length === 0 ? 1 : Math.max(...compteurs) + 1
  return `${prefixe}${String(suivant).padStart(3, '0')}`
}
