import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  Shield,
  Car,
  TrendingUp,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import type { MarchesStats } from '@/lib/actions/marches'
import type { CautionsStats } from '@/lib/actions/cautions'
import type { VehiculesStats } from '@/lib/actions/vehicules'

interface KPICardsProps {
  marchesStats: MarchesStats
  cautionsStats: CautionsStats
  vehiculesStats: VehiculesStats
}

export function KPICards({ marchesStats, cautionsStats, vehiculesStats }: KPICardsProps) {
  const formatMontant = (montant: number) => {
    const formatted = new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0,
    }).format(montant)
    return `${formatted} FCFA`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Marchés */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Marchés actifs</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{marchesStats.enCours}</div>
          <p className="text-xs text-muted-foreground mt-1">
            sur {marchesStats.total} marchés au total
          </p>
          <p className="text-xs font-medium text-blue-600 mt-2">
            {formatMontant(marchesStats.montantEnCours)} en cours
          </p>
        </CardContent>
      </Card>

      {/* Montant total marchés */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valeur totale</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatMontant(marchesStats.montantTotal)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tous les marchés confondus
          </p>
        </CardContent>
      </Card>

      {/* Cautions actives */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cautions actives</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{cautionsStats.actives}</div>
          <p className="text-xs text-muted-foreground mt-1">
            sur {cautionsStats.total} cautions au total
          </p>
          <p className="text-xs font-medium text-green-600 mt-2">
            {formatMontant(cautionsStats.montantActif)} garantis
          </p>
        </CardContent>
      </Card>

      {/* Cautions proches échéance */}
      {cautionsStats.prochesEcheance > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">
              Cautions à surveiller
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {cautionsStats.prochesEcheance}
            </div>
            <p className="text-xs text-orange-700 mt-1">
              Expirent dans moins de 30 jours
            </p>
          </CardContent>
        </Card>
      )}

      {/* Véhicules */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Véhicules</CardTitle>
          <Car className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{vehiculesStats.total}</div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span className="text-muted-foreground">
                {vehiculesStats.enService} en service
              </span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-orange-600" />
              <span className="text-muted-foreground">
                {vehiculesStats.enAttenteLivraison} en attente
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Véhicules livrés */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Livraisons</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{vehiculesStats.livres}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Véhicules livrés
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
