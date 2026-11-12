'use server'

import type { StatutMarche } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { requireRead } from '@/lib/utils/permissions'
import { STATUTS_OPPORTUNITE_OFFRE_SOUMISE } from '@/lib/constants/marche'
import { PHASE_STATUTS } from '@/lib/utils/opportunite-filters'
import { capturerOperation, type ResultatOperation } from '@/lib/pilotage/capturer-operation'
import { intituleLot, type LotPilotage, type StatutFactureLite } from '@/lib/pilotage/calculs'
import { JOURS_MOIS } from '@/lib/tableau-de-bord/dates'
import { droitsTableauDeBord } from '@/lib/tableau-de-bord/droits'
import {
  construireATraiter,
  type CautionEcheances, type FactureEcheances, type MarcheEcheances, type OpportuniteEcheances, type ResultatATraiter,
} from '@/lib/tableau-de-bord/a-traiter'
import {
  voyantCautions, voyantDepots, voyantEncaissements, voyantResteAFacturer, voyantTauxSucces,
  type DetailEncaissements, type DetailResteAFacturer, type MarcheReception, type OpportuniteDepot, type Voyant,
} from '@/lib/tableau-de-bord/voyants'
import { calculerPipeline } from '@/lib/tableau-de-bord/pipeline'

export type BlocTableauDeBord<T> = { status: 'success'; value: T } | { status: 'error'; message: string }

export interface TableauDeBordData {
  aTraiter: BlocTableauDeBord<ResultatATraiter>
  pipeline: BlocTableauDeBord<ReturnType<typeof calculerPipeline>>
  voyants: {
    /** null = rôle sans accès aux finances */
    encaissements: BlocTableauDeBord<Voyant<DetailEncaissements>> | null
    cautions: BlocTableauDeBord<ReturnType<typeof voyantCautions>>
    tauxSucces: BlocTableauDeBord<ReturnType<typeof voyantTauxSucces>>
    depots: BlocTableauDeBord<ReturnType<typeof voyantDepots>>
    resteAFacturer: BlocTableauDeBord<Voyant<DetailResteAFacturer>> | null
  }
}

const STATUTS_MARCHES_SUIVIS: StatutMarche[] = ['EN_ATTENTE_LIVRAISON_OS', 'EN_EXECUTION', 'EXECUTE_ATTENTE_GARANTIES']
const MESSAGE_ERREUR = 'Bloc indisponible. Réessayez.'

function publierBloc<T>(nom: string, resultat: ResultatOperation<T>): BlocTableauDeBord<T> {
  if (resultat.status === 'success') return resultat
  console.error(`[getTableauDeBordData] Bloc ${nom} indisponible`, resultat.error)
  return { status: 'error', message: MESSAGE_ERREUR }
}

/** Calcule un bloc à partir de lectures déjà capturées : une lecture en erreur met le bloc en erreur. */
function depuis<T>(lectures: ResultatOperation<unknown>[], calcul: () => T): Promise<ResultatOperation<T>> {
  return capturerOperation(() => {
    for (const l of lectures) if (l.status === 'error') throw l.error
    return calcul()
  })
}

const valeur = <T>(r: ResultatOperation<T>): T => (r as { value: T }).value
const nombre = (d: { toString(): string } | null): number | null => (d === null ? null : Number(d))

export async function getTableauDeBordData(): Promise<TableauDeBordData> {
  const session = await requireRead()
  const droits = droitsTableauDeBord(session.user.role)
  const aujourdHui = new Date()
  const finFenetre = new Date(Date.UTC(aujourdHui.getUTCFullYear(), aujourdHui.getUTCMonth(), aujourdHui.getUTCDate() + JOURS_MOIS, 23, 59, 59, 999))
  const debut24Mois = new Date(Date.UTC(aujourdHui.getUTCFullYear(), aujourdHui.getUTCMonth() - 24, aujourdHui.getUTCDate()))

  const [opportunites, marches, cautions, lots, factures, marchesReception] = await Promise.all([
    capturerOperation(async () => {
      const rows = await prisma.opportunite.findMany({
        where: { statut: { in: PHASE_STATUTS['en-cours'] } },
        select: {
          id: true, reference: true, objet: true, statut: true, montantEstime: true,
          dateLimite: true, periodeValiditeFin: true, echeanceAttributionProv: true,
          piecesCommunes: { where: { obligatoire: true }, select: { statut: true } },
          dossiers: { select: { id: true, pieces: { where: { obligatoire: true }, select: { statut: true } } } },
          lots: { select: { dossier: { select: { id: true, pieces: { where: { obligatoire: true }, select: { statut: true } } } } } },
        },
      })
      return rows.map((o) => {
        // Un dossier de lot peut aussi porter l'opportunité : dédoublonner par identifiant.
        const dossiers = new Map<string, { statut: OpportuniteDepot['piecesObligatoires'][number]['statut'] }[]>()
        for (const d of o.dossiers) dossiers.set(d.id, d.pieces)
        for (const l of o.lots) if (l.dossier) dossiers.set(l.dossier.id, l.dossier.pieces)
        const echeances: OpportuniteEcheances = {
          id: o.id, reference: o.reference, objet: o.objet, statut: o.statut, montantEstime: nombre(o.montantEstime),
          dateLimite: o.dateLimite, periodeValiditeFin: o.periodeValiditeFin, echeanceAttributionProv: o.echeanceAttributionProv,
        }
        const depot: OpportuniteDepot = {
          id: o.id, reference: o.reference, objet: o.objet, statut: o.statut, dateLimite: o.dateLimite,
          aUnDossier: dossiers.size > 0,
          piecesObligatoires: [...o.piecesCommunes, ...[...dossiers.values()].flat()],
        }
        return { echeances, depot }
      })
    }),
    capturerOperation(async (): Promise<MarcheEcheances[]> => {
      const rows = await prisma.marche.findMany({
        where: { statut: { in: droits.restrictionMarche ? [droits.restrictionMarche] : STATUTS_MARCHES_SUIVIS } },
        select: { id: true, numero: true, objet: true, statut: true, montant: true, dateLivraisonPrevue: true, dateFinPrevue: true, garantiesLiberees: true },
      })
      return rows.map((m) => ({ ...m, montant: Number(m.montant) }))
    }),
    capturerOperation(async (): Promise<CautionEcheances[]> => {
      const rows = await prisma.caution.findMany({
        where: {
          statut: { in: ['ACTIVE', 'EXPIREE'] },
          dateEcheance: { lte: finFenetre },
          ...(droits.restrictionMarche ? { marche: { statut: droits.restrictionMarche } } : {}),
        },
        select: {
          id: true, reference: true, type: true, statut: true, montant: true, dateEcheance: true,
          opportunite: { select: { id: true, statut: true } },
          marche: { select: { id: true, numero: true, statut: true, garantiesLiberees: true } },
        },
      })
      return rows.map((c) => ({ ...c, montant: Number(c.montant) }))
    }),
    capturerOperation(async (): Promise<LotPilotage[]> => {
      // Même lecture que getPilotageData (lib/actions/pilotage.ts), limitée aux 24 derniers mois.
      const rows = await prisma.lot.findMany({
        where: { opportunite: { dateLimite: { gte: debut24Mois } } },
        select: {
          id: true, numero: true, resultat: true, montantPropose: true, montantOffreConcurrent: true, motifPerte: true, concurrentGagnant: true,
          opportunite: { select: { id: true, reference: true, objet: true, statut: true, dateLimite: true, autoriteContractante: true } },
        },
      })
      return rows.map((l) => ({
        id: l.id, opportuniteId: l.opportunite.id,
        libelle: intituleLot(l.opportunite.reference, l.opportunite.objet, l.numero),
        autorite: l.opportunite.autoriteContractante, resultat: l.resultat,
        montantPropose: nombre(l.montantPropose), montantOffreConcurrent: nombre(l.montantOffreConcurrent),
        concurrentGagnant: l.concurrentGagnant?.trim() || null, motif: l.motifPerte?.trim() || null,
        dateDepot: l.opportunite.dateLimite,
        soumis: STATUTS_OPPORTUNITE_OFFRE_SOUMISE.includes(l.opportunite.statut),
        motifRenseigne: !!l.motifPerte?.trim(),
      }))
    }),
    // Finances : aucune requête sur Facture sans le droit.
    droits.finances
      ? capturerOperation(async (): Promise<FactureEcheances[]> => {
        const rows = await prisma.facture.findMany({
          where: { statut: { in: ['EMISE', 'EN_ATTENTE'] }, datePaiement: null },
          select: { id: true, numero: true, marcheId: true, statut: true, montantTTC: true, dateEmission: true, datePaiement: true },
        })
        return rows.map((f) => ({ ...f, montantTTC: Number(f.montantTTC) }))
      })
      : null,
    droits.finances
      ? capturerOperation(async (): Promise<MarcheReception[]> => {
        const rows = await prisma.marche.findMany({
          where: { dateReception: { not: null }, statut: { notIn: ['RESILIE', 'ANNULE'] } },
          select: { id: true, numero: true, statut: true, montant: true, dateReception: true, factures: { select: { statut: true, montantTTC: true } } },
        })
        return rows.map((m) => ({
          ...m, montant: Number(m.montant),
          factures: m.factures.map((f) => ({ statut: f.statut as StatutFactureLite, montantTTC: Number(f.montantTTC) })),
        }))
      })
      : null,
  ])

  const lecturesATraiter = factures ? [opportunites, marches, cautions, factures] : [opportunites, marches, cautions]
  const [aTraiter, pipeline, vCautions, vTaux, vDepots, vEncaissements, vReste] = await Promise.all([
    depuis(lecturesATraiter, () => construireATraiter({
      opportunites: valeur(opportunites).map((o) => o.echeances),
      marches: valeur(marches),
      cautions: valeur(cautions),
      factures: factures ? valeur(factures) : null,
    }, aujourdHui)),
    depuis([opportunites], () => calculerPipeline(valeur(opportunites).map((o) => o.echeances))),
    depuis([cautions], () => voyantCautions(valeur(cautions), aujourdHui)),
    depuis([lots], () => voyantTauxSucces(valeur(lots), aujourdHui)),
    depuis([opportunites], () => voyantDepots(valeur(opportunites).map((o) => o.depot), aujourdHui)),
    factures ? depuis([factures], () => voyantEncaissements(valeur(factures), aujourdHui)) : null,
    marchesReception ? depuis([marchesReception], () => voyantResteAFacturer(valeur(marchesReception), aujourdHui)) : null,
  ])

  return {
    aTraiter: publierBloc('à traiter', aTraiter),
    pipeline: publierBloc('pipeline', pipeline),
    voyants: {
      encaissements: vEncaissements ? publierBloc('encaissements', vEncaissements) : null,
      cautions: publierBloc('cautions', vCautions),
      tauxSucces: publierBloc('taux de succès', vTaux),
      depots: publierBloc('dépôts', vDepots),
      resteAFacturer: vReste ? publierBloc('reste à facturer', vReste) : null,
    },
  }
}
