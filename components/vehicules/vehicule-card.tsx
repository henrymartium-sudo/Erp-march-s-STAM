'use client'

import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatutBadge } from './statut-badge'
import { formatDateCourt } from '@/lib/utils/format'
import { Eye, Pencil, Calendar, Truck } from 'lucide-react'
import type { SerializedVehicule } from '@/types/serialized'

interface VehiculeCardProps {
  vehicule: SerializedVehicule
}

export function VehiculeCard({ vehicule }: VehiculeCardProps) {
  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <h3 className="font-semibold text-lg">{vehicule.immatriculation}</h3>
            <p className="text-sm text-muted-foreground">
              {vehicule.marque} {vehicule.modele}
            </p>
          </div>
          <StatutBadge statut={vehicule.statut} size="sm" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Informations principales */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Année:</span>
            <span className="font-medium">{vehicule.annee}</span>
          </div>

          {vehicule.dateLivraison && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Livraison</span>
              <span>{formatDateCourt(vehicule.dateLivraison)}</span>
            </div>
          )}

          {vehicule.dateReceptionDefinitive && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Réception définitive</span>
              <span>{formatDateCourt(vehicule.dateReceptionDefinitive)}</span>
            </div>
          )}
        </div>

        {/* Marché associé */}
        {vehicule.marche && (
          <div className="pt-2 border-t">
            <div className="flex items-start gap-2">
              <Truck className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Marché</p>
                <Link
                  href={`/marches/${vehicule.marche.id}`}
                  className="text-sm font-medium text-primary hover:underline truncate block"
                  onClick={(e) => e.stopPropagation()}
                >
                  {vehicule.marche.numero}
                </Link>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t pt-4 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link href={`/vehicules/${vehicule.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            Voir détails
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/vehicules/${vehicule.id}/edit`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
