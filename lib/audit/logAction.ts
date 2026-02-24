import { headers } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'

interface LogActionParams {
  userId?:    string | null
  userEmail?: string | null
  action:     string
  entityType: string
  entityId?:  string | null
  metadata?:  Record<string, unknown>
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    const headersList = await headers()
    const ipAddress =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      headersList.get('x-real-ip') ??
      null
    const userAgent = headersList.get('user-agent') ?? null

    await prisma.auditLog.create({
      data: {
        userId:     params.userId    ?? null,
        userEmail:  params.userEmail ?? null,
        action:     params.action,
        entityType: params.entityType,
        entityId:   params.entityId  ?? null,
        metadata:   (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress,
        userAgent,
      },
    })
  } catch {
    // Silencieux — ne jamais interrompre le flux métier
  }
}
