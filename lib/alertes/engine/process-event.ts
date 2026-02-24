// lib/alertes/engine/process-event.ts

import { prisma } from "@/lib/db/prisma"
import { evaluateConditions } from "./rule-evaluator"
import { resolveRecipients } from "./recipient-resolver"
import type { Recipient } from "./recipient-resolver"
import { shouldRunRuleToday } from "./schedule-checker"
import { sendEmailChannel } from "@/lib/alertes/channels/email-channel"
import { markInAppReady } from "@/lib/alertes/channels/inapp-channel"
import { sendWebhookChannel } from "@/lib/alertes/channels/webhook-channel"
import type { RuleConditions, ScheduleConfig } from "@/lib/alertes/types"

/**
 * Construit la clé de déduplication basée sur la fenêtre de cooldown.
 * Deux appels dans la même fenêtre → même clé → INSERT bloqué par @@unique.
 */
function buildDeduplicationKey(
  eventType: string,
  referenceId: string,
  ruleId: string,
  cooldownMinutes: number
): string {
  const windowMs = cooldownMinutes * 60 * 1000
  const windowIndex = Math.floor(Date.now() / windowMs)
  return `${eventType}_${referenceId}_${ruleId}_${windowIndex}`
}

export async function processEvent(eventId: string): Promise<void> {
  const event = await prisma.alertEvent.findUnique({
    where: { id: eventId },
  })
  if (!event) return

  const payload = event.payload as Record<string, unknown>

  // 1. Trouver les règles actives pour ce type d'événement
  const rules = await prisma.alertRule.findMany({
    where: { eventType: event.type, isActive: true },
    orderBy: { priority: "asc" },
  })

  for (const rule of rules) {
    // 2. Vérifier la planification de la règle
    const scheduleConfig = rule.scheduleConfig as ScheduleConfig | null
    if (!shouldRunRuleToday(scheduleConfig)) continue

    // 3. Évaluer les conditions
    const conditions = rule.conditions as unknown as RuleConditions
    if (!evaluateConditions(conditions, payload)) continue

    // 4. Résoudre les destinataires internes (rôles + userIds)
    const internalRecipients = await resolveRecipients(rule.targetRoles, rule.targetUserIds)

    // 4b. Fusionner avec les emails externes (hors-base)
    const externalEmails: string[] = (rule.externalEmails ?? []).filter(
      (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    )
    const externalRecipients: Recipient[] = externalEmails.map((email) => ({
      email,
      role: "EXTERNAL",
    }))

    // Dédupliquer par email (un email externe peut aussi être un user interne)
    const seenEmails = new Set(internalRecipients.map((r) => r.email))
    const uniqueExternal = externalRecipients.filter((r) => !seenEmails.has(r.email))
    const recipients: Recipient[] = [...internalRecipients, ...uniqueExternal]

    if (recipients.length === 0) continue

    for (const channel of rule.channels) {
      for (const recipient of recipients) {
        const dedupKey =
          buildDeduplicationKey(event.type, event.referenceId, rule.id, rule.cooldownMinutes) +
          `_${channel}_${recipient.email}`

        // 5. Vérifier l'idempotence
        const existing = await prisma.alertNotification.findUnique({
          where: { deduplicationKey: dedupKey },
        })
        if (existing) continue

        // 6. Créer la notification en PENDING
        const notification = await prisma.alertNotification.create({
          data: {
            eventId: event.id,
            ruleId: rule.id,
            channel,
            recipientEmail: recipient.email,
            recipientUserId: recipient.userId ?? null,
            status: "PENDING",
            deduplicationKey: dedupKey,
          },
        })

        // 7. Dispatcher selon canal
        let result: { success: boolean; log: string }

        if (channel === "EMAIL") {
          const subject = `[ERP Marchés] ${rule.name}`
          const html = buildSimpleEmailHtml(rule.name, event.type, payload)
          result = await sendEmailChannel({ to: recipient.email, subject, html })
        } else if (channel === "IN_APP") {
          result = markInAppReady()
        } else if (channel === "WEBHOOK" && rule.webhookUrl) {
          result = await sendWebhookChannel(rule.webhookUrl, {
            eventType: event.type,
            referenceId: event.referenceId,
            payload,
            rule: { id: rule.id, name: rule.name },
          })
        } else {
          continue
        }

        // 8. Mettre à jour le statut
        await prisma.alertNotification.update({
          where: { id: notification.id },
          data: {
            status: result.success ? (channel === "IN_APP" ? "PENDING" : "SENT") : "FAILED",
            sentAt: result.success && channel !== "IN_APP" ? new Date() : undefined,
            deliveryLog: result.log,
          },
        })
      }
    }
  }

  // 8. Marquer l'événement comme traité
  await prisma.alertEvent.update({
    where: { id: eventId },
    data: { processedAt: new Date() },
  })
}

/** Template email générique basé sur le payload de l'événement */
function buildSimpleEmailHtml(
  ruleName: string,
  eventType: string,
  payload: Record<string, unknown>
): string {
  const rows = Object.entries(payload)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 8px;font-weight:bold">${k}</td><td style="padding:4px 8px">${v}</td></tr>`
    )
    .join("")

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1E3A5F;color:white;padding:24px">
        <h2 style="margin:0">🔔 ${ruleName}</h2>
        <p style="margin:8px 0 0;opacity:.8">${eventType}</p>
      </div>
      <div style="padding:24px;background:#f9f9f9">
        <table style="width:100%;border-collapse:collapse">
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="padding:16px;font-size:12px;color:#666;text-align:center">
        ERP Marchés STAM — notification automatique
      </div>
    </div>
  `
}
