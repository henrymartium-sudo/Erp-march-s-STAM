import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataPagination } from '@/components/ui/data-pagination'
import { Plus, FileText } from 'lucide-react'
import { requireAuth } from '@/lib/utils/permissions'
import { getAllDocuments } from '@/lib/actions/documents'
import { shouldShowPagination } from '@/lib/utils/pagination'
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
  }>
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  // Vérifier l'authentification
  await requireAuth()

  // Await searchParams (Next.js 15)
  const params = await searchParams

  // Parse page number
  const currentPage = Number(params.page) || 1

  // Récupérer les documents avec filtres et pagination
  const result = await getAllDocuments({
    type: params.type as TypeDocument | undefined,
    phase: params.phase as PhaseMarche | undefined,
    marcheId: params.marcheId,
    search: params.search,
    page: currentPage,
  })

  // Gérer les erreurs
  if (!result.success) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur</CardTitle>
            <CardDescription>
              Impossible de charger les documents : {result.error}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { data: documents, pagination } = result.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Documents & Médias
          </h1>
          <p className="text-muted-foreground mt-2">
            Gérez tous vos documents liés aux marchés publics
          </p>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            type="documents"
            filters={{
              type: params.type,
              phase: params.phase,
              search: params.search,
            }}
          />
          <Link href="/documents/upload">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Nouveau document
            </Button>
          </Link>
        </div>
      </div>

      {/* Contenu */}
      <DocumentsContent documents={documents} />

      {/* Pagination */}
      {shouldShowPagination(pagination.totalItems) && (
        <DataPagination pagination={pagination} />
      )}
    </div>
  )
}
