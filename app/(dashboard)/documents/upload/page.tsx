import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { requireMarcheWrite } from '@/lib/utils/permissions'
import { DocumentUploadContent } from './_components/document-upload-content'

/**
 * Page d'upload de documents
 */
export default async function DocumentUploadPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Vérifier les permissions (ADMIN ou AVANCE)
  await requireMarcheWrite()

  const marcheId = typeof searchParams.marcheId === 'string' ? searchParams.marcheId : undefined

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header avec bouton retour */}
      <div className="flex items-center gap-4">
        <Link href="/documents">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Uploader un document
          </h1>
          <p className="text-muted-foreground mt-1">
            Ajoutez un nouveau document à votre bibliothèque
          </p>
        </div>
      </div>

      {/* Formulaire d'upload */}
      <DocumentUploadContent marcheId={marcheId} />
    </div>
  )
}
