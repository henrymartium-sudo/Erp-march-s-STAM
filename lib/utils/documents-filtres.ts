const CLES_FILTRES = ['search', 'type', 'phase', 'marcheId'] as const

/** Vrai si l'URL de la liste porte au moins un filtre (tri, sens et page n'en sont pas). */
export function aDesFiltresActifs(params: URLSearchParams): boolean {
  return CLES_FILTRES.some((cle) => {
    const valeur = params.get(cle)
    return Boolean(valeur) && valeur !== 'all'
  })
}
