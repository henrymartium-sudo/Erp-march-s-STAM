import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { FactureList } from '@/components/factures/facture-list'
import { DataPagination } from '@/components/ui/data-pagination'
import { getFactures } from '@/lib/actions/factures'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { shouldShowPagination } from '@/lib/utils/pagination'
import { Plus } from 'lucide-react'
import type { StatutFacture } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface FacturesPageProps {
  searchParams: Promise<{
    statut?: string
    marcheId?: string
    page?: string
  }>
}

export default async function FacturesPage({ searchParams }: FacturesPageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)

  const params = await searchParams
  const currentPage = Number(params.page) || 1

  const result = await getFactures({
    statut: params.statut as StatutFacture | undefined,
    marcheId: params.marcheId,
    page: currentPage,
  })

  if (!result.success) {
    return (
      <div className="space-y-6">
        <PageHeader title="Factures" description="Gestion de la facturation" />
        <p className="text-destructive">{result.error}</p>
      </div>
    )
  }

  const { data: factures, pagination } = result.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        description="Gestion et suivi de la facturation"
        count={pagination.totalItems}
        action={
          userCanWrite && (
            <Button asChild>
              <Link href="/factures/nouvelle">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle facture
              </Link>
            </Button>
          )
        }
      />

      <FactureList
        factures={factures}
        canWrite={userCanWrite}
        showMarche
      />

      {shouldShowPagination(pagination.totalItems) && (
        <DataPagination pagination={pagination} />
      )}
    </div>
  )
}
