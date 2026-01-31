'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deleteMarche } from '@/lib/actions/marches'
import { Loader2, Trash2 } from 'lucide-react'

interface DeleteMarcheDialogProps {
  marcheId: string
  marcheNumero: string
  marcheObjet: string
  onDelete?: () => void
}

export function DeleteMarcheDialog({
  marcheId,
  marcheNumero,
  marcheObjet,
  onDelete,
}: DeleteMarcheDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)

    startTransition(async () => {
      try {
        const result = await deleteMarche(marcheId)

        if (result.success) {
          setOpen(false)

          if (onDelete) {
            onDelete()
          } else {
            // Redirection par défaut vers la liste des marchés
            router.push('/marches')
            router.refresh()
          }
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError('Une erreur inattendue est survenue')
        console.error(err)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer la suppression</DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Le marché sera définitivement supprimé.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div>
              <span className="text-sm font-medium">Numéro : </span>
              <span className="text-sm">{marcheNumero}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Objet : </span>
              <span className="text-sm">{marcheObjet}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-800 bg-red-100 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
