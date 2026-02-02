import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { requireAuth } from '@/lib/utils/permissions'
import { getDocumentById } from '@/lib/actions/documents'
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
  await requireAuth()

  // Await params (Next.js 15 requirement)
  const { id } = await params

  // Récupérer le document
  const result = await getDocumentById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const document = result.data

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header avec bouton retour */}
      <div className="flex items-center gap-4">
        <Link href="/documents">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {document.nom}
          </h1>
          <p className="text-muted-foreground mt-1">
            {document.nomOriginal}
          </p>
        </div>
      </div>

      {/* Contenu avec actions */}
      <DocumentDetailContent document={document} />
    </div>
  )
}
