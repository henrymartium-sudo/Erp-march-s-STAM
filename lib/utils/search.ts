/**
 * Utilitaires pour la recherche textuelle
 */

/**
 * Normalise un texte pour la recherche :
 * - Convertit en minuscules
 * - Supprime les accents
 * - Supprime les espaces superflus
 *
 * @param text - Le texte à normaliser
 * @returns Le texte normalisé
 *
 * @example
 * normalizeText("Café") // "cafe"
 * normalizeText("MARCHÉS PUBLICS") // "marches publics"
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Décompose les caractères accentués (é → e + ´)
    .replace(/[\u0300-\u036f]/g, '') // Supprime les marques diacritiques
    .trim()
}

/**
 * Recherche un texte dans plusieurs champs d'un objet
 * La recherche est souple : insensible à la casse et aux accents
 *
 * @param item - L'objet dans lequel rechercher
 * @param fields - Les noms des champs à rechercher
 * @param query - Le texte recherché
 * @returns true si le texte est trouvé dans au moins un champ
 *
 * @example
 * const marche = { numero: "M-2024-001", objet: "Fourniture véhicules" }
 * searchInFields(marche, ['numero', 'objet'], 'vehicule') // true
 * searchInFields(marche, ['numero', 'objet'], 'STAM') // false
 */
export function searchInFields(
  item: Record<string, any>,
  fields: string[],
  query: string
): boolean {
  if (!query) return true

  const normalizedQuery = normalizeText(query)

  return fields.some((field) => {
    const value = item[field]
    if (!value) return false

    const normalizedValue = normalizeText(String(value))
    return normalizedValue.includes(normalizedQuery)
  })
}
