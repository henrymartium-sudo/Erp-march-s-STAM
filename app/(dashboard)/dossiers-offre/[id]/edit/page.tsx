import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { DossierForm } from '@/components/dossiers-offre/dossier-form'
import { getDossierOffre } from '@/lib/actions/dossiers-offre'
import { requireAuth, canWrite } from '@/lib/utils/permissions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditDossierPage({ params }: PageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  if (!canWrite(role)) {
    redirect('/dossiers-offre')
  }

  const { id } = await params
  const result = await getDossierOffre(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const dossier = result.data

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dossiers d'offre", href: '/dossiers-offre' },
          { label: dossier.titre, href: `/dossiers-offre/${id}` },
          { label: 'Modifier' },
        ]}
      />
      <PageHeader
        title="Modifier le dossier"
        description={dossier.titre}
      />
      <div className="max-w-2xl">
        <DossierForm dossier={dossier} />
      </div>
    </div>
  )
}
