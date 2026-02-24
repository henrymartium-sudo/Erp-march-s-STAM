/**
 * API Route de test pour le système d'alertes
 * Permet de visualiser les alertes sans envoyer d'emails
 *
 * Usage : GET /api/test-alerts
 * Pas d'authentification requise (uniquement pour dev/test)
 */

import { testAlertsSystem } from "@/lib/actions/alertes";
import { auth } from "@/lib/auth/auth.config";
import { NextResponse } from "next/server";

export async function GET() {
  // Guard ADMIN — route réservée aux admins
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Non autorisé" },
      { status: 401 }
    );
  }

  try {
    const result = await testAlertsSystem();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Test du système d'alertes réussi",
        data: {
          cautions: result.data?.cautions || [],
          marches: result.data?.marches || [],
          emailPreview: result.data?.emailPreview || {},
          summary: {
            cautionsCount: result.data?.cautions.length || 0,
            marchesCount: result.data?.marches.length || 0,
            totalAlerts: (result.data?.cautions.length || 0) + (result.data?.marches.length || 0),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur interne",
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
