export type ResultatOuverture = 'ouvert' | 'bloque'

/**
 * Ouvre l'URL de téléchargement et dit si le navigateur l'a laissée s'ouvrir.
 * `window.open` appelé après un `await` est souvent bloqué : il renvoie alors null.
 */
export function ouvrirTelechargement(
  url: string,
  ouvrir: (url: string) => unknown
): ResultatOuverture {
  try {
    return ouvrir(url) ? 'ouvert' : 'bloque'
  } catch {
    return 'bloque'
  }
}
