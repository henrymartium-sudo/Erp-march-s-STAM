'use client'

import { useState } from 'react'
import { FileText, Loader2, Download, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/utils/toast'

// ============================================================================
// TYPES
// ============================================================================

type PDFOrientation = 'portrait' | 'landscape'

interface PDFExportModalProps {
  open: boolean
  onClose: () => void
  /** URL de base de l'API PDF — ex. "/api/exports-pdf/marches?statut=EN_COURS" */
  apiUrl: string
  /** Nom du module pour les labels */
  moduleName?: string
}

// ============================================================================
// COMPOSANT
// ============================================================================

export function PDFExportModal({
  open,
  onClose,
  apiUrl,
  moduleName = 'données',
}: PDFExportModalProps) {
  const [orientation, setOrientation] = useState<PDFOrientation>('portrait')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingDownload, setLoadingDownload] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  /** Construit l'URL finale avec les params orientation et preview */
  const buildUrl = (preview: boolean): string => {
    const separator = apiUrl.includes('?') ? '&' : '?'
    const previewParam = preview ? '&preview=true' : ''
    return `${apiUrl}${separator}orientation=${orientation}${previewParam}`
  }

  /** Charge la prévisualisation dans l'iframe */
  const handlePreview = async () => {
    setLoadingPreview(true)
    setPreviewUrl(null)
    try {
      const url = buildUrl(true)
      const response = await fetch(url)
      if (!response.ok) throw new Error('Erreur de génération PDF')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      setPreviewUrl(objectUrl)
    } catch (error: any) {
      console.error('[PDF_PREVIEW]', error)
      toast.error('Erreur de prévisualisation', {
        description: error.message || 'Impossible de générer le PDF',
      })
    } finally {
      setLoadingPreview(false)
    }
  }

  /** Déclenche le téléchargement direct */
  const handleDownload = async () => {
    setLoadingDownload(true)
    try {
      const url = buildUrl(false)
      const response = await fetch(url)
      if (!response.ok) throw new Error('Erreur de génération PDF')
      const blob = await response.blob()
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || `export_${Date.now()}.pdf`
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)
      toast.success('Export PDF réussi', {
        description: `Le fichier ${filename} a été téléchargé`,
      })
      onClose()
    } catch (error: any) {
      console.error('[PDF_DOWNLOAD]', error)
      toast.error("Erreur lors de l'export", {
        description: error.message || 'Impossible de télécharger le PDF',
      })
    } finally {
      setLoadingDownload(false)
    }
  }

  const handleClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setOrientation('portrait')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-red-600" />
            Export PDF — {moduleName}
          </DialogTitle>
        </DialogHeader>

        {/* Sélecteur orientation */}
        <div className="flex items-center gap-6 py-3 border-b">
          <Label className="text-sm font-medium text-muted-foreground">
            Orientation :
          </Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="orientation"
                value="portrait"
                checked={orientation === 'portrait'}
                onChange={() => {
                  setOrientation('portrait')
                  setPreviewUrl(null)
                }}
                className="accent-primary"
              />
              <span className="text-sm">Portrait</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="orientation"
                value="landscape"
                checked={orientation === 'landscape'}
                onChange={() => {
                  setOrientation('landscape')
                  setPreviewUrl(null)
                }}
                className="accent-primary"
              />
              <span className="text-sm">Paysage</span>
            </label>
          </div>
        </div>

        {/* Zone de prévisualisation */}
        <div className="min-h-[400px] bg-muted/30 rounded-lg border flex items-center justify-center overflow-hidden">
          {loadingPreview ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Génération du PDF en cours...</p>
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-[500px] rounded-lg"
              title="Prévisualisation PDF"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                Cliquez sur &quot;Prévisualiser&quot; pour voir le rendu
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={loadingPreview || loadingDownload}
          >
            {loadingPreview ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Prévisualiser
          </Button>
          <Button
            onClick={handleDownload}
            disabled={loadingPreview || loadingDownload}
          >
            {loadingDownload ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Télécharger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
