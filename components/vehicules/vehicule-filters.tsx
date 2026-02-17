'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { STATUT_VEHICULE_LABELS, MARQUES_VEHICULES } from '@/lib/constants/vehicule'
import { X, Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

interface VehiculeFiltersProps {
  totalCount: number
  filteredCount: number
}

export function VehiculeFilters({ totalCount, filteredCount }: VehiculeFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const debouncedSearch = useDebounce(searchInput, 300)

  const statutActuel = searchParams.get('statut') || 'tous'
  const marqueActuelle = searchParams.get('marque') || 'toutes'

  // Mettre à jour l'URL quand la recherche change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (debouncedSearch) {
      params.set('search', debouncedSearch)
    } else {
      params.delete('search')
    }

    router.push(`/vehicules?${params.toString()}`)
  }, [debouncedSearch, router, searchParams])

  const handleStatutChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'tous') {
      params.delete('statut')
    } else {
      params.set('statut', value)
    }

    router.push(`/vehicules?${params.toString()}`)
  }

  const handleMarqueChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'toutes') {
      params.delete('marque')
    } else {
      params.set('marque', value)
    }

    router.push(`/vehicules?${params.toString()}`)
  }

  const handleReset = () => {
    setSearchInput('')
    router.push('/vehicules')
  }

  const hasFilters =
    statutActuel !== 'tous' ||
    marqueActuelle !== 'toutes' ||
    searchInput !== ''

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card">
      {/* Barre principale : recherche + dropdowns + reset */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3">

        {/* Recherche — flex-1 */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Rechercher un véhicule..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchInput('')}
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
              {Object.entries(STATUT_VEHICULE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={marqueActuelle} onValueChange={handleMarqueChange}>
            <SelectTrigger className="w-40 h-10">
              <SelectValue placeholder="Marque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les marques</SelectItem>
              {MARQUES_VEHICULES.map((marque) => (
                <SelectItem key={marque} value={marque}>{marque}</SelectItem>
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
          {searchInput && filteredCount === 0 ? (
            <>Aucun résultat pour <span className="font-semibold text-foreground">"{searchInput}"</span></>
          ) : hasFilters ? (
            <><span className="font-semibold text-foreground">{filteredCount}</span> résultat{filteredCount > 1 ? 's' : ''} sur {totalCount}</>
          ) : (
            <><span className="font-semibold text-foreground">{totalCount}</span> véhicule{totalCount > 1 ? 's' : ''} au total</>
          )}
        </p>
      </div>
    </div>
  )
}
