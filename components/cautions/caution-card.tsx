'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CautionBadge } from './caution-badge';
import { formatMontant } from '@/lib/utils/format';
import {
  formatDateCourte,
  getJoursRestants,
  getNiveauAlerte,
} from '@/lib/utils/caution';
import { Eye, Pencil, Trash2, MoreVertical, Building2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SerializedCaution } from '@/types/serialized';
import Link from 'next/link';

interface CautionCardProps {
  caution: SerializedCaution;
  mode?: 'compact' | 'normal';
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

/* Barre gauche colorée selon niveau d'alerte */
const LEFT_BORDER_COLOR = {
  CRITIQUE: 'border-l-red-500',
  ATTENTION: 'border-l-amber-400',
  INFO:      'border-l-yellow-400',
  EXPIRE:    'border-l-gray-300',
  AUCUN:     'border-l-emerald-400',
} as const

/* Countdown : couleur du badge jours restants */
function getCountdownStyle(joursRestants: number, expire: boolean): { pill: string; pulse: boolean } {
  if (expire)              return { pill: 'text-gray-500 bg-gray-100',   pulse: false }
  if (joursRestants < 30)  return { pill: 'text-red-600 bg-red-50',      pulse: true  }
  if (joursRestants < 90)  return { pill: 'text-amber-600 bg-amber-50',  pulse: false }
  return                          { pill: 'text-emerald-600 bg-emerald-50', pulse: false }
}

export function CautionCard({
  caution,
  mode = 'normal',
  onEdit,
  onDelete,
  className,
}: CautionCardProps) {
  const dateEcheance  = new Date(caution.dateEcheance);
  const joursRestants = getJoursRestants(dateEcheance);
  const niveauAlerte  = getNiveauAlerte(caution.statut, dateEcheance);
  const isExpire      = niveauAlerte === 'EXPIRE';

  const borderColor = LEFT_BORDER_COLOR[niveauAlerte] ?? 'border-l-gray-200';
  const { pill, pulse } = getCountdownStyle(joursRestants, isExpire);

  const countdownLabel = isExpire
    ? 'Expirée'
    : `J-${joursRestants}`

  return (
    <div className={cn(
      'group bg-white rounded-xl border border-gray-100 border-l-4 shadow-card',
      'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200',
      'flex flex-col overflow-hidden',
      borderColor,
      className,
    )}>

      {/* Header : badges + référence + dropdown */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap gap-1.5">
            <CautionBadge variant="type"   value={caution.type}   size="sm" />
            <CautionBadge variant="statut" value={caution.statut} size="sm" />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded-lg hover:bg-gray-100">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/cautions/${caution.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Voir détails
                </Link>
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(caution.id)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(caution.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Référence */}
        <p className="font-semibold text-foreground leading-snug truncate" title={caution.reference || 'Sans référence'}>
          {caution.reference || 'Sans référence'}
        </p>

        {/* Banque */}
        <p className="text-xs text-muted-foreground mt-0.5 truncate" title={caution.banqueNom}>
          {caution.banqueNom}
        </p>
      </div>

      {/* Montant — typographie principale */}
      <div className="px-5 py-3 border-t border-gray-50">
        <p className="text-xs text-muted-foreground mb-0.5">Montant garanti</p>
        <p className="text-2xl font-bold text-foreground tracking-tight">
          {formatMontant(caution.montant)}
        </p>
      </div>

      {/* Échéance + countdown */}
      <div className="px-5 py-3 flex items-center justify-between border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{formatDateCourte(caution.dateEcheance)}</span>
        </div>

        {/* Countdown coloré + badge-pulse si urgent */}
        <span className={cn(
          'text-xs font-semibold px-2.5 py-1 rounded-full',
          pill,
          pulse && 'badge-pulse',
        )}>
          {countdownLabel}
        </span>
      </div>

      {/* Marché associé (mode normal uniquement) */}
      {mode === 'normal' && caution.marche && (
        <div className="px-5 py-2 border-t border-gray-50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
            <Link
              href={`/marches/${caution.marche.id}`}
              className="truncate hover:text-stam-accent hover:underline transition-colors"
              title={`${caution.marche.numero} — ${caution.marche.objet}`}
              onClick={(e) => e.stopPropagation()}
            >
              {caution.marche.numero} — {caution.marche.objet}
            </Link>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2 bg-gray-50/50 mt-auto">
        <Link
          href={`/cautions/${caution.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-stam-accent hover:text-stam-accent/80 py-1.5 px-3 rounded-lg hover:bg-blue-50 transition-colors duration-150"
        >
          <Eye className="h-3.5 w-3.5" />
          Voir détails
        </Link>
        {onEdit && (
          <>
            <div className="w-px h-4 bg-gray-200" />
            <button
              onClick={() => onEdit(caution.id)}
              className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground py-1.5 px-3 rounded-lg hover:bg-gray-100 transition-colors duration-150"
            >
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </button>
          </>
        )}
      </div>
    </div>
  );
}
