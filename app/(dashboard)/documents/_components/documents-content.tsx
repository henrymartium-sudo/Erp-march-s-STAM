'use client'

import { useState } from 'react'
import {
  DocumentTable,
  DocumentFilters,
  DocumentPreview,
  DocumentVersionHistory,
} from '@/components/documents'
import { deleteDocument, getSignedUrlForDocument } from '@/lib/actions/documents'
import type { Document } from '@prisma/client'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'

interface DocumentsContentProps {
  documents: Document[]
}

/**
 * Contenu client de la page documents (filtres, table, dialogs)
 */
export function DocumentsContent({ documents: initialDocuments }: DocumentsContentProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)

  // Preview state
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Versions state
  const [versionsDocument, setVersionsDocument] = useState<Document | null>(null)
  const [isVersionsOpen, setIsVersionsOpen] = useState(false)

  // Delete state
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Gérer la prévisualisation
  const handlePreview = (document: Document) => {
    setPreviewDocument(document)
    setIsPreviewOpen(true)
  }

  // Gérer le téléchargement
  const handleDownload = async (document: Document) => {
    try {
      const result = await getSignedUrlForDocument(document.id)
      if (result.success) {
        window.open(result.data, '_blank')
        toast.success('Téléchargement lancé')
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Erreur lors du téléchargement')
    }
  }

  // Gérer la suppression
  const handleDeleteConfirm = async () => {
    if (!deleteDocumentId) return

    setIsDeleting(true)
    try {
      const result = await deleteDocument(deleteDocumentId)
      if (result.success) {
        toast.success('Document supprimé avec succès')
        setDocuments(documents.filter((d) => d.id !== deleteDocumentId))
        setDeleteDocumentId(null)
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  // Gérer les versions
  const handleViewVersions = (document: Document) => {
    setVersionsDocument(document)
    setIsVersionsOpen(true)
  }

  return (
    <>
      {/* Filtres */}
      <DocumentFilters />

      {/* Tableau */}
      <DocumentTable
        documents={documents}
        onPreview={handlePreview}
        onDownload={handleDownload}
        onDelete={(doc) => setDeleteDocumentId(doc.id)}
        onViewVersions={handleViewVersions}
      />

      {/* Dialog de prévisualisation */}
      <DocumentPreview
        document={previewDocument}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        onDownload={handleDownload}
      />

      {/* Dialog des versions */}
      <DocumentVersionHistory
        document={versionsDocument}
        open={isVersionsOpen}
        onOpenChange={setIsVersionsOpen}
        onPreview={handlePreview}
        onDownload={handleDownload}
      />

      {/* Dialog de confirmation de suppression */}
      <AlertDialog
        open={!!deleteDocumentId}
        onOpenChange={(open) => !open && setDeleteDocumentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce document ? Cette action peut être
              annulée (soft delete).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
