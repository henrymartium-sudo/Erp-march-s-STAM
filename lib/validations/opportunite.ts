import { z } from 'zod'

// ============================================================================
// ENUM
// ============================================================================

export const statutOpportuniteEnum = z.enum([
  'IDENTIFIEE',
  'EN_ANALYSE',
  'GO',
  'NO_GO',
  'SOUMISE',
  'GAGNEE',
  'PERDUE',
])

export type StatutOpportuniteInput = z.infer<typeof statutOpportuniteEnum>

// ============================================================================
// LABELS ET COULEURS
// ============================================================================

export const STATUT_OPPORTUNITE_LABELS: Record<string, string> = {
  IDENTIFIEE:  'Identifiée',
  EN_ANALYSE:  'En analyse',
  GO:          'GO',
  NO_GO:       'No Go',
  SOUMISE:     'Soumise',
  GAGNEE:      'Gagnée',
  PERDUE:      'Perdue',
}

export const STATUT_OPPORTUNITE_COLORS: Record<string, string> = {
  IDENTIFIEE:  'muted',
  EN_ANALYSE:  'info',
  GO:          'success',
  NO_GO:       'danger',
  SOUMISE:     'warning',
  GAGNEE:      'success',
  PERDUE:      'muted',
}

// ============================================================================
// HELPER DATE PREPROCESS
// ============================================================================

const preprocessDate = (val: unknown) => {
  if (!val || val === '') return undefined
  if (val instanceof Date) return val
  if (typeof val === 'string') return new Date(val)
  return val
}

// ============================================================================
// SCHÉMAS
// ============================================================================

// Pour react-hook-form (dates en tant que Date | null)
export const formOpportuniteSchema = z.object({
  reference:            z.string().max(100).optional().nullable(),
  objet:                z.string().min(1, "L'objet est requis").max(500),
  autoriteContractante: z.string().min(1, "L'autorité contractante est requise").max(200),
  montantEstime:        z.number().positive('Le montant estimé doit être positif').max(999999999999999).optional().nullable(),
  datePublication:      z.date().optional().nullable(),
  dateLimite:           z.date().optional().nullable(),
  statut:               statutOpportuniteEnum,
  probabiliteGain:      z.number().int().min(0).max(100).optional().nullable(),
  notes:                z.string().optional().nullable(),
  marcheId:             z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().optional().nullable()
  ),
})

export type FormOpportuniteInput = z.infer<typeof formOpportuniteSchema>

// Pour le serveur (avec preprocess pour conversion string→Date)
export const createOpportuniteSchema = z.object({
  reference: z.string().max(100).optional().nullable(),

  objet: z
    .string()
    .min(1, "L'objet est requis")
    .max(500, "L'objet ne peut pas dépasser 500 caractères"),

  autoriteContractante: z
    .string()
    .min(1, "L'autorité contractante est requise")
    .max(200, "Le nom ne peut pas dépasser 200 caractères"),

  montantEstime: z
    .number()
    .positive('Le montant estimé doit être positif')
    .max(999999999999999, 'Montant trop élevé')
    .optional()
    .nullable(),

  datePublication: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateLimite:      z.preprocess(preprocessDate, z.date().optional().nullable()),

  statut: statutOpportuniteEnum.default('IDENTIFIEE'),

  probabiliteGain: z
    .number()
    .int()
    .min(0, 'La probabilité doit être entre 0 et 100')
    .max(100, 'La probabilité doit être entre 0 et 100')
    .optional()
    .nullable(),

  notes:    z.string().optional().nullable(),
  marcheId: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().optional().nullable()
  ),
})

export const updateOpportuniteSchema = createOpportuniteSchema.partial().extend({
  id: z.string().cuid(),
})

// ============================================================================
// TYPES INFÉRÉS
// ============================================================================

export type CreateOpportuniteInput = z.infer<typeof createOpportuniteSchema>
export type UpdateOpportuniteInput = z.infer<typeof updateOpportuniteSchema>
