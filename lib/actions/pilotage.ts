'use server'

import { subYears } from 'date-fns'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/permissions'
import { STATUTS_ATTRIBUES, STATUTS_OPPORTUNITE_OFFRE_SOUMISE } from '@/lib/constants/marche'
import { capturerOperation, type ResultatOperation } from '@/lib/pilotage/capturer-operation'
import {
  calculerConversion, calculerIssueOffres, calculerEcartPrix, calculerQualite, estAttribueUnJour,
  calculerEvolutionPoints,
  type MarchePilotage, type LotPilotage, type StatutFactureLite,
  type ResultatConversion, type ResultatIssueOffres, type ResultatEcartPrix, type ElementQualite,
} from '@/lib/pilotage/calculs'

export type BlocPilotage<T> =
  | { status: 'success'; value: T }
  | { status: 'error'; message: string }

export interface PilotageData {
  conversion: BlocPilotage<{ resultat: ResultatConversion; evolution: number | null }>
  offres: BlocPilotage<{ resultat: ResultatIssueOffres; evolution: number | null }>
  ecartPrix: BlocPilotage<{ resultat: ResultatEcartPrix; evolution: number | null }>
  qualite: BlocPilotage<ElementQualite[]>
  evolution: {
    periodeReference: { dateDebut: string; dateFin: string }
  }
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
  const periodeReference = {
    dateDebut: subYears(periode.dateDebut, 1),
    dateFin: subYears(periode.dateFin, 1),
  }

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
        return {
          id: m.id, numero: m.numero, objet: m.objet, statut: m.statut, montant: Number(m.montant),
          dateAttribution: m.dateAttributionDefinitive ?? premierPassage,
          dateDepotOffre: m.dateDepotOffre,
          attribueUnJour: estAttribueUnJour(m.statut, m.dateAttributionDefinitive, premierPassage),
          factures: m.factures.map((f) => ({ statut: f.statut as StatutFactureLite, montantTTC: Number(f.montantTTC) })),
          motifRenseigne: renseigne(motif),
          dateFinPrevue: m.dateFinPrevue,
          aOpportunite: m.opportuniteId !== null || m.opportunites.length > 0,
        }
      })
    }),
    capturerOperation(async (): Promise<LotPilotage[]> => {
      const lotsRaw = await prisma.lot.findMany({
        select: {
          id: true, numero: true, resultat: true, montantPropose: true, montantOffreConcurrent: true, motifPerte: true,
          opportunite: { select: { id: true, reference: true, objet: true, statut: true, dateLimite: true } },
        },
      })

      return lotsRaw.map((l) => ({
        id: l.id,
        opportuniteId: l.opportunite.id,
        libelle: `${l.opportunite.reference ?? l.opportunite.objet} — Lot ${l.numero}`,
        resultat: l.resultat,
        montantPropose: l.montantPropose === null ? null : Number(l.montantPropose),
        montantOffreConcurrent: l.montantOffreConcurrent === null ? null : Number(l.montantOffreConcurrent),
        dateDepot: l.opportunite.dateLimite,
        soumis: STATUTS_OPPORTUNITE_OFFRE_SOUMISE.includes(l.opportunite.statut),
        motifRenseigne: renseigne(l.motifPerte),
      }))
    }),
  ])

  const conversionCapture = await capturerOperation(() => {
    if (marchesCapture.status === 'error') throw marchesCapture.error
    const resultat = calculerConversion(marchesCapture.value, periode)
    const reference = calculerConversion(marchesCapture.value, periodeReference)
    return {
      resultat,
      evolution: calculerEvolutionPoints(resultat.taux, reference.taux),
    }
  })

  const offresCapture = await capturerOperation(() => {
    if (lotsCapture.status === 'error') throw lotsCapture.error
    const resultat = calculerIssueOffres(lotsCapture.value, periode)
    const reference = calculerIssueOffres(lotsCapture.value, periodeReference)
    return {
      resultat,
      evolution: calculerEvolutionPoints(resultat.tauxPerte, reference.tauxPerte),
    }
  })

  const ecartPrixCapture = await capturerOperation(() => {
    if (lotsCapture.status === 'error') throw lotsCapture.error
    const resultat = calculerEcartPrix(lotsCapture.value, periode)
    const reference = calculerEcartPrix(lotsCapture.value, periodeReference)
    return {
      resultat,
      evolution: calculerEvolutionPoints(
        resultat.suffisant ? resultat.ecartMoyen : null,
        reference.suffisant ? reference.ecartMoyen : null,
      ),
    }
  })

  const qualiteCapture = await capturerOperation(() => {
    if (marchesCapture.status === 'error') throw marchesCapture.error
    if (lotsCapture.status === 'error') throw lotsCapture.error
    if (conversionCapture.status === 'error') throw conversionCapture.error
    if (offresCapture.status === 'error') throw offresCapture.error
    return calculerQualite(
      marchesCapture.value,
      lotsCapture.value,
      conversionCapture.value.resultat,
      offresCapture.value.resultat,
      new Date(),
    )
  })

  return {
    conversion: publierBloc('conversion', conversionCapture, 'Indicateur indisponible. Réessayez.'),
    offres: publierBloc('issue des offres', offresCapture, 'Indicateur indisponible. Réessayez.'),
    ecartPrix: publierBloc('écart de prix', ecartPrixCapture, 'Indicateur indisponible. Réessayez.'),
    qualite: publierBloc('qualité des données', qualiteCapture, 'Qualité des données indisponible. Réessayez.'),
    evolution: {
      periodeReference: {
        dateDebut: periodeReference.dateDebut.toISOString(),
        dateFin: periodeReference.dateFin.toISOString(),
      },
    },
  }
}
