'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createFacture, updateFacture } from '@/lib/actions/factures'
import { formFactureSchema, STATUT_FACTURE_LABELS, type FormFactureInput } from '@/lib/validations/facture'
import { toast } from '@/lib/utils/toast'
import type { FactureWithMarche } from '@/lib/actions/factures'
import type { Marche } from '@prisma/client'

interface FactureFormProps {
  marches: Pick<Marche, 'id' | 'numero' | 'objet'>[]
  facture?: FactureWithMarche
  defaultMarcheId?: string
}

type FormValues = FormFactureInput

export function FactureForm({ marches, facture, defaultMarcheId }: FactureFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!facture

  const form = useForm<FormValues>({
    resolver: zodResolver(formFactureSchema),
    defaultValues: {
      numero:       facture?.numero ?? '',
      marcheId:     facture?.marcheId ?? defaultMarcheId ?? '',
      montantHT:    facture ? Number(facture.montantHT) : undefined,
      tva:          facture ? Number(facture.tva) : 18,
      montantTTC:   facture ? Number(facture.montantTTC) : undefined,
      statut:       (facture?.statut ?? 'BROUILLON') as FormValues['statut'],
      dateEmission: facture?.dateEmission ?? null,
      dateEcheance: facture?.dateEcheance ?? null,
      datePaiement: facture?.datePaiement ?? null,
      reference:    facture?.reference ?? '',
      notes:        facture?.notes ?? '',
    },
  })

  // Calcul automatique du montant TTC
  const montantHT = form.watch('montantHT')
  const tva = form.watch('tva')

  useEffect(() => {
    if (montantHT && tva !== undefined) {
      const ttc = Number(montantHT) * (1 + Number(tva) / 100)
      form.setValue('montantTTC', Math.round(ttc * 100) / 100, { shouldValidate: false })
    }
  }, [montantHT, tva, form])

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      const result = isEditing
        ? await updateFacture(facture!.id, values)
        : await createFacture(values)

      if (result.success) {
        toast.success(isEditing ? 'Facture modifiée' : 'Facture créée')
        router.push(isEditing ? `/factures/${facture!.id}` : '/factures')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Une erreur est survenue')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDateForInput = (date: Date | null | undefined): string => {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0] as string
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Informations de base */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 space-y-4">
          <h3 className="font-semibold text-base">Informations de base</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Numéro */}
            <FormField
              control={form.control}
              name="numero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de facture *</FormLabel>
                  <FormControl>
                    <Input placeholder="FAC-2025-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Référence */}
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Référence bon de commande</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="BC-2025-xxx"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Marché */}
          <FormField
            control={form.control}
            name="marcheId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marché associé *</FormLabel>
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={!!defaultMarcheId && !isEditing}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un marché" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {marches.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.numero} — {m.objet.slice(0, 60)}{m.objet.length > 60 ? '…' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Statut */}
          <FormField
            control={form.control}
            name="statut"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Statut</FormLabel>
                <Select value={field.value || 'BROUILLON'} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(STATUT_FACTURE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Montants */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 space-y-4">
          <h3 className="font-semibold text-base">Montants</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="montantHT"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant HT (FCFA) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tva"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TVA (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      {...field}
                      value={field.value ?? 18}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="montantTTC"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant TTC (FCFA) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Calculé automatiquement"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 space-y-4">
          <h3 className="font-semibold text-base">Dates</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="dateEmission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d'émission</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={formatDateForInput(field.value)}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateEcheance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d'échéance</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={formatDateForInput(field.value)}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="datePaiement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de paiement</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={formatDateForInput(field.value)}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 space-y-4">
          <h3 className="font-semibold text-base">Notes</h3>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Notes ou commentaires sur cette facture..."
                    className="min-h-[100px]"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement…' : isEditing ? 'Modifier la facture' : 'Créer la facture'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
