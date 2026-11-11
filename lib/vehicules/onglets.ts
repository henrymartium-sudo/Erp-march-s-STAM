// Onglets de /vehicules, lus et écrits dans l'adresse (/vehicules = Parc, /vehicules?onglet=sav = SAV).

export type OngletVehicules = 'parc' | 'sav'

/** Valeur absente, vide ou inconnue : Parc. Paramètre répété : première valeur. */
export function lireOngletVehicules(valeur: string | string[] | undefined): OngletVehicules {
  const premiere = Array.isArray(valeur) ? valeur[0] : valeur
  return premiere === 'sav' ? 'sav' : 'parc'
}

export function urlOngletVehicules(onglet: OngletVehicules): string {
  return onglet === 'sav' ? '/vehicules?onglet=sav' : '/vehicules'
}
