// Période de /pilotage (tous onglets), lue et écrite dans l'adresse (?debut=AAAA-MM-JJ&fin=AAAA-MM-JJ).

import { startOfDay, endOfDay, subYears, format, parse, isValid } from 'date-fns'
import type { Periode } from '@/lib/analytics/types'

/** 12 mois glissants, comme le défaut de /pilotage. */
export function periodeParDefaut(maintenant: Date = new Date()): Periode {
  return { dateDebut: startOfDay(subYears(maintenant, 1)), dateFin: endOfDay(maintenant) }
}

function lireDate(texte: string | null): Date | null {
  if (!texte || !/^\d{4}-\d{2}-\d{2}$/.test(texte)) return null
  const date = parse(texte, 'yyyy-MM-dd', new Date())
  return isValid(date) ? date : null
}

/** Valeurs absentes, mal formées ou inversées : période par défaut. */
export function lirePeriodeUrl(debut: string | null, fin: string | null, maintenant: Date = new Date()): Periode {
  const d = lireDate(debut)
  const f = lireDate(fin)
  if (!d || !f || d > f) return periodeParDefaut(maintenant)
  return { dateDebut: startOfDay(d), dateFin: endOfDay(f) }
}

/** Chaîne de recherche (sans `?`) avec `debut` et `fin` posés, les autres paramètres (dont `onglet`) gardés. */
export function avecPeriode(recherche: string, periode: Periode): string {
  const params = new URLSearchParams(recherche)
  params.set('debut', format(periode.dateDebut, 'yyyy-MM-dd'))
  params.set('fin', format(periode.dateFin, 'yyyy-MM-dd'))
  return params.toString()
}
