'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { createMarcheFromOpportunite } from '@/lib/actions/opportunites'
import { formatMontant } from '@/lib/utils/format'
import { toast } from '@/lib/utils/toast'

export interface LotLibre {
  id: string
  numero: number
  intitule: string
  montantPropose: number | null
}

interface CreerMarcheDialogProps {
  opportuniteId: string
  /** Lots gagnés pas encore rattachés à un marché. */
  lotsLibres: LotLibre[]
  /** Appelé avec l'identifiant du marché créé. */
  onCreated: (marcheId: string) => void
}

export function CreerMarcheDialog({ opportuniteId, lotsLibres, onCreated }: CreerMarcheDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selection, setSelection] = useState<Set<string>>(new Set())

  // Tout est coché à chaque ouverture : le cas courant est un seul marché pour tous les lots libres.
  function handleOpenChange(v: boolean) {
    if (loading) return
    if (v) setSelection(new Set(lotsLibres.map((l) => l.id)))
    setOpen(v)
  }

  function basculer(id: string, coche: boolean) {
    setSelection((prev) => {
      const suivant = new Set(prev)
      if (coche) suivant.add(id)
      else suivant.delete(id)
      return suivant
    })
  }

  const total = lotsLibres
    .filter((l) => selection.has(l.id))
    .reduce((somme, l) => somme + (l.montantPropose ?? 0), 0)

  async function handleCreate() {
    if (loading || selection.size === 0) return
    setLoading(true)
    const result = await createMarcheFromOpportunite(opportuniteId, [...selection])
    if (result.success) {
      toast.success('Marché créé avec succès')
      onCreated(result.data.marcheId)
      return
    }
    setLoading(false)
    toast.error(result.error ?? 'Erreur lors de la création du marché')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Créer le marché
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer le marché</DialogTitle>
          <DialogDescription>
            Choisissez les lots gagnés que ce marché couvre. Les autres restent libres pour un autre marché.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
          {lotsLibres.map((lot) => {
            const idCase = `lot-marche-${lot.id}`
            return (
              <li key={lot.id} className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox
                  id={idCase}
                  checked={selection.has(lot.id)}
                  onCheckedChange={(v) => basculer(lot.id, v === true)}
                  className="mt-0.5"
                />
                <label htmlFor={idCase} className="flex-1 min-w-0 cursor-pointer text-sm">
                  <span className="font-medium">Lot {lot.numero}</span>
                  <span className="block text-muted-foreground break-words">{lot.intitule}</span>
                  <span className="block">{lot.montantPropose != null ? formatMontant(lot.montantPropose) : 'Montant non renseigné'}</span>
                </label>
              </li>
            )
          })}
        </ul>

        <div className="flex justify-between text-sm font-semibold">
          <span>Total du marché</span>
          <span>{formatMontant(total)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={loading || selection.size === 0}>
            {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Créer le marché
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
