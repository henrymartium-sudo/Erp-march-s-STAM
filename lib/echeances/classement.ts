// lib/echeances/classement.ts
/**
 * Classement des offres à rendre pour le mail « échéances du matin ».
 * Fonctions pures : la date du jour est un paramètre. Fuseau : UTC (Lomé = UTC+0).
 */

import type { StatutOpportunite } from '@prisma/client'
import { STATUTS_AVANT_SOUMISSION } from '@/lib/utils/opportunite-filters'

const JOUR_MS = 86_400_000

/** Statuts pour lesquels l'offre est encore à rendre : source unique, partagée avec la liste. */
export const STATUTS_A_RENDRE: StatutOpportunite[] = STATUTS_AVANT_SOUMISSION

const STATUTS_DETECTEE: StatutOpportunite[] = ['IDENTIFIEE', 'EN_ANALYSE']

export type BlocEcheance = 'rouge' | 'orange' | 'bleu'

export interface OffreEcheance {
  id: string
  reference: string | null
  objet: string
  autoriteContractante: string
  statut: StatutOpportunite
  dateLimite: Date | null
  lots: { numero: number; montantPropose: unknown; dossier: { progression: number } | null }[]
}

export interface GroupesEcheances {
  rouge: OffreEcheance[]
  orange: OffreEcheance[]
  bleu: OffreEcheance[]
}

/** dateLimite avec son heure ; minuit exact (UTC) = heure non renseignée = 23 h 59 le même jour. */
export function echeanceEffective(dateLimite: Date): Date {
  if (dateLimite.getTime() % JOUR_MS === 0) return new Date(dateLimite.getTime() + JOUR_MS - 60_000)
  return dateLimite
}

/** Nombre de jours calendaires (UTC) entre le jour de `now` et celui de `dateLimite`. */
export function ecartJours(dateLimite: Date, now: Date): number {
  return Math.floor(dateLimite.getTime() / JOUR_MS) - Math.floor(now.getTime() / JOUR_MS)
}

export function classerOffre(
  offre: Pick<OffreEcheance, 'statut' | 'dateLimite'>,
  now: Date
): BlocEcheance | null {
  if (!offre.dateLimite || !STATUTS_A_RENDRE.includes(offre.statut)) return null
  if (echeanceEffective(offre.dateLimite).getTime() < now.getTime()) return 'rouge'
  const ecart = ecartJours(offre.dateLimite, now)
  if (ecart <= 1) return 'orange'
  if (ecart <= 7) return 'bleu'
  return null
}

/** Offre « détectée » dont l'échéance tombe d'aujourd'hui à J+2 ; jamais dans le bloc rouge. */
export function alerteGras(
  offre: Pick<OffreEcheance, 'statut' | 'dateLimite'>,
  now: Date
): boolean {
  if (!offre.dateLimite || !STATUTS_DETECTEE.includes(offre.statut)) return false
  if (classerOffre(offre, now) === 'rouge') return false
  const ecart = ecartJours(offre.dateLimite, now)
  return ecart >= 0 && ecart <= 2
}

/** Répartit les offres dans leur bloc, triées de l'échéance effective la plus proche à la plus lointaine. */
export function grouperEcheances(offres: OffreEcheance[], now: Date): GroupesEcheances {
  const groupes: GroupesEcheances = { rouge: [], orange: [], bleu: [] }
  for (const offre of offres) {
    const bloc = classerOffre(offre, now)
    if (bloc) groupes[bloc].push(offre)
  }
  const parEcheance = (a: OffreEcheance, b: OffreEcheance) =>
    echeanceEffective(a.dateLimite as Date).getTime() - echeanceEffective(b.dateLimite as Date).getTime()
  groupes.rouge.sort(parEcheance)
  groupes.orange.sort(parEcheance)
  groupes.bleu.sort(parEcheance)
  return groupes
}
