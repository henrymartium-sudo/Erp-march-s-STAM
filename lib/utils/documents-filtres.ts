const CLES_FILTRES = ['search', 'type', 'phase', 'marcheId'] as const

/** Vrai si l'URL de la liste porte au moins un filtre (tri, sens et page n'en sont pas). */
export function aDesFiltresActifs(params: URLSearchParams): boolean {
  return CLES_FILTRES.some((cle) => {
    const valeur = params.get(cle)
    return Boolean(valeur) && valeur !== 'all'
  })
}

/**
 * Applique le filtre marché à une copie des paramètres d'URL.
 * 'all' ou vide retire le filtre ; la pagination repart à la page 1.
 * L'entrée n'est pas modifiée.
 */
export function appliquerFiltreMarche(params: URLSearchParams, marcheId: string): URLSearchParams {
  const copie = new URLSearchParams(params.toString())
  if (marcheId === 'all' || marcheId === '') {
    copie.delete('marcheId')
  } else {
    copie.set('marcheId', marcheId)
  }
  copie.delete('page')
  return copie
}

const LONGUEUR_MAX_OBJET_LIBELLE = 60

/**
 * Libellé d'un marché pour les sélecteurs : « numéro — objet », objet tronqué à 60 caractères.
 */
export function libelleMarche(marche: { numero: string; objet: string }): string {
  const objet =
    marche.objet.length > LONGUEUR_MAX_OBJET_LIBELLE
      ? `${marche.objet.slice(0, LONGUEUR_MAX_OBJET_LIBELLE)}…`
      : marche.objet
  return `${marche.numero} — ${objet}`
}
