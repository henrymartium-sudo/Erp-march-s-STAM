import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth.config'
import { getMarchesStats } from '@/lib/actions/marches'
import { getCautionsStats } from '@/lib/actions/cautions'
import { getVehiculesStats } from '@/lib/actions/vehicules'
import { getStatutDistribution, getMontantsMensuels, getCAEffectif } from '@/lib/dashboard/stats'
import { KPICards } from '@/components/dashboard/kpi-cards'
import { StatusCharts } from '@/components/dashboard/status-charts'
import { MontantsChart } from '@/components/dashboard/montants-chart'
import { EffectiveRevenueChart } from '@/components/dashboard/effective-revenue-chart'
import { AlertsSection } from '@/components/dashboard/alerts-section'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { getOpportunitesStats } from '@/lib/actions/opportunites'
import { OpportunitesWidget } from '@/components/dashboard/opportunites-widget'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Récupérer toutes les statistiques en parallèle
  const [
    marchesStatsResult,
    cautionsStatsResult,
    vehiculesStatsResult,
    statutDistribution,
    montantsMensuels,
    caEffectif,
    opportunitesStatsResult,
  ] = await Promise.all([
    getMarchesStats(),
    getCautionsStats(),
    getVehiculesStats(),
    getStatutDistribution(),
    getMontantsMensuels(),
    getCAEffectif(),
    getOpportunitesStats(),
  ])

  // Gérer les erreurs de récupération
  const marchesStats = marchesStatsResult.success
    ? marchesStatsResult.data
    : {
        total: 0,
        parStatut: {
          OPPORTUNITE_IDENTIFIEE: 0,
          DOSSIER_EN_PREPARATION: 0,
          OFFRE_DEPOSEE: 0,
          EN_ATTENTE_ATTRIBUTION: 0,
          ATTRIBUE_PROVISOIREMENT: 0,
          ATTRIBUE_DEFINITIVEMENT: 0,
          EN_ATTENTE_LIVRAISON_OS: 0,
          EN_EXECUTION: 0,
          EXECUTE_ATTENTE_GARANTIES: 0,
          CLOTURE: 0,
          RESILIE: 0,
          ANNULE: 0,
          INFRUCTUEUX: 0,
        },
        enCours: 0,
        montantTotal: 0,
        montantEnCours: 0,
      }

  const cautionsStats = cautionsStatsResult.success
    ? cautionsStatsResult.data
    : {
        total: 0,
        actives: 0,
        expirees: 0,
        aVenir: 0,
        montantTotal: 0,
        montantActif: 0,
        parType: {
          SOUMISSION: 0,
          CAPACITE_FINANCIERE: 0,
          BONNE_EXECUTION: 0,
          AVANCE_DEMARRAGE: 0,
          RETENUE_GARANTIE: 0,
        },
        prochesEcheance: 0,
      }

  const vehiculesStats = vehiculesStatsResult.success
    ? vehiculesStatsResult.data
    : {
        total: 0,
        parStatut: {
          EN_ATTENTE_LIVRAISON: 0,
          LIVRE: 0,
          RECEPTION_PROVISOIRE: 0,
          RECEPTION_DEFINITIVE: 0,
          GARANTIE: 0,
          HORS_SERVICE: 0,
        },
        livres: 0,
        enAttenteLivraison: 0,
        enService: 0,
      }

  const opportunitesStats = opportunitesStatsResult.success
    ? opportunitesStatsResult.data
    : { total: 0, parStatut: {} }

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Tableau de bord</h1>

      {/* KPIs principaux */}
      <KPICards
        marchesStats={marchesStats}
        cautionsStats={cautionsStats}
        vehiculesStats={vehiculesStats}
      />

      {/* Alertes et échéances */}
      <AlertsSection />

      {/* Actions rapides */}
      <QuickActions />

      {/* Pipeline Opportunités */}
      <OpportunitesWidget total={opportunitesStats.total} parStatut={opportunitesStats.parStatut} />

      {/* Graphiques de répartition */}
      <StatusCharts
        marchesStats={marchesStats}
        cautionsStats={cautionsStats}
        vehiculesStats={vehiculesStats}
        statutDistribution={statutDistribution}
      />

      {/* Montants mensuels */}
      <MontantsChart data={montantsMensuels} />

      {/* CA Effectif avec filtre période */}
      <EffectiveRevenueChart data={caEffectif} />

      {/* Activité récente */}
      <RecentActivity />
    </div>
  )
}
