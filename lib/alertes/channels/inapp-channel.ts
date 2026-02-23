// lib/alertes/channels/inapp-channel.ts

/**
 * Canal in-app : l'enregistrement AlertNotification avec status=PENDING
 * est suffisant — le polling client le récupère.
 * Cette fonction ne fait rien de plus (le INSERT est fait dans process-event).
 */
export function markInAppReady(): { success: boolean; log: string } {
  return { success: true, log: "in-app:ready" }
}
