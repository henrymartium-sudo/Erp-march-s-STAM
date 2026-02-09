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
    <div className="bg-white p-4 rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filtres</h3>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Recherche */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Recherche</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Filtre par statut */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Statut</label>
            <Select value={statutActuel} onValueChange={handleStatutChange}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                {Object.entries(STATUT_VEHICULE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtre par marque */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Marque</label>
            <Select value={marqueActuelle} onValueChange={handleMarqueChange}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes les marques" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes les marques</SelectItem>
                {MARQUES_VEHICULES.map((marque) => (
                  <SelectItem key={marque} value={marque}>
                    {marque}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Nombre de résultats */}
      <div className="pt-2 border-t">
        <p className="text-sm text-muted-foreground">
          {searchInput && filteredCount === 0 ? (
            <>
              Aucun résultat pour <span className="font-semibold text-foreground">"{searchInput}"</span>
            </>
          ) : hasFilters ? (
            <>
              <span className="font-semibold text-foreground">{filteredCount}</span> résultat
              {filteredCount > 1 ? 's' : ''} sur {totalCount}
            </>
          ) : (
            <>
              <span className="font-semibold text-foreground">{totalCount}</span> véhicule
              {totalCount > 1 ? 's' : ''} au total
            </>
          )}
        </p>
      </div>
    </div>
  )
}
