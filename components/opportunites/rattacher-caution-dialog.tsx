'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { CautionBadge } from '@/components/cautions/caution-badge'
import { toast } from '@/lib/utils/toast'
import { formatMontant } from '@/lib/utils/format'
import { formatDateCourte } from '@/lib/utils/caution'
import {
  getCautionsRattachablesOpportunite,
  rattacherCautionOpportunite,
} from '@/lib/actions/cautions'
import type { SerializedCaution } from '@/types/serialized'

/** Rattache à l'opportunité une caution déjà créée dans le module et encore sans lien. */
export function RattacherCautionDialog({ opportuniteId }: { opportuniteId: string }) {
  const router = useRouter()
  const [ouvert, setOuvert] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [cautions, setCautions] = useState<SerializedCaution[]>([])
  const [enCours, setEnCours] = useState<string | null>(null)

  async function ouvrir(valeur: boolean) {
    setOuvert(valeur)
    if (!valeur) return
    setChargement(true)
    setErreur(null)
    const resultat = await getCautionsRattachablesOpportunite()
    setChargement(false)
    if (!resultat.success) {
      setErreur(resultat.error ?? 'Impossible de charger les cautions disponibles')
      return
    }
    setCautions(resultat.data)
  }

  async function rattacher(cautionId: string) {
    setEnCours(cautionId)
    const resultat = await rattacherCautionOpportunite(cautionId, opportuniteId)
    setEnCours(null)
    if (!resultat.success) {
      toast.error('Erreur', { description: resultat.error })
      return
    }
    toast.success('Caution rattachée', { description: 'La caution est maintenant rattachée à cette opportunité.' })
    setOuvert(false)
    router.refresh()
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => ouvrir(true)}>
        <Link2 className="h-4 w-4 mr-2" aria-hidden="true" />
        Rattacher
      </Button>
      <Dialog open={ouvert} onOpenChange={ouvrir}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rattacher une caution existante</DialogTitle>
            <DialogDescription>
              Cautions de soumission ou de capacité financière qui ne sont encore rattachées ni à une opportunité ni à un marché.
            </DialogDescription>
          </DialogHeader>

          {chargement && (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {!chargement && erreur && (
            <p role="alert" className="text-sm text-destructive">{erreur}</p>
          )}

          {!chargement && !erreur && cautions.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucune caution disponible à rattacher. Créez-en une avec le bouton « Créer ».
            </p>
          )}

          {!chargement && !erreur && cautions.length > 0 && (
            <ul className="space-y-3">
              {cautions.map((caution) => (
                <li
                  key={caution.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CautionBadge variant="type" value={caution.type} size="sm" />
                      <CautionBadge variant="statut" value={caution.statut} size="sm" />
                    </div>
                    <p className="truncate font-medium" title={caution.reference}>{caution.reference}</p>
                    <p className="text-sm text-muted-foreground">
                      {caution.banqueNom} • {formatMontant(caution.montant)} • échéance {formatDateCourte(caution.dateEcheance)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => rattacher(caution.id)}
                    disabled={enCours !== null}
                    aria-label={`Rattacher la caution ${caution.reference}`}
                  >
                    {enCours === caution.id ? 'Rattachement…' : 'Rattacher'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
