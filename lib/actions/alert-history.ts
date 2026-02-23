'use server'

import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/permissions'

export async function getNotificationHistory(filters?: {
  status?: string
  channel?: string
  page?: number
}) {
  await requireRole(['ADMIN', 'AVANCE'])

  const page  = filters?.page ?? 1
  const limit = 25
  const skip  = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (filters?.status)  where.status  = filters.status
  if (filters?.channel) where.channel = filters.channel

  const [notifications, total] = await Promise.all([
    prisma.alertNotification.findMany({
      where,
      include: {
        event: { select: { type: true, sourceModule: true, referenceId: true } },
        rule:  { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.alertNotification.count({ where }),
  ])

  return { notifications, total, page, limit }
}
