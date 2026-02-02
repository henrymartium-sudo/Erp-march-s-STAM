'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { TypeDocument, PhaseMarche } from '@prisma/client'
import { TYPE_DOCUMENT_LABELS, PHASE_MARCHE_LABELS } from '@/lib/utils/document'
import { CalendarIcon, FilterX, Search } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { DocumentFiltersInput } from '@/lib/validations/document'

interface DocumentFiltersProps {
  filters: DocumentFiltersInput
  onFiltersChange: (filters: DocumentFiltersInput) => void
}

/**
 * Composant de filtrage des documents
 */
export function DocumentFilters({
  filters,
  onFiltersChange,
}: DocumentFiltersProps) {
  const [search, setSearch] = useState(filters.search || '')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onFiltersChange({ ...filters, search: search || undefined })
  }

  const handleReset = () => {
    setSearch('')
    onFiltersChange({})
  }

  const hasActiveFilters =
    filters.type || filters.phase || filters.dateDebut || filters.dateFin || filters.search

  return (
    <div className="space-y-4">
      {/* Recherche par nom */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par nom de document..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit">Rechercher</Button>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <FilterX className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </form>

      {/* Filtres avancés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Type de document */}
        <div className="space-y-2">
          <Label htmlFor="type-filter">Type de document</Label>
          <Select
            value={filters.type || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                type: value === 'all' ? undefined : (value as TypeDocument),
              })
            }
          >
            <SelectTrigger id="type-filter">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(TYPE_DOCUMENT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Phase du marché */}
        <div className="space-y-2">
          <Label htmlFor="phase-filter">Phase du marché</Label>
          <Select
            value={filters.phase || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                phase: value === 'all' ? undefined : (value as PhaseMarche),
              })
            }
          >
            <SelectTrigger id="phase-filter">
              <SelectValue placeholder="Toutes les phases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les phases</SelectItem>
              {Object.entries(PHASE_MARCHE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date de début */}
        <div className="space-y-2">
          <Label>Date de début</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !filters.dateDebut && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateDebut ? (
                  format(filters.dateDebut, 'dd MMM yyyy', { locale: fr })
                ) : (
                  <span>Sélectionner</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateDebut ?? undefined}
                onSelect={(date) =>
                  onFiltersChange({
                    ...filters,
                    dateDebut: date ?? undefined,
                  })
                }
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date de fin */}
        <div className="space-y-2">
          <Label>Date de fin</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !filters.dateFin && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFin ? (
                  format(filters.dateFin, 'dd MMM yyyy', { locale: fr })
                ) : (
                  <span>Sélectionner</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFin ?? undefined}
                onSelect={(date) =>
                  onFiltersChange({
                    ...filters,
                    dateFin: date ?? undefined,
                  })
                }
                disabled={(date) =>
                  filters.dateDebut ? date < filters.dateDebut : false
                }
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Indicateur de filtres actifs */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>Filtres actifs:</span>
          {filters.type && (
            <span className="px-2 py-1 bg-secondary rounded-md">
              {TYPE_DOCUMENT_LABELS[filters.type]}
            </span>
          )}
          {filters.phase && (
            <span className="px-2 py-1 bg-secondary rounded-md">
              {PHASE_MARCHE_LABELS[filters.phase]}
            </span>
          )}
          {filters.dateDebut && (
            <span className="px-2 py-1 bg-secondary rounded-md">
              Depuis {format(filters.dateDebut, 'dd/MM/yyyy')}
            </span>
          )}
          {filters.dateFin && (
            <span className="px-2 py-1 bg-secondary rounded-md">
              Jusqu'au {format(filters.dateFin, 'dd/MM/yyyy')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
