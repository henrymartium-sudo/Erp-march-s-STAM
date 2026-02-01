'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { STATUT_LABELS } from '@/lib/utils/statut'
import { X } from 'lucide-react'

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
    router.push('/marches')
  }

  const hasFilters = statutActuel !== 'tous' || typeActuel !== 'tous'

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
        </div>

        {/* Filtre par type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Type de marché</label>
          <Select value={typeActuel} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Nombre de résultats */}
      <div className="pt-2 border-t">
        <p className="text-sm text-muted-foreground">
          {hasFilters ? (
            <>
              <span className="font-semibold text-foreground">{filteredCount}</span> résultat
              {filteredCount > 1 ? 's' : ''} sur {totalCount}
            </>
          ) : (
            <>
              <span className="font-semibold text-foreground">{totalCount}</span> marché
              {totalCount > 1 ? 's' : ''} au total
            </>
          )}
        </p>
      </div>
    </div>
  )
}
