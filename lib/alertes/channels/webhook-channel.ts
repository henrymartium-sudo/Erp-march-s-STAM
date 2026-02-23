// lib/alertes/channels/webhook-channel.ts

/**
 * Envoie un payload JSON vers une URL webhook externe.
 * Timeout 5s, pas de retry (status FAILED loggué).
 */
export async function sendWebhookChannel(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; log: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    return {
      success: res.ok,
      log: `status:${res.status}`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, log: `ERROR:${msg}` }
  }
}
