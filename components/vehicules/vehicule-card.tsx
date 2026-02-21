'use client'

import Link from 'next/link'
import { StatutBadge } from './statut-badge'
import { formatDateCourt } from '@/lib/utils/format'
import { Eye, Pencil, Calendar, Truck, Car } from 'lucide-react'
import type { SerializedVehicule } from '@/types/serialized'
import type { StatutVehicule } from '@prisma/client'

interface VehiculeCardProps {
  vehicule: SerializedVehicule
}

/* Barre couleur en haut de la card selon le statut */
const STATUT_TOP_COLOR: Record<StatutVehicule, string> = {
  EN_ATTENTE_LIVRAISON: 'bg-amber-400',
  LIVRE:                'bg-green-400',
  RECEPTION_PROVISOIRE: 'bg-orange-400',
  RECEPTION_DEFINITIVE: 'bg-emerald-400',
  GARANTIE:             'bg-blue-400',
  HORS_SERVICE:         'bg-red-400',
}

export function VehiculeCard({ vehicule }: VehiculeCardProps) {
  const accentBar = STATUT_TOP_COLOR[vehicule.statut]

  return (
    <div className="group bg-white rounded-xl border border-gray-100 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">

      {/* Barre couleur statut */}
      <div className={`h-1 w-full ${accentBar}`} />

      {/* Lien principal */}
      <Link href={`/vehicules/${vehicule.id}`} className="flex-1 flex flex-col p-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="font-mono-marche text-stam-accent font-semibold leading-tight truncate">
              {vehicule.immatriculation}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {vehicule.marque} {vehicule.modele}
            </p>
          </div>
          <StatutBadge statut={vehicule.statut} size="sm" />
        </div>

        {/* Infos clés */}
        <div className="space-y-2 mt-auto">
          <div className="flex items-center gap-2 text-sm">
            <Car className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Année</span>
            <span className="ml-auto font-semibold text-foreground">{vehicule.annee}</span>
          </div>

          {vehicule.dateLivraison && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Livraison</span>
              <span className="ml-auto text-foreground">{formatDateCourt(vehicule.dateLivraison)}</span>
            </div>
          )}

          {vehicule.marches && vehicule.marches.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground truncate max-w-[55%]">
                {vehicule.marches.length === 1
                  ? `Marché ${vehicule.marches[0]?.numero ?? ''}`
                  : `${vehicule.marches.length} marchés`}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Footer actions */}
      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2 bg-gray-50/50">
        <Link
          href={`/vehicules/${vehicule.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-stam-accent hover:text-stam-accent/80 py-1.5 px-3 rounded-lg hover:bg-blue-50 transition-colors duration-150"
        >
          <Eye className="h-3.5 w-3.5" />
          Voir détails
        </Link>
        <div className="w-px h-4 bg-gray-200" />
        <Link
          href={`/vehicules/${vehicule.id}/edit`}
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground py-1.5 px-3 rounded-lg hover:bg-gray-100 transition-colors duration-150"
        >
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </Link>
      </div>
    </div>
  )
}
