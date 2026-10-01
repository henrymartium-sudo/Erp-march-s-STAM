'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ResultatLot } from '@prisma/client'
import { Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/lib/utils/toast'
import { setResultatLot } from '@/lib/actions/lots'
import { formResultatLotSchema, RESULTAT_LOT_LABELS } from '@/lib/validations/lot'
import { STATUT_OPPORTUNITE_LABELS } from '@/lib/validations/opportunite'

type FormInput = z.input<typeof formResultatLotSchema>
type FormOutput = z.output<typeof formResultatLotSchema>

const RESULTATS: ResultatLot[] = ['EN_COURS', 'ATTRIBUE_PROVISOIREMENT', 'GAGNE', 'PERDU', 'INFRUCTUEUX']

interface LotResultatDialogProps {
  lotId: string
  numeroLot: number
  resultatActuel: ResultatLot
  /** Détails d'une perte déjà enregistrée, pré-remplis quand le lot est PERDU. */
  motifPerte?: string | null
  concurrentGagnant?: string | null
  montantOffreConcurrent?: number | null
}

export function LotResultatDialog({
  lotId,
  numeroLot,
  resultatActuel,
  motifPerte = null,
  concurrentGagnant = null,
  montantOffreConcurrent = null,
}: LotResultatDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // `defaultValues` n'est lu qu'au montage alors que la fiche est rafraîchie après chaque
  // enregistrement : le formulaire est donc ré-initialisé depuis les props à chaque ouverture,
  // sinon un résultat déjà saisi serait ré-écrasé par les valeurs du premier rendu.
  function valeursInitiales(): FormInput {
    const perdu = resultatActuel === 'PERDU'
    return {
      resultat: resultatActuel,
      motifPerte: perdu ? motifPerte : null,
      concurrentGagnant: perdu ? concurrentGagnant : null,
      montantOffreConcurrent: perdu ? montantOffreConcurrent : null,
    }
  }

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formResultatLotSchema),
    defaultValues: valeursInitiales(),
  })

  function handleOpenChange(v: boolean) {
    if (v) form.reset(valeursInitiales())
    setOpen(v)
  }

  const resultat = form.watch('resultat')
  const isPerdu = resultat === 'PERDU'

  async function onSubmit(values: FormOutput) {
    setLoading(true)
    try {
      const result = await setResultatLot({ ...values, lotId })
      if (result.success) {
        toast.success(`Résultat enregistré — opportunité : ${STATUT_OPPORTUNITE_LABELS[result.data.statutOpportunite]}`)
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Erreur lors de la saisie du résultat')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Saisir le résultat du lot ${numeroLot}`}>
          <Trophy className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Résultat — Lot {numeroLot}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="resultat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Résultat *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un résultat" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RESULTATS.map((r) => (
                        <SelectItem key={r} value={r}>{RESULTAT_LOT_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isPerdu && (
              <div className="space-y-3 border rounded-md p-3 bg-muted/30">
                <FormField
                  control={form.control}
                  name="motifPerte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motif de la perte *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Prix trop élevé, délai non respecté..."
                          rows={3}
                          {...field}
                          value={(field.value ?? '') as string | number}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="concurrentGagnant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Concurrent retenu</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom de l'entreprise gagnante" {...field} value={(field.value ?? '') as string | number} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="montantOffreConcurrent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant de l&apos;offre concurrente (XOF)</FormLabel>
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
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
