'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  DocumentTable,
  DocumentFilters,
  DocumentPreview,
  DocumentVersionHistory,
  DocumentCard,
} from '@/components/documents'
import { deleteDocument, getSignedUrlForDocument } from '@/lib/actions/documents'
import type { Document } from '@prisma/client'
import { toast } from '@/lib/utils/toast'
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
import { Loader2, LayoutGrid, LayoutList } from 'lucide-react'
import type { ColonneTri, SensTri } from '@/lib/utils/documents-tri'

interface DocumentsContentProps {
  documents: Document[]
  canWrite?: boolean
  tri: ColonneTri
  sens: SensTri
}

type ViewMode = 'list' | 'grid'

const CLE_VUE = 'documents-mode-de-vue'

/**
 * Contenu client de la page documents (filtres, table/grille, dialogs)
 */
export function DocumentsContent({ documents, canWrite = false, tri, sens }: DocumentsContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Mode de vue mémorisé par navigateur (lecture après le premier rendu pour éviter un écart d'hydratation)
  useEffect(() => {
    try {
      const memorise = localStorage.getItem(CLE_VUE)
      if (memorise === 'grid' || memorise === 'list') setViewMode(memorise)
    } catch {
      // stockage indisponible (navigation privée) : on reste sur la vue liste
    }
  }, [])

  const changerVue = (mode: ViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(CLE_VUE, mode)
    } catch {
      // sans stockage, le choix vaut pour la visite en cours
    }
  }

  // Tri global : l'URL porte la colonne et le sens, le serveur renvoie la liste triée
  const handleTriChange = (colonne: ColonneTri) => {
    const params = new URLSearchParams(searchParams.toString())
    const memeColonne = colonne === tri
    const nouveauSens: SensTri = memeColonne
      ? sens === 'asc' ? 'desc' : 'asc'
      : colonne === 'createdAt' ? 'desc' : 'asc'
    params.set('tri', colonne)
    params.set('sens', nouveauSens)
    params.delete('page')
    router.push(`/documents?${params.toString()}`)
  }

  // Preview state
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Versions state
  const [versionsDocument, setVersionsDocument] = useState<Document | null>(null)
  const [isVersionsOpen, setIsVersionsOpen] = useState(false)

  // Delete state
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handlePreview = (document: Document) => {
    setPreviewDocument(document)
    setIsPreviewOpen(true)
  }

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

  const handleDeleteConfirm = async () => {
    if (!deleteDocumentId) return

    setIsDeleting(true)
    try {
      const result = await deleteDocument(deleteDocumentId)
      if (result.success) {
        // La liste vient du serveur : deleteDocument revalide /documents, la ligne disparaît au rafraîchissement
        toast.success('Document supprimé avec succès')
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

  const handleViewVersions = (document: Document) => {
    setVersionsDocument(document)
    setIsVersionsOpen(true)
  }

  return (
    <>
      {/* Filtres + toggle vue */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <DocumentFilters />
        </div>

        {/* Toggle grille / liste */}
        <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1 gap-0.5 shadow-sm flex-shrink-0 self-end">
          <button
            onClick={() => changerVue('list')}
            aria-label="Vue liste"
            aria-pressed={viewMode === 'list'}
            className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              viewMode === 'list'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-gray-100'
            }`}
          >
            <LayoutList className="h-4 w-4" />
            <span className="hidden sm:inline">Liste</span>
          </button>
          <button
            onClick={() => changerVue('grid')}
            aria-label="Vue grille"
            aria-pressed={viewMode === 'grid'}
            className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              viewMode === 'grid'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-gray-100'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Grille</span>
          </button>
        </div>
      </div>

      {/* Contenu : grille ou liste */}
      {viewMode === 'grid' ? (
        documents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun document trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onPreview={handlePreview}
                onDownload={handleDownload}
                onDelete={canWrite ? (d) => setDeleteDocumentId(d.id) : undefined}
                onViewVersions={handleViewVersions}
              />
            ))}
          </div>
        )
      ) : (
        <DocumentTable
          documents={documents}
          onPreview={handlePreview}
          onDownload={handleDownload}
          onDelete={canWrite ? (doc) => setDeleteDocumentId(doc.id) : undefined}
          onViewVersions={handleViewVersions}
          tri={tri}
          sens={sens}
          onTriChange={handleTriChange}
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
