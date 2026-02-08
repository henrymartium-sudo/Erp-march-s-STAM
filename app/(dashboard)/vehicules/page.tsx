import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { VehiculeList } from '@/components/vehicules/vehicule-list'
import { VehiculeFilters } from '@/components/vehicules/vehicule-filters'
import { ExportExcelButton } from '@/components/exports/export-excel-button'
import { getVehicules } from '@/lib/actions/vehicules'
import { Plus } from 'lucide-react'
import type { StatutVehicule } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface VehiculesPageProps {
  searchParams: Promise<{
    search?: string
    statut?: string
    marque?: string
  }>
}

export default async function VehiculesPage({ searchParams }: VehiculesPageProps) {
  // Await searchParams (Next.js 15)
  const params = await searchParams

  // Récupérer les véhicules avec filtres
  const result = await getVehicules({
    search: params.search,
    statut: params.statut as StatutVehicule | undefined,
    marque: params.marque,
  })

  const vehicules = result.vehicules || []

  // Compter le nombre total sans filtres
  const totalResult = await getVehicules({})
  const totalCount = totalResult.total || 0

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Véhicules</h1>
          <p className="text-muted-foreground">
            Gérez le parc de véhicules liés à vos marchés
          </p>
        </div>
        <div className="flex gap-2">
          <ExportExcelButton
            type="vehicules"
            filters={{
              statut: params.statut,
            }}
          />
          <Button asChild>
            <Link href="/vehicules/nouveau">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau véhicule
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <VehiculeFilters
        totalCount={totalCount}
        filteredCount={vehicules.length}
      />

      {/* Liste des véhicules */}
      <VehiculeList vehicules={vehicules} />
    </div>
  )
}
