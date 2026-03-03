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
import { Checkbox } from '@/components/ui/checkbox'
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
  formDossierOffreSchema,
  type FormDossierOffreInput,
  STATUT_DOSSIER_LABELS,
} from '@/lib/validations/dossier-offre'
import { createDossierOffre, updateDossierOffre } from '@/lib/actions/dossiers-offre'
import type { DossierOffre } from '@prisma/client'

interface DossierFormProps {
  dossier?: DossierOffre
  defaultMarcheId?: string
  defaultOpportuniteId?: string
}

const STATUTS = ['EN_COURS', 'SOUMIS', 'ARCHIVE'] as const

export function DossierForm({ dossier, defaultMarcheId, defaultOpportuniteId }: DossierFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [useTemplate, setUseTemplate] = useState(true)
  const isEditing = !!dossier

  const form = useForm<FormDossierOffreInput>({
    resolver: zodResolver(formDossierOffreSchema),
    defaultValues: {
      titre:         dossier?.titre ?? '',
      opportuniteId: dossier?.opportuniteId ?? defaultOpportuniteId ?? '',
      marcheId:      dossier?.marcheId ?? defaultMarcheId ?? '',
      dateDepot:     dossier?.dateDepot ? new Date(dossier.dateDepot) : undefined,
      statut:        (dossier?.statut as 'EN_COURS' | 'SOUMIS' | 'ARCHIVE') ?? 'EN_COURS',
      notes:         dossier?.notes ?? '',
    },
  })

  async function onSubmit(values: FormDossierOffreInput) {
    setLoading(true)
    const result = isEditing
      ? await updateDossierOffre(dossier.id, values)
      : await createDossierOffre({ ...values, useTemplate })
    setLoading(false)

    if (result.success) {
      toast.success(isEditing ? 'Dossier mis à jour' : 'Dossier créé')
      router.push(isEditing ? `/dossiers-offre/${dossier.id}` : '/dossiers-offre')
    } else {
      toast.error(result.error ?? 'Erreur lors de la sauvegarde')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Titre */}
        <FormField
          control={form.control}
          name="titre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titre du dossier *</FormLabel>
              <FormControl>
                <Input placeholder="Dossier offre DAO N°2026-001 — Véhicules utilitaires" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Statut + Date dépôt */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {STATUT_DOSSIER_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateDepot"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de dépôt prévue</FormLabel>
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
                  placeholder="Observations, contacts, exigences particulières..."
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Option template (création uniquement) */}
        {!isEditing && (
          <div className="flex items-start space-x-3 rounded-md border p-4 bg-muted/30">
            <Checkbox
              id="useTemplate"
              checked={useTemplate}
              onCheckedChange={(v) => setUseTemplate(!!v)}
            />
            <div className="space-y-1 leading-none">
              <label htmlFor="useTemplate" className="text-sm font-medium cursor-pointer">
                Utiliser le template de checklist standard
              </label>
              <p className="text-xs text-muted-foreground">
                Pré-remplit le dossier avec les 12 pièces habituelles d&apos;un dossier d&apos;offre marché public (lettre de soumission, caution, registre de commerce, etc.)
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer le dossier'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(isEditing ? `/dossiers-offre/${dossier.id}` : '/dossiers-offre')}
          >
            Annuler
          </Button>
        </div>
      </form>
    </Form>
  )
}
