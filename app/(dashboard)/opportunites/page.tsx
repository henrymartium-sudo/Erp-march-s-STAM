import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { OpportuniteList } from '@/components/opportunites/opportunite-list'
import { DataPagination } from '@/components/ui/data-pagination'
import { getOpportunites } from '@/lib/actions/opportunites'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { shouldShowPagination } from '@/lib/utils/pagination'
import { Plus } from 'lucide-react'
import type { StatutOpportunite } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface OpportunitesPageProps {
  searchParams: Promise<{
    statut?: string
    page?: string
  }>
}

export default async function OpportunitesPage({ searchParams }: OpportunitesPageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)

  const params = await searchParams
  const currentPage = Number(params.page) || 1

  const result = await getOpportunites({
    statut: params.statut as StatutOpportunite | undefined,
    page: currentPage,
  })

  if (!result.success) {
    return (
      <div className="space-y-6">
        <PageHeader title="Opportunités" description="Pipeline de veille marchés" />
        <p className="text-destructive">{result.error}</p>
      </div>
    )
  }

  const { data: opportunites, pagination } = result.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunités"
        description="Pipeline de veille et suivi des appels d'offres"
        count={pagination.totalItems}
        action={
          userCanWrite && (
            <Button asChild>
              <Link href="/opportunites/nouvelle">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle opportunité
              </Link>
            </Button>
          )
        }
      />

      <OpportuniteList opportunites={opportunites} canWrite={userCanWrite} />

      {shouldShowPagination(pagination.totalItems) && (
        <DataPagination pagination={pagination} />
      )}
    </div>
  )
}
