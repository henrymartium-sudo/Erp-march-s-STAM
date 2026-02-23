// lib/alertes/engine/recipient-resolver.ts

import { prisma } from "@/lib/db/prisma"

export interface Recipient {
  userId: string
  email: string
  role: string
}

/**
 * Résout la liste des destinataires d'une règle
 * en fusionnant les rôles ciblés et les users individuels.
 */
export async function resolveRecipients(
  targetRoles: string[],
  targetUserIds: string[]
): Promise<Recipient[]> {
  const conditions = []

  if (targetRoles.length > 0) {
    conditions.push({ role: { in: targetRoles as any } })
  }
  if (targetUserIds.length > 0) {
    conditions.push({ id: { in: targetUserIds } })
  }

  if (conditions.length === 0) return []

  const users = await prisma.user.findMany({
    where: { OR: conditions },
    select: { id: true, email: true, role: true },
  })

  // Dédupliquer par email (au cas où un user est ciblé ET via son rôle)
  const seen = new Set<string>()
  return users
    .filter((u) => {
      if (seen.has(u.email)) return false
      seen.add(u.email)
      return true
    })
    .map((u) => ({ userId: u.id, email: u.email, role: u.role as string }))
}
