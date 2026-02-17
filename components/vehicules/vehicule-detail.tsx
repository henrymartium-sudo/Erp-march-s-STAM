import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatutBadge } from './statut-badge'
import { DeleteVehiculeDialog } from './delete-vehicule-dialog'
import { formatDateLong } from '@/lib/utils/format'
import { Pencil, Truck, FileText } from 'lucide-react'
import type { SerializedVehicule } from '@/types/serialized'

interface VehiculeDetailProps {
  vehicule: SerializedVehicule
}

export function VehiculeDetail({ vehicule }: VehiculeDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header 2 colonnes : identité + statut/actions */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-mono-marche text-stam-accent font-semibold text-base leading-tight">
            {vehicule.immatriculation}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            {vehicule.marque} {vehicule.modele}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Année {vehicule.annee}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatutBadge statut={vehicule.statut} size="lg" />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/vehicules/${vehicule.id}/edit`}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Modifier
            </Link>
          </Button>
          <DeleteVehiculeDialog vehiculeId={vehicule.id} vehiculeImmat={vehicule.immatriculation} />
        </div>
      </div>

      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Immatriculation</p>
              <p className="text-sm mt-1 font-semibold">{vehicule.immatriculation}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Marque</p>
              <p className="text-sm mt-1">{vehicule.marque}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Modèle</p>
              <p className="text-sm mt-1">{vehicule.modele}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Année</p>
              <p className="text-sm mt-1">{vehicule.annee}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Statut</p>
              <div className="mt-1">
                <StatutBadge statut={vehicule.statut} size="sm" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dates et livraison */}
      <Card>
        <CardHeader>
          <CardTitle>Dates et livraison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicule.dateLivraison && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Date de livraison
                </p>
                <p className="text-sm mt-1">
                  {formatDateLong(vehicule.dateLivraison)}
                </p>
              </div>
            )}
            {vehicule.bonLivraisonRef && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Référence bon de livraison
                </p>
                <p className="text-sm mt-1 font-mono">{vehicule.bonLivraisonRef}</p>
              </div>
            )}
            {vehicule.dateReceptionProvisoire && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Date de réception provisoire
                </p>
                <p className="text-sm mt-1">
                  {formatDateLong(vehicule.dateReceptionProvisoire)}
                </p>
              </div>
            )}
            {vehicule.dateReceptionDefinitive && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Date de réception définitive
                </p>
                <p className="text-sm mt-1">
                  {formatDateLong(vehicule.dateReceptionDefinitive)}
                </p>
              </div>
            )}
          </div>

          {!vehicule.dateLivraison &&
            !vehicule.bonLivraisonRef &&
            !vehicule.dateReceptionProvisoire &&
            !vehicule.dateReceptionDefinitive && (
              <p className="text-sm text-muted-foreground italic">
                Aucune information de livraison/réception renseignée
              </p>
            )}
        </CardContent>
      </Card>

      {/* Réserves */}
      {vehicule.reservesReception && (
        <Card>
          <CardHeader>
            <CardTitle>Réserves à la réception</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{vehicule.reservesReception}</p>
          </CardContent>
        </Card>
      )}

      {/* Marché associé */}
      {vehicule.marche && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Marché associé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold">{vehicule.marche.numero}</p>
                  <p className="text-sm text-muted-foreground">
                    {vehicule.marche.objet}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/marches/${vehicule.marche.id}`}>
                    <FileText className="h-4 w-4 mr-2" />
                    Voir le marché
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métadonnées */}
      <Card>
        <CardHeader>
          <CardTitle>Informations système</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Date de création</p>
              <p className="mt-1">{formatDateLong(vehicule.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dernière modification</p>
              <p className="mt-1">{formatDateLong(vehicule.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
