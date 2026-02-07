/**
 * API Route pour cron job quotidien d'alertes
 * Appelé automatiquement par Vercel Cron chaque jour
 *
 * Configuration dans vercel.json :
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-alerts",
 *     "schedule": "0 7 * * *"
 *   }]
 * }
 *
 * Variables d'environnement requises :
 * - CRON_SECRET : Token de sécurité pour authentifier Vercel Cron
 * - SMTP_* : Configuration email (voir lib/config/email.ts)
 * - ALERT_EMAIL_TO : Destinataires des alertes (séparés par virgule)
 */

import { sendDailyAlertsEmail } from "@/lib/actions/alertes";
import { NextRequest, NextResponse } from "next/server";

/**
 * Handler GET pour le cron job quotidien
 * Sécurisé par Authorization header avec CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification (Bearer token)
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      console.error("❌ CRON_SECRET non configuré");
      return NextResponse.json(
        {
          success: false,
          error: "Configuration manquante : CRON_SECRET",
        },
        { status: 500 }
      );
    }

    if (authHeader !== expectedAuth) {
      console.warn("⚠️  Tentative d'accès non autorisée au cron job");
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // 2. Exécuter l'envoi des alertes
    console.log("🔔 Démarrage du cron job quotidien d'alertes...");
    const startTime = Date.now();

    const result = await sendDailyAlertsEmail();

    const duration = Date.now() - startTime;

    // 3. Logger le résultat
    if (result.success) {
      console.log(
        `✅ Cron job terminé avec succès en ${duration}ms`
      );
      console.log(
        `   - ${result.data?.cautionsCount || 0} caution(s) alertée(s)`
      );
      console.log(
        `   - ${result.data?.marchesCount || 0} marché(s) alerté(s)`
      );

      return NextResponse.json(
        {
          success: true,
          message: "Alertes quotidiennes envoyées",
          data: {
            cautionsCount: result.data?.cautionsCount || 0,
            marchesCount: result.data?.marchesCount || 0,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 200 }
      );
    } else {
      console.error(`❌ Échec du cron job : ${result.error}`);

      return NextResponse.json(
        {
          success: false,
          error: result.error || "Erreur lors de l'envoi des alertes",
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Erreur critique dans le cron job :", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur interne du serveur",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Désactiver la mise en cache pour cette route
 * Les cron jobs doivent toujours être exécutés
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Requis pour nodemailer (pas Edge compatible)
