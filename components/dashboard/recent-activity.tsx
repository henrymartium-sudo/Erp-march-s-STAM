import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Shield, Car, Clock } from 'lucide-react'
import { getAllMarches } from '@/lib/actions/marches'
import { getCautions } from '@/lib/actions/cautions'
import { getVehicules } from '@/lib/actions/vehicules'
import { formatDate } from '@/lib/utils'
import { STATUT_MARCHE_LABELS } from '@/lib/constants/marche'
import { TYPE_CAUTION_LABELS } from '@/lib/constants/caution'
import { STATUT_VEHICULE_LABELS } from '@/lib/constants/vehicule'

export async function RecentActivity() {
  // Récupérer les dernières données
  const [marches, cautionsResult, vehiculesResult] = await Promise.all([
    getAllMarches({ limit: 5 }),
    getCautions(),
    getVehicules({ limit: 5 }),
  ])

  const cautions = cautionsResult.success
    ? cautionsResult.data.cautions.slice(0, 5)
    : []

  const vehicules = vehiculesResult.vehicules || []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Derniers marchés */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-base">Derniers marchés</CardTitle>
          </div>
          <CardDescription>Créés récemment</CardDescription>
        </CardHeader>
        <CardContent>
          {marches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun marché créé
            </p>
          ) : (
            <div className="space-y-3">
              {marches.map((marche) => (
                <Link
                  key={marche.id}
                  href={`/marches/${marche.id}`}
                  className="block p-2 rounded-md hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {marche.numero}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {marche.objet}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {formatDate(marche.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {STATUT_MARCHE_LABELS[marche.statut]}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dernières cautions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            <CardTitle className="text-base">Dernières cautions</CardTitle>
          </div>
          <CardDescription>Créées récemment</CardDescription>
        </CardHeader>
        <CardContent>
          {cautions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune caution créée
            </p>
          ) : (
            <div className="space-y-3">
              {cautions.map((caution) => (
                <Link
                  key={caution.id}
                  href={`/cautions/${caution.id}`}
                  className="block p-2 rounded-md hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {TYPE_CAUTION_LABELS[caution.type]}
                      </p>
                      {caution.marche && (
                        <p className="text-xs text-muted-foreground truncate">
                          {caution.marche.numero}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {formatDate(caution.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                          maximumFractionDigits: 0,
                        }).format(Number(caution.montant))}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Derniers véhicules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-base">Derniers véhicules</CardTitle>
          </div>
          <CardDescription>Créés récemment</CardDescription>
        </CardHeader>
        <CardContent>
          {vehicules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun véhicule créé
            </p>
          ) : (
            <div className="space-y-3">
              {vehicules.map((vehicule) => (
                <Link
                  key={vehicule.id}
                  href={`/vehicules/${vehicule.id}`}
                  className="block p-2 rounded-md hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {vehicule.immatriculation}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {vehicule.marque} {vehicule.modele}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {formatDate(vehicule.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {STATUT_VEHICULE_LABELS[vehicule.statut]}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
