// lib/cron/echeances-matin.ts
/** Orchestration du mail « échéances du matin » : charger, classer, construire, envoyer. */

import { createEmailTransport } from '@/lib/config/email'
import { prisma } from '@/lib/db/prisma'
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

/** Un rappel du cron dans cette fenêtre après un envoi réussi n'envoie rien (le cron compare l'heure UTC, un rappel dans la même heure renverrait le mail). */
const FENETRE_ANTI_DOUBLON_MS = 20 * 3_600_000
const ACTION_ENVOI_CRON = 'ECHEANCES_MATIN_CRON_ENVOI'

export interface JournalEnvoiCron {
  dernierEnvoi: (ruleId: string) => Promise<Date | null>
  enregistrer: (ruleId: string, envoyes: number) => Promise<void>
}

const journalParDefaut: JournalEnvoiCron = {
  async dernierEnvoi(ruleId) {
    const ligne = await prisma.auditLog.findFirst({
      where: { action: ACTION_ENVOI_CRON, entityType: 'OpportuniteReportingRule', entityId: ruleId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    return ligne?.createdAt ?? null
  },
  async enregistrer(ruleId, envoyes) {
    await prisma.auditLog.create({
      data: { action: ACTION_ENVOI_CRON, entityType: 'OpportuniteReportingRule', entityId: ruleId, metadata: { envoyes } },
    })
  },
}

/** Chemin du cron : comme `envoyerEcheancesMatin`, avec la garde anti-doublon. L'envoi manuel ne passe pas par ici. */
export async function envoyerEcheancesMatinCron(
  ruleId: string,
  destinataires: string[],
  now: Date,
  journal: JournalEnvoiCron = journalParDefaut,
  deps?: DependancesEcheances
): Promise<{ ignore: boolean; resultat?: ResultatEnvoi }> {
  const dernier = await journal.dernierEnvoi(ruleId)
  if (dernier && now.getTime() - dernier.getTime() < FENETRE_ANTI_DOUBLON_MS) return { ignore: true }
  const resultat = await envoyerEcheancesMatin(destinataires, now, deps)
  if (resultat.envoyes > 0) {
    try {
      await journal.enregistrer(ruleId, resultat.envoyes)
    } catch (err) {
      console.error('⚠️ Envoi effectué mais non consigné (risque de doublon si le cron est rappelé) :', err)
    }
  }
  return { ignore: false, resultat }
}
