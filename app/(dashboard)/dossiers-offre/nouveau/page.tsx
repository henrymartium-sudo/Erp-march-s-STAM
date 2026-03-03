import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { DossierForm } from '@/components/dossiers-offre/dossier-form'
import { requireAuth, canWrite } from '@/lib/utils/permissions'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ marcheId?: string; opportuniteId?: string }>
}

export default async function NouveauDossierPage({ searchParams }: PageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  if (!canWrite(role)) {
    redirect('/dossiers-offre')
  }

  const params = await searchParams

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dossiers d'offre", href: '/dossiers-offre' },
          { label: 'Nouveau dossier' },
        ]}
      />
      <PageHeader
        title="Nouveau dossier d'offre"
        description="Créer un dossier de montage d'offre avec checklist de pièces"
      />
      <div className="max-w-2xl">
        <DossierForm
          defaultMarcheId={params.marcheId}
          defaultOpportuniteId={params.opportuniteId}
        />
      </div>
    </div>
  )
}
