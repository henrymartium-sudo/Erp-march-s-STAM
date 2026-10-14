// lib/echeances/charger.ts
import { prisma } from '@/lib/db/prisma'
import { STATUTS_A_RENDRE, type OffreEcheance } from './classement'

const JOUR_MS = 86_400_000

/** Offres à statut « avant soumission » dont la date limite est renseignée et au plus à J+8 (pré-filtre large ; le classement tranche). */
export async function chargerOffresARendre(now: Date): Promise<OffreEcheance[]> {
  return prisma.opportunite.findMany({
    where: {
      statut: { in: STATUTS_A_RENDRE },
      dateLimite: { not: null, lte: new Date(now.getTime() + 8 * JOUR_MS) },
    },
    select: {
      id: true, reference: true, objet: true, autoriteContractante: true, statut: true, dateLimite: true,
      lots: { select: { numero: true, montantPropose: true, dossier: { select: { progression: true } } } },
    },
  })
}
