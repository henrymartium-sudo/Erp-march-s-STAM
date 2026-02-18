'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react'
import { toast } from '@/lib/utils/toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

// ============================================================================
// TYPES
// ============================================================================

type ExportFormat = 'excel' | 'pdf'
type ExportType = 'marches' | 'cautions' | 'documents' | 'vehicules'

export interface ExportFilters {
  statut?: string
  type?: string
  phase?: string
  dateDebut?: string
  dateFin?: string
  search?: string
  marcheId?: string
}

interface ExportMenuProps {
  /**
   * Type d'export : 'marches', 'cautions', 'documents', 'vehicules'
   */
  type: ExportType

  /**
   * Filtres optionnels à appliquer
   */
  filters?: ExportFilters

  /**
   * Texte du bouton (par défaut "Exporter")
   */
  buttonText?: string

  /**
   * Taille du bouton
   */
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon'

  /**
   * Variant du bouton
   */
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost'

  /**
   * Désactiver le menu
   */
  disabled?: boolean

  /**
   * Classe CSS personnalisée
   */
  className?: string
}

// ============================================================================
// COMPOSANT
// ============================================================================

export function ExportMenu({
  type,
  filters,
  buttonText = 'Exporter',
  buttonSize = 'default',
  buttonVariant = 'outline',
  disabled = false,
  className,
}: ExportMenuProps) {
  const [loading, setLoading] = useState(false)
  const [currentFormat, setCurrentFormat] = useState<ExportFormat | null>(null)

  /**
   * Construit l'URL de l'API avec les filtres
   */
  const buildApiUrl = (format: ExportFormat): string => {
    const params = new URLSearchParams()

    if (filters?.statut) params.set('statut', filters.statut)
    if (filters?.type) params.set('type', filters.type)
    if (filters?.phase) params.set('phase', filters.phase)
    if (filters?.dateDebut) params.set('dateDebut', filters.dateDebut)
    if (filters?.dateFin) params.set('dateFin', filters.dateFin)
    if (filters?.search) params.set('search', filters.search)
    if (filters?.marcheId) params.set('marcheId', filters.marcheId)

    const baseUrl =
      format === 'excel' ? `/api/exports/${type}` : `/api/exports-pdf/${type}`

    return `${baseUrl}${params.toString() ? `?${params.toString()}` : ''}`
  }

  /**
   * Gère l'export dans le format demandé
   */
  const handleExport = async (format: ExportFormat) => {
    setLoading(true)
    setCurrentFormat(format)

    try {
      const url = buildApiUrl(format)

      // Appel de l'API
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'export")
      }

      // Récupération du blob
      const blob = await response.blob()

      // Extraction du nom de fichier depuis les headers
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch =
        contentDisposition?.match(/filename="(.+)"/) ||
        contentDisposition?.match(/filename=([^;]+)/)
      const fileExtension = format === 'excel' ? 'xlsx' : 'pdf'
      const filename =
        filenameMatch?.[1] || `export_${type}_${Date.now()}.${fileExtension}`

      // Création du lien de téléchargement
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Nettoyage
      window.URL.revokeObjectURL(downloadUrl)

      // Notification succès
      toast.success(
        `Export ${format === 'excel' ? 'Excel' : 'PDF'} réussi`,
        {
          description: `Le fichier ${filename} a été téléchargé`,
        }
      )
    } catch (error: any) {
      console.error('[EXPORT_MENU]', error)
      toast.error("Erreur lors de l'export", {
        description: error.message || 'Une erreur est survenue',
      })
    } finally {
      setLoading(false)
      setCurrentFormat(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          disabled={disabled || loading}
          className={className}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Export en cours...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {buttonText}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Format d&apos;export</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Option Excel */}
        <DropdownMenuItem
          onClick={() => handleExport('excel')}
          disabled={loading}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
          <div className="flex flex-col">
            <span className="font-medium">Excel (.xlsx)</span>
            <span className="text-xs text-muted-foreground">
              Tableur avec totaux
            </span>
          </div>
          {loading && currentFormat === 'excel' && (
            <Loader2 className="ml-auto h-4 w-4 animate-spin" />
          )}
        </DropdownMenuItem>

        {/* Option PDF */}
        <DropdownMenuItem
          onClick={() => handleExport('pdf')}
          disabled={loading}
          className="cursor-pointer"
        >
          <FileText className="mr-2 h-4 w-4 text-red-600" />
          <div className="flex flex-col">
            <span className="font-medium">PDF (.pdf)</span>
            <span className="text-xs text-muted-foreground">
              Document imprimable
            </span>
          </div>
          {loading && currentFormat === 'pdf' && (
            <Loader2 className="ml-auto h-4 w-4 animate-spin" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
