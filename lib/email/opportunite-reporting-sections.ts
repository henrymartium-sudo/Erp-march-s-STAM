/**
 * Classement des opportunités pour le mail « Suivi Opportunités » :
 * bloc « À traiter », actives, terminées et compteurs par statut.
 */

import type { OpportuniteForReporting } from "./opportunite-reporting-templates"

export const SEUIL_URGENCE_JOURS = 7
export const STATUTS_TERMINES: readonly string[] = ["NO_GO", "PERDUE"]

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

export function diffJours(date: Date, today: Date): number {
  return Math.ceil((date.getTime() - today.getTime()) / 86400000)
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
    if (opp.statut === "GO" && opp.dateLimite && diffJours(opp.dateLimite, now) <= SEUIL_URGENCE_JOURS) {
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
