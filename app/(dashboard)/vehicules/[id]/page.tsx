import { notFound } from 'next/navigation'
import { getVehiculeById } from '@/lib/actions/vehicules'
import { VehiculeDetail } from '@/components/vehicules/vehicule-detail'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { serializeVehicule } from '@/lib/utils/serialize'
import { auth } from '@/lib/auth/auth.config'
import { canWrite, canWriteSAV, canWriteCommentaireContractuel } from '@/lib/utils/permissions'

export const dynamic = 'force-dynamic'

interface VehiculePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function VehiculePage({ params }: VehiculePageProps) {
  const [session, { id }] = await Promise.all([auth(), params])
  const role = (session?.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)
  const userCanWriteSAV = canWriteSAV(role)
  const userCanWriteCommentaire = canWriteCommentaireContractuel(role)

  const vehicule = await getVehiculeById(id)

  if (!vehicule) {
    notFound()
  }

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
      <VehiculeDetail
        vehicule={serializedVehicule}
        canWrite={userCanWrite}
        canWriteSAV={userCanWriteSAV}
        canWriteCommentaire={userCanWriteCommentaire}
      />
    </div>
  )
}
