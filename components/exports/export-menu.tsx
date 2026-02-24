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
import { PDFExportModal } from './PDFExportModal'

// ============================================================================
// TYPES
// ============================================================================

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

/** Labels affichés dans la modal PDF */
const MODULE_LABELS: Record<ExportType, string> = {
  marches: 'Marchés',
  cautions: 'Cautions',
  documents: 'Documents',
  vehicules: 'Véhicules',
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
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [pdfModalOpen, setPdfModalOpen] = useState(false)

  /** Construit l'URL API Excel avec les filtres */
  const buildExcelUrl = (): string => {
    const params = new URLSearchParams()
    if (filters?.statut) params.set('statut', filters.statut)
    if (filters?.type) params.set('type', filters.type)
    if (filters?.phase) params.set('phase', filters.phase)
    if (filters?.dateDebut) params.set('dateDebut', filters.dateDebut)
    if (filters?.dateFin) params.set('dateFin', filters.dateFin)
    if (filters?.search) params.set('search', filters.search)
    if (filters?.marcheId) params.set('marcheId', filters.marcheId)
    const qs = params.toString()
    return `/api/exports/${type}${qs ? `?${qs}` : ''}`
  }

  /** Construit l'URL de base pour la modal PDF (sans orientation/preview — ajoutés par la modal) */
  const buildPdfBaseUrl = (): string => {
    const params = new URLSearchParams()
    if (filters?.statut) params.set('statut', filters.statut)
    if (filters?.type) params.set('type', filters.type)
    if (filters?.phase) params.set('phase', filters.phase)
    if (filters?.dateDebut) params.set('dateDebut', filters.dateDebut)
    if (filters?.dateFin) params.set('dateFin', filters.dateFin)
    if (filters?.search) params.set('search', filters.search)
    if (filters?.marcheId) params.set('marcheId', filters.marcheId)
    const qs = params.toString()
    return `/api/exports-pdf/${type}${qs ? `?${qs}` : ''}`
  }

  /** Télécharge l'export Excel */
  const handleExcelExport = async () => {
    setLoadingExcel(true)
    try {
      const url = buildExcelUrl()
      const response = await fetch(url)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'export")
      }
      const blob = await response.blob()
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch =
        contentDisposition?.match(/filename="(.+)"/) ||
        contentDisposition?.match(/filename=([^;]+)/)
      const filename = filenameMatch?.[1] || `export_${type}_${Date.now()}.xlsx`
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      toast.success('Export Excel réussi', {
        description: `Le fichier ${filename} a été téléchargé`,
      })
    } catch (error: any) {
      console.error('[EXPORT_MENU_EXCEL]', error)
      toast.error("Erreur lors de l'export", {
        description: error.message || 'Une erreur est survenue',
      })
    } finally {
      setLoadingExcel(false)
    }
  }

  const isLoading = loadingExcel

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={buttonVariant}
            size={buttonSize}
            disabled={disabled || isLoading}
            className={className}
          >
            {isLoading ? (
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

          {/* Option Excel — inchangée */}
          <DropdownMenuItem
            onClick={handleExcelExport}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
            <div className="flex flex-col">
              <span className="font-medium">Excel (.xlsx)</span>
              <span className="text-xs text-muted-foreground">
                Tableur avec totaux
              </span>
            </div>
            {loadingExcel && (
              <Loader2 className="ml-auto h-4 w-4 animate-spin" />
            )}
          </DropdownMenuItem>

          {/* Option PDF — ouvre la modal */}
          <DropdownMenuItem
            onClick={() => setPdfModalOpen(true)}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <FileText className="mr-2 h-4 w-4 text-red-600" />
            <div className="flex flex-col">
              <span className="font-medium">PDF (.pdf)</span>
              <span className="text-xs text-muted-foreground">
                Aperçu + choix orientation
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal PDF */}
      <PDFExportModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        apiUrl={buildPdfBaseUrl()}
        moduleName={MODULE_LABELS[type]}
      />
    </>
  )
}
