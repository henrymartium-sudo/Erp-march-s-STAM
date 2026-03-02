/**
 * lib/alertes/engine/cron-processor.ts
 *
 * Scanne la DB et envoie un email consolidé (digest) avant de publier
 * les événements individuels pour les canaux IN_APP et WEBHOOK.
 *
 * Ordre d'exécution :
 * 1. Récupérer toutes les cautions / marchés à alerter
 * 2. Pour chaque règle EMAIL active → résoudre destinataires + filtrer par conditions
 * 3. Envoyer UN email groupé par destinataire (digest tableau)
 * 4. Publier les événements avec _skipEmail=true (traitement IN_APP / WEBHOOK uniquement)
 */

import { prisma } from "@/lib/db/prisma"
import { publishEvent } from "./publish-event"
import { ALERT_EVENT_TYPES } from "@/lib/alertes/types"
import { groupAlerts, mergeCautions, mergeMarches } from "@/lib/alertes/groupAlertsForEmail"
import type { RawCautionForDigest, RawMarcheForDigest } from "@/lib/alertes/groupAlertsForEmail"
import { resolveRecipients } from "./recipient-resolver"
import { sendEmailChannel } from "@/lib/alertes/channels/email-channel"
import { dailyAlertsEmailTemplate } from "@/lib/email/templates"
import type { CautionAlert, MarcheAlert } from "@/lib/email/templates"
import { evaluateConditions } from "./rule-evaluator"
import { shouldRunRuleToday } from "./schedule-checker"
import type { RuleConditions, ScheduleConfig } from "@/lib/alertes/types"

// Types d'événements couverts par le digest groupé
const DIGEST_EVENT_TYPES = [
  ALERT_EVENT_TYPES.CAUTION_EXPIRING,
  ALERT_EVENT_TYPES.MARCHE_EXPIRING,
] as const

// ============================================================
// HELPERS
// ============================================================

/**
 * Calcule la date d'échéance pertinente selon le statut du marché.
 *
 * Pour EN_ATTENTE_LIVRAISON_OS :
 *   1. dateLivraisonPrevue si renseignée
 *   2. sinon dateOrdreService + delaiExecution jours
 *
 * Pour les autres statuts :
 *   - dateFinPrevue
 */
function getEcheanceLivraison(
  m: {
    statut: string
    dateLivraisonPrevue: Date | null
    dateOrdreService: Date | null
    delaiExecution: number
    dateFinPrevue: Date | null
  },
  today: Date
): Date | null {
  if (m.statut === "EN_ATTENTE_LIVRAISON_OS") {
    if (m.dateLivraisonPrevue) return m.dateLivraisonPrevue
    if (m.dateOrdreService) {
      const echeance = new Date(m.dateOrdreService)
      echeance.setDate(echeance.getDate() + m.delaiExecution)
      return echeance
    }
    return null
  }
  return m.dateFinPrevue
}

// ============================================================
// MAIN EXPORT
// ============================================================

/**
 * Scanne la DB et publie les événements d'échéance.
 * Remplace l'envoi email one-by-one par un digest groupé.
 * Appelé par le cron quotidien.
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
  const cautionsDb = await prisma.caution.findMany({
    where: {
      statut: "ACTIVE",
      dateEcheance: { gte: today, lte: in30Days },
    },
    include: {
      marche: {
        select: {
          numero: true,
          objet: true,
          autoriteContractanteNom: true,
        },
      },
    },
  })

  // 2. Marchés proches de leur fin d'exécution
  const marchesDb = await prisma.marche.findMany({
    where: {
      statut: {
        in: ["EN_EXECUTION", "EXECUTE_ATTENTE_GARANTIES", "EN_ATTENTE_LIVRAISON_OS"],
      },
      OR: [
        { dateFinPrevue: { gte: today, lte: in60Days } },
        { statut: "EN_ATTENTE_LIVRAISON_OS", dateFinPrevue: null },
        // EN_ATTENTE_LIVRAISON_OS avec dateLivraisonPrevue dans la fenêtre
        { statut: "EN_ATTENTE_LIVRAISON_OS", dateLivraisonPrevue: { gte: today, lte: in60Days } },
      ],
    },
    select: {
      id: true,
      numero: true,
      objet: true,
      autoriteContractanteNom: true,
      montant: true,
      statut: true,
      dateFinPrevue: true,
      dateLivraisonPrevue: true,
      dateOrdreService: true,
      delaiExecution: true,
    },
  })

  // 3. Construire les données brutes pour l'agrégation
  const rawCautions: RawCautionForDigest[] = cautionsDb.map((c) => ({
    id: c.id,
    reference: c.reference,
    banqueNom: c.banqueNom,
    type: c.type,
    montant: Number(c.montant),
    dateEcheance: c.dateEcheance,
    joursRestants: Math.ceil(
      (c.dateEcheance.getTime() - today.getTime()) / 86400000
    ),
    marcheReference: c.marche?.numero ?? null,
    autoriteContractanteNom: c.marche?.autoriteContractanteNom ?? null,
  }))

  const rawMarches: RawMarcheForDigest[] = marchesDb.map((m) => {
    const echeance = getEcheanceLivraison(m, today)
    const joursRestants = echeance
      ? Math.ceil((echeance.getTime() - today.getTime()) / 86400000)
      : null
    return {
      id: m.id,
      reference: m.numero,
      objet: m.objet,
      autoriteContractante: m.autoriteContractanteNom ?? null,
      montant: Number(m.montant),
      dateFinExecution: echeance ?? today,
      joursRestants: joursRestants ?? -1,
      statut: m.statut,
      echeanceConnue: echeance !== null,
    }
  })

  // 4. Envoyer le digest consolidé (une seule fois par destinataire)
  await sendConsolidatedDigest(rawCautions, rawMarches)

  // 5. Publier les événements individuels avec _skipEmail=true
  //    → processEvent traitera uniquement IN_APP et WEBHOOK
  for (const c of cautionsDb) {
    const joursRestants = Math.ceil(
      (c.dateEcheance.getTime() - today.getTime()) / 86400000
    )
    await publishEvent(ALERT_EVENT_TYPES.CAUTION_EXPIRING, "cautions", c.id, {
      joursRestants,
      statut: c.statut,
      montant: Number(c.montant),
      reference: c.reference,
      marcheNumero: c.marche?.numero ?? "",
      _skipEmail: true, // email déjà envoyé dans le digest
    })
  }

  for (const m of marchesDb) {
    const joursRestants = m.dateFinPrevue
      ? Math.ceil((m.dateFinPrevue.getTime() - today.getTime()) / 86400000)
      : -1
    await publishEvent(ALERT_EVENT_TYPES.MARCHE_EXPIRING, "marches", m.id, {
      joursRestants,
      statut: m.statut,
      montant: Number(m.montant),
      numero: m.numero,
      objet: m.objet,
      _skipEmail: true, // email déjà envoyé dans le digest
    })
  }

  // 6. Documents — champ dateExpiration non présent dans le schéma actuel
  const documentsCount = 0

  return {
    cautionsCount: cautionsDb.length,
    marchesCount: marchesDb.length,
    documentsCount,
  }
}

// ============================================================
// DIGEST CONSOLIDÉ
// ============================================================

/**
 * Pour chaque règle EMAIL active couvrant les événements CAUTION_EXPIRING /
 * MARCHE_EXPIRING, résout les destinataires, filtre par conditions et construit
 * un digest par email. Envoie UNE seule fois par destinataire.
 */
async function sendConsolidatedDigest(
  rawCautions: RawCautionForDigest[],
  rawMarches: RawMarcheForDigest[]
): Promise<void> {
  // Récupérer toutes les règles EMAIL actives pour les types digest
  const emailRules = await prisma.alertRule.findMany({
    where: {
      eventType: { in: [...DIGEST_EVENT_TYPES] },
      isActive: true,
    },
    orderBy: { priority: "asc" },
  })

  // Filtrer celles qui ont le canal EMAIL activé
  const emailOnlyRules = emailRules.filter((r) =>
    (r.channels as string[]).includes("EMAIL")
  )

  if (emailOnlyRules.length === 0) return

  // Accumulateur : email destinataire → { cautions, marches }
  const digestMap = new Map<string, { cautions: CautionAlert[]; marches: MarcheAlert[] }>()

  for (const rule of emailOnlyRules) {
    // Vérifier planification
    const scheduleConfig = rule.scheduleConfig as ScheduleConfig | null
    if (!shouldRunRuleToday(scheduleConfig)) continue

    const conditions = rule.conditions as unknown as RuleConditions

    // Résoudre les destinataires (internes + externes)
    const internalRecipients = await resolveRecipients(
      rule.targetRoles,
      rule.targetUserIds
    )
    const externalEmails: string[] = (
      (rule.externalEmails ?? []) as string[]
    ).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    const seenEmails = new Set(internalRecipients.map((r) => r.email))
    const allRecipientEmails = [
      ...internalRecipients.map((r) => r.email),
      ...externalEmails.filter((e) => !seenEmails.has(e)),
    ]

    if (allRecipientEmails.length === 0) continue

    // Filtrer les items qui correspondent aux conditions de cette règle
    let matchingCautions: CautionAlert[] = []
    let matchingMarches: MarcheAlert[] = []

    if (rule.eventType === ALERT_EVENT_TYPES.CAUTION_EXPIRING) {
      const filtered = rawCautions.filter((c) =>
        evaluateConditions(conditions, {
          joursRestants: c.joursRestants,
          statut: "ACTIVE",
          montant: c.montant,
        })
      )
      const grouped = groupAlerts(filtered, [])
      matchingCautions = grouped.cautions
    } else if (rule.eventType === ALERT_EVENT_TYPES.MARCHE_EXPIRING) {
      const filtered = rawMarches.filter((m) =>
        evaluateConditions(conditions, {
          joursRestants: m.joursRestants,
          statut: m.statut,
          montant: m.montant,
        })
      )
      const grouped = groupAlerts([], filtered)
      matchingMarches = grouped.marches
    }

    // Accumuler dans la map par email destinataire
    for (const email of allRecipientEmails) {
      const entry = digestMap.get(email) ?? { cautions: [], marches: [] }
      entry.cautions = mergeCautions(entry.cautions, matchingCautions)
      entry.marches = mergeMarches(entry.marches, matchingMarches)
      digestMap.set(email, entry)
    }
  }

  // Envoyer UN email par destinataire
  for (const [email, digest] of digestMap) {
    if (digest.cautions.length === 0 && digest.marches.length === 0) continue

    const template = dailyAlertsEmailTemplate(digest.cautions, digest.marches)
    if (!template.html) continue

    const result = await sendEmailChannel({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    if (result.success) {
      console.log(`✅ Digest envoyé à ${email} (${digest.cautions.length} caution(s), ${digest.marches.length} marché(s))`)
    } else {
      console.error(`❌ Échec envoi digest à ${email}: ${result.log}`)
    }
  }
}
