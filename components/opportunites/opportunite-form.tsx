'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/utils/toast'
import {
  formOpportuniteSchema,
  FormOpportuniteInput,
  STATUT_OPPORTUNITE_LABELS,
} from '@/lib/validations/opportunite'
import { createOpportunite, updateOpportunite } from '@/lib/actions/opportunites'
import type { Opportunite } from '@prisma/client'

interface OpportuniteFormProps {
  opportunite?: Opportunite
}

const STATUTS = [
  'IDENTIFIEE', 'EN_ANALYSE', 'GO', 'NO_GO', 'SOUMISE', 'GAGNEE', 'PERDUE',
] as const

export function OpportuniteForm({ opportunite }: OpportuniteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEditing = !!opportunite

  const form = useForm<FormOpportuniteInput>({
    resolver: zodResolver(formOpportuniteSchema),
    defaultValues: {
      reference:            opportunite?.reference ?? '',
      objet:                opportunite?.objet ?? '',
      autoriteContractante: opportunite?.autoriteContractante ?? '',
      montantEstime:        opportunite?.montantEstime
                              ? parseFloat(opportunite.montantEstime.toString())
                              : undefined,
      datePublication:      opportunite?.datePublication
                              ? new Date(opportunite.datePublication)
                              : undefined,
      dateLimite:           opportunite?.dateLimite
                              ? new Date(opportunite.dateLimite)
                              : undefined,
      statut:               opportunite?.statut ?? 'IDENTIFIEE',
      probabiliteGain:      opportunite?.probabiliteGain ?? undefined,
      notes:                opportunite?.notes ?? '',
      marcheId:             opportunite?.marcheId ?? '',
    },
  })

  async function onSubmit(values: FormOpportuniteInput) {
    setLoading(true)
    const result = isEditing
      ? await updateOpportunite(opportunite.id, values)
      : await createOpportunite(values)
    setLoading(false)

    if (result.success) {
      toast.success(isEditing ? 'Opportunité mise à jour' : 'Opportunité créée')
      router.push('/opportunites')
    } else {
      toast.error(result.error ?? 'Erreur lors de la sauvegarde')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Ligne 1 : Objet + Référence */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="objet"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Objet *</FormLabel>
                <FormControl>
                  <Input placeholder="Fourniture de véhicules utilitaires..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Référence</FormLabel>
                <FormControl>
                  <Input placeholder="DAO-2026-001" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Ligne 2 : Autorité contractante + Statut */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="autoriteContractante"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Autorité contractante *</FormLabel>
                <FormControl>
                  <Input placeholder="Ministère des Transports" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="statut"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Statut *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUT_OPPORTUNITE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Ligne 3 : Montant estimé + Probabilité */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="montantEstime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant estimé (XOF)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="50000000"
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
            name="probabiliteGain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Probabilité de gain (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="70"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Ligne 4 : Date publication + Date limite */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="datePublication"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de publication</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                      >
                        {field.value ? format(field.value, 'PPP', { locale: fr }) : 'Choisir une date'}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      locale={fr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateLimite"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date limite de dépôt</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                      >
                        {field.value ? format(field.value, 'PPP', { locale: fr }) : 'Choisir une date'}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      locale={fr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observations, contacts, contexte..."
                  rows={4}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : "Créer l'opportunité"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/opportunites')}>
            Annuler
          </Button>
        </div>
      </form>
    </Form>
  )
}
