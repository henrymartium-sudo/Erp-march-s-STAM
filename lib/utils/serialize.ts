/**
 * Fonctions de sérialisation pour convertir les objets Prisma en objets sérialisables.
 *
 * Les objets Prisma contiennent des types non sérialisables par React Server Components :
 * - Prisma.Decimal -> converti en number
 * - Date -> converti en string ISO
 */

import type { SerializedMarche, SerializedCaution } from '@/types/serialized'

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
