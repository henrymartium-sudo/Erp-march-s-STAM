'use client'

import Link from 'next/link'
import { Truck, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VehiculeCard } from './vehicule-card'
import { SortableHeader } from '@/components/shared/SortableHeader'
import { useSortable } from '@/hooks/use-sortable'
import type { SerializedVehicule } from '@/types/serialized'

interface VehiculeListProps {
  vehicules: SerializedVehicule[]
  canWrite?: boolean
}

export function VehiculeList({ vehicules, canWrite = false }: VehiculeListProps) {
  const { sortedData, sortConfig, onSort } = useSortable<SerializedVehicule>(
    vehicules,
    { key: 'createdAt', direction: 'desc' }
  )

  if (vehicules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Truck className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucun véhicule trouvé</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
          Aucun véhicule ne correspond à vos critères de recherche. Commencez par ajouter
          votre premier véhicule.
        </p>
        {canWrite && (
          <Button asChild>
            <Link href="/vehicules/nouveau">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un véhicule
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar de tri */}
      <div className="flex flex-wrap items-center gap-1 mb-4">
        <span className="text-xs text-muted-foreground mr-1">Trier par :</span>
        <SortableHeader<SerializedVehicule>
          field="immatriculation"
          label="Immatriculation"
          sortConfig={sortConfig}
          onSort={onSort}
        />
        <SortableHeader<SerializedVehicule>
          field="marque"
          label="Marque"
          sortConfig={sortConfig}
          onSort={onSort}
        />
        <SortableHeader<SerializedVehicule>
          field="annee"
          label="Année"
          sortConfig={sortConfig}
          onSort={onSort}
        />
        <SortableHeader<SerializedVehicule>
          field="dateLivraison"
          label="Livraison"
          sortConfig={sortConfig}
          onSort={onSort}
        />
        <SortableHeader<SerializedVehicule>
          field="createdAt"
          label="Ajouté"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      </div>

      {/* Grille responsive de véhicules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedData.map((vehicule) => (
          <VehiculeCard key={vehicule.id} vehicule={vehicule} />
        ))}
      </div>
    </div>
  )
}
