import { z } from 'zod'
import { ResultatLot } from '@prisma/client'

const montant = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().nonnegative().max(999999999999999).nullable()
)

export const lotSchema = z.object({
  opportuniteId: z.string().min(1),
  numero: z.coerce.number().int().min(1).max(999),
  intitule: z.string().trim().min(1, "L'intitulé du lot est obligatoire").max(300),
  montantEstime: montant.optional(),
  montantPropose: montant.optional(),
})

// Objet de base SANS refinement : Zod 4 lève à l'appel de .omit() / .pick() / .partial() sur un objet
// refiné (donc dès l'import du module qui l'appelle). Les schémas dérivés se construisent depuis cette
// base, et la règle métier se pose en dernier sur chacun d'eux.
const resultatLotBaseSchema = z.object({
  lotId: z.string().min(1),
  resultat: z.nativeEnum(ResultatLot),
  motifPerte: z.string().trim().max(5000).optional().nullable(),
  concurrentGagnant: z.string().trim().max(200).optional().nullable(),
  montantOffreConcurrent: montant.optional(),
})

// Règle partagée par le schéma serveur et le schéma du formulaire : un lot perdu exige un motif.
const motifPerteRequisSiPerdu = (d: { resultat: ResultatLot; motifPerte?: string | null }) =>
  d.resultat !== 'PERDU' || !!d.motifPerte?.trim()
const motifPerteRequisSiPerduIssue = {
  message: 'Le motif de perte est obligatoire pour un lot perdu',
  path: ['motifPerte'],
}

export const resultatLotSchema = resultatLotBaseSchema.refine(
  motifPerteRequisSiPerdu,
  motifPerteRequisSiPerduIssue
)

// Pour react-hook-form : sans `lotId`, fourni par le composant au moment de l'envoi.
export const formResultatLotSchema = resultatLotBaseSchema
  .omit({ lotId: true })
  .refine(motifPerteRequisSiPerdu, motifPerteRequisSiPerduIssue)

export const RESULTAT_LOT_LABELS: Record<ResultatLot, string> = {
  EN_COURS: 'En attente',
  ATTRIBUE_PROVISOIREMENT: 'Attribué provisoirement',
  GAGNE: 'Gagné',
  PERDU: 'Perdu',
  INFRUCTUEUX: 'Infructueux',
}
