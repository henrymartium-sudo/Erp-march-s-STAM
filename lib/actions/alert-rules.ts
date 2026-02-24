'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { requireRole } from '@/lib/utils/permissions'
import type { ActionResult } from '@/types'
import { z } from 'zod'

const ScheduleConfigSchema = z.object({
  type:         z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'INTERVAL']),
  daysOfWeek:   z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth:   z.number().int().min(1).max(31).optional(),
  intervalDays: z.number().int().min(2).max(365).optional(),
}).nullable()

const RuleSchema = z.object({
  name:            z.string().min(2).max(100),
  description:     z.string().optional(),
  eventType:       z.string().min(1),
  conditions:      z.object({
    operator: z.enum(['AND', 'OR']),
    conditions: z.array(z.object({
      field: z.string(),
      op:    z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin']),
      value: z.union([z.string(), z.number(), z.array(z.string())]),
    })),
  }),
  channels:        z.array(z.string()).min(1),
  targetRoles:     z.array(z.string()),
  targetUserIds:   z.array(z.string()),
  webhookUrl:      z.string().url().optional().or(z.literal('')),
  priority:        z.number().int().min(1).max(10).default(1),
  cooldownMinutes: z.number().int().min(0).default(1440),
  scheduleConfig:  ScheduleConfigSchema.optional().default(null),
  externalEmails:  z.array(z.string().email()).default([]),
  isActive:        z.boolean().default(true),
})

export async function getAlertRules() {
  await requireRole(['ADMIN', 'AVANCE'])
  return prisma.alertRule.findMany({
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function getAlertRule(id: string) {
  await requireRole(['ADMIN', 'AVANCE'])
  return prisma.alertRule.findUnique({ where: { id } })
}

export async function createAlertRule(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(['ADMIN'])
    const data = RuleSchema.parse(input)
    const rule = await prisma.alertRule.create({
      data: {
        ...data,
        webhookUrl:     data.webhookUrl || null,
        scheduleConfig: data.scheduleConfig ?? Prisma.DbNull,
        externalEmails: data.externalEmails ?? [],
      },
    })
    revalidatePath('/admin/alertes/rules')
    return { success: true, data: { id: rule.id } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur' }
  }
}

export async function updateAlertRule(id: string, input: unknown): Promise<ActionResult<void>> {
  try {
    await requireRole(['ADMIN'])
    const data = RuleSchema.parse(input)
    await prisma.alertRule.update({
      where: { id },
      data: {
        ...data,
        webhookUrl:     data.webhookUrl || null,
        scheduleConfig: data.scheduleConfig ?? Prisma.DbNull,
        externalEmails: data.externalEmails ?? [],
      },
    })
    revalidatePath('/admin/alertes/rules')
    revalidatePath(`/admin/alertes/rules/${id}/edit`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur' }
  }
}

export async function toggleAlertRule(id: string, isActive: boolean): Promise<ActionResult<void>> {
  try {
    await requireRole(['ADMIN'])
    await prisma.alertRule.update({ where: { id }, data: { isActive } })
    revalidatePath('/admin/alertes/rules')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur' }
  }
}

export async function deleteAlertRule(id: string): Promise<ActionResult<void>> {
  try {
    await requireRole(['ADMIN'])
    await prisma.alertRule.delete({ where: { id } })
    revalidatePath('/admin/alertes/rules')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur' }
  }
}
