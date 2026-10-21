'use server'

import { prisma } from '@/lib/db/prisma'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireMarcheWrite, requireDelete, getMarcheStatutRestriction } from '@/lib/utils/permissions'
import {
  createDocumentSchema,
  updateDocumentSchema,
  validateFile,
  documentFiltersSchema,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_FILE_EXTENSIONS,
  type DocumentFilters,
} from '@/lib/validations/document'
import { generateStoragePath, generateVersionedFileName } from '@/lib/utils/document'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import type { Document, TypeDocument, Prisma } from '@prisma/client'
import { z } from 'zod'
import type { PaginatedResponse } from '@/types/pagination'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'
import { supprimerDefinitivement, collecterPortee } from '@/lib/utils/documents-suppression'
import { construireOrderBy, lireTri, trierParLibelleType } from '@/lib/utils/documents-tri'
import { racineDeChaine, prochainNumeroVersion, cheminStockageValide } from '@/lib/utils/documents-versions'
import { construireWhereDocuments } from '@/lib/utils/documents-recherche'

// Extensions autorisées pour l'upload de documents
const ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'txt', 'csv', 'zip',
] as const;

const SELECT_LIGNE = {
  id: true,
  storagePath: true,
  documentParentId: true,
  deleted: true,
  marcheId: true,
} as const

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

      await logAction({
        userId:     session.user.id,
        userEmail:  session.user.email,
        action:     AUDIT_ACTION.CREATE,
        entityType: AUDIT_ENTITY.DOCUMENT,
        entityId:   document.id,
        metadata:   { nom: document.nom, type: document.type, taille: document.taille },
      })

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

    // Validation de l'extension du fichier
    const ext = params.fileName.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number])) {
      return {
        success: false,
        error: `Extension de fichier non autorisée : .${ext}`,
      };
    }

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

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.DOCUMENT,
      entityId:   document.id,
      metadata:   { nom: document.nom, type: document.type, taille: document.taille },
    })

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
 * SAVE DOCUMENT VERSION METADATA
 * Enregistre une nouvelle version après envoi direct client → Supabase Storage.
 * Le chemin de stockage vient du client : il n'est jamais supprimé sans avoir été
 * validé (dossier attendu pour ce type et ce marché) et sans qu'aucune autre ligne
 * ne l'utilise.
 */
export async function saveDocumentVersionMetadata(params: {
  parentId: string
  storagePath: string
  nomOriginal: string
  taille: number
  mimeType: string
}): Promise<ActionResult<Document>> {
  try {
    const session = await requireMarcheWrite()

    // 1. Valider les entrées (sans toucher au stockage)
    if (!Number.isInteger(params.taille) || params.taille <= 0 || params.taille > MAX_FILE_SIZE) {
      return { success: false, error: 'Taille de fichier invalide' }
    }
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(params.mimeType)) {
      return { success: false, error: `Type de fichier non autorisé : ${params.mimeType}` }
    }
    const point = params.nomOriginal.lastIndexOf('.')
    const extension = point >= 0 ? params.nomOriginal.slice(point + 1).toLowerCase() : ''
    if (!(ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(extension)) {
      return { success: false, error: `Extension de fichier non autorisée : .${extension}` }
    }

    // 2. Lire le parent et la racine de la chaîne
    const parent = await prisma.document.findUnique({ where: { id: params.parentId } })
    if (!parent) {
      return { success: false, error: 'Document introuvable' }
    }
    const racine = parent.documentParentId
      ? await prisma.document.findUnique({ where: { id: racineDeChaine(parent) } })
      : parent

    // 3. Le chemin doit être celui attendu AVANT tout nettoyage du stockage
    if (!cheminStockageValide(params.storagePath, parent.type, parent.marcheId)) {
      return { success: false, error: 'Chemin de stockage invalide' }
    }

    // Chemin déjà associé à une autre ligne : refus, sans toucher au fichier (il n'est pas à nous)
    const dejaUtilise = await prisma.document.findFirst({
      where: { storagePath: params.storagePath },
      select: { id: true },
    })
    if (dejaUtilise) {
      return { success: false, error: 'Ce fichier est déjà associé à un document' }
    }

    // L'objet doit exister dans le stockage (rien à effacer sinon)
    const { error: objetAbsent } = await createClient()
      .storage.from('marches-documents')
      .createSignedUrl(params.storagePath, 60)
    if (objetAbsent) {
      return { success: false, error: 'Fichier introuvable dans le stockage' }
    }

    // Supprime le fichier envoyé, sauf si une autre ligne l'utilise
    const nettoyerFichier = async () => {
      try {
        const autre = await prisma.document.findFirst({
          where: { storagePath: params.storagePath },
          select: { id: true },
        })
        if (!autre) {
          await createClient().storage.from('marches-documents').remove([params.storagePath])
        }
      } catch (cleanupError) {
        console.error('[saveDocumentVersionMetadata Cleanup Error]', cleanupError)
      }
    }

    // 4. Parent ou racine supprimé : on n'ajoute pas de version
    if (parent.deleted || !racine || racine.deleted) {
      await nettoyerFichier()
      return { success: false, error: 'Document introuvable' }
    }

    // 5-6. Numérotation et création dans une transaction verrouillée sur la racine
    // (deux envois simultanés ne peuvent plus obtenir le même numéro)
    class ChaineSupprimee extends Error {}
    let newDocument
    try {
      newDocument = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM documents WHERE id = ${racine.id} FOR UPDATE`

        // Relire racine et parent sous verrou : ils ont pu être supprimés entre-temps
        const racineVerrouillee = await tx.document.findUnique({
          where: { id: racine.id },
          select: { deleted: true },
        })
        const parentVerrouille = await tx.document.findUnique({
          where: { id: parent.id },
          select: { deleted: true },
        })
        if (!racineVerrouillee || racineVerrouillee.deleted || !parentVerrouille || parentVerrouille.deleted) {
          throw new ChaineSupprimee()
        }

        // Numéro : toutes les lignes de la chaîne comptent, supprimées comprises
        const lignes = await tx.document.findMany({
          where: { OR: [{ id: racine.id }, { documentParentId: racine.id }] },
          select: { version: true },
        })
        const newVersion = prochainNumeroVersion(lignes.map((l) => l.version))

        return tx.document.create({
          data: {
            nom: parent.nom,
            nomOriginal: params.nomOriginal,
            type: parent.type,
            phase: parent.phase,
            taille: params.taille,
            mimeType: params.mimeType,
            storagePath: params.storagePath,
            description: parent.description,
            dateValidite: parent.dateValidite,
            tags: parent.tags,
            version: newVersion,
            documentParentId: racine.id,
            userId: session.user.id,
            marcheId: parent.marcheId,
          },
          include: {
            user: { select: { id: true, name: true, role: true } },
            marche: { select: { id: true, numero: true, objet: true } },
          },
        })
      })
    } catch (dbError) {
      if (dbError instanceof ChaineSupprimee) {
        await nettoyerFichier()
        return { success: false, error: 'Document introuvable' }
      }
      console.error('[saveDocumentVersionMetadata Database Error]', dbError)
      await nettoyerFichier()
      return { success: false, error: 'Erreur lors de la sauvegarde en base de données' }
    }

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.DOCUMENT,
      entityId:   newDocument.id,
      metadata:   {
        nom: newDocument.nom,
        version: newDocument.version,
        parentId: racine.id,
        remplace: parent.id,
        taille: newDocument.taille,
      },
    })

    revalidatePath('/documents')
    revalidatePath(`/documents/${params.parentId}`)
    revalidatePath(`/documents/${newDocument.id}`)
    if (parent.marcheId) {
      revalidatePath(`/marches/${parent.marcheId}`)
    }

    return { success: true, data: newDocument }
  } catch (error) {
    console.error('[saveDocumentVersionMetadata Error]', error)
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
          where: { deleted: false },
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
      tri,
      sens,
    } = validatedFilters

    // Calcul skip/take pour Prisma
    const { skip, take } = getPrismaSkipTake({ page, limit })

    // Construction du WHERE dynamique
    const where = construireWhereDocuments({ type, phase, marcheId, search, dateDebut, dateFin })

    const include = {
      user: {
        select: { id: true, name: true, role: true },
      },
      marche: {
        select: { id: true, numero: true, objet: true },
      },
    } satisfies Prisma.DocumentInclude

    // Tri global validé (liste fermée) ; défaut : date décroissante
    const ordre = lireTri(tri, sens)

    let documents
    let total: number

    if (ordre.tri === 'type') {
      // Le type se trie sur son libellé affiché : tri en mémoire sur des lignes minimales,
      // puis lecture complète de la seule page demandée
      const lignes = await prisma.document.findMany({
        where,
        select: { id: true, type: true, createdAt: true },
      })
      total = lignes.length
      const idsPage = trierParLibelleType(lignes, ordre.sens)
        .slice(skip, skip + take)
        .map((l) => l.id)
      const lus = await prisma.document.findMany({ where: { id: { in: idsPage } }, include })
      const parId = new Map(lus.map((d) => [d.id, d]))
      documents = idsPage.flatMap((id) => parId.get(id) ?? [])
    } else {
      ;[documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          include,
          orderBy: construireOrderBy(ordre.tri, ordre.sens),
          skip,
          take,
        }),
        prisma.document.count({ where }),
      ])
    }

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
 * LISTE DES MARCHÉS POUR LE FILTRE DE LA PAGE DOCUMENTS
 */
export async function getMarchesPourFiltreDocuments(): Promise<
  ActionResult<{ id: string; numero: string; objet: string }[]>
> {
  try {
    const session = await requireAuth()

    const marches = await prisma.marche.findMany({
      where: { statut: getMarcheStatutRestriction(session.user.role) },
      select: { id: true, numero: true, objet: true },
      orderBy: { numero: 'asc' },
    })

    return { success: true, data: marches }
  } catch (error) {
    console.error('[getMarchesPourFiltreDocuments Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }
  }
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
 * SUPPRIMER UN DOCUMENT DÉFINITIVEMENT
 * Efface le fichier (et ceux de ses versions) du stockage Supabase, PUIS marque les
 * lignes supprimées (soft delete conservé en base). Irréversible : aucune sauvegarde du
 * stockage. Les chemins sont relus en base, jamais fournis par le client.
 */
export async function deleteDocument(
  id: string
): Promise<ActionResult<{ nbDocuments: number }>> {
  try {
    const session = await requireDelete()
    const supabase = createClient()

    const resultat = await supprimerDefinitivement(
      {
        trouver: (docId) => prisma.document.findUnique({ where: { id: docId }, select: SELECT_LIGNE }),
        enfantsVivants: (parents) =>
          prisma.document.findMany({
            where: { documentParentId: { in: parents }, deleted: false },
            select: SELECT_LIGNE,
          }),
        cheminsUtilisesAilleurs: async (chemins, ids) =>
          (
            await prisma.document.findMany({
              where: { storagePath: { in: chemins }, deleted: false, id: { notIn: ids } },
              select: { storagePath: true },
            })
          ).map((l) => l.storagePath),
        effacerFichiers: async (chemins) => {
          const { error } = await supabase.storage.from('marches-documents').remove(chemins)
          if (error) console.error('[deleteDocument Storage Error]', error.message)
          return { error: error ? error.message : null }
        },
        marquerSupprimes: async (ids) => {
          await prisma.document.updateMany({
            where: { id: { in: ids } },
            data: { deleted: true, deletedAt: new Date() },
          })
        },
        tracer: (info) =>
          logAction({
            userId: session.user.id,
            userEmail: session.user.email,
            action: AUDIT_ACTION.DELETE,
            entityType: AUDIT_ENTITY.DOCUMENT,
            entityId: info.racineId,
            metadata: { definitive: true, complet: info.complet, documentIds: info.ids },
          }),
      },
      id
    )

    if (!resultat.success) return resultat

    revalidatePath('/documents')
    revalidatePath(`/documents/${id}`)
    resultat.data.marcheIds.forEach((m) => revalidatePath(`/marches/${m}`))

    return { success: true, data: { nbDocuments: resultat.data.nbDocuments } }
  } catch (error) {
    console.error('[deleteDocument Error]', error)
    return { success: false, error: 'Erreur serveur : rien n’a été supprimé. Réessayez.' }
  }
}

/**
 * Nombre de versions supprimées avec un document (pour la confirmation).
 */
export async function getSuppressionInfo(
  id: string
): Promise<ActionResult<{ nbVersions: number }>> {
  try {
    await requireDelete()
    const parsed = z.string().min(1).max(64).safeParse(id)
    if (!parsed.success) return { success: false, error: 'Identifiant de document invalide' }

    const racine = await prisma.document.findUnique({
      where: { id: parsed.data },
      select: SELECT_LIGNE,
    })
    if (!racine || racine.deleted) return { success: false, error: 'Document introuvable' }

    const portee = await collecterPortee(
      {
        enfantsVivants: (parents) =>
          prisma.document.findMany({
            where: { documentParentId: { in: parents }, deleted: false },
            select: SELECT_LIGNE,
          }),
      },
      racine
    )
    return { success: true, data: { nbVersions: portee.length - 1 } }
  } catch (error) {
    console.error('[getSuppressionInfo Error]', error)
    return { success: false, error: 'Erreur serveur' }
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
        deleted: false, // Un fichier effacé définitivement ne doit plus figurer à l'historique
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
