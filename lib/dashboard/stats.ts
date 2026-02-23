/**
 * Fonctions de calcul de statistiques pour le Dashboard enrichi
 */

import { prisma } from '@/lib/db/prisma'
import { StatutMarche } from '@prisma/client'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { StatutCount, MontantMensuel, CAEffectifPoint } from './types'

// Mapping des labels de statuts (réutiliser les constantes existantes)
import { STATUT_MARCHE_LABELS } from '@/lib/constants/marche'

// Couleurs pour les statuts (format HSL pour Recharts)
const STATUT_COLORS: Record<StatutMarche, string> = {
  OPPORTUNITE_IDENTIFIEE: 'hsl(210, 100%, 50%)',
  DOSSIER_EN_PREPARATION: 'hsl(200, 100%, 45%)',
  OFFRE_DEPOSEE: 'hsl(180, 80%, 40%)',
  EN_ATTENTE_ATTRIBUTION: 'hsl(45, 100%, 50%)',
  ATTRIBUE_PROVISOIREMENT: 'hsl(30, 100%, 50%)',
  ATTRIBUE_DEFINITIVEMENT: 'hsl(120, 60%, 40%)',
  EN_ATTENTE_LIVRAISON_OS: 'hsl(100, 60%, 45%)',
  EN_EXECUTION: 'hsl(140, 70%, 40%)',
  EXECUTE_ATTENTE_GARANTIES: 'hsl(160, 60%, 45%)',
  CLOTURE: 'hsl(0, 0%, 60%)',
  RESILIE: 'hsl(0, 70%, 50%)',
  ANNULE: 'hsl(0, 60%, 40%)',
  INFRUCTUEUX: 'hsl(10, 50%, 50%)',
}

/**
 * Récupère la répartition des marchés par statut pour le Donut Chart
 */
export async function getStatutDistribution(): Promise<StatutCount[]> {
  try {
    const marches = await prisma.marche.groupBy({
      by: ['statut'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    })

    const total = marches.reduce((sum, m) => sum + m._count.id, 0)

    if (total === 0) {
      return []
    }

    return marches.map((m) => ({
      statut: m.statut,
      label: STATUT_MARCHE_LABELS[m.statut],
      count: m._count.id,
      pourcentage: Math.round((m._count.id / total) * 100),
      couleur: STATUT_COLORS[m.statut],
    }))
  } catch (error) {
    console.error('Erreur lors du calcul de la répartition des statuts:', error)
    return []
  }
}

/**
 * Récupère les montants de marchés par mois (12 derniers mois)
 */
export async function getMontantsMensuels(): Promise<MontantMensuel[]> {
  try {
    const now = new Date()
    const months: MontantMensuel[] = []

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = startOfMonth(date)
      const end = endOfMonth(date)

      const result = await prisma.marche.aggregate({
        where: {
          dateNotification: {
            gte: start,
            lte: end,
          },
        },
        _sum: {
          montant: true,
        },
      })

      months.push({
        mois: format(date, 'MMM yyyy', { locale: fr }),
        montant: Number(result._sum.montant || 0),
      })
    }

    return months
  } catch (error) {
    console.error('Erreur lors du calcul des montants mensuels:', error)
    return []
  }
}

/**
 * Récupère le CA effectif (marchés EN_EXECUTION + EXECUTE_ATTENTE_GARANTIES + CLOTURE)
 * sur les 12 derniers mois, basé sur dateNotification.
 */
export async function getCAEffectif(): Promise<CAEffectifPoint[]> {
  try {
    const now = new Date()

    // 1. Récupérer tous les marchés dans les statuts effectifs (sans filtre de date)
    const marches = await prisma.marche.findMany({
      where: {
        statut: {
          in: [
            StatutMarche.EN_EXECUTION,
            StatutMarche.EXECUTE_ATTENTE_GARANTIES,
            StatutMarche.CLOTURE,
          ],
        },
      },
      select: { dateNotification: true, montant: true },
    })

    // 2. Initialiser les 12 derniers mois à 0
    const monthMap = new Map<string, CAEffectifPoint>()
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = format(date, 'yyyy-MM')
      monthMap.set(key, {
        label: key,
        moisLabel: format(date, 'MMM yyyy', { locale: fr }),
        montant: 0,
      })
    }

    // 3. Sommer les montants par mois de dateNotification
    for (const marche of marches) {
      if (!marche.dateNotification) continue
      const key = format(marche.dateNotification, 'yyyy-MM')
      const entry = monthMap.get(key)
      if (entry) {
        entry.montant += Number(marche.montant)
      }
    }

    return Array.from(monthMap.values())
  } catch (error) {
    console.error('Erreur lors du calcul du CA effectif:', error)
    return []
  }
}
