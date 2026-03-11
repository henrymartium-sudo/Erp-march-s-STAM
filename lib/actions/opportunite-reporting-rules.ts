"use server"

/**
 * lib/actions/opportunite-reporting-rules.ts
 * Server Actions CRUD pour les règles de reporting email Opportunités.
 */

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import { requireRole } from "@/lib/utils/permissions"
import { logAction } from "@/lib/audit/logAction"
import { AUDIT_ACTION, AUDIT_ENTITY } from "@/lib/audit/constants"
import type { ActionResult } from "@/types"
import { z } from "zod"
import { buildOpportuniteReportingEmail } from "@/lib/email/opportunite-reporting-templates"
import { createEmailTransport } from "@/lib/config/email"
import type { ReportingScheduleConfig } from "@/lib/cron/reporting-processor"

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

const OpportuniteReportingRuleSchema = z.object({
  name:            z.string().min(2).max(100),
  description:     z.string().optional(),
  recipientEmails: z.array(z.string().email()).min(1, "Sélectionnez au moins un destinataire"),
  scheduleConfig:  ReportingScheduleConfigSchema.optional().default(null),
  isActive:        z.boolean().default(true),
})

// ============================================================
// READ
// ============================================================

export async function getOpportuniteReportingRules() {
  await requireRole(["ADMIN"])
  return prisma.opportuniteReportingRule.findMany({
    orderBy: { createdAt: "asc" },
  })
}

// ============================================================
// CREATE
// ============================================================

export async function createOpportuniteReportingRule(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(["ADMIN"])
    const data = OpportuniteReportingRuleSchema.parse(input)

    const rule = await prisma.opportuniteReportingRule.create({
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
      metadata: { ruleName: rule.name, type: "opportunite-reporting" },
    })

    revalidatePath("/admin/reporting")
    return { success: true, data: { id: rule.id } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? "Données invalides" }
    }
    console.error("createOpportuniteReportingRule:", error)
    return { success: false, error: "Erreur lors de la création" }
  }
}

// ============================================================
// UPDATE
// ============================================================

export async function updateOpportuniteReportingRule(
  id: string,
  input: unknown
): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(["ADMIN"])
    const data = OpportuniteReportingRuleSchema.parse(input)

    await prisma.opportuniteReportingRule.update({
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
      metadata: { type: "opportunite-reporting" },
    })

    revalidatePath("/admin/reporting")
    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? "Données invalides" }
    }
    console.error("updateOpportuniteReportingRule:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

// ============================================================
// DELETE
// ============================================================

export async function deleteOpportuniteReportingRule(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(["ADMIN"])
    await prisma.opportuniteReportingRule.delete({ where: { id } })

    await logAction({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      action: AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.ALERT_RULE,
      entityId: id,
      metadata: { type: "opportunite-reporting" },
    })

    revalidatePath("/admin/reporting")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("deleteOpportuniteReportingRule:", error)
    return { success: false, error: "Erreur lors de la suppression" }
  }
}

// ============================================================
// TOGGLE ACTIVE
// ============================================================

export async function toggleOpportuniteReportingRule(
  id: string,
  isActive: boolean
): Promise<ActionResult<void>> {
  try {
    await requireRole(["ADMIN"])
    await prisma.opportuniteReportingRule.update({
      where: { id },
      data: { isActive },
    })
    revalidatePath("/admin/reporting")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("toggleOpportuniteReportingRule:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

// ============================================================
// SEND NOW (envoi manuel)
// ============================================================

export async function sendOpportuniteReportingRuleNow(
  id: string
): Promise<ActionResult<{ sent: number }>> {
  try {
    const session = await requireRole(["ADMIN"])

    const rule = await prisma.opportuniteReportingRule.findUnique({ where: { id } })
    if (!rule) return { success: false, error: "Règle introuvable" }

    const recipients = (rule.recipientEmails as string[]).filter(
      (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    )
    if (recipients.length === 0) {
      return { success: false, error: "Aucun destinataire valide configuré" }
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
      return { success: false, error: "Aucune opportunité trouvée" }
    }

    const now = new Date()
    const { subject, html, text } = buildOpportuniteReportingEmail(rule.name, opportunites, now)

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
      metadata: {
        type: "opportunite-reporting-manual-send",
        recipients: recipients.length,
        opportunites: opportunites.length,
      },
    })

    return { success: true, data: { sent: recipients.length } }
  } catch (error) {
    console.error("sendOpportuniteReportingRuleNow:", error)
    return { success: false, error: "Erreur lors de l'envoi" }
  }
}

// ============================================================
// EXPORT TYPE (réutilisé par le cron)
// ============================================================

export type { ReportingScheduleConfig }
