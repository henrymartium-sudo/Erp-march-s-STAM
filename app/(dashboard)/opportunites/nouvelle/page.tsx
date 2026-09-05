import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { OpportuniteForm } from '@/components/opportunites/opportunite-form'
import { requireAuth, canWrite } from '@/lib/utils/permissions'

export const dynamic = 'force-dynamic'

export default async function NouvelleOpportunitePage() {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  if (!canWrite(role)) {
    redirect('/opportunites')
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        showHome
        items={[
          { label: 'Opportunités', href: '/opportunites' },
          { label: 'Nouvelle opportunité' },
        ]}
      />
      <PageHeader
        title="Nouvelle opportunité"
        description="Enregistrer une nouvelle opportunité de marché public"
      />
      <div className="max-w-3xl">
        <OpportuniteForm />
      </div>
    </div>
  )
}
