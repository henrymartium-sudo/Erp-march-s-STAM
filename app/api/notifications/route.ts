import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAuth } from "@/lib/utils/permissions"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const notifications = await prisma.alertNotification.findMany({
      where: {
        recipientUserId: userId,
        channel: "IN_APP",
        status: "PENDING",
      },
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
