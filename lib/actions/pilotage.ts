'use server'

import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/permissions'
import { STATUTS_ATTRIBUES, STATUTS_OPPORTUNITE_OFFRE_SOUMISE } from '@/lib/constants/marche'
import { capturerOperation, type ResultatOperation } from '@/lib/pilotage/capturer-operation'
import {
  calculerConversion, calculerIssueOffres, calculerEcartPrix, calculerQualite, calculerMarchesHistoriques, estAttribueUnJour, intituleLot,
  type MarchePilotage, type LotPilotage, type StatutFactureLite,
  type ResultatConversion, type ResultatIssueOffres, type ResultatEcartPrix, type ResultatMarchesHistoriques, type ElementQualite,
} from '@/lib/pilotage/calculs'

export type BlocPilotage<T> =
  | { status: 'success'; value: T }
  | { status: 'error'; message: string }

export interface PilotageData {
  conversion: BlocPilotage<ResultatConversion>
  offres: BlocPilotage<ResultatIssueOffres>
  ecartPrix: BlocPilotage<ResultatEcartPrix>
  historiques: BlocPilotage<ResultatMarchesHistoriques>
  qualite: BlocPilotage<ElementQualite[]>
}

const periodeSchema = z.object({ dateDebut: z.string().datetime(), dateFin: z.string().datetime() })

function renseigne(s: string | null | undefined): boolean {
  return !!s && s.trim().length > 0
}

function publierBloc<T>(
  nom: string,
  resultat: ResultatOperation<T>,
  message: string,
): BlocPilotage<T> {
  if (resultat.status === 'success') return resultat
  console.error(`[getPilotageData] Bloc ${nom} indisponible`, resultat.error)
  return { status: 'error', message }
}

export async function getPilotageData(input: { dateDebut: string; dateFin: string }): Promise<PilotageData> {
  await requireRole(['ADMIN', 'AVANCE'])
  const p = periodeSchema.parse(input)
  const periode = { dateDebut: new Date(p.dateDebut), dateFin: new Date(p.dateFin) }

  const [marchesCapture, lotsCapture] = await Promise.all([
    capturerOperation(async (): Promise<MarchePilotage[]> => {
      // Les calculs filtrent la période eux-mêmes : volume de quelques centaines de lignes.
      const marchesRaw = await prisma.marche.findMany({
        where: { statut: { not: 'OPPORTUNITE_IDENTIFIEE' } },
        select: {
          id: true, numero: true, objet: true, statut: true, montant: true,
          dateAttributionDefinitive: true, dateDepotOffre: true, dateFinPrevue: true,
          opportuniteId: true, opportunites: { select: { id: true }, take: 1 },
          motifsResiliation: true, motifsAnnulation: true, motifsInfructueux: true,
          concurrentGagnant: true, dateInfructueux: true, dateAnnulation: true, dateResiliation: true,
          factures: { select: { statut: true, montantTTC: true } },
          // Pas de filtre SQL sur nouveauStatut : la colonne est en TEXT en production (enum dans le
          // schéma), la comparaison text = "StatutMarche" y échoue. Filtrage en mémoire ci-dessous.
          historiqueStatuts: {
            select: { createdAt: true, nouveauStatut: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      return marchesRaw.map((m) => {
        const premierPassage = m.historiqueStatuts.find((h) => STATUTS_ATTRIBUES.includes(h.nouveauStatut))?.createdAt ?? null
        const motif = m.statut === 'RESILIE' ? m.motifsResiliation
          : m.statut === 'ANNULE' ? m.motifsAnnulation
          : m.statut === 'INFRUCTUEUX' ? m.motifsInfructueux : null
        const dateStatut = m.statut === 'INFRUCTUEUX' ? m.dateInfructueux
          : m.statut === 'ANNULE' ? m.dateAnnulation
          : m.statut === 'RESILIE' ? m.dateResiliation : null
        // historiqueStatuts est trié par createdAt croissant : le dernier élément est le plus récent.
        const dernierHistorique = m.historiqueStatuts.at(-1)?.createdAt ?? null
        return {
          id: m.id, numero: m.numero, objet: m.objet, statut: m.statut, montant: Number(m.montant),
          dateAttribution: m.dateAttributionDefinitive ?? premierPassage,
          dateDepotOffre: m.dateDepotOffre,
          attribueUnJour: estAttribueUnJour(m.statut, m.dateAttributionDefinitive, premierPassage),
          factures: m.factures.map((f) => ({ statut: f.statut as StatutFactureLite, montantTTC: Number(f.montantTTC) })),
          motifRenseigne: renseigne(motif),
          dateFinPrevue: m.dateFinPrevue,
          aOpportunite: m.opportuniteId !== null || m.opportunites.length > 0,
          concurrentGagnant: renseigne(m.concurrentGagnant) ? m.concurrentGagnant!.trim() : null,
          dateDernierStatut: dateStatut ?? dernierHistorique,
        }
      })
    }),
    capturerOperation(async (): Promise<LotPilotage[]> => {
      const lotsRaw = await prisma.lot.findMany({
        select: {
          id: true, numero: true, resultat: true, montantPropose: true, montantOffreConcurrent: true, motifPerte: true,
          concurrentGagnant: true,
          opportunite: { select: { id: true, reference: true, objet: true, statut: true, dateLimite: true, autoriteContractante: true } },
        },
      })

      return lotsRaw.map((l) => ({
        id: l.id,
        opportuniteId: l.opportunite.id,
        libelle: intituleLot(l.opportunite.reference, l.opportunite.objet, l.numero),
        autorite: l.opportunite.autoriteContractante,
        resultat: l.resultat,
        montantPropose: l.montantPropose === null ? null : Number(l.montantPropose),
        montantOffreConcurrent: l.montantOffreConcurrent === null ? null : Number(l.montantOffreConcurrent),
        concurrentGagnant: renseigne(l.concurrentGagnant) ? l.concurrentGagnant!.trim() : null,
        motif: renseigne(l.motifPerte) ? l.motifPerte!.trim() : null,
        dateDepot: l.opportunite.dateLimite,
        soumis: STATUTS_OPPORTUNITE_OFFRE_SOUMISE.includes(l.opportunite.statut),
        motifRenseigne: renseigne(l.motifPerte),
      }))
    }),
  ])

  const conversionCapture = await capturerOperation(() => {
    if (marchesCapture.status === 'error') throw marchesCapture.error
    return calculerConversion(marchesCapture.value, periode)
  })

  const offresCapture = await capturerOperation(() => {
    if (lotsCapture.status === 'error') throw lotsCapture.error
    return calculerIssueOffres(lotsCapture.value, periode)
  })

  const ecartPrixCapture = await capturerOperation(() => {
    if (lotsCapture.status === 'error') throw lotsCapture.error
    return calculerEcartPrix(lotsCapture.value, periode)
  })

  const historiquesCapture = await capturerOperation(() => {
    if (marchesCapture.status === 'error') throw marchesCapture.error
    return calculerMarchesHistoriques(marchesCapture.value, periode)
  })

  const qualiteCapture = await capturerOperation(() => {
    if (marchesCapture.status === 'error') throw marchesCapture.error
    if (lotsCapture.status === 'error') throw lotsCapture.error
    if (conversionCapture.status === 'error') throw conversionCapture.error
    if (offresCapture.status === 'error') throw offresCapture.error
    return calculerQualite(
      marchesCapture.value,
      lotsCapture.value,
      conversionCapture.value,
      offresCapture.value,
      new Date(),
    )
  })

  return {
    conversion: publierBloc('conversion', conversionCapture, 'Indicateur indisponible. Réessayez.'),
    offres: publierBloc('issue des offres', offresCapture, 'Indicateur indisponible. Réessayez.'),
    ecartPrix: publierBloc('écart de prix', ecartPrixCapture, 'Indicateur indisponible. Réessayez.'),
    historiques: publierBloc('marchés historiques', historiquesCapture, 'Indicateur indisponible. Réessayez.'),
    qualite: publierBloc('qualité des données', qualiteCapture, 'Qualité des données indisponible. Réessayez.'),
  }
}
