'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Unlink } from 'lucide-react'
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
import { CautionCard } from '@/components/cautions/caution-card'
import { toast } from '@/lib/utils/toast'
import { detacherCautionOpportunite } from '@/lib/actions/cautions'
import type { SerializedCaution } from '@/types/serialized'

/** Bouton « Détacher » avec confirmation : la caution redevient sans lien, elle n'est pas supprimée. */
function DetacherCautionButton({ caution }: { caution: SerializedCaution }) {
  const router = useRouter()
  const [enCours, setEnCours] = useState(false)

  async function detacher() {
    setEnCours(true)
    const resultat = await detacherCautionOpportunite(caution.id)
    setEnCours(false)
    if (!resultat.success) {
      toast.error('Erreur', { description: resultat.error })
      return
    }
    toast.success('Caution détachée', { description: 'La caution n\'est plus rattachée à cette opportunité.' })
    router.refresh()
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
          <Unlink className="h-4 w-4 mr-2" aria-hidden="true" />
          Détacher
          <span className="sr-only"> la caution {caution.reference}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Détacher la caution</AlertDialogTitle>
          <AlertDialogDescription>
            La caution « {caution.reference} » ne sera plus rattachée à cette opportunité. Elle n&apos;est pas supprimée :
            elle reste dans le module « Cautions &amp; Garanties » et pourra être rattachée ailleurs.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={detacher} disabled={enCours}>
            {enCours ? 'Détachement…' : 'Détacher'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Cartes des cautions d'une opportunité ; « Modifier » et « Détacher » n'existent que pour les rôles qui peuvent écrire. */
export function CautionsListe({
  cautions,
  canWrite,
}: {
  cautions: SerializedCaution[]
  canWrite: boolean
}) {
  const router = useRouter()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cautions.map((caution) => (
        <div key={caution.id} className="space-y-1">
          <CautionCard
            caution={caution}
            mode="compact"
            onEdit={canWrite ? (id) => router.push(`/cautions/${id}/edit`) : undefined}
          />
          {canWrite && <DetacherCautionButton caution={caution} />}
        </div>
      ))}
    </div>
  )
}
