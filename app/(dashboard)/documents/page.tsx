import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PageHeader } from '@/components/shared/page-header'
import { RetryButton } from '@/components/shared/retry-button'
import { DataPagination } from '@/components/ui/data-pagination'
import { AlertCircle, Plus } from 'lucide-react'
import { requireAuth, canWrite, canExport } from '@/lib/utils/permissions'
import { getAllDocuments } from '@/lib/actions/documents'
import { shouldShowPagination } from '@/lib/utils/pagination'
import { lireTri } from '@/lib/utils/documents-tri'
import { DocumentsContent } from './_components/documents-content'
import { ExportMenu } from '@/components/exports'
import type { TypeDocument, PhaseMarche } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface DocumentsPageProps {
  searchParams: Promise<{
    type?: string
    phase?: string
    marcheId?: string
    search?: string
    page?: string
    tri?: string
    sens?: string
  }>
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  // Vérifier l'authentification + permissions
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)
  const userCanExport = canExport(role)

  // Await searchParams (Next.js 15)
  const params = await searchParams

  // Parse page number
  const currentPage = Number(params.page) || 1

  // Tri : valeurs de l'URL validées contre une liste fermée (repli sur le défaut)
  const { tri, sens } = lireTri(params.tri, params.sens)

  // Récupérer les documents avec filtres et pagination
  const result = await getAllDocuments({
    type: params.type as TypeDocument | undefined,
    phase: params.phase as PhaseMarche | undefined,
    marcheId: params.marcheId,
    search: params.search,
    page: currentPage,
    tri,
    sens,
  })

  // Gérer les erreurs
  if (!result.success) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Documents & Médias"
          description="Gérez tous vos documents liés aux marchés publics"
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Chargement impossible</AlertTitle>
          <AlertDescription>
            <p>{result.error}</p>
            <p className="mt-1">
              Réessayez dans un instant. Si le problème persiste, contactez un administrateur ou{' '}
              <Link href="/" className="underline underline-offset-2">
                revenez au tableau de bord
              </Link>
              .
            </p>
          </AlertDescription>
        </Alert>
        <RetryButton />
      </div>
    )
  }

  const { data: documents, pagination } = result.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Documents & Médias"
        description="Gérez tous vos documents liés aux marchés publics"
        count={pagination.totalItems}
        action={
          <>
            {userCanExport && (
              <ExportMenu
                type="documents"
                filters={{
                  type: params.type,
                  phase: params.phase,
                  search: params.search,
                }}
              />
            )}
            {userCanWrite && (
              <Button asChild>
                <Link href="/documents/upload">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau document
                </Link>
              </Button>
            )}
          </>
        }
      />

      {/* Contenu */}
      <DocumentsContent documents={documents} canWrite={userCanWrite} tri={tri} sens={sens} />

      {/* Pagination */}
      {shouldShowPagination(pagination.totalItems) && (
        <DataPagination pagination={pagination} />
      )}
    </div>
  )
}
