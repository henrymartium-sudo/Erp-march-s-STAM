import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { FactureForm } from '@/components/factures/facture-form'
import { getFacture } from '@/lib/actions/factures'
import { getAllMarchesArray } from '@/lib/actions/marches'
import { requireAuth, canWrite } from '@/lib/utils/permissions'

export const dynamic = 'force-dynamic'

interface EditFacturePageProps {
  params: Promise<{ id: string }>
}

export default async function EditFacturePage({ params }: EditFacturePageProps) {
  const { id } = await params
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role

  if (!canWrite(role)) redirect('/factures')

  const [factureResult, marches] = await Promise.all([
    getFacture(id),
    getAllMarchesArray({ limit: 1000 }),
  ])

  if (!factureResult.success) notFound()

  const facture = factureResult.data
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
          { label: facture.numero, href: `/factures/${facture.id}` },
          { label: 'Modifier' },
        ]}
      />
      <PageHeader
        title={`Modifier ${facture.numero}`}
        description="Modification d'une facture existante"
      />
      <FactureForm
        marches={marchesSimples}
        facture={facture}
      />
    </div>
  )
}
