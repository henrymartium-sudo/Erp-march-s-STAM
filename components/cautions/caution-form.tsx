'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Loader2, AlertTriangle, Lightbulb } from 'lucide-react';
import {
  createCautionSchema,
} from '@/lib/validations/caution';
import type { TypeCaution, StatutCaution } from '@prisma/client';

// Type pour le formulaire (tous les champs requis)
export type CautionFormValues = {
  reference: string;
  type: TypeCaution;
  montant: number;
  dateEmission: Date;
  dateEcheance: Date;
  statut: StatutCaution;
  banqueNom: string;
  banqueContact?: string;
  marcheId: string;
};
import {
  TYPE_CAUTION_OPTIONS,
  STATUT_CAUTION_OPTIONS,
} from '@/lib/constants/caution';
import { formatMontant } from '@/lib/utils/format';
import {
  getMontantSuggere,
  getDateEcheanceSuggeree,
  isDureeCoherente,
} from '@/lib/utils/caution';
interface CautionFormProps {
  caution?: any; // Données sérialisées depuis le Server Component (Decimal -> number, Date -> string)
  marcheId?: string;
  montantMarche?: number;
  onSubmit: (data: CautionFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

/**
 * Formulaire de création/édition de caution
 * Avec validation Zod, suggestions automatiques et warnings
 */
export function CautionForm({
  caution,
  marcheId,
  montantMarche,
  onSubmit,
  onCancel,
  isLoading = false,
}: CautionFormProps) {
  const [suggestions, setSuggestions] = useState<{
    montant?: number;
    dateEcheance?: Date;
  }>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  const isEditMode = Boolean(caution);

  const form = useForm<CautionFormValues>({
    resolver: zodResolver(createCautionSchema) as any,
    defaultValues: caution
      ? {
          reference: caution.reference,
          type: caution.type,
          montant: typeof caution.montant === 'number'
            ? caution.montant
            : Number(caution.montant),
          dateEmission: typeof caution.dateEmission === 'string'
            ? new Date(caution.dateEmission)
            : caution.dateEmission,
          dateEcheance: typeof caution.dateEcheance === 'string'
            ? new Date(caution.dateEcheance)
            : caution.dateEcheance,
          statut: caution.statut,
          banqueNom: caution.banqueNom,
          banqueContact: caution.banqueContact || undefined,
          marcheId: caution.marcheId,
        }
      : {
          marcheId: marcheId || '',
          statut: 'ACTIVE',
        },
  });

  const watchType = form.watch('type');
  const watchMontant = form.watch('montant');
  const watchDateEmission = form.watch('dateEmission');
  const watchDateEcheance = form.watch('dateEcheance');

  // Calculer les suggestions
  useEffect(() => {
    if (!watchType) return;

    const newSuggestions: typeof suggestions = {};

    // Suggestion de montant
    if (montantMarche && !watchMontant) {
      newSuggestions.montant = getMontantSuggere(watchType as TypeCaution, montantMarche);
    }

    // Suggestion de date d'échéance
    if (watchDateEmission && !watchDateEcheance) {
      newSuggestions.dateEcheance = getDateEcheanceSuggeree(
        watchType as TypeCaution,
        watchDateEmission
      );
    }

    setSuggestions(newSuggestions);
  }, [watchType, watchDateEmission, watchDateEcheance, watchMontant, montantMarche]);

  // Vérifier la cohérence et afficher des warnings
  useEffect(() => {
    const newWarnings: string[] = [];

    // Warning sur la durée
    if (watchType && watchDateEmission && watchDateEcheance) {
      if (!isDureeCoherente(watchType as TypeCaution, watchDateEmission, watchDateEcheance)) {
        newWarnings.push('⚠️ La durée de cette caution semble inhabituelle pour ce type');
      }
    }

    // Warning sur le montant (si on a le montant du marché)
    // On pourrait ajouter isMontantCoherent() ici mais on n'a pas toujours le montantMarche

    setWarnings(newWarnings);
  }, [watchType, watchDateEmission, watchDateEcheance, watchMontant, montantMarche]);

  const applySuggestion = (field: 'montant' | 'dateEcheance') => {
    if (field === 'montant' && suggestions.montant) {
      form.setValue('montant', suggestions.montant);
    }
    if (field === 'dateEcheance' && suggestions.dateEcheance) {
      form.setValue('dateEcheance', suggestions.dateEcheance);
    }
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Warnings */}
        {warnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Référence */}
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Référence *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: CAU-2024-001"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  Numéro unique de la caution bancaire
                </FormDescription>
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
                <FormLabel>Type de caution *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TYPE_CAUTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Montant */}
          <FormField
            control={form.control}
            name="montant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant (€) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                {suggestions.montant && !field.value && (
                  <FormDescription>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => applySuggestion('montant')}
                    >
                      <Lightbulb className="h-3 w-3 mr-1" />
                      Suggestion: {formatMontant(suggestions.montant)}
                    </Button>
                  </FormDescription>
                )}
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
                    {STATUT_CAUTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date d'émission */}
          <FormField
            control={form.control}
            name="dateEmission"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date d&apos;émission *</FormLabel>
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
                          format(field.value, 'dd MMMM yyyy', { locale: fr })
                        ) : (
                          <span>Choisir une date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
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

          {/* Date d'échéance */}
          <FormField
            control={form.control}
            name="dateEcheance"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date d&apos;échéance *</FormLabel>
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
                          format(field.value, 'dd MMMM yyyy', { locale: fr })
                        ) : (
                          <span>Choisir une date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      locale={fr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {suggestions.dateEcheance && !field.value && watchDateEmission && (
                  <FormDescription>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => applySuggestion('dateEcheance')}
                    >
                      <Lightbulb className="h-3 w-3 mr-1" />
                      Suggestion: {format(suggestions.dateEcheance, 'dd/MM/yyyy', { locale: fr })}
                    </Button>
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Banque */}
          <FormField
            control={form.control}
            name="banqueNom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de la banque *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Banque Populaire" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Contact banque */}
          <FormField
            control={form.control}
            name="banqueContact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact banque</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: contact@banque.fr / 01 23 45 67 89"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  Email ou téléphone (optionnel)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Enregistrer' : 'Créer la caution'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
