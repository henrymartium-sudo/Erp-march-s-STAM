import { z } from 'zod'

// ============================================================================
// ENUM
// ============================================================================

export const statutFactureEnum = z.enum([
  'BROUILLON',
  'EMISE',
  'EN_ATTENTE',
  'PAYEE',
  'REJETEE',
  'ANNULEE',
])

export type StatutFactureInput = z.infer<typeof statutFactureEnum>

// ============================================================================
// LABELS
// ============================================================================

export const STATUT_FACTURE_LABELS: Record<string, string> = {
  BROUILLON:  'Brouillon',
  EMISE:      'Émise',
  EN_ATTENTE: 'En attente',
  PAYEE:      'Payée',
  REJETEE:    'Rejetée',
  ANNULEE:    'Annulée',
}

export const STATUT_FACTURE_COLORS: Record<string, string> = {
  BROUILLON:  'muted',
  EMISE:      'info',
  EN_ATTENTE: 'warning',
  PAYEE:      'success',
  REJETEE:    'danger',
  ANNULEE:    'muted',
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
// SCHÉMA DE BASE
// ============================================================================

// Schéma pour react-hook-form (sans z.preprocess ni .default — dates en tant que Date | null)
export const formFactureSchema = z.object({
  numero: z.string().min(1, 'Le numéro de facture est requis').max(50),
  marcheId: z.string().min(1, 'Le marché associé est requis'),
  montantHT: z.number().positive('Le montant HT doit être positif').max(999999999999999),
  tva: z.number().min(0).max(100),
  montantTTC: z.number().positive('Le montant TTC doit être positif').max(999999999999999),
  statut: statutFactureEnum,
  dateEmission: z.date().optional().nullable(),
  dateEcheance: z.date().optional().nullable(),
  datePaiement: z.date().optional().nullable(),
  reference: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type FormFactureInput = z.infer<typeof formFactureSchema>

// Schéma serveur (avec preprocess pour conversion string→Date depuis FormData)
export const createFactureSchema = z.object({
  numero: z
    .string()
    .min(1, 'Le numéro de facture est requis')
    .max(50, 'Le numéro ne peut pas dépasser 50 caractères'),

  marcheId: z.string().min(1, 'Le marché associé est requis'),

  montantHT: z
    .number()
    .positive('Le montant HT doit être positif')
    .max(999999999999999, 'Montant trop élevé'),

  tva: z
    .number()
    .min(0, 'La TVA ne peut pas être négative')
    .max(100, 'La TVA ne peut pas dépasser 100%')
    .default(18),

  montantTTC: z
    .number()
    .positive('Le montant TTC doit être positif')
    .max(999999999999999, 'Montant trop élevé'),

  statut: statutFactureEnum.default('BROUILLON'),

  dateEmission: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateEcheance: z.preprocess(preprocessDate, z.date().optional().nullable()),
  datePaiement: z.preprocess(preprocessDate, z.date().optional().nullable()),

  reference: z
    .string()
    .max(100, 'La référence ne peut pas dépasser 100 caractères')
    .optional()
    .nullable(),

  notes: z.string().optional().nullable(),
})

export const updateFactureSchema = createFactureSchema.partial().extend({
  id: z.string().cuid(),
})

// ============================================================================
// TYPES INFÉRÉS
// ============================================================================

export type CreateFactureInput = z.infer<typeof createFactureSchema>
export type UpdateFactureInput = z.infer<typeof updateFactureSchema>
