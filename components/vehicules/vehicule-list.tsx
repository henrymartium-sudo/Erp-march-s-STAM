import Link from 'next/link'
import { VehiculeCard } from './vehicule-card'
import { Button } from '@/components/ui/button'
import { Plus, Truck } from 'lucide-react'
import type { Vehicule } from '@prisma/client'

interface VehiculeListProps {
  vehicules: (Vehicule & {
    marche?: {
      id: string
      numero: string
      objet: string
      statut: string
    } | null
  })[]
}

export function VehiculeList({ vehicules }: VehiculeListProps) {
  // Trier les véhicules par date de création (plus récents en premier)
  const vehiculesTries = [...vehicules].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // État vide
  if (vehiculesTries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Truck className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucun véhicule trouvé</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
          Aucun véhicule ne correspond à vos critères de recherche. Commencez par ajouter
          votre premier véhicule.
        </p>
        <Button asChild>
          <Link href="/vehicules/nouveau">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un véhicule
          </Link>
        </Button>
      </div>
    )
  }

  // Grille responsive de véhicules
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vehiculesTries.map((vehicule) => (
        <VehiculeCard key={vehicule.id} vehicule={vehicule} />
      ))}
    </div>
  )
}
