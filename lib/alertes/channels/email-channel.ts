// lib/alertes/channels/email-channel.ts

import { createEmailTransport } from "@/lib/config/email"

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Envoie un email via Nodemailer.
 * Retourne { success, log }.
 */
export async function sendEmailChannel(
  payload: EmailPayload
): Promise<{ success: boolean; log: string }> {
  try {
    const transport = createEmailTransport()
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM ?? "ERP Marchés <noreply@stam.local>",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })
    return { success: true, log: `messageId:${info.messageId}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, log: `ERROR:${msg}` }
  }
}
