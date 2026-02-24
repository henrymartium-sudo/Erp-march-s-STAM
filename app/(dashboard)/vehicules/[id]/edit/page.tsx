import { notFound, redirect } from 'next/navigation'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { VehiculeForm } from '@/components/vehicules/vehicule-form'
import { getVehiculeById } from '@/lib/actions/vehicules'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

interface EditVehiculePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditVehiculePage({ params }: EditVehiculePageProps) {
  const [session, { id }] = await Promise.all([requireAuth(), params])
  if (!canWrite(session.user?.role)) {
    redirect(`/vehicules/${id}`)
  }

  const vehicule = await getVehiculeById(id)

  if (!vehicule) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/vehicules/${id}`}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Retour au véhicule
          </Link>
        </Button>
      </div>

      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Modifier le véhicule</h1>
        <p className="text-muted-foreground">
          {vehicule.immatriculation} - {vehicule.marque} {vehicule.modele}
        </p>
      </div>

      {/* Formulaire */}
      <VehiculeForm vehicule={vehicule} />
    </div>
  )
}
