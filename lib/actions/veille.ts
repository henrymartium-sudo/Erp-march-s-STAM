'use server'

import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/permissions'
import { STATUTS_OPPORTUNITE_OFFRE_SOUMISE } from '@/lib/constants/marche'
import { capturerOperation } from '@/lib/pilotage/capturer-operation'
import { intituleLot } from '@/lib/pilotage/calculs'
import { calculerVeille, type LotVeille, type ResultatVeille } from '@/lib/veille/calculs'

export type VeilleData =
  | { status: 'success'; value: ResultatVeille }
  | { status: 'error'; message: string }

const periodeSchema = z.object({ dateDebut: z.string().datetime(), dateFin: z.string().datetime() })

function renseigne(s: string | null | undefined): s is string {
  return !!s && s.trim().length > 0
}

/** Veille concurrentielle : lots perdus de la période, lus sous quatre angles. Lecture seule. */
export async function getVeilleData(input: { dateDebut: string; dateFin: string }): Promise<VeilleData> {
  await requireRole(['ADMIN', 'AVANCE'])
  const p = periodeSchema.parse(input)
  const periode = { dateDebut: new Date(p.dateDebut), dateFin: new Date(p.dateFin) }

  const resultat = await capturerOperation(async () => {
    // Volume de quelques centaines de lots : le filtre (résultat, statut, période) se fait en mémoire.
    const lotsRaw = await prisma.lot.findMany({
      select: {
        id: true, numero: true, resultat: true, montantPropose: true, montantOffreConcurrent: true,
        motifPerte: true, concurrentGagnant: true,
        vehiculesProposes: { select: { marque: true, modele: true }, orderBy: { ordre: 'asc' } },
        opportunite: {
          select: { id: true, reference: true, objet: true, statut: true, dateLimite: true, autoriteContractante: true },
        },
      },
    })

    const lots: LotVeille[] = lotsRaw.map((l) => ({
      id: l.id,
      opportuniteId: l.opportunite.id,
      libelle: intituleLot(l.opportunite.reference, l.opportunite.objet, l.numero),
      autorite: l.opportunite.autoriteContractante,
      resultat: l.resultat,
      soumis: STATUTS_OPPORTUNITE_OFFRE_SOUMISE.includes(l.opportunite.statut),
      dateDepot: l.opportunite.dateLimite,
      montantPropose: l.montantPropose === null ? null : Number(l.montantPropose),
      montantOffreConcurrent: l.montantOffreConcurrent === null ? null : Number(l.montantOffreConcurrent),
      concurrentGagnant: renseigne(l.concurrentGagnant) ? l.concurrentGagnant.trim() : null,
      motif: renseigne(l.motifPerte) ? l.motifPerte.trim() : null,
      vehicules: l.vehiculesProposes,
    }))
    return calculerVeille(lots, periode)
  })

  if (resultat.status === 'success') return resultat
  console.error('[getVeilleData] calcul indisponible', resultat.error)
  return { status: 'error', message: 'Veille indisponible. Réessayez.' }
}
