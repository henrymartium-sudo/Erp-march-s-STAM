import { prisma } from '@/lib/db/prisma'
import { calculerDureeImmobilisation } from './workflow'

// ============================================================================
// MÉTRIQUES PAR VÉHICULE
// ============================================================================

/**
 * Calcule le taux de disponibilité d'un véhicule (en %).
 * Formule : (1 - jours_immobilisé / jours_depuis_livraison) × 100
 * Retourne 100 si le véhicule n'a jamais été immobilisé ou n'a pas de date de livraison.
 */
export async function calculerTauxDisponibilite(vehiculeId: string): Promise<number> {
  const vehicule = await prisma.vehicule.findUnique({
    where: { id: vehiculeId },
    select: {
      dateLivraison: true,
      interventions: {
        select: { immobiliseAt: true, resolveAt: true },
        where: { immobiliseAt: { not: null } },
      },
    },
  })

  if (!vehicule || !vehicule.dateLivraison) return 100

  const joursTotal = calculerDureeImmobilisation(vehicule.dateLivraison, new Date()) ?? 0
  if (joursTotal === 0) return 100

  const joursImmobilise = vehicule.interventions.reduce((acc, i) => {
    return acc + (calculerDureeImmobilisation(i.immobiliseAt, i.resolveAt) ?? 0)
  }, 0)

  const taux = (1 - Math.min(joursImmobilise, joursTotal) / joursTotal) * 100
  return Math.round(taux * 10) / 10  // Arrondi à 1 décimale
}

/**
 * Calcule le temps moyen d'immobilisation en jours pour un véhicule.
 * Retourne null s'il n'y a aucune immobilisation résolue.
 */
export async function calculerTempsMoyenImmobilisation(vehiculeId: string): Promise<number | null> {
  const interventions = await prisma.intervention.findMany({
    where: {
      vehiculeId,
      immobiliseAt: { not: null },
      resolveAt: { not: null },
    },
    select: { immobiliseAt: true, resolveAt: true },
  })

  if (interventions.length === 0) return null

  const durees = interventions
    .map((i) => calculerDureeImmobilisation(i.immobiliseAt, i.resolveAt))
    .filter((d): d is number => d !== null)

  if (durees.length === 0) return null

  return Math.round(durees.reduce((a, b) => a + b, 0) / durees.length)
}

/**
 * Compte le nombre d'incidents couverts par la garantie pour un véhicule.
 */
export async function compterIncidentsGarantie(vehiculeId: string): Promise<number> {
  return prisma.intervention.count({
    where: { vehiculeId, sousGarantie: true },
  })
}

// ============================================================================
// MÉTRIQUES GLOBALES (pour la page SAV)
// ============================================================================

export interface MetriquesSAVGlobales {
  totalInterventions: number
  enCours: number          // SIGNALE + DIAGNOSTIC + EN_COURS
  resolues: number         // RESOLU + CLOS
  sousGarantie: number
  vehiculesImmobilises: number
}

export async function getMetriquesSAVGlobales(): Promise<MetriquesSAVGlobales> {
  const [total, enCours, resolues, sousGarantie, vehiculesImmobilises] = await Promise.all([
    prisma.intervention.count(),
    prisma.intervention.count({
      where: { statut: { in: ['SIGNALE', 'DIAGNOSTIC', 'EN_COURS'] } },
    }),
    prisma.intervention.count({
      where: { statut: { in: ['RESOLU', 'CLOS'] } },
    }),
    prisma.intervention.count({ where: { sousGarantie: true } }),
    prisma.vehicule.count({ where: { statutSAV: 'IMMOBILISE' } }),
  ])

  return { totalInterventions: total, enCours, resolues, sousGarantie, vehiculesImmobilises }
}
