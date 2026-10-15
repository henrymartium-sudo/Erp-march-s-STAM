/**
 * Classement des opportunités pour le mail « Suivi Opportunités » :
 * bloc « À traiter », actives, terminées et compteurs par statut.
 */

import { ecartJours } from "@/lib/echeances/classement"
import type { OpportuniteForReporting } from "./opportunite-reporting-templates"

export const SEUIL_URGENCE_JOURS = 7
export const STATUTS_TERMINES: readonly string[] = ["NO_GO", "PERDUE"]
/** Offre encore à rendre : mêmes statuts GO et dossier en préparation (cycle GO → dossier en préparation → offre soumise). */
const STATUTS_OFFRE_A_RENDRE: readonly string[] = ["GO", "DOSSIER_EN_PREPARATION"]

const ORDRE_COMPTEURS = ["GO", "NO_GO", "GAGNEE", "PERDUE", "EN_ATTENTE_ATTRIBUTION"]

export type MotifATraiter = "GO_ECHEANCE" | "ATTENTE_ATTRIBUTION"

export interface ATraiter {
  opp: OpportuniteForReporting
  motif: MotifATraiter
}

export interface SectionsSuivi {
  aTraiter: ATraiter[]
  actives: OpportuniteForReporting[]
  terminees: OpportuniteForReporting[]
  compteurs: { statut: string; count: number }[]
}

/** Jours calendaires (UTC) jusqu'à la date : l'heure limite de dépôt ne décale pas le décompte (même règle que le mail des échéances). */
export function diffJours(date: Date, today: Date): number {
  return ecartJours(date, today)
}

function compareDates(a: Date | null, b: Date | null, sens: 1 | -1): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return (a.getTime() - b.getTime()) * sens
}

export function classerOpportunites(opps: OpportuniteForReporting[], now: Date): SectionsSuivi {
  const terminees = opps
    .filter((o) => STATUTS_TERMINES.includes(o.statut))
    .sort((a, b) => compareDates(a.dateLimite, b.dateLimite, -1))
  const actives = opps
    .filter((o) => !STATUTS_TERMINES.includes(o.statut))
    .sort((a, b) => compareDates(a.dateLimite, b.dateLimite, 1))

  const aTraiter: ATraiter[] = []
  for (const opp of actives) {
    if (STATUTS_OFFRE_A_RENDRE.includes(opp.statut) && opp.dateLimite && diffJours(opp.dateLimite, now) <= SEUIL_URGENCE_JOURS) {
      aTraiter.push({ opp, motif: "GO_ECHEANCE" })
    } else if (opp.statut === "EN_ATTENTE_ATTRIBUTION") {
      aTraiter.push({ opp, motif: "ATTENTE_ATTRIBUTION" })
    }
  }

  const parStatut = new Map<string, number>()
  for (const opp of opps) parStatut.set(opp.statut, (parStatut.get(opp.statut) ?? 0) + 1)
  const connus = ORDRE_COMPTEURS.filter((s) => parStatut.has(s))
  const autres = [...parStatut.keys()].filter((s) => !ORDRE_COMPTEURS.includes(s))
  const compteurs = [...connus, ...autres].map((statut) => ({ statut, count: parStatut.get(statut)! }))

  return { aTraiter, actives, terminees, compteurs }
}
