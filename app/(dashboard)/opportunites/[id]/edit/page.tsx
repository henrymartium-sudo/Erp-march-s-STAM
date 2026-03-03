import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { OpportuniteForm } from '@/components/opportunites/opportunite-form'
import { getOpportunite } from '@/lib/actions/opportunites'
import { requireAuth, canWrite } from '@/lib/utils/permissions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditOpportunitePage({ params }: PageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  if (!canWrite(role)) {
    redirect('/opportunites')
  }

  const { id } = await params
  const result = await getOpportunite(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const opp = result.data

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: 'Opportunités', href: '/opportunites' },
          { label: opp.objet, href: `/opportunites/${id}` },
          { label: 'Modifier' },
        ]}
      />
      <PageHeader
        title="Modifier l'opportunité"
        description={opp.objet}
      />
      <div className="max-w-3xl">
        <OpportuniteForm opportunite={opp} />
      </div>
    </div>
  )
}
