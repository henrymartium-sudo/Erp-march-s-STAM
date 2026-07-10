import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAuth } from "@/lib/utils/permissions"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const where = {
      recipientUserId: userId,
      channel: "IN_APP",
      status: "PENDING",
    } as const

    // La grande majorité des polls (toutes les 30 s) ne trouve aucune
    // notification : sans ce garde, l'include ci-dessous déclenche quand
    // même une requête de relations « alert_events WHERE id IN (NULL) ».
    const count = await prisma.alertNotification.count({ where })
    if (count === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const notifications = await prisma.alertNotification.findMany({
      where,
      include: {
        event: { select: { type: true, sourceModule: true, referenceId: true, payload: true } },
        rule:  { select: { name: true, priority: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ success: true, data: notifications })
  } catch {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }
}
