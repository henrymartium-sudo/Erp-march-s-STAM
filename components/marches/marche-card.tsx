import Link from 'next/link'
import type { SerializedMarche } from '@/types/serialized'
import { StatutBadge } from './statut-badge'
import { formatMontant, formatDateCourt } from '@/lib/utils/format'
import { getMarcheUrgency, URGENCY_STYLES } from '@/lib/utils/urgence'
import { isNumeroProvisoire } from '@/lib/utils/marche-numero'
import { Eye, Pencil, Building2, Calendar, Banknote, Clock } from 'lucide-react'
import type { StatutMarche } from '@prisma/client'

interface MarcheCardProps {
  marche: SerializedMarche
}

const TYPE_LABELS: Record<string, string> = {
  TRAVAUX: 'Travaux',
  FOURNITURES: 'Fournitures',
  SERVICES: 'Services',
  PRESTATIONS_INTELLECTUELLES: 'Prestations intellectuelles',
}

/* Barre couleur en haut de la card selon le groupe de statut */
const STATUT_TOP_COLOR: Partial<Record<StatutMarche, string>> = {
  EN_EXECUTION:                  'bg-cyan-400',
  ATTRIBUE_DEFINITIVEMENT:       'bg-green-400',
  ATTRIBUE_PROVISOIREMENT:       'bg-lime-400',
  OFFRE_DEPOSEE:                 'bg-indigo-400',
  EN_ATTENTE_ATTRIBUTION:        'bg-amber-400',
  DOSSIER_EN_PREPARATION:        'bg-purple-400',
  OPPORTUNITE_IDENTIFIEE:        'bg-blue-400',
  EN_ATTENTE_LIVRAISON_OS:       'bg-teal-400',
  EXECUTE_ATTENTE_GARANTIES:     'bg-emerald-400',
  CLOTURE:                       'bg-gray-300',
  RESILIE:                       'bg-red-400',
  ANNULE:                        'bg-slate-400',
  INFRUCTUEUX:                   'bg-orange-400',
}

export function MarcheCard({ marche }: MarcheCardProps) {
  const objetTronque =
    marche.objet.length > 90 ? `${marche.objet.substring(0, 90)}…` : marche.objet

  const accentBar = STATUT_TOP_COLOR[marche.statut] ?? 'bg-gray-200'

  const urgency = getMarcheUrgency(marche.statut, marche.dateFinPrevue)

  return (
    <div className="group bg-white rounded-xl border border-gray-100 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">

      {/* Barre couleur statut */}
      <div className={`h-1 w-full ${accentBar}`} />

      {/* Lien principal */}
      <Link href={`/marches/${marche.id}`} className="flex-1 flex flex-col p-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="font-mono-marche text-stam-accent font-semibold leading-tight truncate">
              {marche.numero}
            </p>
            {isNumeroProvisoire(marche.numero) && (
              <span className="inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                Numéro provisoire — à corriger
              </span>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {TYPE_LABELS[marche.type] ?? marche.type}
            </p>
          </div>
          <StatutBadge statut={marche.statut} size="sm" />
        </div>

        {/* Objet */}
        <p className="text-sm text-foreground leading-snug line-clamp-2 mb-4">
          {objetTronque}
        </p>

        {/* Infos clés */}
        <div className="space-y-2 mt-auto">
          <div className="flex items-center gap-2 text-sm">
            <Banknote className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Montant</span>
            <span className="ml-auto font-semibold text-foreground">{formatMontant(marche.montant)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground truncate max-w-[55%]">{marche.autoriteContractanteNom}</span>
          </div>
          {marche.dateNotification && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Notification</span>
              <span className="ml-auto text-foreground">{formatDateCourt(marche.dateNotification)}</span>
            </div>
          )}
          {urgency && (
            <div className="flex items-center gap-2 text-sm mt-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Échéance</span>
              <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full border ${URGENCY_STYLES[urgency.level]}`}>
                {urgency.label}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Footer actions */}
      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2 bg-gray-50/50">
        <Link
          href={`/marches/${marche.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-stam-accent hover:text-stam-accent/80 py-1.5 px-3 rounded-lg hover:bg-blue-50 transition-colors duration-150"
        >
          <Eye className="h-3.5 w-3.5" />
          Voir détails
        </Link>
        <div className="w-px h-4 bg-gray-200" />
        <Link
          href={`/marches/${marche.id}/edit`}
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground py-1.5 px-3 rounded-lg hover:bg-gray-100 transition-colors duration-150"
        >
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </Link>
      </div>
    </div>
  )
}
