import { z } from 'zod'
import type { EtatDossier } from '@/lib/utils/lots'

// ============================================================================
// ENUMS
// ============================================================================

export const statutPieceEnum = z.enum(['ABSENT', 'INCOMPLET', 'COMPLET', 'VALIDE'])
export type StatutPieceInput = z.infer<typeof statutPieceEnum>

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

/** État du dossier dérivé du statut de son opportunité (voir lib/utils/lots.ts). */
export const ETAT_DOSSIER_LABELS: Record<EtatDossier, string> = {
  EN_PREPARATION: 'En préparation',
  SOUMIS:         'Soumis',
  CLOS:           'Clos',
  AUCUN:          '—',
}

export const ETAT_DOSSIER_COLORS: Record<EtatDossier, string> = {
  EN_PREPARATION: 'warning',
  SOUMIS:         'info',
  CLOS:           'success',
  AUCUN:          'muted',
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
  notes:         z.string().optional().nullable(),
})

export type FormDossierOffreInput = z.infer<typeof formDossierOffreSchema>

export const createDossierOffreSchema = z.object({
  titre: z
    .string()
    .min(1, 'Le titre est requis')
    .max(300, 'Le titre ne peut pas dépasser 300 caractères'),

  opportuniteId: z.preprocess((val) => (val === '' ? null : val), z.string().optional().nullable()),
  marcheId:      z.preprocess((val) => (val === '' ? null : val), z.string().optional().nullable()),
  dateDepot:     z.preprocess(preprocessDate, z.date().optional().nullable()),
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
