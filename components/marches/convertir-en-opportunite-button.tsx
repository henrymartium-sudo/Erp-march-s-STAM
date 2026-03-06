'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ArrowRight } from 'lucide-react'
import { convertirMarcheEnOpportunite } from '@/lib/actions/convertir-marche-en-opportunite'
import { toast } from '@/lib/utils/toast'

interface Props {
  marcheId: string
}

export function ConvertirEnOpportuniteButton({ marcheId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleConvert() {
    setLoading(true)
    const result = await convertirMarcheEnOpportunite(marcheId)
    setLoading(false)

    if (result.success) {
      toast.success('Opportunité créée et liée à ce marché')
      router.push(`/opportunites/${result.data.opportuniteId}`)
    } else {
      toast.error(result.error ?? 'Erreur lors de la conversion')
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowRight className="h-4 w-4 mr-1.5" />
          Convertir en opportunité
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convertir en opportunité ?</AlertDialogTitle>
          <AlertDialogDescription>
            Une opportunité en statut &quot;En analyse&quot; sera créée et liée à ce marché.
            Le marché et toutes ses données (cautions, documents, véhicules) restent intacts.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleConvert} disabled={loading}>
            {loading ? 'Conversion...' : 'Confirmer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
