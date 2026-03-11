/**
 * lib/cron/reporting-processor.ts
 *
 * Orchestrateur du cron reporting horaire.
 * Pour chaque règle active, vérifie si elle doit s'exécuter à l'heure courante,
 * récupère les marchés, construit l'email et l'envoie.
 */

import { prisma } from "@/lib/db/prisma"
import { getMarchesForReporting, groupMarchesByStatut } from "./getMarchesForReporting"
import { buildReportingEmail } from "@/lib/email/reporting-templates"
import { buildOpportuniteReportingEmail } from "@/lib/email/opportunite-reporting-templates"
import { createEmailTransport } from "@/lib/config/email"

// ============================================================
// TYPE
// ============================================================

export interface ReportingScheduleConfig {
  type: "DAILY" | "WEEKLY" | "MONTHLY" | "MANUAL"
  hour: number       // 0–23
  days?: number[]    // WEEKLY: 1=Lun…7=Dim | MONTHLY: 1–31
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Détermine si une règle de reporting doit s'exécuter maintenant.
 * @param config  - Configuration de planification (null = MANUAL → jamais auto)
 * @param hour    - Heure courante (0–23)
 * @param date    - Date courante
 */
export function shouldRunReportingRuleNow(
  config: ReportingScheduleConfig | null | undefined,
  hour: number,
  date: Date = new Date()
): boolean {
  if (!config || config.type === "MANUAL") return false

  // Vérifier l'heure en premier
  if (config.hour !== hour) return false

  switch (config.type) {
    case "DAILY":
      return true

    case "WEEKLY": {
      if (!config.days || config.days.length === 0) return true
      // config.days utilise 1=Lun…7=Dim
      // date.getDay() retourne 0=Dim, 1=Lun…6=Sam
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()
      return config.days.includes(dayOfWeek)
    }

    case "MONTHLY": {
      if (!config.days || config.days.length === 0) return true
      return config.days.includes(date.getDate())
    }

    default:
      return false
  }
}

// ============================================================
// MAIN
// ============================================================

/**
 * Exécute le processing reporting pour l'heure donnée.
 * Appelé par le cron horaire.
 */
export async function runReportingCron(currentHour: number): Promise<{
  processed: number
  sent: number
  skipped: number
}> {
  const now = new Date()

  // Charger toutes les règles actives
  const rules = await prisma.reportingRule.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  })

  let sent = 0
  let skipped = 0

  for (const rule of rules) {
    const config = rule.scheduleConfig as ReportingScheduleConfig | null

    // Vérifier si la règle doit s'exécuter maintenant
    if (!shouldRunReportingRuleNow(config, currentHour, now)) {
      skipped++
      continue
    }

    // Vérifier les destinataires
    const recipients = (rule.recipientEmails as string[]).filter(
      (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    )
    if (recipients.length === 0) {
      console.warn(`⚠️ Règle "${rule.name}" : aucun destinataire valide`)
      skipped++
      continue
    }

    // Récupérer les marchés
    const statutGroups = rule.statutGroups as string[]
    const marches = await getMarchesForReporting(statutGroups)
    if (marches.length === 0) {
      console.log(`ℹ️ Règle "${rule.name}" : aucun marché pour les statuts sélectionnés`)
      skipped++
      continue
    }

    // Construire et envoyer l'email
    const grouped = groupMarchesByStatut(marches)
    const { subject, html, text } = buildReportingEmail(rule.name, grouped, now)

    try {
      const transporter = createEmailTransport()
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? "noreply@erp-marches.local",
        to: recipients.join(", "),
        subject,
        html,
        text,
      })
      console.log(
        `✅ Reporting "${rule.name}" envoyé à ${recipients.length} destinataire(s) — ${marches.length} marchés`
      )
      sent++
    } catch (err) {
      console.error(`❌ Échec envoi reporting "${rule.name}":`, err)
    }
  }

  return { processed: rules.length, sent, skipped }
}

// ============================================================
// OPPORTUNITÉS REPORTING CRON
// ============================================================

/**
 * Exécute le processing reporting Opportunités pour l'heure donnée.
 */
export async function runOpportuniteReportingCron(currentHour: number): Promise<{
  processed: number
  sent: number
  skipped: number
}> {
  const now = new Date()

  const rules = await prisma.opportuniteReportingRule.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  })

  let sent = 0
  let skipped = 0

  for (const rule of rules) {
    const config = rule.scheduleConfig as ReportingScheduleConfig | null

    if (!shouldRunReportingRuleNow(config, currentHour, now)) {
      skipped++
      continue
    }

    const recipients = (rule.recipientEmails as string[]).filter(
      (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    )
    if (recipients.length === 0) {
      console.warn(`⚠️ Règle Opp. "${rule.name}" : aucun destinataire valide`)
      skipped++
      continue
    }

    const opportunites = await prisma.opportunite.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        dossiers: {
          select: { id: true, progression: true, statut: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (opportunites.length === 0) {
      console.log(`ℹ️ Règle Opp. "${rule.name}" : aucune opportunité`)
      skipped++
      continue
    }

    const { subject, html, text } = buildOpportuniteReportingEmail(rule.name, opportunites, now)

    try {
      const transporter = createEmailTransport()
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? "noreply@erp-marches.local",
        to: recipients.join(", "),
        subject,
        html,
        text,
      })
      console.log(
        `✅ Suivi Opp. "${rule.name}" envoyé à ${recipients.length} destinataire(s) — ${opportunites.length} opportunités`
      )
      sent++
    } catch (err) {
      console.error(`❌ Échec envoi suivi opp. "${rule.name}":`, err)
    }
  }

  return { processed: rules.length, sent, skipped }
}
