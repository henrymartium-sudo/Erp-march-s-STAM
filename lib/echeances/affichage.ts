// lib/echeances/affichage.ts
/** Textes du mail « échéances du matin » : fonctions pures. Fuseau : UTC (Lomé). */

import { formatMontant } from '@/lib/utils/format'
import { lotsSansMontantPropose, totalMontantPropose } from '@/lib/utils/lots'
import { ecartJours, type BlocEcheance, type GroupesEcheances } from './classement'

export interface MontantAffiche {
  texte: string
  vide: boolean
  note: string | null
}

function listeLots(numeros: number[]): string {
  if (numeros.length === 1) return `lot ${numeros[0]}`
  return `lots ${numeros.slice(0, -1).join(', ')} et ${numeros[numeros.length - 1]}`
}

export function montantProposeAffiche(
  lots: { numero: number; montantPropose: unknown }[]
): MontantAffiche {
  const total = totalMontantPropose(lots)
  if (total === null) return { texte: 'À définir', vide: true, note: null }
  const manquants = lotsSansMontantPropose(lots)
  return {
    texte: formatMontant(total),
    vide: false,
    note: manquants.length > 0 ? `total partiel — ${listeLots(manquants)} sans montant` : null,
  }
}

export function delaiTexte(dateLimite: Date, now: Date, bloc: BlocEcheance): string {
  const ecart = ecartJours(dateLimite, now)
  if (bloc === 'rouge') {
    if (ecart >= 0) return 'Heure dépassée aujourd\'hui'
    return `Dépassée de ${-ecart} jour${-ecart > 1 ? 's' : ''}`
  }
  if (ecart === 0) return 'Aujourd\'hui'
  if (ecart === 1) return 'Demain'
  return `Dans ${ecart} jours`
}

const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function echeanceLisible(dateLimite: Date): { date: string; heure: string | null } {
  const sansHeure = dateLimite.getUTCHours() === 0 && dateLimite.getUTCMinutes() === 0
  const heure = sansHeure
    ? null
    : `${String(dateLimite.getUTCHours()).padStart(2, '0')}:${String(dateLimite.getUTCMinutes()).padStart(2, '0')}`
  return { date: FORMAT_DATE.format(dateLimite), heure }
}

export function objetMail(g: GroupesEcheances): string {
  const total = g.rouge.length + g.orange.length + g.bleu.length
  if (total === 0) {
    return g.gris.length
      ? `Aucune offre à rendre dans les 7 jours (${g.gris.length} à suivre plus tard)`
      : 'Aucune offre à rendre dans les 7 jours'
  }
  const parties: string[] = []
  if (g.rouge.length) parties.push(`${g.rouge.length} à régulariser`)
  if (g.orange.length) parties.push(`${g.orange.length} aujourd'hui ou demain`)
  if (g.bleu.length) parties.push(`${g.bleu.length} dans la semaine`)
  return `${total} offre${total > 1 ? 's' : ''} à rendre : ${parties.join(', ')}`
}
