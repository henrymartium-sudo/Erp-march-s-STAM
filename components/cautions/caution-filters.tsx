'use client';

import { useState } from 'react';
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
import { X, Filter, CalendarIcon, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  TYPE_CAUTION_OPTIONS,
  STATUT_CAUTION_OPTIONS,
} from '@/lib/constants/caution';
import type { TypeCaution, StatutCaution } from '@prisma/client';
import type { NiveauAlerte } from '@/lib/utils/caution';

export interface CautionFiltersState {
  search?: string;
  types?: TypeCaution[];
  statuts?: StatutCaution[];
  dateEmissionDebut?: Date;
  dateEmissionFin?: Date;
  dateEcheanceDebut?: Date;
  dateEcheanceFin?: Date;
  niveauAlerte?: NiveauAlerte;
}

interface CautionFiltersProps {
  filters: CautionFiltersState;
  onFiltersChange: (filters: CautionFiltersState) => void;
  className?: string;
}

const NIVEAU_ALERTE_OPTIONS = [
  { value: 'CRITIQUE', label: '🔴 Critique' },
  { value: 'ATTENTION', label: '🟠 Attention' },
  { value: 'INFO', label: '🟡 Info' },
  { value: 'EXPIRE', label: '⚫ Expirée' },
  { value: 'AUCUN', label: '🟢 OK' },
] as const;

/**
 * Composant de filtrage avancé pour les cautions
 * Permet de filtrer par type, statut, dates, niveau d'alerte et recherche textuelle
 */
export function CautionFilters({
  filters,
  onFiltersChange,
  className,
}: CautionFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.types?.length ||
    filters.statuts?.length ||
    filters.dateEmissionDebut ||
    filters.dateEmissionFin ||
    filters.dateEcheanceDebut ||
    filters.dateEcheanceFin ||
    filters.niveauAlerte
  );

  const activeFiltersCount = [
    filters.search,
    filters.types?.length,
    filters.statuts?.length,
    filters.dateEmissionDebut,
    filters.dateEmissionFin,
    filters.dateEcheanceDebut,
    filters.dateEcheanceFin,
    filters.niveauAlerte,
  ].filter(Boolean).length;

  const handleReset = () => {
    onFiltersChange({});
  };

  const toggleType = (type: TypeCaution) => {
    const current = filters.types || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onFiltersChange({ ...filters, types: updated.length ? updated : undefined });
  };

  const toggleStatut = (statut: StatutCaution) => {
    const current = filters.statuts || [];
    const updated = current.includes(statut)
      ? current.filter((s) => s !== statut)
      : [...current, statut];
    onFiltersChange({ ...filters, statuts: updated.length ? updated : undefined });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Barre de recherche et bouton filtres */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par référence, banque..."
            value={filters.search || ''}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value || undefined })
            }
            className="w-full"
          />
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
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.types?.map((type) => (
            <Badge key={type} variant="secondary" className="gap-1">
              Type: {TYPE_CAUTION_OPTIONS.find(o => o.value === type)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => toggleType(type)}
              />
            </Badge>
          ))}
          {filters.statuts?.map((statut) => (
            <Badge key={statut} variant="secondary" className="gap-1">
              Statut: {STATUT_CAUTION_OPTIONS.find(o => o.value === statut)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => toggleStatut(statut)}
              />
            </Badge>
          ))}
          {filters.niveauAlerte && (
            <Badge variant="secondary" className="gap-1">
              Alerte: {NIVEAU_ALERTE_OPTIONS.find(o => o.value === filters.niveauAlerte)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, niveauAlerte: undefined })}
              />
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
              <Label>Type de caution</Label>
              <div className="space-y-1">
                {TYPE_CAUTION_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.types?.includes(option.value as TypeCaution)}
                      onChange={() => toggleType(option.value as TypeCaution)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtre Statut */}
            <div className="space-y-2">
              <Label>Statut</Label>
              <div className="space-y-1">
                {STATUT_CAUTION_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.statuts?.includes(option.value as StatutCaution)}
                      onChange={() => toggleStatut(option.value as StatutCaution)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtre Niveau Alerte */}
            <div className="space-y-2">
              <Label htmlFor="niveau-alerte">Niveau d&apos;alerte</Label>
              <Select
                value={filters.niveauAlerte || ''}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    niveauAlerte: value ? (value as NiveauAlerte) : undefined,
                  })
                }
              >
                <SelectTrigger id="niveau-alerte">
                  <SelectValue placeholder="Tous les niveaux" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les niveaux</SelectItem>
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
                      {filters.dateEmissionDebut ? (
                        format(filters.dateEmissionDebut, 'dd/MM/yyyy', { locale: fr })
                      ) : (
                        'De...'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateEmissionDebut}
                      onSelect={(date) =>
                        onFiltersChange({ ...filters, dateEmissionDebut: date })
                      }
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateEmissionFin ? (
                        format(filters.dateEmissionFin, 'dd/MM/yyyy', { locale: fr })
                      ) : (
                        'À...'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateEmissionFin}
                      onSelect={(date) =>
                        onFiltersChange({ ...filters, dateEmissionFin: date })
                      }
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
                      {filters.dateEcheanceDebut ? (
                        format(filters.dateEcheanceDebut, 'dd/MM/yyyy', { locale: fr })
                      ) : (
                        'De...'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateEcheanceDebut}
                      onSelect={(date) =>
                        onFiltersChange({ ...filters, dateEcheanceDebut: date })
                      }
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateEcheanceFin ? (
                        format(filters.dateEcheanceFin, 'dd/MM/yyyy', { locale: fr })
                      ) : (
                        'À...'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateEcheanceFin}
                      onSelect={(date) =>
                        onFiltersChange({ ...filters, dateEcheanceFin: date })
                      }
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
