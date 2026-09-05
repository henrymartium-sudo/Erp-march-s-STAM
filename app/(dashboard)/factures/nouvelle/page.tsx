import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { FactureForm } from '@/components/factures/facture-form'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { getAllMarchesArray } from '@/lib/actions/marches'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface NouvelleFacturePageProps {
  searchParams: Promise<{ marcheId?: string }>
}

export default async function NouvelleFacturePage({ searchParams }: NouvelleFacturePageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role

  if (!canWrite(role)) redirect('/factures')

  const params = await searchParams

  const marches = await getAllMarchesArray({ limit: 1000 })
  const marchesSimples = marches.map((m) => ({
    id: m.id,
    numero: m.numero,
    objet: m.objet,
  }))

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        showHome
        items={[
          { label: 'Factures', href: '/factures' },
          { label: 'Nouvelle facture' },
        ]}
      />
      <PageHeader
        title="Nouvelle facture"
        description="Créez une nouvelle facture pour un marché"
      />
      <FactureForm
        marches={marchesSimples}
        defaultMarcheId={params.marcheId}
      />
    </div>
  )
}
