/**
 * Fonctions de sérialisation pour convertir les objets Prisma en objets sérialisables.
 *
 * Les objets Prisma contiennent des types non sérialisables par React Server Components :
 * - Prisma.Decimal -> converti en number
 * - Date -> converti en string ISO
 */

import type { SerializedMarche, SerializedCaution, SerializedVehicule, SerializedIntervention } from '@/types/serialized'

/**
 * Sérialise un marché Prisma en objet plain pour le passage aux Client Components.
 * Convertit les Decimal en number et les Date en string ISO.
 */
export function serializeMarche(marche: any): SerializedMarche {
  return {
    ...marche,
    montant: typeof marche.montant === 'number'
      ? marche.montant
      : Number(marche.montant),
    montantOffreConcurrent: marche.montantOffreConcurrent
      ? (typeof marche.montantOffreConcurrent === 'number'
          ? marche.montantOffreConcurrent
          : Number(marche.montantOffreConcurrent))
      : null,
    dateNotification: marche.dateNotification instanceof Date
      ? marche.dateNotification.toISOString()
      : String(marche.dateNotification),
    dateOrdreService: marche.dateOrdreService instanceof Date
      ? marche.dateOrdreService.toISOString()
      : marche.dateOrdreService
        ? String(marche.dateOrdreService)
        : null,
    dateFinPrevue: marche.dateFinPrevue instanceof Date
      ? marche.dateFinPrevue.toISOString()
      : marche.dateFinPrevue
        ? String(marche.dateFinPrevue)
        : null,
    dateReception: marche.dateReception instanceof Date
      ? marche.dateReception.toISOString()
      : marche.dateReception
        ? String(marche.dateReception)
        : null,
    createdAt: marche.createdAt instanceof Date
      ? marche.createdAt.toISOString()
      : String(marche.createdAt),
    updatedAt: marche.updatedAt instanceof Date
      ? marche.updatedAt.toISOString()
      : String(marche.updatedAt),
    dateIdentification: marche.dateIdentification instanceof Date
      ? marche.dateIdentification.toISOString()
      : marche.dateIdentification
        ? String(marche.dateIdentification)
        : null,
    dateDepotPrevue: marche.dateDepotPrevue instanceof Date
      ? marche.dateDepotPrevue.toISOString()
      : marche.dateDepotPrevue
        ? String(marche.dateDepotPrevue)
        : null,
    dateDepotOffre: marche.dateDepotOffre instanceof Date
      ? marche.dateDepotOffre.toISOString()
      : marche.dateDepotOffre
        ? String(marche.dateDepotOffre)
        : null,
    dateAttributionProvisoire: marche.dateAttributionProvisoire instanceof Date
      ? marche.dateAttributionProvisoire.toISOString()
      : marche.dateAttributionProvisoire
        ? String(marche.dateAttributionProvisoire)
        : null,
    dateAttributionDefinitive: marche.dateAttributionDefinitive instanceof Date
      ? marche.dateAttributionDefinitive.toISOString()
      : marche.dateAttributionDefinitive
        ? String(marche.dateAttributionDefinitive)
        : null,
    dateLivraisonPrevue: marche.dateLivraisonPrevue instanceof Date
      ? marche.dateLivraisonPrevue.toISOString()
      : marche.dateLivraisonPrevue
        ? String(marche.dateLivraisonPrevue)
        : null,
    dateReceptionProvisoirePrevue: marche.dateReceptionProvisoirePrevue instanceof Date
      ? marche.dateReceptionProvisoirePrevue.toISOString()
      : marche.dateReceptionProvisoirePrevue
        ? String(marche.dateReceptionProvisoirePrevue)
        : null,
    dateReceptionDefinitive: marche.dateReceptionDefinitive instanceof Date
      ? marche.dateReceptionDefinitive.toISOString()
      : marche.dateReceptionDefinitive
        ? String(marche.dateReceptionDefinitive)
        : null,
    dateClotureAdministrative: marche.dateClotureAdministrative instanceof Date
      ? marche.dateClotureAdministrative.toISOString()
      : marche.dateClotureAdministrative
        ? String(marche.dateClotureAdministrative)
        : null,
    dateResiliation: marche.dateResiliation instanceof Date
      ? marche.dateResiliation.toISOString()
      : marche.dateResiliation
        ? String(marche.dateResiliation)
        : null,
    dateAnnulation: marche.dateAnnulation instanceof Date
      ? marche.dateAnnulation.toISOString()
      : marche.dateAnnulation
        ? String(marche.dateAnnulation)
        : null,
    dateInfructueux: marche.dateInfructueux instanceof Date
      ? marche.dateInfructueux.toISOString()
      : marche.dateInfructueux
        ? String(marche.dateInfructueux)
        : null,
    // Véhicules aplatis depuis marcheVehicules
    vehicules: marche.marcheVehicules
      ? marche.marcheVehicules.map((mv: any) => mv.vehicule).filter(Boolean)
      : undefined,
  }
}

/**
 * Sérialise une caution Prisma en objet plain pour le passage aux Client Components.
 * Convertit les Decimal en number et les Date en string ISO.
 */
export function serializeCaution(caution: any): SerializedCaution {
  return {
    ...caution,
    montant: typeof caution.montant === 'number'
      ? caution.montant
      : Number(caution.montant),
    dateEmission: caution.dateEmission instanceof Date
      ? caution.dateEmission.toISOString()
      : String(caution.dateEmission),
    dateEcheance: caution.dateEcheance instanceof Date
      ? caution.dateEcheance.toISOString()
      : String(caution.dateEcheance),
    createdAt: caution.createdAt instanceof Date
      ? caution.createdAt.toISOString()
      : String(caution.createdAt),
    updatedAt: caution.updatedAt instanceof Date
      ? caution.updatedAt.toISOString()
      : String(caution.updatedAt),
    marche: caution.marche ? {
      ...caution.marche,
      montant: typeof caution.marche.montant === 'number'
        ? caution.marche.montant
        : Number(caution.marche.montant),
    } : undefined,
  }
}

/**
 * Sérialise un véhicule Prisma en objet plain pour le passage aux Client Components.
 * Convertit les Date en string ISO.
 */
export function serializeVehicule(vehicule: any): SerializedVehicule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { marcheId: _ignored, marche: _ignoredMarche, ...rest } = vehicule
  return {
    ...rest,
    dateLivraison: vehicule.dateLivraison instanceof Date
      ? vehicule.dateLivraison.toISOString()
      : vehicule.dateLivraison
        ? String(vehicule.dateLivraison)
        : null,
    dateReceptionProvisoire: vehicule.dateReceptionProvisoire instanceof Date
      ? vehicule.dateReceptionProvisoire.toISOString()
      : vehicule.dateReceptionProvisoire
        ? String(vehicule.dateReceptionProvisoire)
        : null,
    dateReceptionDefinitive: vehicule.dateReceptionDefinitive instanceof Date
      ? vehicule.dateReceptionDefinitive.toISOString()
      : vehicule.dateReceptionDefinitive
        ? String(vehicule.dateReceptionDefinitive)
        : null,
    dateFinGarantie: vehicule.dateFinGarantie instanceof Date
      ? vehicule.dateFinGarantie.toISOString()
      : vehicule.dateFinGarantie
        ? String(vehicule.dateFinGarantie)
        : null,
    kilometrageGarantie: vehicule.kilometrageGarantie ?? null,
    statutSAV: vehicule.statutSAV ?? 'EN_SERVICE',
    interventions: vehicule.interventions
      ? vehicule.interventions.map((i: any) => serializeIntervention(i))
      : undefined,
    createdAt: vehicule.createdAt instanceof Date
      ? vehicule.createdAt.toISOString()
      : String(vehicule.createdAt),
    updatedAt: vehicule.updatedAt instanceof Date
      ? vehicule.updatedAt.toISOString()
      : String(vehicule.updatedAt),
    // Marchés aplatis depuis marcheVehicules
    marches: vehicule.marcheVehicules
      ? vehicule.marcheVehicules.map((mv: any) => mv.marche).filter(Boolean)
      : undefined,
  }
}

/**
 * Sérialise une intervention Prisma en objet plain pour le passage aux Client Components.
 */
export function serializeIntervention(intervention: any): SerializedIntervention {
  return {
    ...intervention,
    cout: intervention.cout != null
      ? (typeof intervention.cout === 'number' ? intervention.cout : Number(intervention.cout))
      : null,
    signaleAt: intervention.signaleAt instanceof Date
      ? intervention.signaleAt.toISOString()
      : String(intervention.signaleAt),
    immobiliseAt: intervention.immobiliseAt instanceof Date
      ? intervention.immobiliseAt.toISOString()
      : intervention.immobiliseAt ? String(intervention.immobiliseAt) : null,
    resolveAt: intervention.resolveAt instanceof Date
      ? intervention.resolveAt.toISOString()
      : intervention.resolveAt ? String(intervention.resolveAt) : null,
    createdAt: intervention.createdAt instanceof Date
      ? intervention.createdAt.toISOString()
      : String(intervention.createdAt),
    updatedAt: intervention.updatedAt instanceof Date
      ? intervention.updatedAt.toISOString()
      : String(intervention.updatedAt),
  }
}
