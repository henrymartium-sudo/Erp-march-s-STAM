import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { RetryButton } from '@/components/shared/retry-button'
import { VehiculeList } from '@/components/vehicules/vehicule-list'
import { VehiculeFilters } from '@/components/vehicules/vehicule-filters'
import { VehiculesOnglets } from '@/components/vehicules/vehicules-onglets'
import { SavVueGlobale } from '@/components/vehicules/sav-vue-globale'
import { lireOngletVehicules } from '@/lib/vehicules/onglets'
import { ExportMenu } from '@/components/exports'
import { DataPagination } from '@/components/ui/data-pagination'
import { getVehicules } from '@/lib/actions/vehicules'
import { serializeVehicule } from '@/lib/utils/serialize'
import { shouldShowPagination } from '@/lib/utils/pagination'
import { canWrite, canExport, isExploitation } from '@/lib/utils/permissions'
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
    onglet?: string | string[]
  }>
}

export default async function VehiculesPage({ searchParams }: VehiculesPageProps) {
  // Session + permissions
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)
  // VISITEUR n'exporte pas les véhicules (décision d'Abel du 2026-11-11, remplace 6c173e2 pour ce module).
  const userCanExportVehicules = (canExport(role) && role !== 'VISITEUR') || isExploitation(role)

  // Await searchParams (Next.js 15)
  const params = await searchParams

  // Onglet SAV : le serveur ne charge que les données de l'onglet affiché
  if (lireOngletVehicules(params.onglet) === 'sav') {
    // Comme l'ancienne page SAV : sans session valide, aucune donnée n'est lue ni rendue
    // (les indicateurs n'ont pas de garde propre, et le layout rend en parallèle de la page).
    if (!session) redirect('/login')
    return (
      <div className="space-y-6">
        <PageHeader
          title="Véhicules"
          description="Suivi des interventions sur l'ensemble du parc"
        />
        <VehiculesOnglets onglet="sav" />
        <SavVueGlobale />
      </div>
    )
  }

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
      <div className="container mx-auto py-8 space-y-6">
        <VehiculesOnglets onglet="parc" />
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur</CardTitle>
            <CardDescription>
              Impossible de charger les véhicules : {result.error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetryButton />
          </CardContent>
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
            {userCanExportVehicules && (
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

      <VehiculesOnglets onglet="parc" />

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
