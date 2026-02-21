import { Badge } from '@/components/ui/badge'
import { STATUT_INTERVENTION_LABELS, STATUT_INTERVENTION_COLORS } from '@/lib/constants/intervention'
import type { StatutIntervention } from '@prisma/client'
import { cn } from '@/lib/utils'

interface StatutInterventionBadgeProps {
  statut: StatutIntervention
  size?: 'sm' | 'md' | 'lg'
}

export function StatutInterventionBadge({ statut, size = 'md' }: StatutInterventionBadgeProps) {
  const label = STATUT_INTERVENTION_LABELS[statut]
  const colorVariant = STATUT_INTERVENTION_COLORS[statut]

  return (
    <Badge
      variant={colorVariant as any}
      className={cn({
        'text-xs px-2 py-0.5': size === 'sm',
        'text-sm px-3 py-1': size === 'md',
        'text-base px-4 py-1.5': size === 'lg',
      })}
    >
      {label}
    </Badge>
  )
}
