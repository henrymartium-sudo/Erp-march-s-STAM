'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Marche } from '@prisma/client'
import { createMarcheSchema, type CreateMarcheInput } from '@/lib/validations/marche'
import { createMarche, updateMarche } from '@/lib/actions/marches'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { STATUT_LABELS } from '@/lib/utils/statut'
import { Loader2 } from 'lucide-react'

interface MarcheFormProps {
  marche?: Marche
  onSuccess?: () => void
}

const TYPE_MARCHE_LABELS = {
  TRAVAUX: 'Travaux',
  FOURNITURES: 'Fournitures',
  SERVICES: 'Services',
  PRESTATIONS_INTELLECTUELLES: 'Prestations intellectuelles',
}

export function MarcheForm({ marche, onSuccess }: MarcheFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isEditing = !!marche

  // Configuration du formulaire avec React Hook Form + Zod
  const form = useForm({
    resolver: zodResolver(createMarcheSchema) as any,
    defaultValues: marche
      ? {
          numero: marche.numero,
          objet: marche.objet,
          type: marche.type,
          montant: Number(marche.montant),
          dateNotification: marche.dateNotification,
          dateOrdreService: marche.dateOrdreService || undefined,
          delaiExecution: marche.delaiExecution,
          dateFinPrevue: marche.dateFinPrevue || undefined,
          dateReception: marche.dateReception || undefined,
          statut: marche.statut,
          fournisseurNom: marche.fournisseurNom,
          fournisseurContact: marche.fournisseurContact || undefined,
          fournisseurEmail: marche.fournisseurEmail || undefined,
          fournisseurTel: marche.fournisseurTel || undefined,
        }
      : {
          numero: '',
          objet: '',
          type: 'FOURNITURES',
          montant: 0,
          dateNotification: new Date(),
          delaiExecution: 90,
          statut: 'OPPORTUNITE_IDENTIFIEE',
          fournisseurNom: '',
        },
  })

  // Soumission du formulaire
  async function onSubmit(data: any) {
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        const result = isEditing
          ? await updateMarche({ ...data, id: marche.id })
          : await createMarche(data)

        if (result.success) {
          setSuccess(true)
          form.reset()

          if (onSuccess) {
            onSuccess()
          } else {
            // Redirection par défaut
            setTimeout(() => {
              router.push(isEditing ? `/marches/${marche.id}` : '/marches')
              router.refresh()
            }, 1000)
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
    <div className="w-full max-w-4xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Section : Informations générales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations générales</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Numéro */}
              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro du marché *</FormLabel>
                    <FormControl>
                      <Input placeholder="MAR-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de marché *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TYPE_MARCHE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Objet */}
            <FormField
              control={form.control}
              name="objet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objet du marché *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Fourniture de véhicules légers pour administration"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Montant */}
              <FormField
                control={form.control}
                name="montant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (DH) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="450000"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
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
                    <FormLabel>Statut *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(STATUT_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Section : Dates et délais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dates et délais</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date de notification */}
              <FormField
                control={form.control}
                name="dateNotification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de notification *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value
                            ? new Date(field.value).toISOString().split('T')[0]
                            : ''
                        }
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Délai d'exécution */}
              <FormField
                control={form.control}
                name="delaiExecution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Délai d'exécution (jours) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="90"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date ordre de service */}
              <FormField
                control={form.control}
                name="dateOrdreService"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date ordre de service</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value
                            ? new Date(field.value).toISOString().split('T')[0]
                            : ''
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date de réception */}
              <FormField
                control={form.control}
                name="dateReception"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de réception</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value
                            ? new Date(field.value).toISOString().split('T')[0]
                            : ''
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Section : Fournisseur */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations fournisseur</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nom du fournisseur */}
              <FormField
                control={form.control}
                name="fournisseurNom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du fournisseur *</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto Plus SARL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact */}
              <FormField
                control={form.control}
                name="fournisseurContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personne de contact</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="M. Ahmed Benjelloun"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="fournisseurEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@autoplus.ma"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Téléphone */}
              <FormField
                control={form.control}
                name="fournisseurTel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+212 5 22 11 22 33"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Messages d'erreur et de succès */}
          {error && (
            <div className="p-4 text-sm text-red-800 bg-red-100 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 text-sm text-green-800 bg-green-100 border border-green-200 rounded-md">
              Marché {isEditing ? 'modifié' : 'créé'} avec succès !
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Modifier' : 'Créer'} le marché
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
