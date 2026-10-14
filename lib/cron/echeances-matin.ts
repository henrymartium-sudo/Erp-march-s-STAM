// lib/cron/echeances-matin.ts
/** Orchestration du mail « échéances du matin » : charger, classer, construire, envoyer. */

import { createEmailTransport } from '@/lib/config/email'
import { chargerOffresARendre } from '@/lib/echeances/charger'
import { grouperEcheances, type OffreEcheance } from '@/lib/echeances/classement'
import { buildEcheancesMatinEmail } from '@/lib/email/echeances-matin-templates'
import { envoyerAChaqueDestinataire, type ResultatEnvoi, type Transporteur } from '@/lib/email/envoi-destinataires'

export interface DependancesEcheances {
  charger: (now: Date) => Promise<OffreEcheance[]>
  transporteur: Transporteur
  from: string
  baseUrl: string
}

function dependancesParDefaut(): DependancesEcheances {
  return {
    charger: chargerOffresARendre,
    transporteur: createEmailTransport(),
    from: process.env.SMTP_FROM ?? 'noreply@erp-marches.local',
    baseUrl: (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  }
}

/** Même chemin pour le cron et l'envoi manuel. Le mail part même sans offre à rendre. */
export async function envoyerEcheancesMatin(
  destinataires: string[],
  now: Date,
  deps: DependancesEcheances = dependancesParDefaut()
): Promise<ResultatEnvoi> {
  const groupes = grouperEcheances(await deps.charger(now), now)
  const contenu = buildEcheancesMatinEmail(groupes, now, deps.baseUrl)
  return envoyerAChaqueDestinataire(deps.transporteur, deps.from, destinataires, contenu)
}
