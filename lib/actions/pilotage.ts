'use server'

import { z } from 'zod'
import { StatutMarche, StatutOpportunite } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/permissions'
import {
  calculerConversion, calculerEchecs, calculerEcartPrix, calculerQualite,
  type MarchePilotage, type LotPilotage, type StatutFactureLite,
  type ResultatConversion, type ResultatEchecs, type ResultatEcartPrix, type ElementQualite,
} from '@/lib/pilotage/calculs'

export interface PilotageData {
  conversion: ResultatConversion
  echecs: ResultatEchecs
  ecartPrix: ResultatEcartPrix
  qualite: ElementQualite[]
}

const periodeSchema = z.object({ dateDebut: z.string().datetime(), dateFin: z.string().datetime() })

const STATUTS_ATTRIBUES: StatutMarche[] = [
  'ATTRIBUE_DEFINITIVEMENT', 'EN_ATTENTE_LIVRAISON_OS', 'EN_EXECUTION', 'EXECUTE_ATTENTE_GARANTIES', 'CLOTURE',
]
const STATUTS_OPP_SOUMISES: StatutOpportunite[] = [
  'SOUMISE', 'OFFRE_SOUMISE', 'EN_ATTENTE_ATTRIBUTION', 'ATTRIBUE_PROVISOIREMENT', 'GAGNEE', 'PERDUE',
]

function renseigne(s: string | null | undefined): boolean {
  return !!s && s.trim().length > 0
}

export async function getPilotageData(input: { dateDebut: string; dateFin: string }): Promise<PilotageData> {
  await requireRole(['ADMIN', 'AVANCE'])
  const p = periodeSchema.parse(input)
  const periode = { dateDebut: new Date(p.dateDebut), dateFin: new Date(p.dateFin) }

  // Les calculs filtrent la période eux-mêmes : volume de quelques centaines de lignes.
  const marchesRaw = await prisma.marche.findMany({
    where: { statut: { not: 'OPPORTUNITE_IDENTIFIEE' } },
    select: {
      id: true, numero: true, objet: true, statut: true, montant: true,
      dateAttributionDefinitive: true, dateDepotOffre: true, dateFinPrevue: true,
      motifsResiliation: true, motifsAnnulation: true, motifsInfructueux: true,
      factures: { select: { statut: true, montantTTC: true } },
      historiqueStatuts: {
        where: { nouveauStatut: { in: STATUTS_ATTRIBUES } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  })

  const marches: MarchePilotage[] = marchesRaw.map((m) => {
    const premierPassage = m.historiqueStatuts[0]?.createdAt ?? null
    const motif = m.statut === 'RESILIE' ? m.motifsResiliation
      : m.statut === 'ANNULE' ? m.motifsAnnulation
      : m.statut === 'INFRUCTUEUX' ? m.motifsInfructueux : null
    return {
      id: m.id, numero: m.numero, objet: m.objet, statut: m.statut, montant: Number(m.montant),
      dateAttribution: m.dateAttributionDefinitive ?? premierPassage,
      dateDepotOffre: m.dateDepotOffre,
      attribueUnJour: m.dateAttributionDefinitive !== null || STATUTS_ATTRIBUES.includes(m.statut) || premierPassage !== null,
      factures: m.factures.map((f) => ({ statut: f.statut as StatutFactureLite, montantTTC: Number(f.montantTTC) })),
      motifRenseigne: renseigne(motif),
      dateFinPrevue: m.dateFinPrevue,
    }
  })

  const lotsRaw = await prisma.lot.findMany({
    select: {
      id: true, numero: true, resultat: true, montantPropose: true, montantOffreConcurrent: true, motifPerte: true,
      opportunite: { select: { id: true, reference: true, objet: true, statut: true, dateLimite: true } },
    },
  })

  const lots: LotPilotage[] = lotsRaw.map((l) => ({
    id: l.id,
    opportuniteId: l.opportunite.id,
    libelle: `${l.opportunite.reference ?? l.opportunite.objet} — Lot ${l.numero}`,
    resultat: l.resultat,
    montantPropose: l.montantPropose === null ? null : Number(l.montantPropose),
    montantOffreConcurrent: l.montantOffreConcurrent === null ? null : Number(l.montantOffreConcurrent),
    dateDepot: l.opportunite.dateLimite,
    soumis: STATUTS_OPP_SOUMISES.includes(l.opportunite.statut),
    motifRenseigne: renseigne(l.motifPerte),
  }))

  const conversion = calculerConversion(marches, periode)
  const echecs = calculerEchecs(lots, marches, periode)
  return {
    conversion,
    echecs,
    ecartPrix: calculerEcartPrix(lots, periode),
    qualite: calculerQualite(marches, lots, conversion, echecs, new Date()),
  }
}
