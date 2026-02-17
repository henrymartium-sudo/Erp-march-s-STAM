import { notFound } from 'next/navigation'
import { getVehiculeById } from '@/lib/actions/vehicules'
import { VehiculeDetail } from '@/components/vehicules/vehicule-detail'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { serializeVehicule } from '@/lib/utils/serialize'

export const dynamic = 'force-dynamic'

interface VehiculePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function VehiculePage({ params }: VehiculePageProps) {
  const { id } = await params

  // Récupérer le véhicule avec le marché associé
  const vehicule = await getVehiculeById(id)

  if (!vehicule) {
    notFound()
  }

  // Sérialiser le véhicule pour le passage au Client Component
  const serializedVehicule = serializeVehicule(vehicule)

  return (
    <div className="space-y-5">
      <BreadcrumbNav
        showHome
        items={[
          { label: 'Véhicules', href: '/vehicules' },
          { label: serializedVehicule.immatriculation },
        ]}
      />
      <VehiculeDetail vehicule={serializedVehicule} />
    </div>
  )
}
