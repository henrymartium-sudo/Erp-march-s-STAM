'use server'

import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { createEmailTransport, emailConfig } from '@/lib/config/email'

const schema = z.object({
  email: z.string().email('Email invalide'),
})

export async function forgotPassword(formData: FormData) {
  const result = schema.safeParse({ email: formData.get('email') })

  // Toujours renvoyer succès pour éviter l'énumération d'emails
  if (!result.success) {
    return { success: true }
  }

  const { email } = result.data

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    return { success: true }
  }

  // Invalider les tokens précédents non utilisés
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  })

  // Générer un token sécurisé
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 heure

  await prisma.passwordReset.create({
    data: { userId: user.id, token, expiresAt },
  })

  // Construire l'URL de réinitialisation
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  // Envoyer l'email
  try {
    const transporter = createEmailTransport()
    await transporter.sendMail({
      from: emailConfig.from,
      to: email,
      subject: 'Réinitialisation de votre mot de passe — STAM',
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8" /></head>
        <body style="margin:0;padding:0;background:#f8f9fa;font-family:'DM Sans',system-ui,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:40px 16px;">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background:#1E3A5F;padding:28px 32px;">
                      <span style="color:#C49A1A;font-size:22px;font-weight:900;letter-spacing:2px;">STAM</span>
                      <span style="color:#6b8cad;font-size:11px;display:block;letter-spacing:2px;margin-top:2px;text-transform:uppercase;">Marchés Publics</span>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:32px;">
                      <h1 style="margin:0 0 12px;font-size:20px;color:#1E3A5F;font-weight:700;">
                        Réinitialisation de mot de passe
                      </h1>
                      <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">
                        Bonjour ${user.name},
                      </p>
                      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                        Vous avez demandé la réinitialisation de votre mot de passe.
                        Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
                        Ce lien est valide pendant <strong>1 heure</strong>.
                      </p>
                      <a href="${resetUrl}"
                         style="display:inline-block;background:#1E3A5F;color:#fff;text-decoration:none;
                                padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
                        Réinitialiser mon mot de passe
                      </a>
                      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">
                        Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                        Votre mot de passe ne sera pas modifié.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #f3f4f6;">
                      <p style="margin:0;color:#9ca3af;font-size:11px;">
                        © ${new Date().getFullYear()} STAM — Système sécurisé
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    })
  } catch (err) {
    console.error('[forgotPassword] Erreur envoi email:', err)
    // Ne pas lever l'erreur côté client pour ne pas révéler le statut
  }

  return { success: true }
}
