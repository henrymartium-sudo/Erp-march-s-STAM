'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DocumentIcon,
  DocumentBadge,
  DocumentPreview,
  DocumentVersionHistory,
} from '@/components/documents'
import { formatTaille } from '@/lib/utils/document'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Document } from '@prisma/client'
import { Download, Eye, Trash2, History, Calendar, FileText, Tag } from 'lucide-react'
import { deleteDocument, getSignedUrlForDocument } from '@/lib/actions/documents'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'

interface DocumentDetailContentProps {
  document: Document
}

/**
 * Contenu client de la page de détail
 */
export function DocumentDetailContent({ document }: DocumentDetailContentProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isVersionsOpen, setIsVersionsOpen] = useState(false)

  // Télécharger
  const handleDownload = async () => {
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

  // Supprimer
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteDocument(document.id)
      if (result.success) {
        toast.success('Document supprimé avec succès')
        router.push('/documents')
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card principale */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <DocumentIcon type={document.type} size={48} />
                <div className="flex-1">
                  <CardTitle className="text-2xl">{document.nom}</CardTitle>
                  <CardDescription className="mt-1">
                    {document.nomOriginal}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <DocumentBadge type={document.type} />
                    {document.phase && <DocumentBadge phase={document.phase} />}
                    {document.version > 1 && (
                      <Badge variant="outline">Version {document.version}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              {document.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{document.description}</p>
                </div>
              )}

              {/* Actions principales */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setIsPreviewOpen(true)} className="gap-2">
                  <Eye className="h-4 w-4" />
                  Prévisualiser
                </Button>
                <Button onClick={handleDownload} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Télécharger
                </Button>
                {document.version > 1 && (
                  <Button
                    onClick={() => setIsVersionsOpen(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <History className="h-4 w-4" />
                    Versions ({document.version})
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                      <AlertDialogDescription>
                        Êtes-vous sûr de vouloir supprimer ce document ? Cette action peut
                        être annulée (soft delete).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? 'Suppression...' : 'Supprimer'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Tags */}
              {document.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {document.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale - Informations */}
        <div className="space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taille</p>
                <p className="text-lg font-semibold">{formatTaille(document.taille)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Type MIME</p>
                <p className="text-sm">{document.mimeType}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Créé le</p>
                <p className="text-sm">
                  {format(new Date(document.createdAt), 'dd MMMM yyyy à HH:mm', {
                    locale: fr,
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Modifié le</p>
                <p className="text-sm">
                  {format(new Date(document.updatedAt), 'dd MMMM yyyy à HH:mm', {
                    locale: fr,
                  })}
                </p>
              </div>

              {document.dateValidite && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date de validité
                  </p>
                  <p className="text-sm">
                    {format(new Date(document.dateValidite), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Marché associé */}
          {document.marcheId && (
            <Card>
              <CardHeader>
                <CardTitle>Marché associé</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/marches/${document.marcheId}`}>
                  <Button variant="outline" className="w-full gap-2">
                    <FileText className="h-4 w-4" />
                    Voir le marché
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <DocumentPreview
        document={document}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        onDownload={handleDownload}
      />

      <DocumentVersionHistory
        document={document}
        open={isVersionsOpen}
        onOpenChange={setIsVersionsOpen}
        onPreview={() => setIsPreviewOpen(true)}
        onDownload={handleDownload}
      />
    </>
  )
}
