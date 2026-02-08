import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MarcheList } from '@/components/marches/marche-list'
import { MarcheFilters } from '@/components/marches/marche-filters'
import { ExportExcelButton } from '@/components/exports/export-excel-button'
import { getAllMarches } from '@/lib/actions/marches'
import { Plus } from 'lucide-react'
import type { StatutMarche, TypeMarche } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface MarchesPageProps {
  searchParams: Promise<{
    statut?: string
    type?: string
  }>
}

export default async function MarchesPage({ searchParams }: MarchesPageProps) {
  // Récupérer tous les marchés
  const allMarches = await getAllMarches()

  // Await searchParams (Next.js 15)
  const params = await searchParams

  // Appliquer les filtres
  let marchesFiltres = allMarches

  if (params.statut) {
    marchesFiltres = marchesFiltres.filter(
      (m) => m.statut === params.statut
    )
  }

  if (params.type) {
    marchesFiltres = marchesFiltres.filter(
      (m) => m.type === params.type
    )
  }

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
        totalCount={allMarches.length}
        filteredCount={marchesFiltres.length}
      />

      {/* Liste des marchés */}
      <MarcheList marches={marchesFiltres} />
    </div>
  )
}
