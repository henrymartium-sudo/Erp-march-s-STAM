import { z } from 'zod'

// ============================================================================
// ENUMS
// ============================================================================

export const statutPieceEnum = z.enum(['ABSENT', 'INCOMPLET', 'COMPLET', 'VALIDE'])
export type StatutPieceInput = z.infer<typeof statutPieceEnum>

export const statutDossierEnum = z.enum(['EN_COURS', 'SOUMIS', 'ARCHIVE'])
export type StatutDossierInput = z.infer<typeof statutDossierEnum>

// ============================================================================
// LABELS ET COULEURS
// ============================================================================

export const STATUT_PIECE_LABELS: Record<string, string> = {
  ABSENT:    'Absent',
  INCOMPLET: 'Incomplet',
  COMPLET:   'Complet',
  VALIDE:    'Validé',
}

export const STATUT_PIECE_COLORS: Record<string, string> = {
  ABSENT:    'danger',
  INCOMPLET: 'warning',
  COMPLET:   'info',
  VALIDE:    'success',
}

export const STATUT_DOSSIER_LABELS: Record<string, string> = {
  EN_COURS: 'En cours',
  SOUMIS:   'Soumis',
  ARCHIVE:  'Archivé',
}

export const STATUT_DOSSIER_COLORS: Record<string, string> = {
  EN_COURS: 'warning',
  SOUMIS:   'success',
  ARCHIVE:  'muted',
}

// ============================================================================
// HELPER
// ============================================================================

const preprocessDate = (val: unknown) => {
  if (!val || val === '') return undefined
  if (val instanceof Date) return val
  if (typeof val === 'string') return new Date(val)
  return val
}

// ============================================================================
// SCHÉMAS DOSSIER
// ============================================================================

export const formDossierOffreSchema = z.object({
  titre:         z.string().min(1, 'Le titre est requis').max(300),
  opportuniteId: z.string().optional().nullable(),
  marcheId:      z.string().optional().nullable(),
  dateDepot:     z.date().optional().nullable(),
  statut:        statutDossierEnum,
  notes:         z.string().optional().nullable(),
})

export type FormDossierOffreInput = z.infer<typeof formDossierOffreSchema>

export const createDossierOffreSchema = z.object({
  titre: z
    .string()
    .min(1, 'Le titre est requis')
    .max(300, 'Le titre ne peut pas dépasser 300 caractères'),

  opportuniteId: z.string().optional().nullable(),
  marcheId:      z.string().optional().nullable(),
  dateDepot:     z.preprocess(preprocessDate, z.date().optional().nullable()),
  statut:        statutDossierEnum.default('EN_COURS'),
  notes:         z.string().optional().nullable(),
  useTemplate:   z.boolean().default(true),   // créer les pièces depuis le template standard
})

export const updateDossierOffreSchema = createDossierOffreSchema
  .omit({ useTemplate: true })
  .partial()
  .extend({ id: z.string().cuid() })

export type CreateDossierOffreInput = z.infer<typeof createDossierOffreSchema>
export type UpdateDossierOffreInput = z.infer<typeof updateDossierOffreSchema>

// ============================================================================
// SCHÉMA PIECE
// ============================================================================

export const updatePieceStatutSchema = z.object({
  id:     z.string().cuid(),
  statut: statutPieceEnum,
})

export type UpdatePieceStatutInput = z.infer<typeof updatePieceStatutSchema>
