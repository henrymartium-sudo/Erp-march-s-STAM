import { notFound } from 'next/navigation'
import { getMarcheById } from '@/lib/actions/marches'
import { MarcheDetail } from '@/components/marches/marche-detail'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { serializeMarche } from '@/lib/utils/serialize'
import { auth } from '@/lib/auth/auth.config'
import { canWrite } from '@/lib/utils/permissions'

interface MarchePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function MarchePage({ params }: MarchePageProps) {
  const [session, { id }] = await Promise.all([auth(), params])
  const role = (session?.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)

  const marcheRaw = await getMarcheById(id)

  if (!marcheRaw) {
    notFound()
  }

  const marche = serializeMarche(marcheRaw)

  return (
    <div className="space-y-5">
      <BreadcrumbNav
        showHome
        items={[
          { label: 'Marchés', href: '/marches' },
          { label: marche.numero },
        ]}
      />
      <MarcheDetail marche={marche} canWrite={userCanWrite} />
    </div>
  )
}
