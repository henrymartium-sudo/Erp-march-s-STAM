'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, AlertCircle } from 'lucide-react'
import { formatTaille, isPdfFile, isImageFile, isPreviewable } from '@/lib/utils/document'
import { DocumentBadge } from './document-badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Document } from '@prisma/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getSignedUrlForDocument } from '@/lib/actions/documents'
import Image from 'next/image'

interface DocumentPreviewProps {
  document: Document | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDownload?: (document: Document) => void
}

/**
 * Dialog de prévisualisation de documents (PDF, images)
 */
export function DocumentPreview({
  document,
  open,
  onOpenChange,
  onDownload,
}: DocumentPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPdf = document ? isPdfFile(document.mimeType) : false
  const isImage = document ? isImageFile(document.mimeType) : false
  const canPreview = document ? isPreviewable(document.mimeType) : false

  // Charger l'URL signée
  useEffect(() => {
    if (!document || !open) {
      setPreviewUrl(null)
      setError(null)
      return
    }

    if (!canPreview) {
      setError('Ce type de fichier ne peut pas être prévisualisé')
      return
    }

    const loadPreviewUrl = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await getSignedUrlForDocument(document.id)

        if (result.success) {
          setPreviewUrl(result.data)
        } else {
          setError(result.error)
        }
      } catch {
        setError('Erreur lors du chargement de la prévisualisation')
      } finally {
        setIsLoading(false)
      }
    }

    loadPreviewUrl()
  }, [document, open, canPreview])

  if (!document) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="truncate">{document.nom}</span>
            <DocumentBadge type={document.type} />
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Métadonnées */}
          <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                <strong>Taille:</strong> {formatTaille(document.taille)}
              </span>
              <span>
                <strong>Date:</strong>{' '}
                {format(new Date(document.createdAt), 'dd MMMM yyyy', { locale: fr })}
              </span>
              {document.phase && (
                <span>
                  <strong>Phase:</strong> <DocumentBadge phase={document.phase} />
                </span>
              )}
              {document.version > 1 && (
                <span>
                  <strong>Version:</strong> {document.version}
                </span>
              )}
            </div>

            {document.description && (
              <p className="text-sm text-muted-foreground">{document.description}</p>
            )}

            {document.dateValidite && (
              <p className="text-sm text-muted-foreground">
                <strong>Valide jusqu'au:</strong>{' '}
                {format(new Date(document.dateValidite), 'dd/MM/yyyy', { locale: fr })}
              </p>
            )}

            {document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {document.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-secondary rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Prévisualisation */}
          <div className="border rounded-lg overflow-hidden bg-muted/30 min-h-[400px] flex items-center justify-center">
            {isLoading && (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Chargement de la prévisualisation...</p>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!isLoading && !error && previewUrl && (
              <>
                {isImage && (
                  <div className="relative w-full h-full min-h-[400px]">
                    <Image
                      src={previewUrl}
                      alt={document.nom}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 896px"
                    />
                  </div>
                )}

                {isPdf && (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[600px]"
                    title={document.nom}
                  />
                )}
              </>
            )}

            {!isLoading && !error && !canPreview && (
              <div className="text-center p-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Ce type de fichier ne peut pas être prévisualisé.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Téléchargez le fichier pour l'ouvrir avec l'application appropriée.
                </p>
                {onDownload && (
                  <Button onClick={() => onDownload(document)}>
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {onDownload && canPreview && (
          <div className="pt-4 border-t">
            <Button onClick={() => onDownload(document)} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Télécharger le document
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
