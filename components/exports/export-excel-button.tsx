'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// ============================================================================
// TYPES
// ============================================================================

export interface ExportFilters {
  statut?: string
  type?: string
  dateDebut?: string
  dateFin?: string
  search?: string
}

interface ExportExcelButtonProps {
  /** Type d'export : 'marches', 'cautions', 'vehicules' */
  type: 'marches' | 'cautions' | 'vehicules'
  /** Filtres optionnels à appliquer */
  filters?: ExportFilters
  /** Label du bouton */
  label?: string
  /** Variant du bouton */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  /** Taille du bouton */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Classe CSS personnalisée */
  className?: string
}

// ============================================================================
// LABELS PAR TYPE
// ============================================================================

const TYPE_LABELS: Record<string, string> = {
  marches: 'Exporter Marchés',
  cautions: 'Exporter Cautions',
  vehicules: 'Exporter Véhicules',
}

// ============================================================================
// COMPOSANT
// ============================================================================

export function ExportExcelButton({
  type,
  filters,
  label,
  variant = 'outline',
  size = 'default',
  className,
}: ExportExcelButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  /**
   * Gère l'export Excel
   */
  const handleExport = async () => {
    setIsExporting(true)

    try {
      // Construction de l'URL avec les filtres
      const params = new URLSearchParams()

      if (filters?.statut) params.set('statut', filters.statut)
      if (filters?.type) params.set('type', filters.type)
      if (filters?.dateDebut) params.set('dateDebut', filters.dateDebut)
      if (filters?.dateFin) params.set('dateFin', filters.dateFin)
      if (filters?.search) params.set('search', filters.search)

      const url = `/api/exports/${type}${params.toString() ? `?${params.toString()}` : ''}`

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
      const filename =
        filenameMatch?.[1] || `export_${type}_${Date.now()}.xlsx`

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
      toast.success('Export Excel réussi', {
        description: `Le fichier ${filename} a été téléchargé`,
      })
    } catch (error: any) {
      console.error('[EXPORT_EXCEL]', error)
      toast.error("Erreur lors de l'export", {
        description: error.message || 'Une erreur est survenue',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting}
      className={className}
    >
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Export en cours...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {label || TYPE_LABELS[type]}
        </>
      )}
    </Button>
  )
}
