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
import { toast } from '@/lib/utils/toast'
import { detacherCautionMarche, detacherCautionOpportunite } from '@/lib/actions/cautions'
import type { SerializedCaution } from '@/types/serialized'

const LIBELLES = {
  opportunite: { de: 'cette opportunité', action: detacherCautionOpportunite },
  marche: { de: 'ce marché', action: detacherCautionMarche },
} as const

/**
 * Bouton « Détacher » avec confirmation : la caution redevient sans lien, elle n'est pas supprimée.
 * `onDone` recharge la liste quand le parent charge lui-même ses données (par défaut : rafraîchit la page).
 */
export function DetacherCautionButton({
  caution,
  cible,
  onDone,
}: {
  caution: SerializedCaution
  cible: keyof typeof LIBELLES
  onDone?: () => void
}) {
  const router = useRouter()
  const [enCours, setEnCours] = useState(false)
  const { de, action } = LIBELLES[cible]

  async function detacher() {
    setEnCours(true)
    const resultat = await action(caution.id)
    setEnCours(false)
    if (!resultat.success) {
      toast.error('Erreur', { description: resultat.error })
      return
    }
    toast.success('Caution détachée', { description: `La caution n'est plus rattachée à ${de}.` })
    if (onDone) onDone()
    else router.refresh()
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
            La caution « {caution.reference} » ne sera plus rattachée à {de}. Elle n&apos;est pas supprimée :
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
