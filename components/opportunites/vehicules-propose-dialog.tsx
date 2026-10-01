'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Car, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/utils/toast'
import { setVehiculesProposes, listerSuggestionsVehicules } from '@/lib/actions/vehicules-proposes'
import { vehiculeProposeSchema } from '@/lib/validations/vehicule-propose'
import { calculerMontantVehicules, totalLigneVehicule } from '@/lib/utils/lots'
import { normalizeText } from '@/lib/utils/search'
import type { SuggestionVehicule } from '@/lib/utils/vehicules-proposes'
import type { SerializedVehiculePropose } from '@/lib/utils/serialize'

const formSchema = z.object({ vehicules: z.array(vehiculeProposeSchema).max(20, '20 véhicules au plus par lot') })
type FormInput = z.input<typeof formSchema>
type FormOutput = z.output<typeof formSchema>

const LIGNE_VIDE = { marque: '', modele: '', quantite: 1, prixUnitaire: '' } as const

function formatMontant(val: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(val)
}

interface VehiculesProposeDialogProps {
  lotId: string
  numeroLot: number
  vehicules: SerializedVehiculePropose[]
}

export function VehiculesProposeDialog({ lotId, numeroLot, vehicules }: VehiculesProposeDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionVehicule[]>([])

  function valeursInitiales(): FormInput {
    return {
      vehicules: vehicules.length > 0
        ? vehicules.map((v) => ({ marque: v.marque, modele: v.modele, quantite: v.quantite, prixUnitaire: v.prixUnitaire }))
        : [{ ...LIGNE_VIDE }],
    }
  }

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: valeursInitiales(),
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'vehicules' })
  const lignes = form.watch('vehicules')

  const montantTotal = calculerMontantVehicules(
    (lignes ?? [])
      .map((l) => ({ quantite: Number(l.quantite), prixUnitaire: Number(l.prixUnitaire) }))
      .filter((l) => Number.isFinite(l.quantite) && Number.isFinite(l.prixUnitaire) && String(l.prixUnitaire) !== '')
  )

  function handleOpenChange(v: boolean) {
    if (v) {
      form.reset(valeursInitiales())
      // Les suggestions se chargent en arrière-plan : le dialogue s'ouvre sans attendre l'action serveur.
      listerSuggestionsVehicules()
        .then((res) => { if (res.success && res.data) setSuggestions(res.data) })
        .catch(() => {})
    }
    setOpen(v)
  }

  const marques = Array.from(new Map(suggestions.map((s) => [normalizeText(s.marque), s.marque])).values())

  function modelesDe(marque: string) {
    const cle = normalizeText(marque ?? '')
    return suggestions.filter((s) => normalizeText(s.marque) === cle)
  }

  // Un modèle déjà connu pré-remplit le dernier prix utilisé, sans écraser un prix déjà saisi.
  function surChangementModele(index: number, modele: string) {
    const connu = modelesDe(form.getValues(`vehicules.${index}.marque`)).find((s) => normalizeText(s.modele) === normalizeText(modele))
    const prix = form.getValues(`vehicules.${index}.prixUnitaire`)
    if (connu && (prix === '' || prix == null)) form.setValue(`vehicules.${index}.prixUnitaire`, connu.prixUnitaire)
  }

  async function onSubmit(values: FormOutput) {
    setLoading(true)
    try {
      const result = await setVehiculesProposes({ lotId, vehicules: values.vehicules })
      if (result.success) {
        toast.success(values.vehicules.length > 0 ? 'Véhicules proposés enregistrés' : 'Véhicules proposés supprimés')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Erreur lors de l’enregistrement des véhicules proposés')
      }
    } finally {
      setLoading(false)
    }
  }

  // Enregistrer une liste vide supprime les véhicules : la ligne vide initiale est donc ignorée à l'envoi.
  async function enregistrer() {
    const saisies = form.getValues('vehicules')
    const toutesVides = saisies.every((l) => !l.marque && !l.modele && (l.prixUnitaire === '' || l.prixUnitaire == null))
    if (toutesVides) {
      await onSubmit({ vehicules: [] })
      return
    }
    await form.handleSubmit(onSubmit)()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Véhicules proposés du lot ${numeroLot}`}>
          <Car className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Véhicules proposés — Lot {numeroLot}</DialogTitle>
          <DialogDescription>
            Le montant proposé du lot est la somme des totaux de lignes. Les marques et modèles déjà saisis sont suggérés.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form noValidate onSubmit={(e) => { e.preventDefault(); void enregistrer() }} className="space-y-4">
            <div className="space-y-3">
              {fields.map((field, index) => {
                const l = lignes?.[index]
                const total = l && Number.isFinite(Number(l.quantite)) && l.prixUnitaire !== '' && Number.isFinite(Number(l.prixUnitaire))
                  ? totalLigneVehicule({ quantite: Number(l.quantite), prixUnitaire: Number(l.prixUnitaire) })
                  : null
                return (
                  <div key={field.id} className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-12 sm:items-start">
                    <FormField control={form.control} name={`vehicules.${index}.marque`} render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Marque *</FormLabel>
                        <FormControl><Input list="vehicules-marques" autoComplete="off" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`vehicules.${index}.modele`} render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Modèle *</FormLabel>
                        <FormControl>
                          <Input
                            list={`vehicules-modeles-${index}`}
                            autoComplete="off"
                            {...field}
                            onChange={(e) => { field.onChange(e); surChangementModele(index, e.target.value) }}
                          />
                        </FormControl>
                        <datalist id={`vehicules-modeles-${index}`}>
                          {modelesDe(l?.marque ?? '').map((s) => <option key={s.modele} value={s.modele} />)}
                        </datalist>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`vehicules.${index}.quantite`} render={({ field }) => (
                      <FormItem className="sm:col-span-1">
                        <FormLabel>Qté *</FormLabel>
                        <FormControl><Input type="number" min={1} {...field} value={(field.value ?? '') as string | number} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`vehicules.${index}.prixUnitaire`} render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Prix unitaire (XOF) *</FormLabel>
                        <FormControl><Input type="number" min={0} {...field} value={(field.value ?? '') as string | number} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex items-end justify-between gap-2 sm:col-span-2 sm:flex-col sm:items-end">
                      <p className="text-sm tabular-nums text-muted-foreground" aria-label={`Total de la ligne ${index + 1}`}>
                        {total !== null ? formatMontant(total) : '—'}
                      </p>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label={`Retirer la ligne ${index + 1}`}>
                        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              <datalist id="vehicules-marques">
                {marques.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={() => append({ ...LIGNE_VIDE })} disabled={fields.length >= 20}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Ajouter un véhicule
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <p className="text-sm font-medium">
                Montant proposé du lot : <span className="tabular-nums">{montantTotal !== null ? formatMontant(montantTotal) : '—'}</span>
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
