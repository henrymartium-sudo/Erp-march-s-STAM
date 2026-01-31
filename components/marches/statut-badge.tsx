import { StatutMarche } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { getStatutLabel, getStatutColor } from '@/lib/utils/statut'
import { cn } from '@/lib/utils'

interface StatutBadgeProps {
  statut: StatutMarche
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function StatutBadge({ statut, className, size = 'md' }: StatutBadgeProps) {
  const label = getStatutLabel(statut)
  const colorClass = getStatutColor(statut)

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <Badge
      className={cn(
        'font-medium border',
        colorClass,
        sizeClasses[size],
        className
      )}
      variant="outline"
    >
      {label}
    </Badge>
  )
}
