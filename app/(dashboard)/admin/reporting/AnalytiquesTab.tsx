// app/(dashboard)/admin/reporting/AnalytiquesTab.tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import { Loader2, FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/lib/utils/toast'
import { startOfDay, subYears, endOfDay } from 'date-fns'

import { PeriodSelector } from '@/components/analytique/PeriodSelector'
import { PerformanceSection } from '@/components/analytique/PerformanceSection'
import { FinanciereSection } from '@/components/analytique/FinanciereSection'
import { CapitalisationSection } from '@/components/analytique/CapitalisationSection'
import { SAVSection } from '@/components/analytique/SAVSection'
import { OpportunitesSection } from '@/components/analytique/OpportunitesSection'

import { getAllAnalyticsData } from '@/lib/actions/analytics'
import { exportAnalytiquesPDF, exportAnalytiquesExcel } from '@/lib/actions/analytics-exports'
import type { AllAnalyticsData, Periode } from '@/lib/analytics/types'

const DEFAULT_PERIODE: Periode = {
  dateDebut: startOfDay(subYears(new Date(), 1)),
  dateFin: endOfDay(new Date()),
}

export function AnalytiquesTab() {
  const [periode, setPeriode] = useState<Periode>(DEFAULT_PERIODE)
  const [data, setData] = useState<AllAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setIsLoading(true)
    getAllAnalyticsData(periode)
      .then((result) => {
        setData(result)
        setIsLoading(false)
      })
      .catch(() => {
        toast.error('Erreur lors du chargement des données analytiques')
        setIsLoading(false)
      })
  }, [periode])

  function handleExportPDF() {
    startTransition(async () => {
      try {
        const result = await exportAnalytiquesPDF(periode)
        if (!result.success) throw new Error(result.error)
        if (!result.data) throw new Error('Données PDF manquantes')
        const blob = new Blob([new Uint8Array(result.data.buffer)], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.data.filename
        a.click()
        URL.revokeObjectURL(url)
        toast.success('PDF exporté avec succès')
      } catch {
        toast.error("Erreur lors de l'export PDF")
      }
    })
  }

  function handleExportExcel() {
    startTransition(async () => {
      try {
        const result = await exportAnalytiquesExcel(periode)
        if (!result.success) throw new Error(result.error)
        if (!result.data) throw new Error('Données Excel manquantes')
        const blob = new Blob(
          [new Uint8Array(result.data.buffer)],
          { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.data.filename
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Excel exporté avec succès')
      } catch {
        toast.error("Erreur lors de l'export Excel")
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Barre de contrôle : PeriodSelector + boutons export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodSelector value={periode} onChange={setPeriode} disabled={isLoading || isPending} />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isLoading || isPending || !data}
          >
            {isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <FileText className="mr-2 h-4 w-4" />}
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isLoading || isPending || !data}
          >
            {isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Download className="mr-2 h-4 w-4" />}
            Excel
          </Button>
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : data ? (
        <div className="space-y-10">
          <PerformanceSection data={data.performance} />
          <FinanciereSection data={data.financiere} />
          <CapitalisationSection data={data.capitalisation} />
          <SAVSection data={data.sav} />
          <OpportunitesSection data={data.opportunites} />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Aucune donnée disponible.</p>
      )}
    </div>
  )
}
