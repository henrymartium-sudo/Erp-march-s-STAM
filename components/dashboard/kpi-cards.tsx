import {
  FileText,
  Shield,
  Car,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import type { MarchesStats } from '@/lib/actions/marches'
import type { CautionsStats } from '@/lib/actions/cautions'
import type { VehiculesStats } from '@/lib/actions/vehicules'

interface KPICardsProps {
  marchesStats: MarchesStats
  cautionsStats: CautionsStats
  vehiculesStats: VehiculesStats
}

const formatMontant = (montant: number) => {
  if (montant >= 1_000_000_000) return `${(montant / 1_000_000_000).toFixed(1)} Md`
  if (montant >= 1_000_000) return `${(montant / 1_000_000).toFixed(1)} M`
  if (montant >= 1_000) return `${(montant / 1_000).toFixed(0)} k`
  return `${montant}`
}

const formatMontantFull = (montant: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(montant) + ' FCFA'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  highlight?: string
  highlightColor?: string
  icon: React.ReactNode
  iconBg: string
  warning?: boolean
}

function KPICard({
  title,
  value,
  subtitle,
  highlight,
  highlightColor = 'text-stam-accent',
  icon,
  iconBg,
  warning = false,
}: KPICardProps) {
  return (
    <div
      className={[
        'bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4',
        'shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-default',
        warning ? 'border-l-4 border-l-amber-400' : '',
      ].join(' ')}
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-tight mb-1">
          {title}
        </p>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 leading-snug">{subtitle}</p>
        )}
        {highlight && (
          <p className={`text-xs font-semibold mt-1.5 leading-snug ${highlightColor}`}>
            {highlight}
          </p>
        )}
      </div>
    </div>
  )
}

export function KPICards({ marchesStats, cautionsStats, vehiculesStats }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Marchés actifs */}
      <KPICard
        title="Marchés actifs"
        value={marchesStats.enCours}
        subtitle={`sur ${marchesStats.total} marchés au total`}
        highlight={`${formatMontant(marchesStats.montantEnCours)} FCFA en cours`}
        highlightColor="text-stam-accent"
        icon={<FileText className="h-5 w-5 text-blue-600" />}
        iconBg="bg-blue-50"
      />

      {/* Valeur totale */}
      <KPICard
        title="Valeur totale"
        value={`${formatMontant(marchesStats.montantTotal)} FCFA`}
        subtitle={formatMontantFull(marchesStats.montantTotal)}
        icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
        iconBg="bg-emerald-50"
      />

      {/* Cautions actives */}
      <KPICard
        title="Cautions actives"
        value={cautionsStats.actives}
        subtitle={`sur ${cautionsStats.total} cautions au total`}
        highlight={`${formatMontant(cautionsStats.montantActif)} FCFA garantis`}
        highlightColor="text-stam-success"
        icon={<Shield className="h-5 w-5 text-green-600" />}
        iconBg="bg-green-50"
      />

      {/* Cautions proches échéance */}
      {cautionsStats.prochesEcheance > 0 && (
        <KPICard
          title="Cautions à surveiller"
          value={cautionsStats.prochesEcheance}
          subtitle="Expirent dans moins de 30 jours"
          icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50"
          warning
        />
      )}

      {/* Véhicules */}
      <KPICard
        title="Véhicules"
        value={vehiculesStats.total}
        subtitle={`${vehiculesStats.enService} en service · ${vehiculesStats.enAttenteLivraison} en attente`}
        icon={<Car className="h-5 w-5 text-indigo-600" />}
        iconBg="bg-indigo-50"
      />

      {/* Livraisons */}
      <KPICard
        title="Livraisons effectuées"
        value={vehiculesStats.livres}
        subtitle="Véhicules livrés"
        icon={<CheckCircle2 className="h-5 w-5 text-teal-600" />}
        iconBg="bg-teal-50"
      />
    </div>
  )
}
