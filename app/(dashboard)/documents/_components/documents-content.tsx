'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  DocumentTable,
  DocumentFilters,
  DocumentPreview,
  DocumentVersionHistory,
  DocumentCard,
  DocumentsEtatVide,
  SuppressionDefinitiveDialog,
} from '@/components/documents'
import { getSignedUrlForDocument } from '@/lib/actions/documents'
import type { Document } from '@prisma/client'
import { toast } from '@/lib/utils/toast'
import { LayoutGrid, LayoutList } from 'lucide-react'
import type { ColonneTri, SensTri } from '@/lib/utils/documents-tri'
import { aDesFiltresActifs } from '@/lib/utils/documents-filtres'
import { ouvrirTelechargement } from '@/lib/utils/documents-telechargement'
import type { DocumentAvecMarche } from '@/lib/utils/document'

interface DocumentsContentProps {
  documents: DocumentAvecMarche[]
  marches: { id: string; numero: string; objet: string }[]
  canWrite?: boolean
  tri: ColonneTri
  sens: SensTri
}

type ViewMode = 'list' | 'grid'

const CLE_VUE = 'documents-mode-de-vue'

/**
 * Contenu client de la page documents (filtres, table/grille, dialogs)
 */
export function DocumentsContent({ documents, marches, canWrite = false, tri, sens }: DocumentsContentProps) {
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

  const handlePreview = (document: Document) => {
    setPreviewDocument(document)
    setIsPreviewOpen(true)
  }

  // Téléchargement : un seul à la fois, état de chargement visible, retour honnête
  const [telechargementId, setTelechargementId] = useState<string | null>(null)

  const handleDownload = async (document: Document) => {
    if (telechargementId) return
    setTelechargementId(document.id)
    try {
      const result = await getSignedUrlForDocument(document.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      const url = result.data
      // Pas de 'noopener' dans les features : window.open renverrait toujours null, la détection du blocage serait faussée
      const ouvrir = (cible: string) => {
        const fenetre = window.open(cible, '_blank')
        if (fenetre) fenetre.opener = null
        return fenetre
      }
      if (ouvrirTelechargement(url, ouvrir) === 'ouvert') {
        toast.success('Téléchargement lancé')
      } else {
        // Fenêtre bloquée (appel après un await) : le clic sur l'action est un geste direct, il ne sera pas bloqué
        toast.warning("Votre navigateur a bloqué l'ouverture du fichier.", {
          duration: 15000,
          action: { label: 'Ouvrir le fichier', onClick: () => ouvrir(url) },
        })
      }
    } catch {
      toast.error('Erreur lors du téléchargement')
    } finally {
      setTelechargementId(null)
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
          <DocumentFilters marches={marches} />
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
      {documents.length === 0 ? (
        <DocumentsEtatVide
          filtresActifs={aDesFiltresActifs(new URLSearchParams(searchParams.toString()))}
          canWrite={canWrite}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onPreview={handlePreview}
                onDownload={handleDownload}
                telechargementId={telechargementId}
                onDelete={canWrite ? (d) => setDeleteDocumentId(d.id) : undefined}
                onViewVersions={handleViewVersions}
              />
            ))}
        </div>
      ) : (
        <DocumentTable
          documents={documents}
          onPreview={handlePreview}
          onDownload={handleDownload}
          telechargementId={telechargementId}
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
        telechargementId={telechargementId}
      />

      {/* Dialog des versions */}
      <DocumentVersionHistory
        document={versionsDocument}
        open={isVersionsOpen}
        onOpenChange={setIsVersionsOpen}
        onPreview={handlePreview}
        onDownload={handleDownload}
      />

      {/* Suppression définitive (fichier effacé du stockage) */}
      <SuppressionDefinitiveDialog
        documentId={deleteDocumentId}
        onClose={() => setDeleteDocumentId(null)}
        onSupprime={() => router.refresh()}
      />
    </>
  )
}
