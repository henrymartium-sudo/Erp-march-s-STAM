import { formatMontant } from '@/lib/utils/format'

const signe = (valeur: number): string => (valeur > 0 ? '+' : '')

/** Pourcentage arrondi à l'affichage seulement ; −0,4 s'affiche « 0 % ». */
export function formaterPourcentage(pct: number): string {
  const arrondi = Math.round(pct)
  return `${signe(arrondi)}${arrondi === 0 ? 0 : arrondi} %`
}

/** « +200 FCFA (+25 %) » : positif quand notre offre est plus chère que celle du gagnant. */
export function formaterEcart(pct: number | null, fcfa: number | null): string | null {
  if (pct === null || fcfa === null) return null
  return `${signe(fcfa)}${formatMontant(fcfa)} (${formaterPourcentage(pct)})`
}
