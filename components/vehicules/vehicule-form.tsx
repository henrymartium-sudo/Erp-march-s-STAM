'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Vehicule, Marche, StatutVehicule } from '@prisma/client'
import { createVehiculeSchema, type CreateVehiculeInput } from '@/lib/validations/vehicule'
import { createVehicule, updateVehicule, checkImmatriculationExists } from '@/lib/actions/vehicules'
import { getAllMarches } from '@/lib/actions/marches'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { STATUT_VEHICULE_LABELS, MARQUES_VEHICULES, ANNEES_DISPONIBLES } from '@/lib/constants/vehicule'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

interface VehiculeFormProps {
  vehicule?: Vehicule
  marches?: Marche[]
  onSuccess?: () => void
}

export function VehiculeForm({ vehicule, marches: initialMarches, onSuccess }: VehiculeFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [marches, setMarches] = useState<Marche[]>(initialMarches || [])

  const isEditing = !!vehicule

  // Charger les marchés si non fournis
  useEffect(() => {
    if (!initialMarches) {
      getAllMarches().then((data) => {
        setMarches(data)
      })
    }
  }, [initialMarches])

  // Configuration du formulaire avec React Hook Form + Zod
  const form = useForm<CreateVehiculeInput>({
    resolver: zodResolver(createVehiculeSchema),
    defaultValues: vehicule
      ? {
          immatriculation: vehicule.immatriculation,
          marque: vehicule.marque,
          modele: vehicule.modele,
          annee: vehicule.annee,
          dateLivraison: vehicule.dateLivraison || undefined,
          bonLivraisonRef: vehicule.bonLivraisonRef || undefined,
          dateReceptionProvisoire: vehicule.dateReceptionProvisoire || undefined,
          dateReceptionDefinitive: vehicule.dateReceptionDefinitive || undefined,
          reservesReception: vehicule.reservesReception || undefined,
          statut: vehicule.statut,
          marcheId: vehicule.marcheId || undefined,
        }
      : {
          immatriculation: '',
          marque: '',
          modele: '',
          annee: new Date().getFullYear(),
          statut: 'EN_ATTENTE_LIVRAISON' as const,
        },
  })

  const watchedStatut = form.watch('statut')
  const watchedImmatriculation = form.watch('immatriculation')

  // Vérifier l'unicité de l'immatriculation
  useEffect(() => {
    if (!isEditing && watchedImmatriculation && watchedImmatriculation.length >= 5) {
      checkImmatriculationExists(watchedImmatriculation).then((exists) => {
        if (exists) {
          form.setError('immatriculation', {
            type: 'manual',
            message: 'Cette immatriculation existe déjà',
          })
        }
      })
    }
  }, [watchedImmatriculation, isEditing, form])

  const onSubmit = async (data: CreateVehiculeInput) => {
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        const result = isEditing
          ? await updateVehicule({ ...data, id: vehicule.id })
          : await createVehicule(data)

        if (result.success) {
          setSuccess(true)
          form.reset()

          // Callback optionnel
          if (onSuccess) {
            onSuccess()
          }

          // Redirection après succès
          setTimeout(() => {
            router.push('/vehicules')
            router.refresh()
          }, 1000)
        } else {
          setError(result.error || 'Une erreur est survenue')
        }
      } catch (err) {
        setError('Erreur lors de la soumission du formulaire')
        console.error(err)
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Messages de feedback */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            Véhicule {isEditing ? 'modifié' : 'créé'} avec succès ! Redirection...
          </div>
        )}

        {/* Informations principales */}
        <Card>
          <CardHeader>
            <CardTitle>Informations principales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Immatriculation */}
              <FormField
                control={form.control}
                name="immatriculation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Immatriculation *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="XX-123-YY ou 123 XX 456"
                        {...field}
                        disabled={isEditing}
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(STATUT_VEHICULE_LABELS).map(([value, label]) => (
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Marque */}
              <FormField
                control={form.control}
                name="marque"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marque *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une marque" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MARQUES_VEHICULES.map((marque) => (
                          <SelectItem key={marque} value={marque}>
                            {marque}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Modèle */}
              <FormField
                control={form.control}
                name="modele"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modèle *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 208, Clio..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Année */}
              <FormField
                control={form.control}
                name="annee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Année *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Année" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ANNEES_DISPONIBLES.map((annee) => (
                          <SelectItem key={annee} value={annee.toString()}>
                            {annee}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Marché associé */}
            <FormField
              control={form.control}
              name="marcheId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marché associé</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Aucun marché associé" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucun marché</SelectItem>
                      {marches.map((marche) => (
                        <SelectItem key={marche.id} value={marche.id}>
                          {marche.numero} - {marche.objet.substring(0, 50)}
                          {marche.objet.length > 50 ? '...' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Optionnel : Lier ce véhicule à un marché public
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Dates et livraison */}
        <Card>
          <CardHeader>
            <CardTitle>Dates et livraison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date de livraison */}
              <FormField
                control={form.control}
                name="dateLivraison"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de livraison</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: fr })
                            ) : (
                              <span>Sélectionner une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date('1900-01-01')}
                          initialFocus
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Référence bon de livraison */}
              <FormField
                control={form.control}
                name="bonLivraisonRef"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end">
                    <FormLabel>Référence bon de livraison</FormLabel>
                    <FormControl>
                      <Input placeholder="Numéro du bon..." {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date de réception provisoire */}
              <FormField
                control={form.control}
                name="dateReceptionProvisoire"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de réception provisoire</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: fr })
                            ) : (
                              <span>Sélectionner une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date('1900-01-01')}
                          initialFocus
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date de réception définitive */}
              <FormField
                control={form.control}
                name="dateReceptionDefinitive"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de réception définitive</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: fr })
                            ) : (
                              <span>Sélectionner une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date('1900-01-01')}
                          initialFocus
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Réserves */}
        <Card>
          <CardHeader>
            <CardTitle>Réserves éventuelles</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="reservesReception"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Réserves à la réception</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Listez ici les réserves formulées lors de la réception..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Optionnel : Réserves formulées lors de la réception provisoire ou définitive
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
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
            {isEditing ? 'Modifier' : 'Créer'} le véhicule
          </Button>
        </div>
      </form>
    </Form>
  )
}
