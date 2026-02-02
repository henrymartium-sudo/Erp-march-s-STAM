'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Download, Eye, FileText, Clock } from 'lucide-react'
import { formatTaille } from '@/lib/utils/document'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Document } from '@prisma/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getDocumentVersions } from '@/lib/actions/documents'
import { Badge } from '@/components/ui/badge'

interface DocumentVersionHistoryProps {
  document: Document | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPreview?: (document: Document) => void
  onDownload?: (document: Document) => void
}

/**
 * Dialog d'affichage de l'historique des versions d'un document
 */
export function DocumentVersionHistory({
  document,
  open,
  onOpenChange,
  onPreview,
  onDownload,
}: DocumentVersionHistoryProps) {
  const [versions, setVersions] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charger les versions
  useEffect(() => {
    if (!document || !open) {
      setVersions([])
      setError(null)
      return
    }

    const loadVersions = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await getDocumentVersions(document.id)

        if (result.success) {
          const sorted = [...result.data].sort((a, b) => b.version - a.version)
          setVersions(sorted)
        } else {
          setError(result.error)
        }
      } catch {
        setError('Erreur lors du chargement des versions')
      } finally {
        setIsLoading(false)
      }
    }

    loadVersions()
  }, [document, open])

  if (!document) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            Historique des versions
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{document.nom}</p>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Chargement de l'historique...
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && versions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucune version trouvée</p>
            </div>
          )}

          {!isLoading && !error && versions.length > 0 && (
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* En-tête de version */}
                      <div className="flex items-center gap-3">
                        <Badge variant={index === 0 ? 'default' : 'secondary'}>
                          Version {version.version}
                        </Badge>
                        {index === 0 && (
                          <Badge variant="outline">Version actuelle</Badge>
                        )}
                      </div>

                      {/* Nom et description */}
                      <div>
                        <p className="font-medium">{version.nom}</p>
                        {version.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {version.description}
                          </p>
                        )}
                      </div>

                      {/* Métadonnées */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(version.createdAt), 'dd MMM yyyy à HH:mm', {
                            locale: fr,
                          })}
                        </span>
                        <span>•</span>
                        <span>{formatTaille(version.taille)}</span>
                        {version.nomOriginal !== document.nomOriginal && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-xs" title={version.nomOriginal}>
                              {version.nomOriginal}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Tags */}
                      {version.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {version.tags.map((tag) => (
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

                    {/* Actions */}
                    <div className="flex gap-2">
                      {onPreview && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onPreview(version)}
                          title="Prévisualiser"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {onDownload && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onDownload(version)}
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Indicateur de changements */}
                  {(() => {
                    const newerVersion = index > 0 ? versions[index - 1] : null
                    if (!newerVersion) return null
                    if (version.taille === newerVersion.taille) return null

                    const sizeDiff = version.taille - newerVersion.taille
                    return (
                      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                        <span>
                          Taille modifiée: {sizeDiff > 0 ? '+' : ''}
                          {formatTaille(Math.abs(sizeDiff))}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {versions.length} version{versions.length > 1 ? 's' : ''} au total
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
