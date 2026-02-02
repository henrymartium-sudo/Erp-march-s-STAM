import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'
import { requireAuth } from '@/lib/utils/permissions'
import { DocumentsContent } from './_components/documents-content'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Page de liste des documents
 */
export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Vérifier l'authentification
  await requireAuth()

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
        <Link href="/documents/upload">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nouveau document
          </Button>
        </Link>
      </div>

      {/* Contenu avec Suspense */}
      <Suspense fallback={<DocumentsPageSkeleton />}>
        <DocumentsContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

/**
 * Skeleton de chargement
 */
function DocumentsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filtres skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="border rounded-lg p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}
