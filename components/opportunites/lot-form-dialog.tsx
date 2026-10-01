'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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
import { createLot, updateLot, deleteLot } from '@/lib/actions/lots'
import { lotSchema } from '@/lib/validations/lot'

const formSchema = lotSchema.omit({ opportuniteId: true })
type FormInput = z.input<typeof formSchema>
type FormOutput = z.output<typeof formSchema>

interface LotFormDialogProps {
  opportuniteId: string
  lot?: {
    id: string
    numero: number
    intitule: string
    montantEstime: number | null
    montantPropose: number | null
  }
  /** Numéro proposé à la création (ignoré en modification). */
  numeroParDefaut?: number
}

export function LotFormDialog({ opportuniteId, lot, numeroParDefaut = 1 }: LotFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const isEdition = !!lot

  // `defaultValues` n'est lu qu'au montage alors que la fiche est rafraîchie après chaque
  // enregistrement : le formulaire est donc ré-initialisé depuis les props à chaque ouverture.
  function valeursInitiales(): FormInput {
    return {
      numero: lot?.numero ?? numeroParDefaut,
      intitule: lot?.intitule ?? '',
      montantEstime: lot?.montantEstime ?? null,
      montantPropose: lot?.montantPropose ?? null,
    }
  }

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: valeursInitiales(),
  })

  function handleOpenChange(v: boolean) {
    if (v) form.reset(valeursInitiales())
    setOpen(v)
  }

  async function onSubmit(values: FormOutput) {
    setLoading(true)
    try {
      const result = isEdition
        ? await updateLot(lot!.id, values)
        : await createLot({ ...values, opportuniteId })
      if (result.success) {
        toast.success(isEdition ? 'Lot modifié' : 'Lot créé')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Erreur lors de l’enregistrement du lot')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!lot) return
    setLoading(true)
    try {
      const result = await deleteLot(lot.id)
      if (result.success) {
        toast.success('Lot supprimé')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Erreur lors de la suppression du lot')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEdition ? (
          <Button variant="ghost" size="icon" aria-label={`Modifier le lot ${lot!.numero}`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Ajouter un lot
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdition ? `Modifier le lot ${lot!.numero}` : 'Nouveau lot'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="numero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro *</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} value={(field.value ?? '') as string | number} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="intitule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intitulé *</FormLabel>
                  <FormControl>
                    <Input placeholder="Fourniture de véhicules utilitaires" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="montantEstime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant estimé (XOF)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={(field.value ?? '') as string | number}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="montantPropose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant proposé (XOF)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={(field.value ?? '') as string | number}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between pt-2">
              {isEdition ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={loading}>
                      <Trash2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer le lot {lot!.numero}</AlertDialogTitle>
                      <AlertDialogDescription>
                        Supprimer ce lot supprime aussi son dossier et ses pièces. Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : <span />}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Enregistrement...' : isEdition ? 'Enregistrer' : 'Créer'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
