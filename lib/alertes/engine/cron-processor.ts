import { prisma } from "@/lib/db/prisma"
import { publishEvent } from "./publish-event"
import { ALERT_EVENT_TYPES } from "@/lib/alertes/types"

/**
 * Scanne la DB et publie les événements d'échéance.
 * Remplace sendDailyAlertsEmail() — appelé par le cron quotidien.
 */
export async function runDailyAlertsCron(): Promise<{
  cautionsCount: number
  marchesCount: number
  documentsCount: number
}> {
  const today = new Date()
  const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  // 1. Cautions actives expirant dans 30 jours
  const cautions = await prisma.caution.findMany({
    where: {
      statut: "ACTIVE",
      dateEcheance: { gte: today, lte: in30Days },
    },
    include: { marche: { select: { numero: true, objet: true } } },
  })

  for (const c of cautions) {
    const joursRestants = Math.ceil((c.dateEcheance.getTime() - today.getTime()) / 86400000)
    await publishEvent(ALERT_EVENT_TYPES.CAUTION_EXPIRING, "cautions", c.id, {
      joursRestants,
      statut: c.statut,
      montant: Number(c.montant),
      reference: c.reference,
      marcheNumero: c.marche?.numero ?? "",
    })
  }

  // 2. Marchés en exécution finissant dans 60 jours
  const marches = await prisma.marche.findMany({
    where: {
      statut: { in: ["EN_EXECUTION", "EXECUTE_ATTENTE_GARANTIES"] },
      dateFinPrevue: { gte: today, lte: in60Days },
    },
  })

  for (const m of marches) {
    if (!m.dateFinPrevue) continue
    const joursRestants = Math.ceil((m.dateFinPrevue.getTime() - today.getTime()) / 86400000)
    await publishEvent(ALERT_EVENT_TYPES.MARCHE_EXPIRING, "marches", m.id, {
      joursRestants,
      statut: m.statut,
      montant: Number(m.montant),
      numero: m.numero,
      objet: m.objet,
    })
  }

  // 3. Documents — champ dateExpiration non présent dans le schéma actuel, ignoré
  const documentsCount = 0

  return {
    cautionsCount: cautions.length,
    marchesCount: marches.length,
    documentsCount,
  }
}
