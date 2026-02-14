'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import type { MarchesStats } from '@/lib/actions/marches'
import type { CautionsStats } from '@/lib/actions/cautions'
import type { VehiculesStats } from '@/lib/actions/vehicules'
import type { StatutCount } from '@/lib/dashboard/types'
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
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react'
import type { StatutMarche, TypeCaution, StatutVehicule } from '@prisma/client'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface StatusChartsProps {
  marchesStats: MarchesStats
  cautionsStats: CautionsStats
  vehiculesStats: VehiculesStats
  statutDistribution?: StatutCount[] // Données pour le Donut Chart
}

export function StatusCharts({
  marchesStats,
  cautionsStats,
  vehiculesStats,
  statutDistribution = [],
}: StatusChartsProps) {
  // Préparer les données pour les barres HTML (fallback si pas de Donut)
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

  // Préparer les données pour Recharts (format attendu par PieChart)
  const chartData = statutDistribution.map((item) => ({
    name: item.label,
    value: item.count,
    fill: item.couleur,
  }))

  // Configuration pour le Chart shadcn (optionnel car on utilise des couleurs custom)
  const chartConfig = {}

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Donut Chart - Répartition Marchés (si données disponibles) */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Répartition des marchés par statut</CardTitle>
            </div>
            <CardDescription>
              {marchesStats.total} marchés au total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[400px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length && payload[0]) {
                        const data = payload[0]
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-semibold">
                                {data.name}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {data.value} marchés ({((data.value as number / marchesStats.total) * 100).toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    content={({ payload }) => {
                      if (!payload) return null
                      return (
                        <div className="flex flex-wrap justify-center gap-3 mt-4">
                          {payload.map((entry, index) => (
                            <div key={`legend-${index}`} className="flex items-center gap-1.5">
                              <div
                                className="h-3 w-3 rounded-sm"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-xs text-muted-foreground">
                                {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Barres horizontales - Cautions et Véhicules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

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
        <Card>
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
              <div className="space-y-3">
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
    </div>
  )
}
