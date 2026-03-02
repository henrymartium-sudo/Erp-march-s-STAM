/**
 * lib/cron/getMarchesForReporting.ts
 *
 * Récupère les marchés filtrés par groupe de statuts pour le reporting.
 * Lecture directe depuis la DB — aucune logique métier.
 */

import { prisma } from "@/lib/db/prisma"
import type { StatutMarche } from "@prisma/client"

export interface MarcheForReporting {
  id: string
  numero: string
  objet: string
  autoriteContractanteNom: string
  montant: number
  statut: StatutMarche
  // Dates clés — toutes optionnelles selon statut
  dateDepotPrevue:              Date | null
  dateDepotOffre:               Date | null
  dateAttributionProvisoire:    Date | null
  dateAttributionDefinitive:    Date | null
  dateOrdreService:             Date | null
  dateLivraisonPrevue:          Date | null
  dureeLivraisonPrevue:         number | null
  dateFinPrevue:                Date | null
  dateReceptionProvisoirePrevue: Date | null
  dateReceptionDefinitive:      Date | null
  dateClotureAdministrative:    Date | null
  dateResiliation:              Date | null
  dateAnnulation:               Date | null
  dateInfructueux:              Date | null
  delaiExecution:               number
}

/**
 * Retourne tous les marchés dont le statut est dans `statutGroups`.
 * Triés par statut puis par numéro.
 */
export async function getMarchesForReporting(
  statutGroups: string[]
): Promise<MarcheForReporting[]> {
  if (statutGroups.length === 0) return []

  const marches = await prisma.marche.findMany({
    where: {
      statut: { in: statutGroups as StatutMarche[] },
    },
    select: {
      id: true,
      numero: true,
      objet: true,
      autoriteContractanteNom: true,
      montant: true,
      statut: true,
      dateDepotPrevue: true,
      dateDepotOffre: true,
      dateAttributionProvisoire: true,
      dateAttributionDefinitive: true,
      dateOrdreService: true,
      dateLivraisonPrevue: true,
      dureeLivraisonPrevue: true,
      dateFinPrevue: true,
      dateReceptionProvisoirePrevue: true,
      dateReceptionDefinitive: true,
      dateClotureAdministrative: true,
      dateResiliation: true,
      dateAnnulation: true,
      dateInfructueux: true,
      delaiExecution: true,
    },
    orderBy: [{ statut: "asc" }, { numero: "asc" }],
  })

  return marches.map((m) => ({
    ...m,
    montant: Number(m.montant),
  }))
}

/**
 * Regroupe une liste de marchés par statut.
 * Retourne uniquement les statuts ayant au moins un marché.
 */
export function groupMarchesByStatut(
  marches: MarcheForReporting[]
): Map<StatutMarche, MarcheForReporting[]> {
  const map = new Map<StatutMarche, MarcheForReporting[]>()
  for (const m of marches) {
    const group = map.get(m.statut) ?? []
    group.push(m)
    map.set(m.statut, group)
  }
  return map
}
