/**
 * lib/alertes/groupAlertsForEmail.ts
 *
 * Utilitaire pur de groupement des alertes pour la génération d'emails consolidés.
 * Aucun effet de bord — ne touche pas la DB, ne fait pas d'I/O réseau.
 *
 * FEATURE 1 du prompt "Amélioration du format des emails du système Cron Alertes".
 */

import type { CautionAlert, MarcheAlert } from "@/lib/email/templates"

// ============================================================
// TYPES D'ENTRÉE (raw data depuis la DB)
// ============================================================

export interface RawCautionForDigest {
  id: string
  reference: string
  /** Correspond à Caution.banqueNom en DB */
  banqueNom?: string | null
  type: string
  montant: number
  dateEcheance: Date
  joursRestants: number
  marcheReference?: string | null
  /** Correspond à Marche.autoriteContractanteNom (via relation) */
  autoriteContractanteNom?: string | null
}

export interface RawMarcheForDigest {
  id: string
  reference: string
  objet: string
  autoriteContractante?: string | null
  montant: number
  dateFinExecution: Date
  joursRestants: number
  statut: string
}

// ============================================================
// TYPE DE SORTIE
// ============================================================

export interface GroupedAlertsForEmail {
  /** Cautions triées par joursRestants croissant (plus urgentes en premier) */
  cautions: CautionAlert[]
  /** Marchés triés par joursRestants croissant (plus urgents en premier) */
  marches: MarcheAlert[]
  /** Vrai si au moins une section contient des données */
  hasContent: boolean
}

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

/**
 * Groupe et trie les alertes brutes pour produire un email synthétique.
 *
 * @example
 * // Avant agrégation : 5 événements CAUTION_EXPIRING indépendants → 5 emails
 * // Après  agrégation : 1 appel groupAlerts(cautions, marches) → 1 email
 *
 * const grouped = groupAlerts(rawCautions, rawMarches)
 * const template = dailyAlertsEmailTemplate(grouped.cautions, grouped.marches)
 */
export function groupAlerts(
  rawCautions: RawCautionForDigest[],
  rawMarches: RawMarcheForDigest[]
): GroupedAlertsForEmail {
  const cautions: CautionAlert[] = rawCautions
    .map((c) => ({
      id: c.id,
      reference: c.reference,
      banque: c.banqueNom ?? undefined,
      type: c.type,
      montant: c.montant,
      dateEcheance: c.dateEcheance,
      joursRestants: c.joursRestants,
      marcheReference: c.marcheReference ?? undefined,
      autoriteContractante: c.autoriteContractanteNom ?? undefined,
      niveau: (c.joursRestants <= 7 ? "CRITIQUE" : "ATTENTION") as
        | "CRITIQUE"
        | "ATTENTION",
    }))
    .sort((a, b) => a.joursRestants - b.joursRestants)

  const marches: MarcheAlert[] = rawMarches
    .map((m) => ({
      id: m.id,
      reference: m.reference,
      objet: m.objet,
      autoriteContractante: m.autoriteContractante ?? undefined,
      montant: m.montant,
      dateFinExecution: m.dateFinExecution,
      joursRestants: m.joursRestants,
      statut: m.statut,
    }))
    .sort((a, b) => a.joursRestants - b.joursRestants)

  return {
    cautions,
    marches,
    hasContent: cautions.length > 0 || marches.length > 0,
  }
}

// ============================================================
// HELPERS DE DÉDUPLICATION (pour fusionner plusieurs règles)
// ============================================================

/**
 * Fusionne deux listes de CautionAlert en dédupliquant par id.
 * Utile quand plusieurs règles ciblent les mêmes cautions.
 */
export function mergeCautions(
  existing: CautionAlert[],
  incoming: CautionAlert[]
): CautionAlert[] {
  const seen = new Set(existing.map((c) => c.id))
  const merged = [...existing]
  for (const c of incoming) {
    if (!seen.has(c.id)) {
      merged.push(c)
      seen.add(c.id)
    }
  }
  return merged.sort((a, b) => a.joursRestants - b.joursRestants)
}

/**
 * Fusionne deux listes de MarcheAlert en dédupliquant par id.
 */
export function mergeMarches(
  existing: MarcheAlert[],
  incoming: MarcheAlert[]
): MarcheAlert[] {
  const seen = new Set(existing.map((m) => m.id))
  const merged = [...existing]
  for (const m of incoming) {
    if (!seen.has(m.id)) {
      merged.push(m)
      seen.add(m.id)
    }
  }
  return merged.sort((a, b) => a.joursRestants - b.joursRestants)
}

// ============================================================
// EXEMPLE JSON avant / après agrégation (documentation)
// ============================================================
//
// AVANT (5 événements CAUTION_EXPIRING → 5 emails séparés) :
// [
//   { eventType: "CAUTION_EXPIRING", reference: "CAU-001", joursRestants: 3, montant: 500000 },
//   { eventType: "CAUTION_EXPIRING", reference: "CAU-007", joursRestants: 8, montant: 200000 },
//   { eventType: "CAUTION_EXPIRING", reference: "CAU-012", joursRestants: 22, montant: 1500000 },
//   { eventType: "MARCHE_EXPIRING",  reference: "MRC-2023-001", joursRestants: 10, objet: "Fourniture véhicules" },
//   { eventType: "MARCHE_EXPIRING",  reference: "MRC-2024-003", joursRestants: 45, objet: "Maintenance flotte" },
// ]
//
// APRÈS groupAlerts() → 1 email consolidé avec :
// {
//   cautions: [
//     { id: "...", reference: "CAU-001", joursRestants: 3,  niveau: "CRITIQUE", ... },
//     { id: "...", reference: "CAU-007", joursRestants: 8,  niveau: "ATTENTION", ... },
//     { id: "...", reference: "CAU-012", joursRestants: 22, niveau: "ATTENTION", ... },
//   ],
//   marches: [
//     { id: "...", reference: "MRC-2023-001", joursRestants: 10, objet: "Fourniture véhicules", ... },
//     { id: "...", reference: "MRC-2024-003", joursRestants: 45, objet: "Maintenance flotte", ... },
//   ],
//   hasContent: true
// }
