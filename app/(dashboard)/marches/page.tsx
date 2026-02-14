import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MarcheList } from '@/components/marches/marche-list'
import { MarcheFilters } from '@/components/marches/marche-filters'
import { MarchePagination } from '@/components/marches/marche-pagination'
import { ExportExcelButton } from '@/components/exports/export-excel-button'
import { getAllMarches } from '@/lib/actions/marches'
import { searchInFields } from '@/lib/utils/search'
import { serializeMarche } from '@/lib/utils/serialize'
import { shouldShowPagination, formatPaginationMessage } from '@/lib/utils/pagination'
import { Plus } from 'lucide-react'
import type { StatutMarche, TypeMarche } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface MarchesPageProps {
  searchParams: Promise<{
    statut?: string
    type?: string
    search?: string
    page?: string
  }>
}

export default async function MarchesPage({ searchParams }: MarchesPageProps) {
  // Await searchParams (Next.js 15)
  const params = await searchParams

  // Parse page number
  const currentPage = Number(params.page) || 1

  // Récupérer les marchés avec pagination (backend)
  const marchesResponse = await getAllMarches({
    statut: params.statut as StatutMarche | undefined,
    type: params.type as TypeMarche | undefined,
    page: currentPage,
  })

  // Sérialiser les marchés pour les Client Components
  let marchesFiltres = marchesResponse.data.map(serializeMarche)

  // Appliquer la recherche textuelle côté client (fonctionnalité existante à préserver)
  // Note: La recherche côté client désactive la pagination backend
  if (params.search) {
    // Récupérer TOUS les marchés pour la recherche
    const allMarchesResponse = await getAllMarches({
      statut: params.statut as StatutMarche | undefined,
      type: params.type as TypeMarche | undefined,
      limit: 10000, // Récupérer tout
    })

    marchesFiltres = allMarchesResponse.data
      .map(serializeMarche)
      .filter((marche) =>
        searchInFields(
          marche,
          ['numero', 'objet', 'autoriteContractanteNom'],
          params.search!
        )
      )
  }

  // Pagination metadata (ajustée si recherche active)
  const paginationData = params.search
    ? {
        ...marchesResponse.pagination,
        totalItems: marchesFiltres.length,
        totalPages: Math.ceil(marchesFiltres.length / marchesResponse.pagination.itemsPerPage),
      }
    : marchesResponse.pagination

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Marchés publics</h1>
          <p className="text-muted-foreground">
            Gérez vos marchés publics de bout en bout
          </p>
        </div>
        <div className="flex gap-2">
          <ExportExcelButton
            type="marches"
            filters={{
              statut: params.statut,
              type: params.type,
              search: params.search,
            }}
          />
          <Button asChild>
            <Link href="/marches/nouveau">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau marché
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <MarcheFilters
        totalCount={paginationData.totalItems}
        filteredCount={marchesFiltres.length}
      />

      {/* Liste des marchés */}
      <MarcheList marches={marchesFiltres} />

      {/* Pagination */}
      {shouldShowPagination(paginationData.totalItems) && (
        <MarchePagination pagination={paginationData} />
      )}
    </div>
  )
}
