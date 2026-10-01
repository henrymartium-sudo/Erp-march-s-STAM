import { z } from 'zod'

// ============================================================================
// ENUM
// ============================================================================

export const statutOpportuniteEnum = z.enum([
  'EN_ANALYSE',
  'GO',
  'NO_GO',
  'DOSSIER_EN_PREPARATION',
  'OFFRE_SOUMISE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
  'GAGNEE',
  'PERDUE',
])

export type StatutOpportuniteInput = z.infer<typeof statutOpportuniteEnum>

// À la création, seuls les statuts d'analyse sont permis : les suivants passent par changerStatutOpportunite (transitions, lots, dossiers).
export const STATUTS_CREATION = ['EN_ANALYSE', 'GO', 'NO_GO'] as const satisfies readonly StatutOpportuniteInput[]

// ============================================================================
// LABELS ET COULEURS
// ============================================================================

export const STATUT_OPPORTUNITE_LABELS: Record<string, string> = {
  EN_ANALYSE:              'En analyse',
  GO:                      'GO',
  NO_GO:                   'No Go',
  DOSSIER_EN_PREPARATION:  'Dossier en préparation',
  OFFRE_SOUMISE:           'Offre soumise',
  EN_ATTENTE_ATTRIBUTION:  "En attente d'attribution",
  ATTRIBUE_PROVISOIREMENT: 'Attribué provisoirement',
  GAGNEE:                  'Gagnée',
  PERDUE:                  'Perdue',
}

export const STATUT_OPPORTUNITE_COLORS: Record<string, string> = {
  EN_ANALYSE:              'info',
  GO:                      'success',
  NO_GO:                   'danger',
  DOSSIER_EN_PREPARATION:  'warning',
  OFFRE_SOUMISE:           'warning',
  EN_ATTENTE_ATTRIBUTION:  'warning',
  ATTRIBUE_PROVISOIREMENT: 'warning',
  GAGNEE:                  'success',
  PERDUE:                  'muted',
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

// Le montant proposé, le résultat et les informations de perte (motif, concurrent) se saisissent par lot :
// voir lib/validations/lot.ts.

// Pour react-hook-form (dates en tant que Date | null)
export const formOpportuniteSchema = z.object({
  reference:              z.string().max(100).optional().nullable(),
  objet:                  z.string().min(1, "L'objet est requis").max(500),
  autoriteContractante:   z.string().min(1, "L'autorité contractante est requise").max(200),
  montantEstime:          z.number().positive('Le montant estimé doit être positif').max(999999999999999).optional().nullable(),
  datePublication:        z.date().optional().nullable(),
  dateLimite:             z.date().optional().nullable(),
  echeanceAttributionProv: z.date().optional().nullable(),
  statut:                 statutOpportuniteEnum,
  notes:                  z.string().optional().nullable(),
  marcheId:               z.string().optional().nullable(),
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

  statut: z.enum(STATUTS_CREATION).default('EN_ANALYSE'),

  notes:   z.string().optional().nullable(),
  marcheId: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().optional().nullable()
  ),
})

// Le statut ne se change que par changerStatutOpportunite (transitions, commentaire, lots) : la clé est retirée avant .partial(), sinon son défaut réécrirait EN_ANALYSE.
// Le lien vers le marché n'est pas modifiable ici non plus : le formulaire le renvoie tel qu'il l'a chargé, donc périmé si le marché a été créé depuis les lots entre-temps.
export const updateOpportuniteSchema = createOpportuniteSchema.omit({ statut: true, marcheId: true }).partial().extend({
  id: z.string().cuid(),
  // Vidable (null) contrairement aux autres dates : un champ absent reste inchangé, une chaîne vide ou null efface.
  echeanceAttributionProv: z.preprocess(
    (val) => (val === undefined ? undefined : val === '' || val === null ? null : val instanceof Date ? val : new Date(val as string)),
    z.date().nullable().optional()
  ),
})

// ============================================================================
// TYPES INFÉRÉS
// ============================================================================

export type CreateOpportuniteInput = z.infer<typeof createOpportuniteSchema>
export type UpdateOpportuniteInput = z.infer<typeof updateOpportuniteSchema>
