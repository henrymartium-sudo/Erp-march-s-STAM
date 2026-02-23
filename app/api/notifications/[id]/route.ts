import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAuth } from "@/lib/utils/permissions"

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const notif = await prisma.alertNotification.findUnique({ where: { id } })
    if (!notif || notif.recipientUserId !== session.user.id) {
      return NextResponse.json({ error: "Non trouvé" }, { status: 404 })
    }

    await prisma.alertNotification.update({
      where: { id },
      data: { status: "READ", readAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
