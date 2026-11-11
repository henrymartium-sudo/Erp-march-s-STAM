// Filtres des Analyses : définition unique, partagée par les compteurs (analytics.ts)
// et par les listes qui s'ouvrent au clic (drill-down.ts), pour que le chiffre annoncé
// soit toujours le nombre de lignes du détail.
import { StatutMarche } from '@prisma/client'
import type { Periode } from '@/lib/analytics/types'

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
