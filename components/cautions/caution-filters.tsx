'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Filter, CalendarIcon, RotateCcw, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  TYPE_CAUTION_OPTIONS,
  STATUT_CAUTION_OPTIONS,
} from '@/lib/constants/caution';

const NIVEAU_ALERTE_OPTIONS = [
  { value: 'CRITIQUE', label: '🔴 Critique' },
  { value: 'ATTENTION', label: '🟠 Attention' },
  { value: 'INFO', label: '🟡 Info' },
  { value: 'EXPIRE', label: '⚫ Expirée' },
  { value: 'AUCUN', label: '🟢 OK' },
] as const;

/** Paramètres d'URL pilotés par ce composant (hors pagination) */
const FILTER_PARAM_KEYS = [
  'search',
  'type',
  'statut',
  'niveauAlerte',
  'dateEmissionDebut',
  'dateEmissionFin',
  'dateEcheanceDebut',
  'dateEcheanceFin',
] as const;

const URL_DATE_FORMAT = 'yyyy-MM-dd';

function parseUrlDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, URL_DATE_FORMAT, new Date());
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

interface CautionFiltersProps {
  className?: string;
}

/**
 * Composant de filtrage avancé pour les cautions.
 *
 * Les filtres sont portés par l'URL (searchParams) et appliqués côté serveur
 * dans getCautions() : ils s'appliquent donc à l'ensemble des cautions et non
 * à la seule page courante. Toute modification réinitialise `page`.
 */
export function CautionFilters({ className }: CautionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  // Valeurs courantes lues depuis l'URL
  const typeActuel = searchParams.get('type') || 'ALL';
  const statutActuel = searchParams.get('statut') || 'ALL';
  const niveauAlerteActuel = searchParams.get('niveauAlerte') || 'ALL';
  const dateEmissionDebut = parseUrlDate(searchParams.get('dateEmissionDebut'));
  const dateEmissionFin = parseUrlDate(searchParams.get('dateEmissionFin'));
  const dateEcheanceDebut = parseUrlDate(searchParams.get('dateEcheanceDebut'));
  const dateEcheanceFin = parseUrlDate(searchParams.get('dateEcheanceFin'));

  // Recherche : état local debouncé avant propagation dans l'URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Synchronisation URL — recherche
  useEffect(() => {
    const current = searchParams.get('search') || '';
    if (debouncedSearch === current) return;

    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    params.delete('page');
    router.push(`/cautions?${params.toString()}`);
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'ALL') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`/cautions?${params.toString()}`);
  };

  const updateDateParam = (key: string, date: Date | undefined) => {
    updateParam(key, date ? format(date, URL_DATE_FORMAT) : null);
  };

  const clearParams = (keys: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    keys.forEach((key) => params.delete(key));
    params.delete('page');
    router.push(`/cautions?${params.toString()}`);
  };

  const activeFilterKeys = FILTER_PARAM_KEYS.filter((key) =>
    Boolean(searchParams.get(key))
  );
  const hasActiveFilters = activeFilterKeys.length > 0 || searchQuery !== '';
  const activeFiltersCount = activeFilterKeys.length;

  const handleReset = () => {
    setSearchQuery('');
    router.push('/cautions');
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Barre de recherche et bouton filtres */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une caution..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant={isExpanded ? 'default' : 'outline'}
            onClick={() => setIsExpanded(!isExpanded)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtres
            {activeFiltersCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Filtres actifs (badges) */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {typeActuel !== 'ALL' && (
            <Badge variant="secondary" className="gap-1">
              Type: {TYPE_CAUTION_OPTIONS.find((o) => o.value === typeActuel)?.label ?? typeActuel}
              <button
                type="button"
                aria-label="Retirer le filtre type"
                onClick={() => updateParam('type', null)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {statutActuel !== 'ALL' && (
            <Badge variant="secondary" className="gap-1">
              Statut: {STATUT_CAUTION_OPTIONS.find((o) => o.value === statutActuel)?.label ?? statutActuel}
              <button
                type="button"
                aria-label="Retirer le filtre statut"
                onClick={() => updateParam('statut', null)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {niveauAlerteActuel !== 'ALL' && (
            <Badge variant="secondary" className="gap-1">
              Alerte: {NIVEAU_ALERTE_OPTIONS.find((o) => o.value === niveauAlerteActuel)?.label ?? niveauAlerteActuel}
              <button
                type="button"
                aria-label="Retirer le filtre niveau d'alerte"
                onClick={() => updateParam('niveauAlerte', null)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(dateEmissionDebut || dateEmissionFin) && (
            <Badge variant="secondary" className="gap-1">
              Émission: {dateEmissionDebut ? format(dateEmissionDebut, 'dd/MM/yyyy') : '…'} → {dateEmissionFin ? format(dateEmissionFin, 'dd/MM/yyyy') : '…'}
              <button
                type="button"
                aria-label="Retirer le filtre date d'émission"
                onClick={() => clearParams(['dateEmissionDebut', 'dateEmissionFin'])}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(dateEcheanceDebut || dateEcheanceFin) && (
            <Badge variant="secondary" className="gap-1">
              Échéance: {dateEcheanceDebut ? format(dateEcheanceDebut, 'dd/MM/yyyy') : '…'} → {dateEcheanceFin ? format(dateEcheanceFin, 'dd/MM/yyyy') : '…'}
              <button
                type="button"
                aria-label="Retirer le filtre date d'échéance"
                onClick={() => clearParams(['dateEcheanceDebut', 'dateEcheanceFin'])}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Panneau de filtres étendu */}
      {isExpanded && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filtre Type */}
            <div className="space-y-2">
              <Label htmlFor="filtre-type">Type de caution</Label>
              <Select
                value={typeActuel}
                onValueChange={(value) => updateParam('type', value)}
              >
                <SelectTrigger id="filtre-type">
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les types</SelectItem>
                  {TYPE_CAUTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtre Statut */}
            <div className="space-y-2">
              <Label htmlFor="filtre-statut">Statut</Label>
              <Select
                value={statutActuel}
                onValueChange={(value) => updateParam('statut', value)}
              >
                <SelectTrigger id="filtre-statut">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  {STATUT_CAUTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtre Niveau Alerte */}
            <div className="space-y-2">
              <Label htmlFor="niveau-alerte">Niveau d&apos;alerte</Label>
              <Select
                value={niveauAlerteActuel}
                onValueChange={(value) => updateParam('niveauAlerte', value)}
              >
                <SelectTrigger id="niveau-alerte">
                  <SelectValue placeholder="Tous les niveaux" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les niveaux</SelectItem>
                  {NIVEAU_ALERTE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtres de dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date émission */}
            <div className="space-y-2">
              <Label>Date d&apos;émission</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateEmissionDebut ? (
                        format(dateEmissionDebut, 'dd/MM/yyyy', { locale: fr })
                      ) : (
                        'De...'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateEmissionDebut}
                      onSelect={(date) => updateDateParam('dateEmissionDebut', date)}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateEmissionFin ? (
                        format(dateEmissionFin, 'dd/MM/yyyy', { locale: fr })
                      ) : (
                        'À...'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateEmissionFin}
                      onSelect={(date) => updateDateParam('dateEmissionFin', date)}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Date échéance */}
            <div className="space-y-2">
              <Label>Date d&apos;échéance</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateEcheanceDebut ? (
                        format(dateEcheanceDebut, 'dd/MM/yyyy', { locale: fr })
                      ) : (
                        'De...'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateEcheanceDebut}
                      onSelect={(date) => updateDateParam('dateEcheanceDebut', date)}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateEcheanceFin ? (
                        format(dateEcheanceFin, 'dd/MM/yyyy', { locale: fr })
                      ) : (
                        'À...'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateEcheanceFin}
                      onSelect={(date) => updateDateParam('dateEcheanceFin', date)}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
