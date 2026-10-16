// lib/echeances/charger.ts
import { prisma } from '@/lib/db/prisma'
import { STATUTS_A_RENDRE, type OffreEcheance } from './classement'

/** Offres à statut « avant soumission » dont la date limite est renseignée, quelle que soit son éloignement (le classement tranche). */
export async function chargerOffresARendre(_now: Date): Promise<OffreEcheance[]> {
  return prisma.opportunite.findMany({
    where: {
      statut: { in: STATUTS_A_RENDRE },
      dateLimite: { not: null },
    },
    select: {
      id: true, reference: true, objet: true, autoriteContractante: true, statut: true, dateLimite: true,
      lots: { select: { numero: true, montantPropose: true, dossier: { select: { progression: true } } } },
    },
  })
}
