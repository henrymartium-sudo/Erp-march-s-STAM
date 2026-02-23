// lib/alertes/engine/publish-event.ts

import { prisma } from "@/lib/db/prisma"
import type { AlertEventType } from "@/lib/alertes/types"
import { processEvent } from "./process-event"

/**
 * Publie un événement métier et déclenche immédiatement son traitement.
 * Point d'entrée unique pour tous les modules (SAV, Marchés, Cautions, Documents).
 */
export async function publishEvent(
  type: AlertEventType,
  sourceModule: string,
  referenceId: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const event = await prisma.alertEvent.create({
      data: { type, sourceModule, referenceId, payload: payload as any },
    })
    // Traitement synchrone (Vercel Hobby : pas de queue async)
    await processEvent(event.id)
  } catch (err) {
    // Ne jamais faire planter l'action métier à cause d'une alerte
    console.error("[AlertEngine] publishEvent error:", err)
  }
}
