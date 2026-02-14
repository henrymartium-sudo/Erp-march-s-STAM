import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth.config'
import { getMarchesStats } from '@/lib/actions/marches'
import { getCautionsStats } from '@/lib/actions/cautions'
import { getVehiculesStats } from '@/lib/actions/vehicules'
import { getStatutDistribution } from '@/lib/dashboard/stats'
import { KPICards } from '@/components/dashboard/kpi-cards'
import { StatusCharts } from '@/components/dashboard/status-charts'
import { AlertsSection } from '@/components/dashboard/alerts-section'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { QuickActions } from '@/components/dashboard/quick-actions'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Récupérer toutes les statistiques en parallèle
  const [marchesStatsResult, cautionsStatsResult, vehiculesStatsResult, statutDistribution] =
    await Promise.all([
      getMarchesStats(),
      getCautionsStats(),
      getVehiculesStats(),
      getStatutDistribution(),
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

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de vos marchés publics, cautions et véhicules
        </p>
      </div>

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

      {/* Graphiques de répartition */}
      <StatusCharts
        marchesStats={marchesStats}
        cautionsStats={cautionsStats}
        vehiculesStats={vehiculesStats}
        statutDistribution={statutDistribution}
      />

      {/* Activité récente */}
      <RecentActivity />
    </div>
  )
}
