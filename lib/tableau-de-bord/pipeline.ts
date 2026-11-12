/**
 * Pipeline des offres du tableau de bord : opportunités en cours par phase.
 * Les statuts historiques (IDENTIFIEE, SOUMISE) comptent dans la phase de leur équivalent.
 */

import type { StatutOpportunite } from '@prisma/client'

export const PHASES_PIPELINE: { statut: StatutOpportunite; libelle: string; inclut: StatutOpportunite[] }[] = [
  { statut: 'EN_ANALYSE', libelle: 'En analyse', inclut: ['EN_ANALYSE', 'IDENTIFIEE'] },
  { statut: 'GO', libelle: 'Go', inclut: ['GO'] },
  { statut: 'DOSSIER_EN_PREPARATION', libelle: 'Dossier en préparation', inclut: ['DOSSIER_EN_PREPARATION'] },
  { statut: 'OFFRE_SOUMISE', libelle: 'Offre soumise', inclut: ['OFFRE_SOUMISE', 'SOUMISE'] },
  { statut: 'EN_ATTENTE_ATTRIBUTION', libelle: "En attente d'attribution", inclut: ['EN_ATTENTE_ATTRIBUTION'] },
  { statut: 'ATTRIBUE_PROVISOIREMENT', libelle: 'Attribuée provisoirement', inclut: ['ATTRIBUE_PROVISOIREMENT'] },
]

/** `montant` vaut null quand le rôle n'a pas accès aux montants. */
export interface ResultatPipeline {
  phases: { statut: StatutOpportunite; libelle: string; nombre: number; montant: number | null; href: string }[]
  total: { nombre: number; montant: number | null }
}

export function calculerPipeline(opps: { statut: StatutOpportunite; montantEstime: number | null }[]): ResultatPipeline {
  const phases = PHASES_PIPELINE.map(({ statut, libelle, inclut }) => {
    const dans = opps.filter((o) => inclut.includes(o.statut))
    return {
      statut, libelle,
      nombre: dans.length,
      montant: dans.reduce((s, o) => s + (o.montantEstime ?? 0), 0),
      href: `/opportunites?statut=${statut}`,
    }
  })
  return {
    phases,
    total: { nombre: phases.reduce((s, p) => s + p.nombre, 0), montant: phases.reduce((s, p) => s + (p.montant ?? 0), 0) },
  }
}
