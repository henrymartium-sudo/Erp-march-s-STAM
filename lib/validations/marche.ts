import { z } from 'zod'

// ============================================================================
// ENUMS ZOD (alignés avec Prisma)
// ============================================================================

export const typeMarcheEnum = z.enum([
  'TRAVAUX',
  'FOURNITURES',
  'SERVICES',
  'PRESTATIONS_INTELLECTUELLES',
])

export const statutMarcheEnum = z.enum([
  'OPPORTUNITE_IDENTIFIEE',
  'DOSSIER_EN_PREPARATION',
  'OFFRE_DEPOSEE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
  'ATTRIBUE_DEFINITIVEMENT',
  'EN_ATTENTE_LIVRAISON_OS',
  'EN_EXECUTION',
  'EXECUTE_ATTENTE_GARANTIES',
  'CLOTURE',
  'RESILIE',
  'ANNULE',
  'INFRUCTUEUX',
])

// ============================================================================
// HELPER POUR PREPROCESSING DES DATES
// ============================================================================

const preprocessDate = (val: unknown) => {
  if (!val || val === null || val === undefined || val === '') return undefined
  if (val instanceof Date) return val
  if (typeof val === 'string') return new Date(val)
  return val
}

// ============================================================================
// SCHÉMA DE VALIDATION MARCHÉ
// ============================================================================

// Schéma de base sans refinements (pour pouvoir utiliser .partial())
const baseMarcheSchema = z.object({
  // Champs requis
  numero: z
    .string()
    .min(1, 'Le numéro de marché est requis')
    .max(50, 'Le numéro ne peut pas dépasser 50 caractères'),

  objet: z
    .string()
    .min(10, 'L\'objet doit contenir au moins 10 caractères')
    .max(500, 'L\'objet ne peut pas dépasser 500 caractères'),

  type: typeMarcheEnum,

  montant: z
    .number()
    .positive('Le montant doit être positif')
    .max(999999999999999, 'Le montant est trop élevé'),

  dateNotification: z.date(),

  delaiExecution: z
    .number()
    .int('Le délai doit être un nombre entier')
    .positive('Le délai doit être positif')
    .max(3650, 'Le délai ne peut pas dépasser 10 ans (3650 jours)'),

  autoriteContractanteNom: z
    .string()
    .min(1, 'Le nom de l\'autorité contractante est requis')
    .max(200, 'Le nom ne peut pas dépasser 200 caractères'),

  statut: statutMarcheEnum,

  // Champs optionnels génériques
  dateOrdreService: z.date().optional().nullable(),
  dateReception: z.date().optional().nullable(),
  dateFinPrevue: z.date().optional().nullable(),

  autoriteContractanteContact: z
    .string()
    .max(200, 'Le contact ne peut pas dépasser 200 caractères')
    .optional()
    .nullable(),

  autoriteContractanteEmail: z
    .string()
    .email('Format d\'email invalide')
    .max(100, 'L\'email ne peut pas dépasser 100 caractères')
    .optional()
    .nullable(),

  autoriteContractanteTel: z
    .string()
    .max(20, 'Le téléphone ne peut pas dépasser 20 caractères')
    .regex(
      /^[\d\s+()-]+$/,
      'Le téléphone ne peut contenir que des chiffres, espaces et symboles + - ( )'
    )
    .optional()
    .nullable(),

  // Champs spécifiques par statut
  // OPPORTUNITE_IDENTIFIEE
  dateIdentification: z.date().optional().nullable(),

  // DOSSIER_EN_PREPARATION
  dateDepotPrevue: z.date().optional().nullable(),

  // OFFRE_DEPOSEE
  dateDepotOffre: z.date().optional().nullable(),
  delaiValiditeOffre: z.number().int().positive().optional().nullable(),

  // ATTRIBUE_PROVISOIREMENT
  dateAttributionProvisoire: z.date().optional().nullable(),

  // ATTRIBUE_DEFINITIVEMENT
  dateAttributionDefinitive: z.date().optional().nullable(),

  // EN_ATTENTE_LIVRAISON_OS
  dateLivraisonPrevue: z.date().optional().nullable(),
  dureeLivraisonPrevue: z.number().int().positive().optional().nullable(),

  // EN_EXECUTION / EXECUTE_ATTENTE_GARANTIES
  dateReceptionProvisoirePrevue: z.date().optional().nullable(),
  dateReceptionDefinitive: z.date().optional().nullable(),

  // EXECUTE_ATTENTE_GARANTIES
  garantiesLiberees: z.boolean().optional().nullable(),

  // CLOTURE
  dateClotureAdministrative: z.date().optional().nullable(),

  // RESILIE
  dateResiliation: z.date().optional().nullable(),
  motifsResiliation: z.string().optional().nullable(),

  // ANNULE
  dateAnnulation: z.date().optional().nullable(),
  motifsAnnulation: z.string().optional().nullable(),

  // INFRUCTUEUX
  dateInfructueux: z.date().optional().nullable(),
  motifsInfructueux: z.string().optional().nullable(),
  concurrentGagnant: z.string().optional().nullable(),
  montantOffreConcurrent: z.number().positive().optional().nullable(),

  // Véhicules associés (many-to-many)
  vehiculeIds: z.array(z.string()).optional(),

  // Commentaire optionnel lors d'un changement de statut
  commentaireStatut: z.string().optional().nullable(),
})

// Schéma avec refinements pour la validation complète
export const marcheSchema = baseMarcheSchema.superRefine((data, ctx) => {
  // Validation conditionnelle selon le statut

  // Validation des motifs de terminaison (minimum 10 caractères si fourni)
  if (data.statut === 'RESILIE' && data.motifsResiliation && data.motifsResiliation.length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Les motifs de résiliation doivent contenir au moins 10 caractères',
      path: ['motifsResiliation'],
    })
  }

  if (data.statut === 'ANNULE' && data.motifsAnnulation && data.motifsAnnulation.length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Les motifs d\'annulation doivent contenir au moins 10 caractères',
      path: ['motifsAnnulation'],
    })
  }

  if (data.statut === 'INFRUCTUEUX' && data.motifsInfructueux && data.motifsInfructueux.length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Les motifs doivent contenir au moins 10 caractères',
      path: ['motifsInfructueux'],
    })
  }

  // Validation cross-field : dateAttributionDefinitive >= dateAttributionProvisoire
  if (
    data.dateAttributionProvisoire &&
    data.dateAttributionDefinitive &&
    data.dateAttributionDefinitive < data.dateAttributionProvisoire
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La date d\'attribution définitive doit être postérieure ou égale à la date d\'attribution provisoire',
      path: ['dateAttributionDefinitive'],
    })
  }

  // Validation du montant concurrent pour INFRUCTUEUX
  if (data.statut === 'INFRUCTUEUX' && data.montantOffreConcurrent !== null && data.montantOffreConcurrent !== undefined) {
    if (data.montantOffreConcurrent <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le montant de l\'offre du concurrent doit être positif',
        path: ['montantOffreConcurrent'],
      })
    }
  }
})

// Schéma pour la création (sans id, sans dates auto)
export const createMarcheSchema = marcheSchema

// Schéma pour les Server Actions avec preprocess sur les dates (conversion string -> Date)
const preprocessedDateFields = {
  dateNotification: z.preprocess(preprocessDate, z.date()),
  dateOrdreService: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateReception: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateFinPrevue: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateIdentification: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateDepotPrevue: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateDepotOffre: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateAttributionProvisoire: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateAttributionDefinitive: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateLivraisonPrevue: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateReceptionProvisoirePrevue: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateReceptionDefinitive: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateClotureAdministrative: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateResiliation: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateAnnulation: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateInfructueux: z.preprocess(preprocessDate, z.date().optional().nullable()),
}

// Schéma pour les Server Actions (avec preprocessing des dates)
export const createMarcheServerSchema = baseMarcheSchema.extend(preprocessedDateFields).superRefine((data, ctx) => {
  // Copie des refinements du marcheSchema
  if (data.statut === 'RESILIE' && data.motifsResiliation && data.motifsResiliation.length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Les motifs de résiliation doivent contenir au moins 10 caractères',
      path: ['motifsResiliation'],
    })
  }

  if (data.statut === 'ANNULE' && data.motifsAnnulation && data.motifsAnnulation.length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Les motifs d\'annulation doivent contenir au moins 10 caractères',
      path: ['motifsAnnulation'],
    })
  }

  if (data.statut === 'INFRUCTUEUX' && data.motifsInfructueux && data.motifsInfructueux.length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Les motifs doivent contenir au moins 10 caractères',
      path: ['motifsInfructueux'],
    })
  }

  if (
    data.dateAttributionProvisoire &&
    data.dateAttributionDefinitive &&
    data.dateAttributionDefinitive < data.dateAttributionProvisoire
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La date d\'attribution définitive doit être postérieure ou égale à la date d\'attribution provisoire',
      path: ['dateAttributionDefinitive'],
    })
  }

  if (data.statut === 'INFRUCTUEUX' && data.montantOffreConcurrent !== null && data.montantOffreConcurrent !== undefined) {
    if (data.montantOffreConcurrent <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le montant de l\'offre du concurrent doit être positif',
        path: ['montantOffreConcurrent'],
      })
    }
  }
})

// Schéma pour la modification (avec id, toutes les dates optionnelles)
// Utilise baseMarcheSchema au lieu de marcheSchema pour éviter l'erreur .partial() avec refinements
export const updateMarcheSchema = baseMarcheSchema.partial().extend({
  id: z.string().cuid(),
})

// Schéma pour modification avec preprocessing
export const updateMarcheServerSchema = updateMarcheSchema.extend(preprocessedDateFields)

// ============================================================================
// TYPES INFÉRÉS
// ============================================================================

export type MarcheInput = z.infer<typeof marcheSchema>
export type CreateMarcheInput = z.infer<typeof createMarcheSchema>
export type UpdateMarcheInput = z.infer<typeof updateMarcheSchema>
