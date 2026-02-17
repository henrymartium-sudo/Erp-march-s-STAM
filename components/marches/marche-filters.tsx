'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { STATUT_LABELS } from '@/lib/utils/statut'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

const TYPE_LABELS = {
  TRAVAUX: 'Travaux',
  FOURNITURES: 'Fournitures',
  SERVICES: 'Services',
  PRESTATIONS_INTELLECTUELLES: 'Prestations intellectuelles',
}

interface MarcheFiltersProps {
  totalCount: number
  filteredCount: number
}

export function MarcheFilters({ totalCount, filteredCount }: MarcheFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const statutActuel = searchParams.get('statut') || 'tous'
  const typeActuel = searchParams.get('type') || 'tous'

  // État de recherche
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Synchronisation URL avec recherche debouncée
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (debouncedSearch) {
      params.set('search', debouncedSearch)
    } else {
      params.delete('search')
    }

    router.push(`/marches?${params.toString()}`)
  }, [debouncedSearch, router, searchParams])

  const handleStatutChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'tous') {
      params.delete('statut')
    } else {
      params.set('statut', value)
    }

    router.push(`/marches?${params.toString()}`)
  }

  const handleTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'tous') {
      params.delete('type')
    } else {
      params.set('type', value)
    }

    router.push(`/marches?${params.toString()}`)
  }

  const handleReset = () => {
    setSearchQuery('')
    router.push('/marches')
  }

  const hasFilters = statutActuel !== 'tous' || typeActuel !== 'tous' || searchQuery !== ''

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card">
      {/* Barre principale : recherche + dropdowns + reset */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3">

        {/* Recherche — flex-1 */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher un marché..."
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
          <Select value={statutActuel} onValueChange={handleStatutChange}>
            <SelectTrigger className="w-40 h-10">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              {Object.entries(STATUT_LABELS)
                .filter(([value]) => !['RESILIE', 'ANNULE', 'INFRUCTUEUX'].includes(value))
                .map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Terminés</SelectLabel>
                {['RESILIE', 'ANNULE', 'INFRUCTUEUX']
                  .filter(value => STATUT_LABELS[value as keyof typeof STATUT_LABELS])
                  .map((value) => (
                    <SelectItem key={value} value={value}>
                      {STATUT_LABELS[value as keyof typeof STATUT_LABELS]}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={typeActuel} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-40 h-10">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
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

      {/* Compteur de résultats */}
      <div className="px-4 py-2 border-t border-gray-50">
        <p className="text-xs text-muted-foreground">
          {searchQuery && filteredCount === 0 ? (
            <>Aucun résultat pour <span className="font-semibold text-foreground">"{searchQuery}"</span></>
          ) : hasFilters ? (
            <><span className="font-semibold text-foreground">{filteredCount}</span> résultat{filteredCount > 1 ? 's' : ''} sur {totalCount}</>
          ) : (
            <><span className="font-semibold text-foreground">{totalCount}</span> marché{totalCount > 1 ? 's' : ''} au total</>
          )}
        </p>
      </div>
    </div>
  )
}
