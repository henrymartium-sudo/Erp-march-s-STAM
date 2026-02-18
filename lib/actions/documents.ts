'use server'

import { prisma } from '@/lib/db/prisma'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireMarcheWrite, requireDelete } from '@/lib/utils/permissions'
import {
  createDocumentSchema,
  updateDocumentSchema,
  validateFile,
  documentFiltersSchema,
  type DocumentFilters,
} from '@/lib/validations/document'
import { generateStoragePath, generateVersionedFileName } from '@/lib/utils/document'
import { revalidatePath } from 'next/cache'
import type { Document, TypeDocument, Prisma } from '@prisma/client'
import { z } from 'zod'
import type { PaginatedResponse } from '@/types/pagination'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'

/**
 * TYPE DE RÉSULTAT
 */
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * UPLOAD DOCUMENT
 * Upload un nouveau document vers Supabase Storage et crée l'entrée DB
 */
export async function uploadDocument(
  formData: FormData
): Promise<ActionResult<Document>> {
  try {
    // 1. Vérifier authentification et permissions
    const session = await requireMarcheWrite()

    // 2. Extraire le fichier et les métadonnées
    const file = formData.get('file') as File
    const nom = formData.get('nom') as string
    const type = formData.get('type') as TypeDocument
    const phase = formData.get('phase') as string | null
    const description = formData.get('description') as string | null
    const dateValidite = formData.get('dateValidite') as string | null
    const marcheId = formData.get('marcheId') as string | null
    const tags = formData.get('tags') as string | null

    if (!file) {
      return { success: false, error: 'Aucun fichier fourni' }
    }

    // 3. Valider le fichier (taille, type MIME)
    const fileValidation = validateFile(file)
    if (!fileValidation.success) {
      return { success: false, error: fileValidation.error! }
    }

    // 4. Générer le chemin de stockage
    const storagePath = generateStoragePath(type, file.name, marcheId || undefined)

    // 5. Upload vers Supabase Storage
    const supabase = createClient()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('marches-documents')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[Upload Error]', uploadError)
      return {
        success: false,
        error: `Erreur lors de l'upload : ${uploadError.message}`,
      }
    }

    // 6. Créer l'entrée en base de données
    try {
      const documentData: Prisma.DocumentCreateInput = {
        nom: nom || file.name,
        nomOriginal: file.name,
        type,
        phase: (phase as import('@prisma/client').PhaseMarche) || null,
        taille: file.size,
        mimeType: file.type,
        storagePath: uploadData.path,
        storageUrl: null, // URL signée générée à la demande
        description: description || null,
        dateValidite: dateValidite ? new Date(dateValidite) : null,
        tags: tags ? JSON.parse(tags) : [],
        user: {
          connect: { id: session.user.id },
        },
        ...(marcheId && {
          marche: {
            connect: { id: marcheId },
          },
        }),
      }

      const document = await prisma.document.create({
        data: documentData,
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
          marche: {
            select: { id: true, numero: true, objet: true },
          },
        },
      })

      // 7. Revalider les caches
      revalidatePath('/documents')
      if (marcheId) {
        revalidatePath(`/marches/${marcheId}`)
      }

      return { success: true, data: document }
    } catch (dbError) {
      // Rollback : supprimer le fichier de Storage si l'insertion DB échoue
      await supabase.storage.from('marches-documents').remove([storagePath])

      console.error('[Database Error]', dbError)
      return {
        success: false,
        error: 'Erreur lors de la sauvegarde en base de données',
      }
    }
  } catch (error) {
    console.error('[uploadDocument Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }
  }
}

/**
 * GET UPLOAD URL
 * Génère une URL signée pour upload direct client → Supabase Storage (bypass Next.js, limite 50MB)
 * Le client upload directement, puis appelle saveDocumentMetadata()
 */
export async function getUploadUrl(params: {
  type: TypeDocument
  fileName: string
  marcheId?: string
}): Promise<ActionResult<{ signedUrl: string; storagePath: string }>> {
  try {
    await requireMarcheWrite()

    const storagePath = generateStoragePath(params.type, params.fileName, params.marcheId)

    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('marches-documents')
      .createSignedUploadUrl(storagePath)

    if (error || !data) {
      console.error('[getUploadUrl Error]', error)
      return { success: false, error: 'Impossible de générer l\'URL d\'upload' }
    }

    return { success: true, data: { signedUrl: data.signedUrl, storagePath } }
  } catch (error) {
    console.error('[getUploadUrl Error]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erreur serveur' }
  }
}

/**
 * SAVE DOCUMENT METADATA
 * Sauvegarde les métadonnées d'un document après upload direct client → Supabase
 */
export async function saveDocumentMetadata(params: {
  storagePath: string
  nom: string
  nomOriginal: string
  type: TypeDocument
  phase?: string
  taille: number
  mimeType: string
  description?: string
  dateValidite?: string
  marcheId?: string
  tags?: string
}): Promise<ActionResult<Document>> {
  try {
    const session = await requireMarcheWrite()

    const documentData: Prisma.DocumentCreateInput = {
      nom: params.nom,
      nomOriginal: params.nomOriginal,
      type: params.type,
      phase: (params.phase as import('@prisma/client').PhaseMarche) || null,
      taille: params.taille,
      mimeType: params.mimeType,
      storagePath: params.storagePath,
      storageUrl: null,
      description: params.description || null,
      dateValidite: params.dateValidite ? new Date(params.dateValidite) : null,
      tags: params.tags ? params.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      user: { connect: { id: session.user.id } },
      ...(params.marcheId && { marche: { connect: { id: params.marcheId } } }),
    }

    const document = await prisma.document.create({
      data: documentData,
      include: {
        user: { select: { id: true, name: true, role: true } },
        marche: { select: { id: true, numero: true, objet: true } },
      },
    })

    revalidatePath('/documents')
    if (params.marcheId) {
      revalidatePath(`/marches/${params.marcheId}`)
    }

    return { success: true, data: document }
  } catch (error) {
    // Rollback : supprimer le fichier uploadé si la sauvegarde DB échoue
    try {
      const supabase = createClient()
      await supabase.storage.from('marches-documents').remove([params.storagePath])
    } catch (rollbackError) {
      console.error('[saveDocumentMetadata Rollback Error]', rollbackError)
    }

    console.error('[saveDocumentMetadata Error]', error)
    return { success: false, error: 'Erreur lors de la sauvegarde en base de données' }
  }
}

/**
 * UPLOAD NOUVELLE VERSION
 * Upload une nouvelle version d'un document existant
 */
export async function uploadDocumentVersion(
  documentId: string,
  formData: FormData
): Promise<ActionResult<Document>> {
  try {
    const session = await requireMarcheWrite()

    // 1. Récupérer le document parent
    const parent = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!parent) {
      return { success: false, error: 'Document introuvable' }
    }

    // 2. Extraire et valider le fichier
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'Aucun fichier fourni' }
    }

    const fileValidation = validateFile(file)
    if (!fileValidation.success) {
      return { success: false, error: fileValidation.error! }
    }

    // 3. Calculer la nouvelle version
    const newVersion = parent.version + 1

    // 4. Générer le chemin avec version
    const versionedFileName = generateVersionedFileName(file.name, newVersion)
    const storagePath = generateStoragePath(
      parent.type,
      versionedFileName,
      parent.marcheId || undefined
    )

    // 5. Upload vers Supabase Storage
    const supabase = createClient()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('marches-documents')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return {
        success: false,
        error: `Erreur lors de l'upload : ${uploadError.message}`,
      }
    }

    // 6. Créer la nouvelle version en DB
    try {
      const newDocument = await prisma.document.create({
        data: {
          nom: parent.nom, // Même nom que le parent
          nomOriginal: file.name,
          type: parent.type,
          phase: parent.phase,
          taille: file.size,
          mimeType: file.type,
          storagePath: uploadData.path,
          description: parent.description,
          dateValidite: parent.dateValidite,
          tags: parent.tags,
          version: newVersion,
          documentParentId: parent.id,
          userId: session.user.id,
          marcheId: parent.marcheId,
        },
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
          marche: {
            select: { id: true, numero: true, objet: true },
          },
        },
      })

      revalidatePath('/documents')
      revalidatePath(`/documents/${documentId}`)

      return { success: true, data: newDocument }
    } catch (dbError) {
      // Rollback Storage
      await supabase.storage.from('marches-documents').remove([storagePath])

      console.error('[Database Error]', dbError)
      return {
        success: false,
        error: 'Erreur lors de la sauvegarde en base de données',
      }
    }
  } catch (error) {
    console.error('[uploadDocumentVersion Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }
  }
}

/**
 * RÉCUPÉRER UN DOCUMENT PAR ID
 */
export async function getDocumentById(
  id: string
): Promise<ActionResult<Document>> {
  try {
    await requireAuth()

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
        marche: {
          select: { id: true, numero: true, objet: true },
        },
        documentParent: {
          select: { id: true, nom: true, version: true },
        },
        versions: {
          select: {
            id: true,
            nom: true,
            version: true,
            createdAt: true,
            taille: true,
          },
          orderBy: { version: 'desc' },
        },
      },
    })

    if (!document) {
      return { success: false, error: 'Document introuvable' }
    }

    if (document.deleted) {
      return { success: false, error: 'Ce document a été supprimé' }
    }

    return { success: true, data: document }
  } catch (error) {
    console.error('[getDocumentById Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }
  }
}

/**
 * RÉCUPÉRER TOUS LES DOCUMENTS (avec filtres et pagination)
 */
export async function getAllDocuments(
  filters?: Partial<DocumentFilters>
): Promise<ActionResult<PaginatedResponse<Document>>> {
  try {
    await requireAuth()

    // Validation des filtres
    const validatedFilters = filters
      ? documentFiltersSchema.partial().parse(filters)
      : {}

    const {
      type,
      phase,
      marcheId,
      search,
      dateDebut,
      dateFin,
      page,
      limit,
    } = validatedFilters

    // Calcul skip/take pour Prisma
    const { skip, take } = getPrismaSkipTake({ page, limit })

    // Construction du WHERE dynamique
    const where: Prisma.DocumentWhereInput = {
      deleted: false, // Exclure les documents supprimés
    }

    if (type) where.type = type
    if (phase) where.phase = phase
    if (marcheId) where.marcheId = marcheId

    // Recherche texte (nom, description, nom original)
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { nomOriginal: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Filtrage par période
    if (dateDebut || dateFin) {
      where.createdAt = {}
      if (dateDebut) where.createdAt.gte = dateDebut
      if (dateFin) where.createdAt.lte = dateFin
    }

    // Exécution des requêtes en parallèle
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
          marche: {
            select: { id: true, numero: true, objet: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.document.count({ where }),
    ])

    // Calcul métadonnées pagination
    const pagination = calculatePagination(total, page, limit)

    return {
      success: true,
      data: {
        data: documents,
        pagination,
      },
    }
  } catch (error) {
    console.error('[getAllDocuments Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }
  }
}

/**
 * Fonction wrapper pour les composants qui veulent juste un tableau de documents
 * (sans pagination) - utilisée par Dashboard, Forms, etc.
 */
export async function getAllDocumentsArray(
  filters?: Partial<DocumentFilters>
): Promise<Document[]> {
  const result = await getAllDocuments(filters ? { ...filters, limit: 10000 } : { limit: 10000 })
  return result.success ? result.data.data : []
}

/**
 * RÉCUPÉRER DOCUMENTS PAR MARCHÉ
 */
export async function getDocumentsByMarche(
  marcheId: string
): Promise<ActionResult<Document[]>> {
  try {
    await requireAuth()

    const documents = await prisma.document.findMany({
      where: {
        marcheId,
        deleted: false,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    })

    return { success: true, data: documents }
  } catch (error) {
    console.error('[getDocumentsByMarche Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }
  }
}

/**
 * METTRE À JOUR UN DOCUMENT
 * Met à jour les métadonnées uniquement (pas le fichier Storage)
 */
export async function updateDocument(
  id: string,
  data: unknown
): Promise<ActionResult<Document>> {
  try {
    await requireMarcheWrite()

    // Validation
    const validated = updateDocumentSchema.parse(data)

    // Vérifier que le document existe
    const existing = await prisma.document.findUnique({
      where: { id },
    })

    if (!existing) {
      return { success: false, error: 'Document introuvable' }
    }

    if (existing.deleted) {
      return { success: false, error: 'Ce document a été supprimé' }
    }

    // Mise à jour
    const document = await prisma.document.update({
      where: { id },
      data: validated,
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
        marche: {
          select: { id: true, numero: true, objet: true },
        },
      },
    })

    revalidatePath('/documents')
    revalidatePath(`/documents/${id}`)
    if (document.marcheId) {
      revalidatePath(`/marches/${document.marcheId}`)
    }

    return { success: true, data: document }
  } catch (error) {
    console.error('[updateDocument Error]', error)

    if (error instanceof z.ZodError) {
      return { success: false, error: 'Données invalides' }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }
  }
}

/**
 * SUPPRIMER UN DOCUMENT (soft delete)
 * Ne supprime PAS le fichier de Storage, seulement marque comme deleted
 */
export async function deleteDocument(id: string): Promise<ActionResult> {
  try {
    await requireDelete()

    const document = await prisma.document.findUnique({
      where: { id },
    })

    if (!document) {
      return { success: false, error: 'Document introuvable' }
    }

    // Soft delete
    await prisma.document.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    })

    revalidatePath('/documents')
    if (document.marcheId) {
      revalidatePath(`/marches/${document.marcheId}`)
    }

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteDocument Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }
  }
}

/**
 * RESTAURER UN DOCUMENT
 * Annule le soft delete
 */
export async function restoreDocument(id: string): Promise<ActionResult> {
  try {
    await requireDelete()

    const document = await prisma.document.findUnique({
      where: { id },
    })

    if (!document) {
      return { success: false, error: 'Document introuvable' }
    }

    if (!document.deleted) {
      return { success: false, error: 'Ce document n\'est pas supprimé' }
    }

    await prisma.document.update({
      where: { id },
      data: {
        deleted: false,
        deletedAt: null,
      },
    })

    revalidatePath('/documents')
    if (document.marcheId) {
      revalidatePath(`/marches/${document.marcheId}`)
    }

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[restoreDocument Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }
  }
}

/**
 * GÉNÉRER URL SIGNÉE POUR TÉLÉCHARGEMENT
 * Crée une URL signée valide 1h pour téléchargement sécurisé
 */
export async function getSignedUrlForDocument(
  id: string
): Promise<ActionResult<string>> {
  try {
    await requireAuth()

    const document = await prisma.document.findUnique({
      where: { id },
    })

    if (!document) {
      return { success: false, error: 'Document introuvable' }
    }

    if (document.deleted) {
      return { success: false, error: 'Ce document a été supprimé' }
    }

    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('marches-documents')
      .createSignedUrl(document.storagePath, 3600) // 1h = 3600s

    if (error) {
      console.error('[Signed URL Error]', error)
      return {
        success: false,
        error: 'Erreur lors de la génération de l\'URL de téléchargement',
      }
    }

    return { success: true, data: data.signedUrl }
  } catch (error) {
    console.error('[getSignedUrlForDocument Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }
  }
}

/**
 * RÉCUPÉRER L'HISTORIQUE DES VERSIONS
 * Retourne toutes les versions d'un document (parent + enfants)
 */
export async function getDocumentVersions(
  documentId: string
): Promise<ActionResult<Document[]>> {
  try {
    await requireAuth()

    // Récupérer le document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      return { success: false, error: 'Document introuvable' }
    }

    // Si c'est une version, récupérer le parent
    const parentId = document.documentParentId || document.id

    // Récupérer toutes les versions (parent + enfants)
    const versions = await prisma.document.findMany({
      where: {
        OR: [
          { id: parentId }, // Le parent
          { documentParentId: parentId }, // Les versions
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { version: 'desc' },
    })

    return { success: true, data: versions }
  } catch (error) {
    console.error('[getDocumentVersions Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }
  }
}
