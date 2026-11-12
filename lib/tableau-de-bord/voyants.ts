/**
 * Les cinq voyants du tableau de bord — fonctions pures, sans accès base.
 * Règles et seuils : Journal de décisions, 2026-11-12, « règles des cinq voyants du tableau de bord ».
 */

import type { StatutMarche, StatutOpportunite, StatutPiece } from '@prisma/client'
import {
  calculerIssueOffres, montantFacture, TOLERANCE_FACTURE,
  type ElementLie, type LotPilotage, type StatutFactureLite,
} from '@/lib/pilotage/calculs'
import { STATUTS_AVANT_SOUMISSION } from '@/lib/utils/opportunite-filters'
import { cautionEncoreNecessaire, DELAI_PAIEMENT_DEFAUT, echeanceFacture, type CautionEcheances, type FactureEcheances } from './a-traiter'
import { joursDepuis } from './dates'

export type EtatVoyant = 'vert' | 'ambre' | 'rouge' | 'gris'
export interface Voyant<D> { etat: EtatVoyant; detail: D }

// ── 1. Encaissements en retard ──────────────────────────────────────────────

export interface DetailEncaissements {
  pourcentageEnRetard: number
  /** Montant TTC non encaissé des factures datées ; les factures sans date sont dans `facturesSansDate`. */
  totalNonEncaisse: number
  enRetard: number
  /** Montants TTC non encaissés selon le retard sur l'échéance (factures datées seulement). */
  anciennete: { dansDelai: number; retard1a45: number; retardPlusDe45: number }
  facturesSansDate: ElementLie[]
}

const SEUIL_ENCAISSEMENTS_AMBRE = 20
const SEUIL_ENCAISSEMENTS_ROUGE = 40
/** Retard au-delà duquel une seule facture suffit pour le rouge (90 j après émission avec le délai par défaut). */
const JOURS_RETARD_ROUGE = DELAI_PAIEMENT_DEFAUT

export function voyantEncaissements(factures: FactureEcheances[], aujourdHui: Date): Voyant<DetailEncaissements> {
  const detail: DetailEncaissements = {
    pourcentageEnRetard: 0, totalNonEncaisse: 0, enRetard: 0,
    anciennete: { dansDelai: 0, retard1a45: 0, retardPlusDe45: 0 }, facturesSansDate: [],
  }
  let uneTresAncienne = false
  for (const f of factures) {
    if ((f.statut !== 'EMISE' && f.statut !== 'EN_ATTENTE') || f.datePaiement) continue
    const echeance = echeanceFacture(f)
    // Non datable : signalée à part et hors du total, pour ne pas diluer le pourcentage de retard.
    if (!echeance) { detail.facturesSansDate.push({ libelle: f.numero, href: `/factures/${f.id}` }); continue }
    detail.totalNonEncaisse += f.montantTTC
    const retard = joursDepuis(echeance, aujourdHui)
    if (retard <= 0) detail.anciennete.dansDelai += f.montantTTC
    else if (retard <= JOURS_RETARD_ROUGE) detail.anciennete.retard1a45 += f.montantTTC
    else { detail.anciennete.retardPlusDe45 += f.montantTTC; uneTresAncienne = true }
  }
  detail.enRetard = detail.anciennete.retard1a45 + detail.anciennete.retardPlusDe45
  detail.pourcentageEnRetard = detail.totalNonEncaisse > 0 ? Math.round((detail.enRetard / detail.totalNonEncaisse) * 100) : 0

  const etat: EtatVoyant =
    detail.pourcentageEnRetard >= SEUIL_ENCAISSEMENTS_ROUGE || uneTresAncienne ? 'rouge'
      : detail.pourcentageEnRetard >= SEUIL_ENCAISSEMENTS_AMBRE ? 'ambre'
        : 'vert'
  return { etat, detail }
}

// ── 5. Reste à facturer ─────────────────────────────────────────────────────

export interface MarcheReception { id: string; numero: string; statut: StatutMarche; montant: number; dateReception: Date | null; factures: { statut: StatutFactureLite; montantTTC: number }[] }
export interface DetailResteAFacturer { marches: { id: string; numero: string; reste: number; joursDepuisReception: number }[]; total: number }

const JOURS_RESTE_AMBRE = 15
const JOURS_RESTE_ROUGE = 30

export function voyantResteAFacturer(marches: MarcheReception[], aujourdHui: Date): Voyant<DetailResteAFacturer> {
  const detail: DetailResteAFacturer = { marches: [], total: 0 }
  for (const m of marches) {
    if (!m.dateReception || m.statut === 'RESILIE' || m.statut === 'ANNULE') continue
    const reste = m.montant - montantFacture(m)
    if (reste <= m.montant * (TOLERANCE_FACTURE - 1)) continue
    detail.marches.push({ id: m.id, numero: m.numero, reste, joursDepuisReception: joursDepuis(m.dateReception, aujourdHui) })
    detail.total += reste
  }
  const plusAncien = Math.max(-Infinity, ...detail.marches.map((m) => m.joursDepuisReception))
  const etat: EtatVoyant = plusAncien > JOURS_RESTE_ROUGE ? 'rouge' : plusAncien > JOURS_RESTE_AMBRE ? 'ambre' : 'vert'
  return { etat, detail }
}

// ── 2. Cautions encore nécessaires ──────────────────────────────────────────

const JOURS_CAUTION_ROUGE = 7
const JOURS_CAUTION_AMBRE = 30

export function voyantCautions(
  cautions: CautionEcheances[], aujourdHui: Date,
): Voyant<{ sous30: number; plusProcheDansJours: number | null; elements: ElementLie[] }> {
  const suivies = cautions
    .filter((c) => (c.statut === 'ACTIVE' || c.statut === 'EXPIREE') && cautionEncoreNecessaire(c))
    .map((c) => ({ c, dansJours: -joursDepuis(c.dateEcheance, aujourdHui) }))
    .sort((a, b) => a.dansJours - b.dansJours)
  const sous30 = suivies.filter((s) => s.dansJours <= JOURS_CAUTION_AMBRE)
  const plusProche = sous30[0]?.dansJours ?? null
  const etat: EtatVoyant = plusProche === null ? 'vert' : plusProche <= JOURS_CAUTION_ROUGE ? 'rouge' : 'ambre'
  return {
    etat,
    detail: {
      sous30: sous30.length,
      plusProcheDansJours: plusProche,
      elements: sous30.map(({ c }) => ({ libelle: c.reference, href: `/cautions/${c.id}` })),
    },
  }
}

// ── 3. Dépôts sous 14 jours ─────────────────────────────────────────────────

/** `piecesObligatoires` : pièces obligatoires communes et propres à chaque lot, seules transmises. */
export interface OpportuniteDepot { id: string; reference: string | null; objet: string; statut: StatutOpportunite; dateLimite: Date | null; aUnDossier: boolean; piecesObligatoires: { statut: StatutPiece }[] }

const JOURS_DEPOTS = 14
const JOURS_DEPOT_ROUGE = 3

export function voyantDepots(
  opps: OpportuniteDepot[], aujourdHui: Date,
): Voyant<{ nonPrets: number; depotsSous14: number; elements: ElementLie[] }> {
  let rouge = false
  const proches = opps
    .filter((o) => STATUTS_AVANT_SOUMISSION.includes(o.statut) && o.dateLimite)
    .map((o) => ({ o, dansJours: -joursDepuis(o.dateLimite!, aujourdHui) }))
    .filter((p) => p.dansJours >= 0 && p.dansJours <= JOURS_DEPOTS)
  const nonPrets = proches.filter(({ o, dansJours }) => {
    const prete = o.aUnDossier && o.piecesObligatoires.length > 0
      && o.piecesObligatoires.every((p) => p.statut === 'COMPLET' || p.statut === 'VALIDE')
    if (!prete && (!o.aUnDossier || dansJours <= JOURS_DEPOT_ROUGE)) rouge = true
    return !prete
  })
  return {
    etat: rouge ? 'rouge' : nonPrets.length > 0 ? 'ambre' : 'vert',
    detail: {
      nonPrets: nonPrets.length,
      depotsSous14: proches.length,
      elements: nonPrets.map(({ o }) => ({ libelle: o.reference ?? o.objet, href: `/opportunites/${o.id}` })),
    },
  }
}

// ── 4. Taux de succès sur 6 mois ────────────────────────────────────────────

export const MIN_RESULTATS_TAUX = 5
const ECART_TAUX_AMBRE = 10
const ECART_TAUX_ROUGE = 20

function moisAvant(d: Date, mois: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - mois, d.getUTCDate()))
}

export function voyantTauxSucces(
  lots: LotPilotage[], aujourdHui: Date,
): Voyant<{ taux6Mois: number | null; taux24Mois: number | null; resultats6Mois: number; ecartPoints: number | null }> {
  const finJour = new Date(Date.UTC(aujourdHui.getUTCFullYear(), aujourdHui.getUTCMonth(), aujourdHui.getUTCDate(), 23, 59, 59, 999))
  const sur6 = calculerIssueOffres(lots, { dateDebut: moisAvant(aujourdHui, 6), dateFin: finJour })
  const sur24 = calculerIssueOffres(lots, { dateDebut: moisAvant(aujourdHui, 24), dateFin: finJour })
  const resultats6Mois = sur6.gagnes.nombre + sur6.perdus.nombre
  const taux6Mois = sur6.tauxSucces
  const taux24Mois = sur24.tauxSucces
  if (resultats6Mois < MIN_RESULTATS_TAUX || taux6Mois === null || taux24Mois === null) {
    return { etat: 'gris', detail: { taux6Mois, taux24Mois, resultats6Mois, ecartPoints: null } }
  }
  const ecartPoints = taux24Mois - taux6Mois
  const etat: EtatVoyant = ecartPoints >= ECART_TAUX_ROUGE ? 'rouge' : ecartPoints >= ECART_TAUX_AMBRE ? 'ambre' : 'vert'
  return { etat, detail: { taux6Mois, taux24Mois, resultats6Mois, ecartPoints } }
}
