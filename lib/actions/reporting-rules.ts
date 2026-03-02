"use server"

/**
 * lib/actions/reporting-rules.ts
 * Server Actions CRUD pour les règles de reporting email.
 */

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import { requireRole } from "@/lib/utils/permissions"
import { logAction } from "@/lib/audit/logAction"
import { AUDIT_ACTION, AUDIT_ENTITY } from "@/lib/audit/constants"
import type { ActionResult } from "@/types"
import { z } from "zod"
import { getMarchesForReporting, groupMarchesByStatut } from "@/lib/cron/getMarchesForReporting"
import { buildReportingEmail } from "@/lib/email/reporting-templates"
import { createEmailTransport } from "@/lib/config/email"

// ============================================================
// SCHÉMA ZOD
// ============================================================

const ReportingScheduleConfigSchema = z
  .object({
    type: z.enum(["DAILY", "WEEKLY", "MONTHLY", "MANUAL"]),
    hour: z.number().int().min(0).max(23),
    days: z.array(z.number().int().min(1).max(31)).optional(),
  })
  .nullable()

const ReportingRuleSchema = z.object({
  name:            z.string().min(2).max(100),
  description:     z.string().optional(),
  statutGroups:    z.array(z.string()).min(1, "Sélectionnez au moins un statut"),
  recipientEmails: z.array(z.string().email()).min(1, "Sélectionnez au moins un destinataire"),
  scheduleConfig:  ReportingScheduleConfigSchema.optional().default(null),
  isActive:        z.boolean().default(true),
})

// ============================================================
// READ
// ============================================================

export async function getReportingRules() {
  await requireRole(["ADMIN"])
  return prisma.reportingRule.findMany({
    orderBy: { createdAt: "asc" },
  })
}

// ============================================================
// CREATE
// ============================================================

export async function createReportingRule(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(["ADMIN"])
    const data = ReportingRuleSchema.parse(input)

    const rule = await prisma.reportingRule.create({
      data: {
        ...data,
        scheduleConfig:
          data.scheduleConfig === null
            ? Prisma.DbNull
            : data.scheduleConfig,
      },
    })

    await logAction({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      action: AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.ALERT_RULE,
      entityId: rule.id,
      metadata: { ruleName: rule.name, type: "reporting" },
    })

    revalidatePath("/admin/reporting")
    return { success: true, data: { id: rule.id } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? "Données invalides" }
    }
    console.error("createReportingRule:", error)
    return { success: false, error: "Erreur lors de la création" }
  }
}

// ============================================================
// UPDATE
// ============================================================

export async function updateReportingRule(
  id: string,
  input: unknown
): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(["ADMIN"])
    const data = ReportingRuleSchema.parse(input)

    await prisma.reportingRule.update({
      where: { id },
      data: {
        ...data,
        scheduleConfig:
          data.scheduleConfig === null
            ? Prisma.DbNull
            : data.scheduleConfig,
      },
    })

    await logAction({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      action: AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.ALERT_RULE,
      entityId: id,
      metadata: { type: "reporting" },
    })

    revalidatePath("/admin/reporting")
    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? "Données invalides" }
    }
    console.error("updateReportingRule:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

// ============================================================
// DELETE
// ============================================================

export async function deleteReportingRule(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(["ADMIN"])
    await prisma.reportingRule.delete({ where: { id } })

    await logAction({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      action: AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.ALERT_RULE,
      entityId: id,
      metadata: { type: "reporting" },
    })

    revalidatePath("/admin/reporting")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("deleteReportingRule:", error)
    return { success: false, error: "Erreur lors de la suppression" }
  }
}

// ============================================================
// TOGGLE ACTIVE
// ============================================================

export async function toggleReportingRule(
  id: string,
  isActive: boolean
): Promise<ActionResult<void>> {
  try {
    await requireRole(["ADMIN"])
    await prisma.reportingRule.update({
      where: { id },
      data: { isActive },
    })
    revalidatePath("/admin/reporting")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("toggleReportingRule:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

// ============================================================
// SEND NOW (envoi manuel)
// ============================================================

export async function sendReportingRuleNow(id: string): Promise<ActionResult<{ sent: number }>> {
  try {
    const session = await requireRole(["ADMIN"])

    const rule = await prisma.reportingRule.findUnique({ where: { id } })
    if (!rule) return { success: false, error: "Règle introuvable" }

    const recipients = (rule.recipientEmails as string[]).filter(
      (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    )
    if (recipients.length === 0) {
      return { success: false, error: "Aucun destinataire valide configuré" }
    }

    const marches = await getMarchesForReporting(rule.statutGroups as string[])
    if (marches.length === 0) {
      return { success: false, error: "Aucun marché trouvé pour les statuts sélectionnés" }
    }

    const grouped = groupMarchesByStatut(marches)
    const now = new Date()
    const { subject, html, text } = buildReportingEmail(rule.name, grouped, now)

    const transporter = createEmailTransport()
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "noreply@erp-marches.local",
      to: recipients.join(", "),
      subject,
      html,
      text,
    })

    await logAction({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      action: AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.ALERT_RULE,
      entityId: id,
      metadata: { type: "reporting-manual-send", recipients: recipients.length, marches: marches.length },
    })

    return { success: true, data: { sent: recipients.length } }
  } catch (error) {
    console.error("sendReportingRuleNow:", error)
    return { success: false, error: "Erreur lors de l'envoi" }
  }
}
