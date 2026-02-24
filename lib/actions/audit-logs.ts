'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/utils/permissions'
import type { PaginatedResponse } from '@/types/pagination'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'

export interface AuditLogRow {
  id:         string
  userId:     string | null
  userEmail:  string | null
  userName:   string | null
  action:     string
  entityType: string
  entityId:   string | null
  ipAddress:  string | null
  userAgent:  string | null
  createdAt:  string
}

export interface AuditLogDetail extends AuditLogRow {
  metadata: Record<string, unknown> | null
}

export interface AuditLogFilters {
  userId?:     string
  action?:     string
  entityType?: string
  startDate?:  string
  endDate?:    string
  search?:     string
  page?:       number
  limit?:      number
}

export async function getAuditLogs(
  filters: AuditLogFilters = {}
): Promise<PaginatedResponse<AuditLogRow>> {
  await requireAdmin()

  const page  = filters.page  ?? 1
  const limit = filters.limit ?? 50

  const where: any = {}

  if (filters.userId)     where.userId     = filters.userId
  if (filters.action)     where.action     = filters.action
  if (filters.entityType) where.entityType = filters.entityType

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
    if (filters.endDate)   where.createdAt.lte = new Date(filters.endDate + 'T23:59:59.999Z')
  }

  if (filters.search) {
    where.OR = [
      { userEmail:  { contains: filters.search, mode: 'insensitive' } },
      { entityId:   { contains: filters.search, mode: 'insensitive' } },
      { action:     { contains: filters.search, mode: 'insensitive' } },
      { entityType: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      ...getPrismaSkipTake({ page, limit }),
    }),
  ])

  const data: AuditLogRow[] = logs.map(l => ({
    id:         l.id,
    userId:     l.userId,
    userEmail:  l.userEmail,
    userName:   l.user?.name ?? null,
    action:     l.action,
    entityType: l.entityType,
    entityId:   l.entityId,
    ipAddress:  l.ipAddress,
    userAgent:  l.userAgent,
    createdAt:  l.createdAt.toISOString(),
  }))

  return { data, pagination: calculatePagination(total, page, limit) }
}

export async function getAuditLogById(id: string): Promise<AuditLogDetail | null> {
  await requireAdmin()

  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  })

  if (!log) return null

  return {
    id:         log.id,
    userId:     log.userId,
    userEmail:  log.userEmail,
    userName:   log.user?.name ?? null,
    action:     log.action,
    entityType: log.entityType,
    entityId:   log.entityId,
    metadata:   log.metadata as Record<string, unknown> | null,
    ipAddress:  log.ipAddress,
    userAgent:  log.userAgent,
    createdAt:  log.createdAt.toISOString(),
  }
}

export async function exportAuditLogsCsv(filters: AuditLogFilters = {}): Promise<string> {
  await requireAdmin()

  const where: any = {}
  if (filters.userId)     where.userId     = filters.userId
  if (filters.action)     where.action     = filters.action
  if (filters.entityType) where.entityType = filters.entityType
  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
    if (filters.endDate)   where.createdAt.lte = new Date(filters.endDate + 'T23:59:59.999Z')
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  })

  const header = 'Date,Utilisateur,Email,Action,Module,Référence,IP'
  const rows = logs.map(l => [
    new Date(l.createdAt).toLocaleString('fr-FR'),
    l.user?.name ?? '— système —',
    l.userEmail ?? '',
    l.action,
    l.entityType,
    l.entityId ?? '',
    l.ipAddress ?? '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

  return [header, ...rows].join('\n')
}
