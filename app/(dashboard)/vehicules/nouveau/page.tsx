import { VehiculeForm } from '@/components/vehicules/vehicule-form'
import { getAllMarchesArray } from '@/lib/actions/marches'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function NouveauVehiculePage() {
  // Récupérer la liste des marchés pour le formulaire
  const marches = await getAllMarchesArray()

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/vehicules">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Retour aux véhicules
          </Link>
        </Button>
      </div>

      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Nouveau véhicule</h1>
        <p className="text-muted-foreground">
          Ajoutez un nouveau véhicule au parc automobile
        </p>
      </div>

      {/* Formulaire */}
      <VehiculeForm marches={marches} />
    </div>
  )
}
