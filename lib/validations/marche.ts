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
  'RESILIE_ANNULE_INFRUCTUEUX',
])

// ============================================================================
// SCHÉMA DE VALIDATION MARCHÉ
// ============================================================================

export const marcheSchema = z.object({
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

  dateNotification: z.preprocess((val) => {
    if (val instanceof Date) return val
    if (typeof val === 'string') return new Date(val)
    return val
  }, z.date()),

  delaiExecution: z
    .number()
    .int('Le délai doit être un nombre entier')
    .positive('Le délai doit être positif')
    .max(3650, 'Le délai ne peut pas dépasser 10 ans (3650 jours)'),

  fournisseurNom: z
    .string()
    .min(1, 'Le nom du fournisseur est requis')
    .max(200, 'Le nom du fournisseur ne peut pas dépasser 200 caractères'),

  statut: statutMarcheEnum.default('OPPORTUNITE_IDENTIFIEE'),

  // Champs optionnels
  dateOrdreService: z.preprocess((val) => {
    if (!val || val === null || val === undefined || val === '') return undefined
    if (val instanceof Date) return val
    if (typeof val === 'string') return new Date(val)
    return val
  }, z.date().optional().nullable()),

  dateReception: z.preprocess((val) => {
    if (!val || val === null || val === undefined || val === '') return undefined
    if (val instanceof Date) return val
    if (typeof val === 'string') return new Date(val)
    return val
  }, z.date().optional().nullable()),

  dateFinPrevue: z.preprocess((val) => {
    if (!val || val === null || val === undefined || val === '') return undefined
    if (val instanceof Date) return val
    if (typeof val === 'string') return new Date(val)
    return val
  }, z.date().optional().nullable()),

  fournisseurContact: z
    .string()
    .max(200, 'Le contact ne peut pas dépasser 200 caractères')
    .optional()
    .nullable(),

  fournisseurEmail: z
    .string()
    .email('Format d\'email invalide')
    .max(100, 'L\'email ne peut pas dépasser 100 caractères')
    .optional()
    .nullable(),

  fournisseurTel: z
    .string()
    .max(20, 'Le téléphone ne peut pas dépasser 20 caractères')
    .regex(
      /^[\d\s+()-]+$/,
      'Le téléphone ne peut contenir que des chiffres, espaces et symboles + - ( )'
    )
    .optional()
    .nullable(),
})

// Schéma pour la création (sans id, sans dates auto)
export const createMarcheSchema = marcheSchema

// Schéma pour la modification (avec id, toutes les dates optionnelles)
export const updateMarcheSchema = marcheSchema.partial().extend({
  id: z.string().cuid(),
})

// ============================================================================
// TYPES INFÉRÉS
// ============================================================================

export type MarcheInput = z.infer<typeof marcheSchema>
export type CreateMarcheInput = z.infer<typeof createMarcheSchema>
export type UpdateMarcheInput = z.infer<typeof updateMarcheSchema>
