'use client'

import { useRouter } from 'next/navigation'
import { DocumentUpload } from '@/components/documents'

interface DocumentUploadContentProps {
  marcheId?: string
}

/**
 * Contenu client de la page d'upload
 */
export function DocumentUploadContent({ marcheId }: DocumentUploadContentProps) {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/documents')
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <DocumentUpload
      marcheId={marcheId}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  )
}
