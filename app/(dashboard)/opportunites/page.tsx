import Link from 'next/link'
import { AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PageHeader } from '@/components/shared/page-header'
import { OpportuniteList } from '@/components/opportunites/opportunite-list'
import { OpportuniteFilters } from '@/components/opportunites/opportunite-filters'
import { DataPagination } from '@/components/ui/data-pagination'
import { ExportMenu } from '@/components/exports/export-menu'
import { getOpportunites, getOpportunitesPhaseCounts } from '@/lib/actions/opportunites'
import { requireAuth, canWrite, canExport } from '@/lib/utils/permissions'
import { shouldShowPagination } from '@/lib/utils/pagination'
import { parseOpportuniteFilters } from '@/lib/utils/opportunite-filters'

export const dynamic = 'force-dynamic'

interface OpportunitesPageProps {
  searchParams: Promise<{
    phase?: string
    statut?: string
    search?: string
    echeance?: string
    tri?: string
    page?: string
  }>
}

export default async function OpportunitesPage({ searchParams }: OpportunitesPageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)
  const userCanExport = canExport(role)

  const params = await searchParams
  const currentPage = Number(params.page) || 1
  const filters = parseOpportuniteFilters(params)

  const [result, countsResult] = await Promise.all([
    getOpportunites({ ...filters, page: currentPage }),
    getOpportunitesPhaseCounts(),
  ])

  if (!result.success || !countsResult.success) {
    const error = !result.success ? result.error : !countsResult.success ? countsResult.error : ''
    return (
      <div className="space-y-6">
        <PageHeader title="Opportunités" description="Pipeline de veille et suivi des appels d'offres" />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Chargement impossible</AlertTitle>
          <AlertDescription>{error} Rechargez la page pour réessayer.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const { data: opportunites, pagination } = result.data
  const hasFilters = Boolean(filters.search || filters.statut || filters.echeance)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunités"
        description="Pipeline de veille et suivi des appels d'offres"
        count={countsResult.data.toutes}
        action={
          <div className="flex flex-wrap gap-2">
            {userCanExport && (
              <ExportMenu
                type="opportunites"
                filters={{
                  phase: filters.phase,
                  statut: filters.statut,
                  search: filters.search,
                  echeance: filters.echeance,
                  tri: filters.tri,
                }}
                buttonVariant="outline"
              />
            )}
            {userCanWrite && (
              <Button asChild>
                <Link href="/opportunites/nouvelle">
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Nouvelle opportunité
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <OpportuniteFilters phaseCounts={countsResult.data} filteredCount={pagination.totalItems} />

      <OpportuniteList opportunites={opportunites} canWrite={userCanWrite} hasFilters={hasFilters} />

      {shouldShowPagination(pagination.totalItems) && (
        <DataPagination pagination={pagination} />
      )}
    </div>
  )
}
