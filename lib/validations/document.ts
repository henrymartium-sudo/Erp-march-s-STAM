import { z } from 'zod'
import { TypeDocument, PhaseMarche } from '@prisma/client'

/**
 * CONSTANTES DE VALIDATION
 */

// Taille maximale : 50 MB (upload direct Supabase, bypass Next.js)
export const MAX_FILE_SIZE = 50 * 1024 * 1024

// Types MIME autorisés
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'application/msword', // DOC (legacy)
  'application/vnd.ms-excel', // XLS (legacy)
] as const

// Extensions de fichiers autorisées
export const ALLOWED_FILE_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'docx',
  'xlsx',
  'doc',
  'xls',
] as const

/**
 * SCHÉMA DE BASE DOCUMENT
 */
export const documentBaseSchema = z.object({
  nom: z
    .string()
    .min(1, 'Le nom du document est requis')
    .max(255, 'Le nom ne peut pas dépasser 255 caractères'),

  type: z.nativeEnum(TypeDocument, {
    error: 'Le type de document est requis',
  }),

  phase: z.nativeEnum(PhaseMarche).optional().nullable(),

  description: z
    .string()
    .max(2000, 'La description ne peut pas dépasser 2000 caractères')
    .optional()
    .nullable(),

  dateValidite: z
    .date()
    .refine(
      (date) => {
        // Si fournie, la date doit être dans le futur
        if (!date) return true
        return date > new Date()
      },
      {
        message: 'La date de validité doit être dans le futur',
      }
    )
    .optional()
    .nullable(),

  tags: z.array(z.string()).default([]),

  marcheId: z.string().cuid().optional().nullable(),
})

/**
 * SCHÉMA CRÉATION DOCUMENT
 */
export const createDocumentSchema = documentBaseSchema.extend({
  nomOriginal: z.string().min(1, 'Le nom du fichier original est requis'),
  taille: z.number().int().positive(),
  mimeType: z.string().min(1, 'Le type MIME est requis'),
  storagePath: z.string().min(1, 'Le chemin de stockage est requis'),
  storageUrl: z.string().url().optional().nullable(),
  userId: z.string().cuid(),
})

/**
 * SCHÉMA MISE À JOUR DOCUMENT
 * Tous les champs sont optionnels sauf l'ID
 */
export const updateDocumentSchema = z.object({
  nom: z
    .string()
    .min(1, 'Le nom du document est requis')
    .max(255, 'Le nom ne peut pas dépasser 255 caractères')
    .optional(),

  type: z.nativeEnum(TypeDocument).optional(),
  phase: z.nativeEnum(PhaseMarche).optional().nullable(),

  description: z
    .string()
    .max(2000, 'La description ne peut pas dépasser 2000 caractères')
    .optional()
    .nullable(),

  dateValidite: z
    .date()
    .refine(
      (date) => {
        if (!date) return true
        return date > new Date()
      },
      {
        message: 'La date de validité doit être dans le futur',
      }
    )
    .optional()
    .nullable(),

  tags: z.array(z.string()).optional(),
  marcheId: z.string().cuid().optional().nullable(),
})

/**
 * SCHÉMA VALIDATION FICHIER UPLOADÉ
 */
export const uploadFileSchema = z.object({
  file: z.custom<File>((val) => val instanceof File, {
    message: 'Un fichier est requis',
  }),
})

/**
 * VALIDATION FICHIER CÔTÉ SERVEUR
 * Valide la taille et le type MIME d'un fichier
 */
export function validateFile(file: File): {
  success: boolean
  error?: string
} {
  // Vérification taille
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `Le fichier est trop volumineux. Taille maximale : ${MAX_FILE_SIZE / 1024 / 1024} MB`,
    }
  }

  // Vérification taille minimale (éviter fichiers vides)
  if (file.size === 0) {
    return {
      success: false,
      error: 'Le fichier est vide',
    }
  }

  // Vérification type MIME
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      success: false,
      error: `Type de fichier non autorisé : ${file.type}. Types acceptés : PDF, JPG, PNG, DOCX, XLSX`,
    }
  }

  // Vérification extension (double vérification)
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !ALLOWED_FILE_EXTENSIONS.includes(extension as any)) {
    return {
      success: false,
      error: `Extension de fichier non autorisée : .${extension}. Extensions acceptées : ${ALLOWED_FILE_EXTENSIONS.join(', ')}`,
    }
  }

  return { success: true }
}

/**
 * SCHÉMA FILTRES RECHERCHE DOCUMENTS
 */
export const documentFiltersSchema = z.object({
  type: z.nativeEnum(TypeDocument).optional(),
  phase: z.nativeEnum(PhaseMarche).optional(),
  marcheId: z.string().cuid().optional(),
  search: z.string().optional(),
  dateDebut: z.date().optional(),
  dateFin: z.date().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
})

/**
 * TYPES INFÉRÉS
 */
export type DocumentBase = z.infer<typeof documentBaseSchema>
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>
export type DocumentFilters = z.infer<typeof documentFiltersSchema>

/**
 * Type d'entrée pour les filtres UI (page/pageSize optionnels grâce aux defaults)
 */
export type DocumentFiltersInput = z.input<typeof documentFiltersSchema>
