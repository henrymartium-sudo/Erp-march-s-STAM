'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TypeDocument, PhaseMarche } from '@prisma/client'
import { TYPE_DOCUMENT_LABELS, PHASE_MARCHE_LABELS } from '@/lib/utils/document'
import { Search, X } from 'lucide-react'
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
    <div className="bg-white rounded-xl border border-gray-100 shadow-card">
      {/* Barre principale : recherche + dropdowns + reset */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3">

        {/* Recherche — flex-1 */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Dropdowns compacts */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Select value={typeActuel} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-44 h-10">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(TYPE_DOCUMENT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={phaseActuel} onValueChange={handlePhaseChange}>
            <SelectTrigger className="w-44 h-10">
              <SelectValue placeholder="Phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les phases</SelectItem>
              {Object.entries(PHASE_MARCHE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <X className="h-4 w-4 mr-1.5" />
              Effacer
            </Button>
          )}
        </div>
      </div>

      {/* Filtres actifs — badges discrets */}
      {hasActiveFilters && (
        <div className="px-4 py-2 border-t border-gray-50 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Actifs :</span>
          {typeActuel !== 'all' && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/8 text-primary rounded-full px-2 py-0.5">
              {TYPE_DOCUMENT_LABELS[typeActuel as TypeDocument]}
            </span>
          )}
          {phaseActuel !== 'all' && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/8 text-primary rounded-full px-2 py-0.5">
              {PHASE_MARCHE_LABELS[phaseActuel as PhaseMarche]}
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/8 text-primary rounded-full px-2 py-0.5">
              &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </div>
      )}
    </div>
  )
}
