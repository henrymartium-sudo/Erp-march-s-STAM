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

// ============================================================================
// REFINEMENTS PARTAGÉS (create/update, client/serveur)
// ============================================================================

type MarcheRefinementData = Partial<z.infer<typeof baseMarcheSchema>>

/**
 * Validation conditionnelle selon le statut.
 * Pour un statut de terminaison (RESILIE, ANNULE, INFRUCTUEUX), la date
 * et les motifs (≥ 10 caractères) sont obligatoires — bloquant, cohérent
 * avec COMMENTAIRE_OBLIGATOIRE de lib/utils/workflow-statuts.ts.
 * Sur un schéma partiel (update), les contrôles ne s'appliquent que si
 * le statut est présent dans le payload.
 */
const marcheRefinements = (data: MarcheRefinementData, ctx: z.RefinementCtx) => {
  if (data.statut === 'RESILIE') {
    if (!data.dateResiliation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La date de résiliation est requise pour un marché résilié',
        path: ['dateResiliation'],
      })
    }
    if (!data.motifsResiliation || data.motifsResiliation.trim().length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Les motifs de résiliation sont requis (minimum 10 caractères)',
        path: ['motifsResiliation'],
      })
    }
  }

  if (data.statut === 'ANNULE') {
    if (!data.dateAnnulation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La date d\'annulation est requise pour un marché annulé',
        path: ['dateAnnulation'],
      })
    }
    if (!data.motifsAnnulation || data.motifsAnnulation.trim().length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Les motifs d\'annulation sont requis (minimum 10 caractères)',
        path: ['motifsAnnulation'],
      })
    }
  }

  if (data.statut === 'INFRUCTUEUX') {
    if (!data.dateInfructueux) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La date de déclaration d\'infructuosité est requise',
        path: ['dateInfructueux'],
      })
    }
    if (!data.motifsInfructueux || data.motifsInfructueux.trim().length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Les motifs d\'infructuosité sont requis (minimum 10 caractères)',
        path: ['motifsInfructueux'],
      })
    }
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
}

// Schéma avec refinements pour la validation complète
export const marcheSchema = baseMarcheSchema.superRefine(marcheRefinements)

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
export const createMarcheServerSchema = baseMarcheSchema
  .extend(preprocessedDateFields)
  .superRefine(marcheRefinements)

// Schéma pour la modification (avec id, toutes les dates optionnelles)
// Utilise baseMarcheSchema au lieu de marcheSchema pour éviter l'erreur .partial() avec refinements
const updateMarcheBaseSchema = baseMarcheSchema.partial().extend({
  id: z.string().cuid(),
})

export const updateMarcheSchema = updateMarcheBaseSchema.superRefine(marcheRefinements)

// Schéma pour modification avec preprocessing
export const updateMarcheServerSchema = updateMarcheBaseSchema
  .extend(preprocessedDateFields)
  .superRefine(marcheRefinements)

// ============================================================================
// TYPES INFÉRÉS
// ============================================================================

export type MarcheInput = z.infer<typeof marcheSchema>
export type CreateMarcheInput = z.infer<typeof createMarcheSchema>
export type UpdateMarcheInput = z.infer<typeof updateMarcheSchema>
