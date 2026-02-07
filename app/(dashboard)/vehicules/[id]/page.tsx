import { notFound } from 'next/navigation'
import { getVehiculeById } from '@/lib/actions/vehicules'
import { VehiculeDetail } from '@/components/vehicules/vehicule-detail'

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

  return <VehiculeDetail vehicule={vehicule} />
}
