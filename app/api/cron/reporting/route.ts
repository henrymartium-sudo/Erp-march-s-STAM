/**
 * app/api/cron/reporting/route.ts
 *
 * Endpoint cron horaire pour le module de reporting email.
 * Déclenché automatiquement par Vercel toutes les heures.
 * Sécurisé par x-vercel-cron ou CRON_SECRET.
 */

import { timingSafeEqual } from "crypto"
import { runReportingCron } from "@/lib/cron/reporting-processor"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    if (!process.env.CRON_SECRET) {
      console.error("❌ CRON_SECRET non configuré")
      return NextResponse.json({ success: false, error: "Configuration manquante" }, { status: 500 })
    }

    const isVercelCron = request.headers.get("x-vercel-cron") === "1"
    const authHeader = request.headers.get("authorization") ?? ""
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    let authorized = false
    try {
      authorized = timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedAuth))
    } catch { authorized = false }

    if (!authorized && !isVercelCron) {
      console.warn("⚠️ Tentative d'accès non autorisée au cron reporting")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const currentHour = new Date().getHours()
    console.log(`📊 Démarrage cron reporting — heure courante : ${currentHour}h`)
    const startTime = Date.now()

    const result = await runReportingCron(currentHour)
    const duration = Date.now() - startTime

    console.log(`✅ Cron reporting terminé en ${duration}ms — ${result.sent} envoi(s), ${result.skipped} ignoré(s)`)

    return NextResponse.json({
      success: true,
      data: { ...result, hour: currentHour, duration: `${duration}ms`, timestamp: new Date().toISOString() },
    }, { status: 200 })
  } catch (error) {
    console.error("❌ Erreur critique cron reporting:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur interne",
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
