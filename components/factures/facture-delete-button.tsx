'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { Button } from '@/components/ui/button'
import { deleteFacture } from '@/lib/actions/factures'
import { toast } from '@/lib/utils/toast'
import { Trash2 } from 'lucide-react'

interface FactureDeleteButtonProps {
  factureId: string
  factureNumero: string
}

export function FactureDeleteButton({ factureId, factureNumero }: FactureDeleteButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteFacture(factureId)
      if (result.success) {
        toast.success(`Facture ${factureNumero} supprimée`)
        router.push('/factures')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Erreur lors de la suppression')
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer la facture ?</AlertDialogTitle>
          <AlertDialogDescription>
            La facture <strong>{factureNumero}</strong> sera définitivement supprimée.
            Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending ? 'Suppression…' : 'Supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
