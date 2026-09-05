import { StatutMarche } from '@prisma/client'
import { Check, Circle, X, ArrowRight } from 'lucide-react'
import { STATUT_LABELS } from '@/lib/utils/statut'
import { CHEMIN_PRINCIPAL, TERMINAUX_LATERAUX } from '@/lib/utils/workflow-statuts'
import { cn } from '@/lib/utils'

interface StatutWorkflowStepperProps {
  currentStatut: StatutMarche
  selectedStatut?: StatutMarche
}

export function StatutWorkflowStepper({
  currentStatut,
  selectedStatut,
}: StatutWorkflowStepperProps) {
  const currentIdx = CHEMIN_PRINCIPAL.indexOf(currentStatut)
  const isCurrentTerminalLateral = TERMINAUX_LATERAUX.includes(currentStatut)

  return (
    <div className="space-y-2">
      {/* Chemin principal */}
      <ol className="relative space-y-1">
        {CHEMIN_PRINCIPAL.map((statut, idx) => {
          const isPast = idx < currentIdx
          const isCurrent = statut === currentStatut
          const isSelected = statut === selectedStatut && statut !== currentStatut
          const isFuture = idx > currentIdx && !isCurrent

          return (
            <li key={statut} className="flex items-center gap-2 py-0.5">
              <span
                className={cn(
                  'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs',
                  isPast && 'bg-stam-success-bg border-stam-success text-stam-success',
                  isCurrent && 'bg-stam-accent-light border-primary text-primary font-bold',
                  isSelected && 'bg-stam-warning-bg border-stam-warning text-stam-warning',
                  isFuture && !isSelected && 'bg-muted border-border text-muted-foreground'
                )}
              >
                {isPast ? (
                  <Check className="h-3 w-3" />
                ) : isCurrent ? (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                ) : isSelected ? (
                  <ArrowRight className="h-3 w-3" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </span>
              <span
                className={cn(
                  'text-xs',
                  isPast && 'text-stam-success',
                  isCurrent && 'font-semibold text-primary',
                  isSelected && 'font-semibold text-stam-warning',
                  isFuture && !isSelected && 'text-muted-foreground'
                )}
              >
                {STATUT_LABELS[statut]}
              </span>
            </li>
          )
        })}
      </ol>

      {/* Branches terminales latérales */}
      {(!isCurrentTerminalLateral || TERMINAUX_LATERAUX.includes(currentStatut)) && (
        <div className="mt-2 border-t pt-2">
          <p className="text-xs text-muted-foreground mb-1">Terminaisons possibles :</p>
          <div className="flex flex-wrap gap-2">
            {TERMINAUX_LATERAUX.map((statut) => {
              const isSelected = statut === selectedStatut
              const isCurrent = statut === currentStatut
              return (
                <span
                  key={statut}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border',
                    isCurrent && 'bg-muted border-border text-foreground font-semibold',
                    isSelected && 'bg-stam-warning-bg border-stam-warning text-stam-warning font-semibold',
                    !isCurrent && !isSelected && 'bg-muted border-border text-muted-foreground'
                  )}
                >
                  <X className="h-2.5 w-2.5" />
                  {STATUT_LABELS[statut]}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
