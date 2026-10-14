// lib/email/envoi-destinataires.ts
/** Envoi d'un même mail à plusieurs destinataires, un message par destinataire. */

export const MAX_DESTINATAIRES = 20

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ResultatEnvoi {
  envoyes: number
  echecs: { email: string; erreur: string }[]
}

export interface Transporteur {
  sendMail(options: { from: string; to: string; subject: string; html: string; text: string }): Promise<unknown>
}

/** Retire espaces et doublons (casse ignorée), écarte les adresses invalides. */
export function nettoyerDestinataires(emails: string[]): string[] {
  const vus = new Set<string>()
  for (const brut of emails) {
    const email = brut.trim().toLowerCase()
    if (EMAIL.test(email)) vus.add(email)
  }
  return [...vus]
}

/**
 * Un message par destinataire : les adresses ne sont pas exposées entre elles et un refus
 * n'empêche pas les autres envois. Envois en série pour ménager le quota du serveur SMTP.
 */
export async function envoyerAChaqueDestinataire(
  transporteur: Transporteur,
  from: string,
  destinataires: string[],
  contenu: { subject: string; html: string; text: string }
): Promise<ResultatEnvoi> {
  const resultat: ResultatEnvoi = { envoyes: 0, echecs: [] }
  for (const email of nettoyerDestinataires(destinataires)) {
    try {
      await transporteur.sendMail({ from, to: email, ...contenu })
      resultat.envoyes++
    } catch (err) {
      resultat.echecs.push({ email, erreur: err instanceof Error ? err.message : 'erreur inconnue' })
    }
  }
  return resultat
}
