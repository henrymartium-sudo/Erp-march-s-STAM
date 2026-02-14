'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { TypeDocument, PhaseMarche } from '@prisma/client'
import { TYPE_DOCUMENT_LABELS, PHASE_MARCHE_LABELS } from '@/lib/utils/document'
import { FilterX, Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

/**
 * Composant de filtrage des documents
 */
export function DocumentFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const typeActuel = searchParams.get('type') || 'all'
  const phaseActuel = searchParams.get('phase') || 'all'

  // État de recherche
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Synchronisation URL avec recherche debouncée
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (debouncedSearch) {
      params.set('search', debouncedSearch)
      // Reset page quand la recherche change
      params.delete('page')
    } else {
      params.delete('search')
    }

    router.push(`/documents?${params.toString()}`)
  }, [debouncedSearch, router, searchParams])

  const handleTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'all') {
      params.delete('type')
    } else {
      params.set('type', value)
    }

    // Reset page quand les filtres changent
    params.delete('page')

    router.push(`/documents?${params.toString()}`)
  }

  const handlePhaseChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'all') {
      params.delete('phase')
    } else {
      params.set('phase', value)
    }

    // Reset page quand les filtres changent
    params.delete('page')

    router.push(`/documents?${params.toString()}`)
  }

  const handleReset = () => {
    setSearchQuery('')
    router.push('/documents')
  }

  const hasActiveFilters =
    typeActuel !== 'all' || phaseActuel !== 'all' || searchQuery

  return (
    <div className="space-y-4">
      {/* Recherche par nom */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
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
      </div>

      {/* Filtres avancés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* Type de document */}
        <div className="space-y-2">
          <Label htmlFor="type-filter">Type de document</Label>
          <Select value={typeActuel} onValueChange={handleTypeChange}>
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
          <Select value={phaseActuel} onValueChange={handlePhaseChange}>
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
      </div>

      {/* Indicateur de filtres actifs */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>Filtres actifs:</span>
          {typeActuel !== 'all' && (
            <span className="px-2 py-1 bg-secondary rounded-md">
              {TYPE_DOCUMENT_LABELS[typeActuel as TypeDocument]}
            </span>
          )}
          {phaseActuel !== 'all' && (
            <span className="px-2 py-1 bg-secondary rounded-md">
              {PHASE_MARCHE_LABELS[phaseActuel as PhaseMarche]}
            </span>
          )}
          {searchQuery && (
            <span className="px-2 py-1 bg-secondary rounded-md">
              Recherche: "{searchQuery}"
            </span>
          )}
        </div>
      )}
    </div>
  )
}
