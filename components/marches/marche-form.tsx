'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { StatutMarche } from '@prisma/client'
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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { STATUT_LABELS } from '@/lib/utils/statut'
import { Loader2 } from 'lucide-react'
import type { SerializedMarche } from '@/types/serialized'

interface MarcheFormProps {
  marche?: SerializedMarche
  onSuccess?: () => void
}

const TYPE_MARCHE_LABELS = {
  TRAVAUX: 'Travaux',
  FOURNITURES: 'Fournitures',
  SERVICES: 'Services',
  PRESTATIONS_INTELLECTUELLES: 'Prestations intellectuelles',
}

// Helper pour déterminer quels champs afficher selon le statut
type StatutSpecificField =
  | 'dateIdentification'
  | 'dateDepotPrevue'
  | 'dateDepotOffre'
  | 'delaiValiditeOffre'
  | 'dateAttributionProvisoire'
  | 'dateAttributionDefinitive'
  | 'dateLivraisonPrevue'
  | 'dureeLivraisonPrevue'
  | 'dateReceptionProvisoirePrevue'
  | 'garantiesLiberees'
  | 'dateClotureAdministrative'
  | 'dateResiliation'
  | 'motifsResiliation'
  | 'dateAnnulation'
  | 'motifsAnnulation'
  | 'dateInfructueux'
  | 'motifsInfructueux'
  | 'concurrentGagnant'
  | 'montantOffreConcurrent'

function getStatutSpecificFields(statut: StatutMarche | undefined): StatutSpecificField[] {
  if (!statut) return []

  const fieldsMap: Record<StatutMarche, StatutSpecificField[]> = {
    OPPORTUNITE_IDENTIFIEE: ['dateIdentification'],
    DOSSIER_EN_PREPARATION: ['dateDepotPrevue'],
    OFFRE_DEPOSEE: ['dateDepotOffre', 'delaiValiditeOffre'],
    EN_ATTENTE_ATTRIBUTION: [],
    ATTRIBUE_PROVISOIREMENT: ['dateAttributionProvisoire'],
    ATTRIBUE_DEFINITIVEMENT: ['dateAttributionDefinitive'],
    EN_ATTENTE_LIVRAISON_OS: ['dateLivraisonPrevue', 'dureeLivraisonPrevue'],
    EN_EXECUTION: ['dateReceptionProvisoirePrevue'],
    EXECUTE_ATTENTE_GARANTIES: ['garantiesLiberees'],
    CLOTURE: ['dateClotureAdministrative'],
    RESILIE: ['dateResiliation', 'motifsResiliation'],
    ANNULE: ['dateAnnulation', 'motifsAnnulation'],
    INFRUCTUEUX: ['dateInfructueux', 'motifsInfructueux', 'concurrentGagnant', 'montantOffreConcurrent'],
  }

  return fieldsMap[statut] || []
}

export function MarcheForm({ marche, onSuccess }: MarcheFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)

  const isEditing = !!marche

  // Configuration du formulaire avec React Hook Form + Zod
  const form = useForm<CreateMarcheInput>({
    resolver: zodResolver(createMarcheSchema),
    defaultValues: marche
      ? {
          numero: marche.numero,
          objet: marche.objet,
          type: marche.type,
          montant: marche.montant,
          dateNotification: new Date(marche.dateNotification),
          dateOrdreService: marche.dateOrdreService ? new Date(marche.dateOrdreService) : undefined,
          delaiExecution: marche.delaiExecution,
          dateFinPrevue: marche.dateFinPrevue ? new Date(marche.dateFinPrevue) : undefined,
          dateReception: marche.dateReception ? new Date(marche.dateReception) : undefined,
          statut: marche.statut,
          autoriteContractanteNom: marche.autoriteContractanteNom,
          autoriteContractanteContact: marche.autoriteContractanteContact || undefined,
          autoriteContractanteEmail: marche.autoriteContractanteEmail || undefined,
          autoriteContractanteTel: marche.autoriteContractanteTel || undefined,
          // Champs spécifiques
          dateIdentification: marche.dateIdentification ? new Date(marche.dateIdentification) : undefined,
          dateDepotPrevue: marche.dateDepotPrevue ? new Date(marche.dateDepotPrevue) : undefined,
          dateDepotOffre: marche.dateDepotOffre ? new Date(marche.dateDepotOffre) : undefined,
          delaiValiditeOffre: marche.delaiValiditeOffre || undefined,
          dateAttributionProvisoire: marche.dateAttributionProvisoire ? new Date(marche.dateAttributionProvisoire) : undefined,
          dateAttributionDefinitive: marche.dateAttributionDefinitive ? new Date(marche.dateAttributionDefinitive) : undefined,
          dateLivraisonPrevue: marche.dateLivraisonPrevue ? new Date(marche.dateLivraisonPrevue) : undefined,
          dureeLivraisonPrevue: marche.dureeLivraisonPrevue || undefined,
          dateReceptionProvisoirePrevue: marche.dateReceptionProvisoirePrevue ? new Date(marche.dateReceptionProvisoirePrevue) : undefined,
          garantiesLiberees: marche.garantiesLiberees || undefined,
          dateClotureAdministrative: marche.dateClotureAdministrative ? new Date(marche.dateClotureAdministrative) : undefined,
          dateResiliation: marche.dateResiliation ? new Date(marche.dateResiliation) : undefined,
          motifsResiliation: marche.motifsResiliation || undefined,
          dateAnnulation: marche.dateAnnulation ? new Date(marche.dateAnnulation) : undefined,
          motifsAnnulation: marche.motifsAnnulation || undefined,
          dateInfructueux: marche.dateInfructueux ? new Date(marche.dateInfructueux) : undefined,
          motifsInfructueux: marche.motifsInfructueux || undefined,
          concurrentGagnant: marche.concurrentGagnant || undefined,
          montantOffreConcurrent: marche.montantOffreConcurrent || undefined,
        }
      : {
          numero: '',
          objet: '',
          type: 'FOURNITURES' as const,
          montant: 0,
          dateNotification: new Date(),
          delaiExecution: 90,
          statut: 'OPPORTUNITE_IDENTIFIEE' as const,
          autoriteContractanteNom: '',
        },
  })

  // Watch le statut pour afficher les champs dynamiques
  const currentStatut = form.watch('statut')
  const statutSpecificFields = getStatutSpecificFields(currentStatut as StatutMarche)

  // Vérifier les avertissements pour les statuts de terminaison
  const checkTerminationWarnings = (data: any): boolean => {
    setWarning(null)

    const terminationStatuses = ['RESILIE', 'ANNULE', 'INFRUCTUEUX']
    if (!terminationStatuses.includes(data.statut)) {
      return true // Pas un statut de terminaison, ok
    }

    const warnings: string[] = []

    if (data.statut === 'RESILIE') {
      if (!data.dateResiliation) warnings.push('la date de résiliation')
      if (!data.motifsResiliation || data.motifsResiliation.length < 10) {
        warnings.push('les motifs de résiliation (minimum 10 caractères)')
      }
    }

    if (data.statut === 'ANNULE') {
      if (!data.dateAnnulation) warnings.push('la date d\'annulation')
      if (!data.motifsAnnulation || data.motifsAnnulation.length < 10) {
        warnings.push('les motifs d\'annulation (minimum 10 caractères)')
      }
    }

    if (data.statut === 'INFRUCTUEUX') {
      if (!data.dateInfructueux) warnings.push('la date')
      if (!data.motifsInfructueux || data.motifsInfructueux.length < 10) {
        warnings.push('les motifs (minimum 10 caractères)')
      }
    }

    if (warnings.length > 0) {
      setWarning(
        `Attention : Ce marché a un statut de terminaison mais il manque des informations importantes : ${warnings.join(', ')}. Voulez-vous continuer ?`
      )
      // Laisser continuer mais avec l'avertissement affiché
      return true
    }

    return true
  }

  // Soumission du formulaire
  async function onSubmit(data: any) {
    setError(null)
    setSuccess(false)

    // Vérifier les avertissements
    if (!checkTerminationWarnings(data)) {
      return
    }

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
                        {/* Statuts actifs */}
                        {Object.entries(STATUT_LABELS)
                          .filter(([value]) => !['RESILIE', 'ANNULE', 'INFRUCTUEUX'].includes(value))
                          .map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}

                        {/* Groupe Terminés */}
                        <optgroup label="Terminés">
                          {['RESILIE', 'ANNULE', 'INFRUCTUEUX']
                            .filter(value => STATUT_LABELS[value as keyof typeof STATUT_LABELS])
                            .map((value) => (
                              <SelectItem key={value} value={value}>
                                {STATUT_LABELS[value as keyof typeof STATUT_LABELS]}
                              </SelectItem>
                            ))}
                        </optgroup>
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

          {/* Section : Champs spécifiques au statut */}
          {statutSpecificFields.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/50 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
              <CardHeader>
                <CardTitle className="text-lg">
                  Informations spécifiques - {STATUT_LABELS[currentStatut as keyof typeof STATUT_LABELS]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* OPPORTUNITE_IDENTIFIEE */}
                  {statutSpecificFields.includes('dateIdentification') && (
                    <FormField
                      control={form.control}
                      name="dateIdentification"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date d'identification</FormLabel>
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
                  )}

                  {/* DOSSIER_EN_PREPARATION */}
                  {statutSpecificFields.includes('dateDepotPrevue') && (
                    <FormField
                      control={form.control}
                      name="dateDepotPrevue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de dépôt prévue</FormLabel>
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
                  )}

                  {/* OFFRE_DEPOSEE - Date dépôt offre */}
                  {statutSpecificFields.includes('dateDepotOffre') && (
                    <FormField
                      control={form.control}
                      name="dateDepotOffre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de dépôt de l'offre</FormLabel>
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
                  )}

                  {/* OFFRE_DEPOSEE - Délai validité offre */}
                  {statutSpecificFields.includes('delaiValiditeOffre') && (
                    <FormField
                      control={form.control}
                      name="delaiValiditeOffre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Délai de validité de l'offre (jours)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="90"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseInt(e.target.value) : null
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* ATTRIBUE_PROVISOIREMENT */}
                  {statutSpecificFields.includes('dateAttributionProvisoire') && (
                    <FormField
                      control={form.control}
                      name="dateAttributionProvisoire"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date d'attribution provisoire</FormLabel>
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
                  )}

                  {/* ATTRIBUE_DEFINITIVEMENT */}
                  {statutSpecificFields.includes('dateAttributionDefinitive') && (
                    <FormField
                      control={form.control}
                      name="dateAttributionDefinitive"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date d'attribution définitive</FormLabel>
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
                  )}

                  {/* EN_ATTENTE_LIVRAISON_OS - Date livraison prévue */}
                  {statutSpecificFields.includes('dateLivraisonPrevue') && (
                    <FormField
                      control={form.control}
                      name="dateLivraisonPrevue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de livraison prévue</FormLabel>
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
                  )}

                  {/* EN_ATTENTE_LIVRAISON_OS - Durée livraison prévue */}
                  {statutSpecificFields.includes('dureeLivraisonPrevue') && (
                    <FormField
                      control={form.control}
                      name="dureeLivraisonPrevue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Durée de livraison prévue (jours)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="30"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseInt(e.target.value) : null
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* EN_EXECUTION */}
                  {statutSpecificFields.includes('dateReceptionProvisoirePrevue') && (
                    <FormField
                      control={form.control}
                      name="dateReceptionProvisoirePrevue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de réception provisoire prévue</FormLabel>
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
                  )}

                  {/* EXECUTE_ATTENTE_GARANTIES */}
                  {statutSpecificFields.includes('garantiesLiberees') && (
                    <FormField
                      control={form.control}
                      name="garantiesLiberees"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Garanties libérées
                            </FormLabel>
                            <FormDescription>
                              Cocher si les garanties ont été libérées
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  )}

                  {/* CLOTURE */}
                  {statutSpecificFields.includes('dateClotureAdministrative') && (
                    <FormField
                      control={form.control}
                      name="dateClotureAdministrative"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de clôture administrative</FormLabel>
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
                  )}

                  {/* RESILIE - Date résiliation */}
                  {statutSpecificFields.includes('dateResiliation') && (
                    <FormField
                      control={form.control}
                      name="dateResiliation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de résiliation</FormLabel>
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
                  )}

                  {/* RESILIE - Motifs résiliation */}
                  {statutSpecificFields.includes('motifsResiliation') && (
                    <FormField
                      control={form.control}
                      name="motifsResiliation"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Motifs de résiliation</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Expliquer les raisons de la résiliation (min. 10 caractères)"
                              className="min-h-[100px]"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* ANNULE - Date annulation */}
                  {statutSpecificFields.includes('dateAnnulation') && (
                    <FormField
                      control={form.control}
                      name="dateAnnulation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date d'annulation</FormLabel>
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
                  )}

                  {/* ANNULE - Motifs annulation */}
                  {statutSpecificFields.includes('motifsAnnulation') && (
                    <FormField
                      control={form.control}
                      name="motifsAnnulation"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Motifs d'annulation</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Expliquer les raisons de l'annulation (min. 10 caractères)"
                              className="min-h-[100px]"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* INFRUCTUEUX - Date infructueux */}
                  {statutSpecificFields.includes('dateInfructueux') && (
                    <FormField
                      control={form.control}
                      name="dateInfructueux"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de déclaration infructueux</FormLabel>
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
                  )}

                  {/* INFRUCTUEUX - Concurrent gagnant */}
                  {statutSpecificFields.includes('concurrentGagnant') && (
                    <FormField
                      control={form.control}
                      name="concurrentGagnant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Concurrent gagnant</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nom du concurrent qui a remporté le marché"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* INFRUCTUEUX - Montant offre concurrent */}
                  {statutSpecificFields.includes('montantOffreConcurrent') && (
                    <FormField
                      control={form.control}
                      name="montantOffreConcurrent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant de l'offre du concurrent (DH)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="350000"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseFloat(e.target.value) : null
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* INFRUCTUEUX - Motifs infructueux */}
                  {statutSpecificFields.includes('motifsInfructueux') && (
                    <FormField
                      control={form.control}
                      name="motifsInfructueux"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Motifs d'infructuosité</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Expliquer pourquoi le marché a été déclaré infructueux (min. 10 caractères)"
                              className="min-h-[100px]"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section : Autorité contractante */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations autorité contractante</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nom de l'autorité contractante */}
              <FormField
                control={form.control}
                name="autoriteContractanteNom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'autorité contractante *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ministère de l'Intérieur" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact */}
              <FormField
                control={form.control}
                name="autoriteContractanteContact"
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
                name="autoriteContractanteEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@ministere.gov.ma"
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
                name="autoriteContractanteTel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+212 5 37 66 00 00"
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

          {/* Messages d'erreur, d'avertissement et de succès */}
          {error && (
            <div className="p-4 text-sm text-red-800 bg-red-100 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {warning && (
            <div className="p-4 text-sm text-yellow-800 bg-yellow-100 border border-yellow-200 rounded-md">
              {warning}
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
