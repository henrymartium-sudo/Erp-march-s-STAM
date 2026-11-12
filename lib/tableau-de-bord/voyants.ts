/**
 * Les cinq voyants du tableau de bord — fonctions pures, sans accès base.
 * Règles et seuils : Journal de décisions, 2026-11-12, « règles des cinq voyants du tableau de bord ».
 */

import type { StatutMarche } from '@prisma/client'
import { montantFacture, TOLERANCE_FACTURE, type ElementLie, type StatutFactureLite } from '@/lib/pilotage/calculs'
import { DELAI_PAIEMENT_DEFAUT, type FactureEcheances } from './a-traiter'
import { joursDepuis } from './dates'

export type EtatVoyant = 'vert' | 'ambre' | 'rouge' | 'gris'
export interface Voyant<D> { etat: EtatVoyant; detail: D }

// ── 1. Encaissements en retard ──────────────────────────────────────────────

export interface DetailEncaissements {
  pourcentageEnRetard: number
  totalNonEncaisse: number
  enRetard: number
  /** Montants TTC non encaissés par ancienneté depuis l'émission (factures datées seulement). */
  anciennete: { dansDelai: number; de46a90: number; plusDe90: number }
  facturesSansDate: ElementLie[]
}

const SEUIL_ENCAISSEMENTS_AMBRE = 20
const SEUIL_ENCAISSEMENTS_ROUGE = 40
const JOURS_ANCIENNETE_ROUGE = 90

export function voyantEncaissements(factures: FactureEcheances[], aujourdHui: Date): Voyant<DetailEncaissements> {
  const detail: DetailEncaissements = {
    pourcentageEnRetard: 0, totalNonEncaisse: 0, enRetard: 0,
    anciennete: { dansDelai: 0, de46a90: 0, plusDe90: 0 }, facturesSansDate: [],
  }
  for (const f of factures) {
    if ((f.statut !== 'EMISE' && f.statut !== 'EN_ATTENTE') || f.datePaiement) continue
    detail.totalNonEncaisse += f.montantTTC
    if (!f.dateEmission) { detail.facturesSansDate.push({ libelle: f.numero, href: `/factures/${f.id}` }); continue }
    const jours = joursDepuis(f.dateEmission, aujourdHui)
    if (jours <= DELAI_PAIEMENT_DEFAUT) detail.anciennete.dansDelai += f.montantTTC
    else if (jours <= JOURS_ANCIENNETE_ROUGE) detail.anciennete.de46a90 += f.montantTTC
    else detail.anciennete.plusDe90 += f.montantTTC
  }
  detail.enRetard = detail.anciennete.de46a90 + detail.anciennete.plusDe90
  detail.pourcentageEnRetard = detail.totalNonEncaisse > 0 ? Math.round((detail.enRetard / detail.totalNonEncaisse) * 100) : 0

  const etat: EtatVoyant =
    detail.pourcentageEnRetard >= SEUIL_ENCAISSEMENTS_ROUGE || detail.anciennete.plusDe90 > 0 ? 'rouge'
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
