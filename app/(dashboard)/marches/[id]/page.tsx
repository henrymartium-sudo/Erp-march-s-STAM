import { notFound } from 'next/navigation'
import { getMarcheById } from '@/lib/actions/marches'
import { MarcheDetail } from '@/components/marches/marche-detail'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { serializeMarche } from '@/lib/utils/serialize'

interface MarchePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function MarchePage({ params }: MarchePageProps) {
  const { id } = await params
  const marcheRaw = await getMarcheById(id)

  if (!marcheRaw) {
    notFound()
  }

  // Sérialiser le marché pour le Client Component
  // Les Decimal Prisma ne sont PAS sérialisables par RSC
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
      <MarcheDetail marche={marche} />
    </div>
  )
}
