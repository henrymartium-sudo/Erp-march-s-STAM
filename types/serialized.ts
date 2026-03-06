/**
 * Types sérialisés pour le passage de données entre Server Components et Client Components.
 *
 * Les objets Prisma contiennent des types non sérialisables par RSC :
 * - Prisma.Decimal -> converti en number
 * - Date -> converti en string ISO (pour cohérence et sécurité)
 *
 * Ces types représentent les données APRÈS sérialisation.
 */

import type { TypeCaution, StatutCaution, TypeMarche, StatutMarche, StatutVehicule, StatutSAV, TypeIntervention, StatutIntervention } from '@prisma/client'

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
  dateReceptionDefinitive: string | null
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
  // Véhicules associés (via table de jonction)
  vehicules?: Array<{
    id: string
    immatriculation: string
    marque: string
    modele: string
    annee: number | null
    statut: string
  }>
  // Opportunité d'origine (lien bidirectionnel)
  opportunite?: {
    id: string
    reference: string | null
    objet: string
  } | null
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
  // SAV
  dateFinGarantie: string | null     // Date -> ISO string
  kilometrageGarantie: number | null
  statutSAV: StatutSAV
  interventions?: SerializedIntervention[]
  createdAt: string // Date -> ISO string
  updatedAt: string // Date -> ISO string
  // Marchés associés (via table de jonction many-to-many)
  marches?: Array<{
    id: string
    numero: string
    objet: string
    statut: string
  }>
}

// ============================================================================
// INTERVENTION SÉRIALISÉE
// ============================================================================

export interface SerializedIntervention {
  id: string
  vehiculeId: string
  type: TypeIntervention
  statut: StatutIntervention
  sousGarantie: boolean
  signaleAt: string           // Date -> ISO string
  immobiliseAt: string | null // Date -> ISO string
  resolveAt: string | null    // Date -> ISO string
  cout: number | null         // Decimal -> number
  description: string | null
  commentaireContractuel: string | null
  createdAt: string           // Date -> ISO string
  updatedAt: string           // Date -> ISO string
  vehicule?: {
    id: string
    immatriculation: string
    marque: string
    modele: string
  }
}

// ============================================================================
// FONCTIONS DE SÉRIALISATION
// ============================================================================

/**
 * Convertit un objet Prisma.Decimal en number
 */
export function serializeDecimal(decimal: any): number {
  if (!decimal) return 0
  if (typeof decimal === 'number') return decimal
  if (typeof decimal.toNumber === 'function') return decimal.toNumber()
  return Number(decimal)
}

/**
 * Convertit une Date en string ISO
 */
export function serializeDate(date: any): string | null {
  if (!date) return null
  if (date instanceof Date) return date.toISOString()
  if (typeof date === 'string') return new Date(date).toISOString()
  return null
}

/**
 * Sérialise un marché Prisma vers SerializedMarche
 */
export function serializeMarche(marche: any): SerializedMarche {
  return {
    ...marche,
    montant: serializeDecimal(marche.montant),
    montantOffreConcurrent: marche.montantOffreConcurrent ? serializeDecimal(marche.montantOffreConcurrent) : null,
    dateNotification: serializeDate(marche.dateNotification) || '',
    dateOrdreService: serializeDate(marche.dateOrdreService),
    dateFinPrevue: serializeDate(marche.dateFinPrevue),
    dateReception: serializeDate(marche.dateReception),
    createdAt: serializeDate(marche.createdAt) || '',
    updatedAt: serializeDate(marche.updatedAt) || '',
    dateIdentification: serializeDate(marche.dateIdentification),
    dateDepotPrevue: serializeDate(marche.dateDepotPrevue),
    dateDepotOffre: serializeDate(marche.dateDepotOffre),
    dateAttributionProvisoire: serializeDate(marche.dateAttributionProvisoire),
    dateAttributionDefinitive: serializeDate(marche.dateAttributionDefinitive),
    dateLivraisonPrevue: serializeDate(marche.dateLivraisonPrevue),
    dateReceptionProvisoirePrevue: serializeDate(marche.dateReceptionProvisoirePrevue),
    dateReceptionDefinitive: serializeDate(marche.dateReceptionDefinitive),
    dateClotureAdministrative: serializeDate(marche.dateClotureAdministrative),
    dateResiliation: serializeDate(marche.dateResiliation),
    dateAnnulation: serializeDate(marche.dateAnnulation),
    dateInfructueux: serializeDate(marche.dateInfructueux),
    // Véhicules aplatis depuis marcheVehicules
    vehicules: marche.marcheVehicules
      ? marche.marcheVehicules.map((mv: any) => mv.vehicule).filter(Boolean)
      : undefined,
  }
}

/**
 * Sérialise une caution Prisma vers SerializedCaution
 */
export function serializeCaution(caution: any): SerializedCaution {
  return {
    ...caution,
    montant: serializeDecimal(caution.montant),
    dateEmission: serializeDate(caution.dateEmission) || '',
    dateEcheance: serializeDate(caution.dateEcheance) || '',
    createdAt: serializeDate(caution.createdAt) || '',
    updatedAt: serializeDate(caution.updatedAt) || '',
    marche: caution.marche ? {
      ...caution.marche,
      montant: serializeDecimal(caution.marche.montant),
    } : undefined,
  }
}

/**
 * Sérialise un véhicule Prisma vers SerializedVehicule
 */
export function serializeVehicule(vehicule: any): SerializedVehicule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { marcheId: _ignored, marche: _ignoredMarche, ...rest } = vehicule
  return {
    ...rest,
    dateLivraison: serializeDate(vehicule.dateLivraison),
    dateReceptionProvisoire: serializeDate(vehicule.dateReceptionProvisoire),
    dateReceptionDefinitive: serializeDate(vehicule.dateReceptionDefinitive),
    createdAt: serializeDate(vehicule.createdAt) || '',
    updatedAt: serializeDate(vehicule.updatedAt) || '',
    // Marchés aplatis depuis marcheVehicules
    marches: vehicule.marcheVehicules
      ? vehicule.marcheVehicules.map((mv: any) => mv.marche).filter(Boolean)
      : undefined,
  }
}
