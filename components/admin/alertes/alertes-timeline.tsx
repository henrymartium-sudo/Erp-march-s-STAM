'use client'

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  TrendingUp,
  FileText,
} from 'lucide-react'
import type { AlertesActuelles } from '@/lib/actions/alertes-manuelles'
import { formatMontant, formatDateCourt } from '@/lib/utils/format'

type AlertesTimelineProps = {
  alertes: AlertesActuelles
}

type NiveauAlerte = 'URGENCE' | 'ATTENTION' | 'OK'

function getNiveauCaution(jours: number): NiveauAlerte {
  if (jours <= 15) return 'URGENCE'
  if (jours <= 45) return 'ATTENTION'
  return 'OK'
}

function getNiveauMarche(jours: number): NiveauAlerte {
  if (jours <= 14) return 'URGENCE'
  if (jours <= 45) return 'ATTENTION'
  return 'OK'
}

const NIVEAU_CONFIG = {
  URGENCE: {
    label: 'Urgences',
    Icon: AlertCircle,
    headerBg: 'bg-red-50 border-red-200',
    textColor: 'text-red-700',
    countBg: 'bg-red-600 text-white',
    dotClass: 'bg-red-500',
    countdownBg: 'bg-red-50',
    countdownText: 'text-red-700',
  },
  ATTENTION: {
    label: 'Attention',
    Icon: AlertTriangle,
    headerBg: 'bg-amber-50 border-amber-200',
    textColor: 'text-amber-700',
    countBg: 'bg-amber-500 text-white',
    dotClass: 'bg-amber-500',
    countdownBg: 'bg-amber-50',
    countdownText: 'text-amber-700',
  },
  OK: {
    label: 'Sous surveillance',
    Icon: CheckCircle2,
    headerBg: 'bg-green-50 border-green-200',
    textColor: 'text-green-700',
    countBg: 'bg-green-600 text-white',
    dotClass: 'bg-green-500',
    countdownBg: 'bg-green-50',
    countdownText: 'text-green-700',
  },
} as const

type TimelineItem = {
  id: string
  itemType: 'caution' | 'marche'
  label: string
  sublabel: string
  joursRestants: number
  montant: number
  date: Date
  niveau: NiveauAlerte
  extra?: string
}

export function AlertesTimeline({ alertes }: AlertesTimelineProps) {
  // Construire la liste unifiée triée par urgence
  const items: TimelineItem[] = [
    ...alertes.cautions.map((c) => ({
      id: c.id,
      itemType: 'caution' as const,
      label: c.reference,
      sublabel: c.type,
      joursRestants: c.joursRestants,
      montant: c.montant,
      date: c.dateEcheance,
      niveau: getNiveauCaution(c.joursRestants),
      extra: `${c.marcheNumero} — ${c.marcheObjet}`,
    })),
    ...alertes.marches.map((m) => ({
      id: m.id,
      itemType: 'marche' as const,
      label: m.numero,
      sublabel: m.objet,
      joursRestants: m.joursRestants,
      montant: m.montant,
      date: m.dateFinPrevue,
      niveau: getNiveauMarche(m.joursRestants),
    })),
  ].sort((a, b) => a.joursRestants - b.joursRestants)

  const grouped: Record<NiveauAlerte, TimelineItem[]> = {
    URGENCE: items.filter((i) => i.niveau === 'URGENCE'),
    ATTENTION: items.filter((i) => i.niveau === 'ATTENTION'),
    OK: items.filter((i) => i.niveau === 'OK'),
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 flex items-center gap-4">
        <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-green-700">Aucune alerte active</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tous les marchés et cautions sont dans les délais normaux.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Résumé pills */}
      <div className="flex flex-wrap gap-3">
        {(['URGENCE', 'ATTENTION', 'OK'] as const).map((niveau) => {
          const count = grouped[niveau].length
          if (count === 0) return null
          const cfg = NIVEAU_CONFIG[niveau]
          const { Icon } = cfg
          return (
            <div
              key={niveau}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border ${cfg.headerBg}`}
            >
              <Icon className={`h-4 w-4 ${cfg.textColor}`} />
              <span className={`text-sm font-semibold ${cfg.textColor}`}>
                {count} {cfg.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Sections par niveau */}
      {(['URGENCE', 'ATTENTION', 'OK'] as const).map((niveau) => {
        const sectionItems = grouped[niveau]
        if (sectionItems.length === 0) return null
        const cfg = NIVEAU_CONFIG[niveau]
        const { Icon } = cfg

        return (
          <div
            key={niveau}
            className={`rounded-xl border ${cfg.headerBg} overflow-hidden`}
          >
            {/* En-tête section */}
            <div className={`flex items-center gap-2.5 px-5 py-3 border-b ${cfg.headerBg}`}>
              <Icon className={`h-4 w-4 ${cfg.textColor}`} />
              <span className={`text-sm font-bold uppercase tracking-wide ${cfg.textColor}`}>
                {cfg.label}
              </span>
              <span
                className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.countBg}`}
              >
                {sectionItems.length}
              </span>
            </div>

            {/* Items timeline */}
            <div className="bg-white divide-y divide-gray-50">
              {sectionItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors duration-150"
                >
                  {/* Indicateur vertical */}
                  <div className="flex flex-col items-center flex-shrink-0 pt-1">
                    <div className={`h-2.5 w-2.5 rounded-full ${cfg.dotClass}`} />
                    {idx < sectionItems.length - 1 && (
                      <div className="w-px flex-1 min-h-[24px] bg-gray-200 mt-1.5" />
                    )}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span
                            className={`text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                              item.itemType === 'caution'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {item.itemType === 'caution' ? 'Caution' : 'Marché'}
                          </span>
                          <span className="font-mono text-sm font-semibold text-foreground">
                            {item.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.sublabel}
                        </p>
                        {item.extra && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <FileText className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{item.extra}</span>
                          </p>
                        )}
                      </div>

                      {/* Compte à rebours */}
                      <div
                        className={`flex-shrink-0 px-3 py-2 rounded-lg text-center min-w-[56px] ${cfg.countdownBg}`}
                      >
                        <p className={`text-xl font-bold leading-none ${cfg.countdownText}`}>
                          {item.joursRestants}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${cfg.countdownText} opacity-70`}>
                          jours
                        </p>
                      </div>
                    </div>

                    {/* Métadonnées */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatMontant(item.montant)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateCourt(item.date)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
