import { z } from 'zod'

// ============================================================================
// ENUMS ZOD (alignés avec Prisma)
// ============================================================================

export const typeCautionEnum = z.enum([
  'PROVISOIRE',
  'DEFINITIVE',
  'AVANCE',
  'RETENUE_GARANTIE',
])

export const statutCautionEnum = z.enum([
  'ACTIVE',
  'EXPIREE',
  'LIBEREE',
  'APPELEE',
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
// SCHÉMA DE VALIDATION CAUTION
// ============================================================================

// Schéma de base sans refinements (pour pouvoir utiliser .partial())
const baseCautionSchema = z.object({
  // Champs requis
  reference: z
    .string()
    .min(1, 'La référence de la caution est requise')
    .max(100, 'La référence ne peut pas dépasser 100 caractères'),

  type: typeCautionEnum,

  montant: z
    .number()
    .positive('Le montant doit être positif')
    .max(999999999999999, 'Le montant est trop élevé'),

  dateEmission: z.date(),

  dateEcheance: z.date(),

  statut: statutCautionEnum.default('ACTIVE'),

  banqueNom: z
    .string()
    .min(1, 'Le nom de la banque est requis')
    .max(200, 'Le nom de la banque ne peut pas dépasser 200 caractères'),

  banqueContact: z
    .string()
    .max(200, 'Le contact ne peut pas dépasser 200 caractères')
    .optional()
    .nullable(),

  // Relation avec le marché
  marcheId: z.string().cuid('ID de marché invalide'),
})

// Schéma avec refinements pour la validation complète
export const cautionSchema = baseCautionSchema.superRefine((data, ctx) => {
  // Validation cross-field : dateEcheance >= dateEmission
  if (data.dateEcheance <= data.dateEmission) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La date d\'échéance doit être postérieure à la date d\'émission',
      path: ['dateEcheance'],
    })
  }

  // Validation : les cautions PROVISOIRE ne peuvent pas avoir le statut LIBEREE
  if (data.type === 'PROVISOIRE' && data.statut === 'LIBEREE') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Une caution provisoire ne peut pas être libérée (elle est remplacée par la caution définitive)',
      path: ['statut'],
    })
  }

  // Validation : une caution ne peut pas être à la fois EXPIREE et LIBEREE
  if (data.statut === 'EXPIREE' || data.statut === 'LIBEREE') {
    const now = new Date()
    if (data.statut === 'EXPIREE' && data.dateEcheance > now) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Une caution ne peut être marquée comme expirée si sa date d\'échéance n\'est pas dépassée',
        path: ['statut'],
      })
    }
  }
})

// Schéma pour la création (sans id, sans dates auto)
export const createCautionSchema = cautionSchema

// Schéma pour les Server Actions avec preprocess sur les dates (conversion string -> Date)
const preprocessedDateFields = {
  dateEmission: z.preprocess(preprocessDate, z.date()),
  dateEcheance: z.preprocess(preprocessDate, z.date()),
}

// Schéma pour les Server Actions (avec preprocessing des dates)
export const createCautionServerSchema = baseCautionSchema
  .extend(preprocessedDateFields)
  .superRefine((data, ctx) => {
    // Copie des refinements du cautionSchema
    if (data.dateEcheance <= data.dateEmission) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La date d\'échéance doit être postérieure à la date d\'émission',
        path: ['dateEcheance'],
      })
    }

    if (data.type === 'PROVISOIRE' && data.statut === 'LIBEREE') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Une caution provisoire ne peut pas être libérée',
        path: ['statut'],
      })
    }

    if (data.statut === 'EXPIREE') {
      const now = new Date()
      if (data.dateEcheance > now) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Une caution ne peut être marquée comme expirée si sa date d\'échéance n\'est pas dépassée',
          path: ['statut'],
        })
      }
    }
  })

// Schéma pour la modification (avec id, tous les champs optionnels)
export const updateCautionSchema = baseCautionSchema.partial().extend({
  id: z.string().cuid(),
})

// Schéma pour modification avec preprocessing
export const updateCautionServerSchema = updateCautionSchema.extend(preprocessedDateFields)

// Schéma pour les filtres
export const cautionFiltersSchema = z.object({
  type: typeCautionEnum.optional(),
  statut: statutCautionEnum.optional(),
  marcheId: z.string().cuid().optional(),
  dateEmissionDebut: z.date().optional(),
  dateEmissionFin: z.date().optional(),
  dateEcheanceDebut: z.date().optional(),
  dateEcheanceFin: z.date().optional(),
  search: z.string().optional(),
})

// ============================================================================
// TYPES INFÉRÉS
// ============================================================================

export type CautionInput = z.infer<typeof cautionSchema>
export type CreateCautionInput = z.infer<typeof createCautionSchema>
export type UpdateCautionInput = z.infer<typeof updateCautionSchema>
export type CautionFiltersInput = z.input<typeof cautionFiltersSchema>
