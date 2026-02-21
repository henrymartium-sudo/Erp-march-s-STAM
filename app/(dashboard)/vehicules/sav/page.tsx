import { auth } from '@/lib/auth/auth.config'
import { redirect } from 'next/navigation'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getInterventionsGlobales } from '@/lib/actions/interventions'
import { getMetriquesSAVGlobales } from '@/lib/sav/metrics'
import { StatutInterventionBadge } from '@/components/interventions/statut-intervention-badge'
import { TYPE_INTERVENTION_LABELS } from '@/lib/constants/intervention'
import { formatDateLong } from '@/lib/utils/format'
import Link from 'next/link'
import { Wrench, AlertTriangle, Shield, Truck } from 'lucide-react'
import type { InterventionWithVehicule } from '@/lib/actions/interventions'

export const dynamic = 'force-dynamic'

export default async function SAVPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [interventionsResult, metriques] = await Promise.all([
    getInterventionsGlobales({ limit: 50 }),
    getMetriquesSAVGlobales(),
  ])

  const interventions: InterventionWithVehicule[] = interventionsResult.success
    ? interventionsResult.data.data
    : []

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        showHome
        items={[
          { label: 'Véhicules', href: '/vehicules' },
          { label: 'SAV — Vue globale' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SAV — Vue globale</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivi des interventions sur l&apos;ensemble du parc
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{metriques.totalInterventions}</p>
                <p className="text-xs text-muted-foreground">Total interventions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{metriques.enCours}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{metriques.sousGarantie}</p>
                <p className="text-xs text-muted-foreground">Sous garantie</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{metriques.vehiculesImmobilises}</p>
                <p className="text-xs text-muted-foreground">Véhicules immobilisés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste interventions */}
      <Card>
        <CardHeader>
          <CardTitle>Dernières interventions</CardTitle>
        </CardHeader>
        <CardContent>
          {interventions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">
              Aucune intervention enregistrée
            </p>
          ) : (
            <div className="space-y-3">
              {interventions.map((intervention) => (
                <div
                  key={intervention.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatutInterventionBadge statut={intervention.statut} size="sm" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                        {TYPE_INTERVENTION_LABELS[intervention.type]}
                        {intervention.sousGarantie && (
                          <Badge variant="default" className="text-xs">Garantie</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {intervention.vehicule?.immatriculation} —{' '}
                        {intervention.vehicule?.marque} {intervention.vehicule?.modele}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {formatDateLong(intervention.signaleAt.toISOString())}
                    </span>
                    <Link
                      href={`/vehicules/${intervention.vehiculeId}`}
                      className="text-xs text-stam-accent hover:underline"
                    >
                      Voir →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
