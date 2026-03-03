import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { DossierList } from '@/components/dossiers-offre/dossier-list'
import { DataPagination } from '@/components/ui/data-pagination'
import { getDossiersOffre } from '@/lib/actions/dossiers-offre'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { shouldShowPagination } from '@/lib/utils/pagination'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface DossiersPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function DossiersOffrePage({ searchParams }: DossiersPageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)

  const params = await searchParams
  const currentPage = Number(params.page) || 1

  const result = await getDossiersOffre({ page: currentPage })

  if (!result.success) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dossiers d'offre" description="Montage des dossiers de soumission" />
        <p className="text-destructive">{result.error}</p>
      </div>
    )
  }

  const { data: dossiers, pagination } = result.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dossiers d'offre"
        description="Gestion et suivi des dossiers de soumission"
        count={pagination.totalItems}
        action={
          userCanWrite && (
            <Button asChild>
              <Link href="/dossiers-offre/nouveau">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau dossier
              </Link>
            </Button>
          )
        }
      />

      <DossierList dossiers={dossiers} canWrite={userCanWrite} />

      {shouldShowPagination(pagination.totalItems) && (
        <DataPagination pagination={pagination} />
      )}
    </div>
  )
}
