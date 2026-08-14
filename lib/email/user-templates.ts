/**
 * Template email — notification ADMIN pour une nouvelle demande d'accès Google
 */

interface PendingUserRequestEmailParams {
  email: string
  name: string
}

export function pendingUserRequestEmailTemplate({ email, name }: PendingUserRequestEmailParams): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const adminUrl = `${baseUrl}/admin/utilisateurs`

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8" /></head>
    <body style="margin:0;padding:0;background:#f8f9fa;font-family:'DM Sans',system-ui,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:40px 16px;">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
              <tr>
                <td style="background:#1E3A5F;padding:28px 32px;">
                  <span style="color:#C49A1A;font-size:22px;font-weight:900;letter-spacing:2px;">STAM</span>
                  <span style="color:#6b8cad;font-size:11px;display:block;letter-spacing:2px;margin-top:2px;text-transform:uppercase;">Marchés Publics</span>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <h1 style="margin:0 0 12px;font-size:20px;color:#1E3A5F;font-weight:700;">
                    Nouvelle demande d'accès
                  </h1>
                  <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">
                    <strong>${name}</strong> (${email}) a tenté de se connecter avec Google et n'a pas de compte STAM existant.
                    Un compte a été créé en attente de validation.
                  </p>
                  <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                    Rendez-vous sur la page de gestion des utilisateurs pour approuver (avec attribution d'un rôle) ou refuser cette demande.
                  </p>
                  <a href="${adminUrl}"
                     style="display:inline-block;background:#1E3A5F;color:#fff;text-decoration:none;
                            padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
                    Gérer les demandes d'accès
                  </a>
                </td>
              </tr>
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
  `
}
