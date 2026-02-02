'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DocumentTable,
  DocumentFilters,
  DocumentPreview,
  DocumentVersionHistory,
} from '@/components/documents'
import { getAllDocuments, deleteDocument, getSignedUrlForDocument } from '@/lib/actions/documents'
import type { Document } from '@prisma/client'
import type { DocumentFilters as Filters } from '@/lib/validations/document'
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
  searchParams: { [key: string]: string | string[] | undefined }
}

/**
 * Contenu client de la page documents (filtres, table, dialogs)
 */
export function DocumentsContent({ searchParams }: DocumentsContentProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({})

  // Preview state
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Versions state
  const [versionsDocument, setVersionsDocument] = useState<Document | null>(null)
  const [isVersionsOpen, setIsVersionsOpen] = useState(false)

  // Delete state
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Charger les documents
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true)
      try {
        const result = await getAllDocuments(filters)
        if (result.success && result.data) {
          setDocuments(result.data)
        } else {
          toast.error(result.error || 'Erreur lors du chargement des documents')
        }
      } catch (error) {
        toast.error('Erreur lors du chargement des documents')
      } finally {
        setIsLoading(false)
      }
    }

    loadDocuments()
  }, [filters])

  // Gérer la prévisualisation
  const handlePreview = (document: Document) => {
    setPreviewDocument(document)
    setIsPreviewOpen(true)
  }

  // Gérer le téléchargement
  const handleDownload = async (document: Document) => {
    try {
      const result = await getSignedUrlForDocument(document.id)
      if (result.success && result.data) {
        // Ouvrir dans un nouvel onglet pour télécharger
        window.open(result.data, '_blank')
        toast.success('Téléchargement lancé')
      } else {
        toast.error(result.error || 'Erreur lors du téléchargement')
      }
    } catch (error) {
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
        toast.error(result.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
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
      <DocumentFilters
        filters={filters}
        onFiltersChange={setFilters}
        showMarcheFilter={true}
      />

      {/* Tableau */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DocumentTable
          documents={documents}
          onPreview={handlePreview}
          onDownload={handleDownload}
          onDelete={(doc) => setDeleteDocumentId(doc.id)}
          onViewVersions={handleViewVersions}
        />
      )}

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
