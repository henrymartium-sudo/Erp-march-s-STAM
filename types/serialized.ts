/**
 * Types sérialisés pour le passage de données entre Server Components et Client Components.
 *
 * Les objets Prisma contiennent des types non sérialisables par RSC :
 * - Prisma.Decimal -> converti en number
 * - Date -> converti en string ISO (pour cohérence et sécurité)
 *
 * Ces types représentent les données APRÈS sérialisation.
 */

import type { TypeCaution, StatutCaution, TypeMarche, StatutMarche, StatutVehicule } from '@prisma/client'

// ============================================================================
// CAUTION SÉRIALISÉE
// ============================================================================

export interface SerializedCaution {
  id: string
  reference: string
  type: TypeCaution
  montant: number // Decimal -> number
  dateEmission: string // Date -> ISO string
  dateEcheance: string // Date -> ISO string
  statut: StatutCaution
  banqueNom: string
  banqueContact: string | null
  marcheId: string
  userId: string
  createdAt: string // Date -> ISO string
  updatedAt: string // Date -> ISO string
  marche?: {
    id: string
    numero: string
    objet: string
    montant: number // Decimal -> number
  }
}

// ============================================================================
// MARCHÉ SÉRIALISÉ
// ============================================================================

export interface SerializedMarche {
  id: string
  numero: string
  objet: string
  type: TypeMarche
  montant: number // Decimal -> number
  dateNotification: string // Date -> ISO string
  dateOrdreService: string | null // Date -> ISO string
  delaiExecution: number
  dateFinPrevue: string | null // Date -> ISO string
  dateReception: string | null // Date -> ISO string
  statut: StatutMarche
  autoriteContractanteNom: string
  autoriteContractanteContact: string | null
  autoriteContractanteEmail: string | null
  autoriteContractanteTel: string | null
  createdAt: string // Date -> ISO string
  updatedAt: string // Date -> ISO string
  dateIdentification: string | null
  dateDepotPrevue: string | null
  dateDepotOffre: string | null
  delaiValiditeOffre: number | null
  dateAttributionProvisoire: string | null
  dateAttributionDefinitive: string | null
  dateLivraisonPrevue: string | null
  dureeLivraisonPrevue: number | null
  dateReceptionProvisoirePrevue: string | null
  garantiesLiberees: boolean | null
  dateClotureAdministrative: string | null
  dateResiliation: string | null
  motifsResiliation: string | null
  dateAnnulation: string | null
  motifsAnnulation: string | null
  dateInfructueux: string | null
  motifsInfructueux: string | null
  concurrentGagnant: string | null
  montantOffreConcurrent: number | null // Decimal -> number
  userId: string
}

// ============================================================================
// VÉHICULE SÉRIALISÉ
// ============================================================================

export interface SerializedVehicule {
  id: string
  immatriculation: string
  marque: string
  modele: string
  annee: number | null
  dateLivraison: string | null // Date -> ISO string
  bonLivraisonRef: string | null
  dateReceptionProvisoire: string | null // Date -> ISO string
  dateReceptionDefinitive: string | null // Date -> ISO string
  reservesReception: string | null
  statut: StatutVehicule
  marcheId: string | null
  createdAt: string // Date -> ISO string
  updatedAt: string // Date -> ISO string
  marche?: {
    id: string
    numero: string
    objet: string
    statut: string
  } | null
}
