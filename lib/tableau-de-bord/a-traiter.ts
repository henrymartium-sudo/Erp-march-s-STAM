/**
 * Liste « À traiter » du tableau de bord — fonctions pures, sans accès base.
 * Règles validées par Abel le 2026-11-12 (plan docs/plans/2026-11-12-donnees-tableau-de-bord-plan.md, tâche 2).
 */

import type { StatutCaution, StatutFacture, StatutMarche, StatutOpportunite, TypeCaution } from '@prisma/client'
import type { ElementLie } from '@/lib/pilotage/calculs'
import { PHASE_STATUTS, STATUTS_AVANT_SOUMISSION } from '@/lib/utils/opportunite-filters'
import { horizonDe, joursDepuis, type Horizon } from './dates'

/** Délai de paiement par défaut, en jours calendaires après le dépôt de la facture (décret 2022-080/PR, art. 145),
 * appliqué quand la facture n'a pas de date d'échéance saisie (décision d'Abel, 2026-11-12). */
export const DELAI_PAIEMENT_DEFAUT = 45

export type NatureEcheance =
  | 'DEPOT_OFFRE' | 'FIN_VALIDITE_OFFRE' | 'ATTRIBUTION_PROVISOIRE'
  | 'LIVRAISON_EN_RETARD' | 'FIN_EXECUTION_PROCHE' | 'RECEPTION_DEFINITIVE' | 'GARANTIES_A_LIBERER'
  | 'CAUTION_A_RENOUVELER' | 'CAUTION_A_LIBERER' | 'FACTURE_ECHUE'

export interface LigneATraiter {
  id: string; nature: NatureEcheance; domaine: 'passation' | 'exec'
  libelle: string; reference: string; href: string
  montant: number | null; echeance: Date; horizon: Horizon
  sansRattrapage: boolean
}

export interface OpportuniteEcheances { id: string; reference: string | null; objet: string; statut: StatutOpportunite; montantEstime: number | null; dateLimite: Date | null; periodeValiditeFin: Date | null; echeanceAttributionProv: Date | null }
export interface MarcheEcheances { id: string; numero: string; objet: string; statut: StatutMarche; montant: number; dateLivraisonPrevue: Date | null; dateFinPrevue: Date | null; garantiesLiberees: boolean | null }
export interface CautionEcheances { id: string; reference: string; type: TypeCaution; statut: StatutCaution; montant: number; dateEcheance: Date; opportunite: { id: string; statut: StatutOpportunite } | null; marche: { id: string; numero: string; statut: StatutMarche; garantiesLiberees: boolean | null } | null }
export interface FactureEcheances { id: string; numero: string; marcheId: string; statut: StatutFacture; montantTTC: number; dateEmission: Date | null; dateEcheance: Date | null; datePaiement: Date | null }
/** `factures: null` = rôle sans accès aux finances. */
export interface SourcesATraiter { opportunites: OpportuniteEcheances[]; marches: MarcheEcheances[]; cautions: CautionEcheances[]; factures: FactureEcheances[] | null }
export interface ResultatATraiter { lignes: LigneATraiter[]; manquants: { opportunitesSansDateDepot: ElementLie[]; marchesSansDateLivraison: ElementLie[]; marchesEnExecutionSansFin: ElementLie[]; facturesSansDate: ElementLie[] } }

const LIBELLES: Record<NatureEcheance, string> = {
  DEPOT_OFFRE: "Dépôt de l'offre",
  FIN_VALIDITE_OFFRE: "Fin de validité de l'offre",
  ATTRIBUTION_PROVISOIRE: 'Attribution provisoire attendue',
  LIVRAISON_EN_RETARD: 'Livraison en retard',
  FIN_EXECUTION_PROCHE: "Fin d'exécution proche",
  RECEPTION_DEFINITIVE: 'Réception définitive à obtenir',
  GARANTIES_A_LIBERER: 'Garantie à faire libérer',
  CAUTION_A_RENOUVELER: 'Caution à renouveler',
  CAUTION_A_LIBERER: 'Caution à libérer',
  FACTURE_ECHUE: 'Facture à encaisser',
}

const STATUTS_VALIDITE: StatutOpportunite[] = ['OFFRE_SOUMISE', 'SOUMISE', 'EN_ATTENTE_ATTRIBUTION']
const MARCHES_TERMINES: StatutMarche[] = ['CLOTURE', 'RESILIE', 'ANNULE', 'INFRUCTUEUX']
const STATUTS_FACTURE_DUE: StatutFacture[] = ['EMISE', 'EN_ATTENTE']
const ORDRE_HORIZON: Record<Horizon, number> = { retard: 0, semaine: 1, mois: 2 }
const MS_JOUR = 24 * 60 * 60 * 1000

/** Échéance de paiement : date saisie sur la facture, sinon émission + 45 jours ; null si aucune des deux. */
export function echeanceFacture(f: Pick<FactureEcheances, 'dateEmission' | 'dateEcheance'>): Date | null {
  if (f.dateEcheance) return f.dateEcheance
  return f.dateEmission ? new Date(f.dateEmission.getTime() + DELAI_PAIEMENT_DEFAUT * MS_JOUR) : null
}

/** Une caution est encore nécessaire tant que l'offre est en cours ou que le marché n'est ni terminé ni libéré de ses garanties. */
export function cautionEncoreNecessaire(c: CautionEcheances): boolean {
  if (c.opportunite) return PHASE_STATUTS['en-cours'].includes(c.opportunite.statut)
  if (c.marche) return !MARCHES_TERMINES.includes(c.marche.statut) && c.marche.garantiesLiberees !== true
  return false
}

export function construireATraiter(s: SourcesATraiter, aujourdHui: Date): ResultatATraiter {
  const lignes: LigneATraiter[] = []
  const ajouter = (
    nature: NatureEcheance, sourceId: string, echeance: Date | null,
    l: Pick<LigneATraiter, 'domaine' | 'reference' | 'href' | 'montant'>, sansRattrapage = false,
  ) => {
    if (!echeance) return
    const horizon = horizonDe(echeance, aujourdHui)
    if (!horizon) return
    lignes.push({ id: `${nature}:${sourceId}`, nature, libelle: LIBELLES[nature], echeance, horizon, sansRattrapage, ...l })
  }
  const passee = (d: Date | null) => d !== null && joursDepuis(d, aujourdHui) > 0

  for (const o of s.opportunites) {
    const l = { domaine: 'passation' as const, reference: o.reference ?? o.objet, href: `/opportunites/${o.id}`, montant: o.montantEstime }
    if (STATUTS_AVANT_SOUMISSION.includes(o.statut)) ajouter('DEPOT_OFFRE', o.id, o.dateLimite, l, true)
    if (STATUTS_VALIDITE.includes(o.statut)) ajouter('FIN_VALIDITE_OFFRE', o.id, o.periodeValiditeFin, l, true)
    if (o.statut === 'EN_ATTENTE_ATTRIBUTION') ajouter('ATTRIBUTION_PROVISOIRE', o.id, o.echeanceAttributionProv, l)
  }

  for (const m of s.marches) {
    const l = { domaine: 'exec' as const, reference: m.numero, href: `/marches/${m.id}`, montant: m.montant }
    if (m.statut === 'EN_ATTENTE_LIVRAISON_OS' && passee(m.dateLivraisonPrevue)) ajouter('LIVRAISON_EN_RETARD', m.id, m.dateLivraisonPrevue, l)
    // Un marché en exécution reste à traiter jusqu'à sa réception définitive (décision d'Abel, 2026-11-12) :
    // fin proche (horizon ≤ 30 j), puis réception à obtenir une fois la fin prévue dépassée.
    if (m.statut === 'EN_EXECUTION' && m.dateFinPrevue) {
      ajouter(passee(m.dateFinPrevue) ? 'RECEPTION_DEFINITIVE' : 'FIN_EXECUTION_PROCHE', m.id, m.dateFinPrevue, l)
    }
  }

  for (const c of s.cautions) {
    const l = { domaine: c.opportunite ? 'passation' as const : 'exec' as const, reference: c.reference, href: `/cautions/${c.id}`, montant: c.montant }
    // Marché en attente de garanties non encore libérées : la caution relève de GARANTIES_A_LIBERER.
    // Garanties cochées libérées : la règle CAUTION_A_LIBERER s'applique (la fiche caution reste à clore).
    if (c.marche?.statut === 'EXECUTE_ATTENTE_GARANTIES' && c.marche.garantiesLiberees !== true) {
      if (c.statut === 'ACTIVE') ajouter('GARANTIES_A_LIBERER', c.id, c.dateEcheance, l)
      continue
    }
    const necessaire = cautionEncoreNecessaire(c)
    if (necessaire && (c.statut === 'ACTIVE' || c.statut === 'EXPIREE')) ajouter('CAUTION_A_RENOUVELER', c.id, c.dateEcheance, l)
    if (!necessaire && c.statut === 'ACTIVE') ajouter('CAUTION_A_LIBERER', c.id, c.dateEcheance, l)
  }

  for (const f of s.factures ?? []) {
    if (!STATUTS_FACTURE_DUE.includes(f.statut) || f.datePaiement) continue
    const echeance = echeanceFacture(f)
    ajouter('FACTURE_ECHUE', f.id, echeance, { domaine: 'exec', reference: f.numero, href: `/factures/${f.id}`, montant: f.montantTTC })
  }

  lignes.sort((a, b) =>
    ORDRE_HORIZON[a.horizon] - ORDRE_HORIZON[b.horizon]
    || Number(b.sansRattrapage) - Number(a.sansRattrapage)
    || a.echeance.getTime() - b.echeance.getTime())

  return {
    lignes,
    manquants: {
      opportunitesSansDateDepot: s.opportunites
        .filter((o) => STATUTS_AVANT_SOUMISSION.includes(o.statut) && !o.dateLimite)
        .map((o) => ({ libelle: o.reference ?? o.objet, href: `/opportunites/${o.id}` })),
      marchesSansDateLivraison: s.marches
        .filter((m) => m.statut === 'EN_ATTENTE_LIVRAISON_OS' && !m.dateLivraisonPrevue)
        .map((m) => ({ libelle: m.numero, href: `/marches/${m.id}` })),
      marchesEnExecutionSansFin: s.marches
        .filter((m) => m.statut === 'EN_EXECUTION' && !m.dateFinPrevue)
        .map((m) => ({ libelle: m.numero, href: `/marches/${m.id}` })),
      facturesSansDate: (s.factures ?? [])
        .filter((f) => STATUTS_FACTURE_DUE.includes(f.statut) && !f.datePaiement && !echeanceFacture(f))
        .map((f) => ({ libelle: f.numero, href: `/factures/${f.id}` })),
    },
  }
}
