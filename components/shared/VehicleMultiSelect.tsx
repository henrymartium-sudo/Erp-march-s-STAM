'use client'

/**
 * Composant multi-sélection de véhicules
 * Utilisé dans le formulaire marché pour associer plusieurs véhicules
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ChevronDown, Truck, X } from 'lucide-react'

export interface VehiculeSummary {
  id: string
  immatriculation: string
  marque: string
  modele: string
  annee: number | null
}

interface VehicleMultiSelectProps {
  vehicules: VehiculeSummary[]
  value: string[]
  onChange: (ids: string[]) => void
}

export function VehicleMultiSelect({
  vehicules,
  value,
  onChange,
}: VehicleMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedVehicules = vehicules.filter((v) => value.includes(v.id))

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    onChange(value.filter((v) => v !== id))
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground">
              {value.length === 0
                ? 'Sélectionner des véhicules…'
                : `${value.length} véhicule${value.length > 1 ? 's' : ''} sélectionné${value.length > 1 ? 's' : ''}`}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0" align="start">
          <div className="max-h-64 overflow-y-auto p-2">
            {vehicules.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2 text-center">
                Aucun véhicule disponible
              </p>
            ) : (
              vehicules.map((vehicule) => (
                <div
                  key={vehicule.id}
                  role="checkbox"
                  aria-checked={value.includes(vehicule.id)}
                  tabIndex={0}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={() => toggle(vehicule.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggle(vehicule.id)
                    }
                  }}
                >
                  {/* Purement présentationnel : le toggle est piloté par le conteneur
                      (sinon un clic direct sur la case déclenchait deux fois le toggle) */}
                  <Checkbox
                    checked={value.includes(vehicule.id)}
                    tabIndex={-1}
                    aria-hidden
                    className="pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-mono">{vehicule.immatriculation}</p>
                    <p className="text-xs text-muted-foreground">
                      {vehicule.marque} {vehicule.modele}
                      {vehicule.annee ? ` • ${vehicule.annee}` : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Badges des véhicules sélectionnés */}
      {selectedVehicules.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedVehicules.map((v) => (
            <Badge key={v.id} variant="secondary" className="gap-1.5 pr-1">
              <Truck className="h-3 w-3" />
              {v.immatriculation}
              <button
                type="button"
                onClick={(e) => remove(v.id, e)}
                className="ml-1 rounded-sm opacity-70 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
