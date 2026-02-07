import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MarchesStats } from '@/lib/actions/marches'
import type { CautionsStats } from '@/lib/actions/cautions'
import type { VehiculesStats } from '@/lib/actions/vehicules'
import {
  STATUT_MARCHE_LABELS,
  STATUT_MARCHE_COLORS,
} from '@/lib/constants/marche'
import {
  TYPE_CAUTION_LABELS,
} from '@/lib/constants/caution'
import {
  STATUT_VEHICULE_LABELS,
  STATUT_VEHICULE_COLORS_CHART,
} from '@/lib/constants/vehicule'
import { BarChart3 } from 'lucide-react'
import type { StatutMarche, TypeCaution, StatutVehicule } from '@prisma/client'

interface StatusChartsProps {
  marchesStats: MarchesStats
  cautionsStats: CautionsStats
  vehiculesStats: VehiculesStats
}

export function StatusCharts({
  marchesStats,
  cautionsStats,
  vehiculesStats,
}: StatusChartsProps) {
  // Préparer les données pour les graphiques
  const marchesData = Object.entries(marchesStats.parStatut)
    .filter(([, count]) => count > 0)
    .map(([statut, count]) => ({
      label: STATUT_MARCHE_LABELS[statut as StatutMarche],
      count,
      percentage: (count / marchesStats.total) * 100,
      color: STATUT_MARCHE_COLORS[statut as StatutMarche],
    }))
    .sort((a, b) => b.count - a.count)

  const cautionsData = Object.entries(cautionsStats.parType)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      label: TYPE_CAUTION_LABELS[type as TypeCaution],
      count,
      percentage: (count / cautionsStats.total) * 100,
      color: 'bg-green-500', // Couleur par défaut pour les cautions
    }))
    .sort((a, b) => b.count - a.count)

  const vehiculesData = Object.entries(vehiculesStats.parStatut)
    .filter(([, count]) => count > 0)
    .map(([statut, count]) => ({
      label: STATUT_VEHICULE_LABELS[statut as StatutVehicule],
      count,
      percentage: (count / vehiculesStats.total) * 100,
      color: STATUT_VEHICULE_COLORS_CHART[statut as StatutVehicule],
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Répartition Marchés */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-base">Répartition des marchés</CardTitle>
          </div>
          <CardDescription>Par statut</CardDescription>
        </CardHeader>
        <CardContent>
          {marchesData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune donnée disponible
            </p>
          ) : (
            <div className="space-y-3">
              {marchesData.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.count} ({Math.round(item.percentage)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Répartition Cautions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-green-600" />
            <CardTitle className="text-base">Répartition des cautions</CardTitle>
          </div>
          <CardDescription>Par type</CardDescription>
        </CardHeader>
        <CardContent>
          {cautionsData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune donnée disponible
            </p>
          ) : (
            <div className="space-y-3">
              {cautionsData.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.count} ({Math.round(item.percentage)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Répartition Véhicules */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-base">Répartition des véhicules</CardTitle>
          </div>
          <CardDescription>Par statut</CardDescription>
        </CardHeader>
        <CardContent>
          {vehiculesData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune donnée disponible
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehiculesData.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.count}
                    </Badge>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(item.percentage)}% du total
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
