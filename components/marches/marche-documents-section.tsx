'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DocumentCard,
  DocumentPreview,
  DocumentVersionHistory,
  DocumentUpload,
} from '@/components/documents'
import { Plus, FileText, Loader2 } from 'lucide-react'
import { getDocumentsByMarche, deleteDocument, getSignedUrlForDocument } from '@/lib/actions/documents'
import type { Document } from '@prisma/client'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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

interface MarcheDocumentsSectionProps {
  marcheId: string
}

/**
 * Section d'affichage des documents associés à un marché
 */
export function MarcheDocumentsSection({ marcheId }: MarcheDocumentsSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadOpen, setIsUploadOpen] = useState(false)

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
  const loadDocuments = async () => {
    setIsLoading(true)
    try {
      const result = await getDocumentsByMarche(marcheId)
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

  useEffect(() => {
    loadDocuments()
  }, [marcheId])

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

  // Rafraîchir après upload
  const handleUploadSuccess = () => {
    loadDocuments()
    setIsUploadOpen(false)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents associés
              </CardTitle>
              <CardDescription>
                {documents.length} document{documents.length > 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Ajouter un document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Uploader un document</DialogTitle>
                </DialogHeader>
                <DocumentUpload
                  marcheId={marcheId}
                  onSuccess={handleUploadSuccess}
                  onCancel={() => setIsUploadOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Aucun document associé à ce marché
              </p>
              <Button onClick={() => setIsUploadOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter le premier document
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {documents.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onDelete={(doc) => setDeleteDocumentId(doc.id)}
                  onViewVersions={handleViewVersions}
                  compact
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
