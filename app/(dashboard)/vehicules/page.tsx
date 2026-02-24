import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { VehiculeList } from '@/components/vehicules/vehicule-list'
import { VehiculeFilters } from '@/components/vehicules/vehicule-filters'
import { ExportMenu } from '@/components/exports'
import { DataPagination } from '@/components/ui/data-pagination'
import { getVehicules } from '@/lib/actions/vehicules'
import { serializeVehicule } from '@/lib/utils/serialize'
import { shouldShowPagination } from '@/lib/utils/pagination'
import { canWrite } from '@/lib/utils/permissions'
import { auth } from '@/lib/auth/auth.config'
import { Plus } from 'lucide-react'
import type { StatutVehicule } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface VehiculesPageProps {
  searchParams: Promise<{
    search?: string
    statut?: string
    marque?: string
    page?: string
  }>
}

export default async function VehiculesPage({ searchParams }: VehiculesPageProps) {
  // Session + permissions
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)

  // Await searchParams (Next.js 15)
  const params = await searchParams

  // Parse page number
  const currentPage = Number(params.page) || 1

  // Récupérer les véhicules avec filtres et pagination
  const result = await getVehicules({
    search: params.search,
    statut: params.statut as StatutVehicule | undefined,
    marque: params.marque,
    page: currentPage,
  })

  // Gérer les erreurs
  if (!result.success) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur</CardTitle>
            <CardDescription>
              Impossible de charger les véhicules : {result.error}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { data: rawVehicules, pagination } = result.data

  // Sérialiser les véhicules pour le passage aux Client Components
  const vehicules = rawVehicules.map(serializeVehicule)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <PageHeader
        title="Véhicules"
        description="Gérez le parc de véhicules liés à vos marchés"
        count={pagination.totalItems}
        action={
          <>
            {userCanWrite && (
            <ExportMenu
              type="vehicules"
              filters={{
                statut: params.statut,
                search: params.search,
              }}
            />
          )}
            {userCanWrite && (
              <Button asChild>
                <Link href="/vehicules/nouveau">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau véhicule
                </Link>
              </Button>
            )}
          </>
        }
      />

      {/* Filtres */}
      <VehiculeFilters
        totalCount={pagination.totalItems}
        filteredCount={vehicules.length}
      />

      {/* Liste des véhicules */}
      <VehiculeList vehicules={vehicules} canWrite={userCanWrite} />

      {/* Pagination */}
      {shouldShowPagination(pagination.totalItems) && (
        <DataPagination pagination={pagination} />
      )}
    </div>
  )
}
