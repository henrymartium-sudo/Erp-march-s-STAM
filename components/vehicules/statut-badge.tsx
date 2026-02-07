import { Badge } from '@/components/ui/badge'
import { STATUT_VEHICULE_LABELS, STATUT_VEHICULE_COLORS } from '@/lib/constants/vehicule'
import type { StatutVehicule } from '@prisma/client'
import { cn } from '@/lib/utils'

interface StatutBadgeProps {
  statut: StatutVehicule
  size?: 'sm' | 'md' | 'lg'
}

export function StatutBadge({ statut, size = 'md' }: StatutBadgeProps) {
  const label = STATUT_VEHICULE_LABELS[statut]
  const colorClasses = STATUT_VEHICULE_COLORS[statut]

  return (
    <Badge
      className={cn(
        colorClasses,
        {
          'text-xs px-2 py-0.5': size === 'sm',
          'text-sm px-3 py-1': size === 'md',
          'text-base px-4 py-1.5': size === 'lg',
        }
      )}
    >
      {label}
    </Badge>
  )
}
