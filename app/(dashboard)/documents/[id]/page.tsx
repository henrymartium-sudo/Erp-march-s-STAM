import { notFound } from 'next/navigation'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { getDocumentById, getDocumentVersions } from '@/lib/actions/documents'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { PageHeader } from '@/components/shared/page-header'
import { DocumentDetailContent } from './_components/document-detail-content'

/**
 * Page de détail d'un document
 */
export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Vérifier l'authentification
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role

  // Await params (Next.js 15 requirement)
  const { id } = await params

  // Récupérer le document
  const result = await getDocumentById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const document = result.data

  // Historique de la chaîne (parent compris), depuis n'importe quelle version
  const versions = await getDocumentVersions(id)
  const nbVersions = versions.success ? versions.data.length : 1

  return (
    <div className="space-y-5 max-w-5xl">
      <BreadcrumbNav
        showHome
        items={[
          { label: 'Documents', href: '/documents' },
          { label: document.nom },
        ]}
      />
      <PageHeader
        title={document.nom}
        description={document.nomOriginal}
      />

      {/* Contenu avec actions */}
      <DocumentDetailContent
        document={document}
        nbVersions={nbVersions}
        peutEcrire={canWrite(role)}
      />
    </div>
  )
}
