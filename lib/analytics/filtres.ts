// Filtres des Analyses : définition unique des périodes, utilisée par les statistiques (analytics.ts).
// Les listes de statuts, elles, n'ont pas de période : le chiffre annoncé et le détail (drill-down.ts)
// portent sur les mêmes lignes parce que les statistiques sont calculées sur PERIODE_ILLIMITEE.
import { StatutMarche } from '@prisma/client'
import type { Periode } from '@/lib/analytics/types'

/** Aucune borne de date : pour les listes qui montrent la situation actuelle (statuts, autorités). */
export const PERIODE_ILLIMITEE: Periode = {
  dateDebut: new Date(0),
  dateFin: new Date('9999-12-31T23:59:59.999Z'),
}

/** Nombre maximal de lignes d'un détail ; au-delà, l'écran signale la troncature. */
export const LIMITE_DETAIL = 50

/**
 * Marchés comptés dans « Performance Marchés » : notifiés dans la période.
 * RÈGLE MÉTIER : exclure « Opportunité identifiée » — statut pré-commercial traité
 * dans le module Opportunités, jamais comptabilisé comme marché réel.
 */
export function filtreMarchesPeriode(periode: Periode) {
  return {
    dateNotification: { gte: periode.dateDebut, lte: periode.dateFin },
    statut: { not: StatutMarche.OPPORTUNITE_IDENTIFIEE },
  }
}

/** Opportunités comptées dans « Pipeline Opportunités » : créées dans la période. */
export function filtreOpportunitesPeriode(periode: Periode) {
  return {
    createdAt: { gte: periode.dateDebut, lte: periode.dateFin },
  }
}
