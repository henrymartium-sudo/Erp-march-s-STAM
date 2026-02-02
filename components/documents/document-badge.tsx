import { Badge } from '@/components/ui/badge'
import { TypeDocument, PhaseMarche } from '@prisma/client'
import { getColorByType, TYPE_DOCUMENT_LABELS, PHASE_MARCHE_LABELS } from '@/lib/utils/document'
import { cn } from '@/lib/utils'

interface DocumentBadgeProps {
  type?: TypeDocument
  phase?: PhaseMarche | null
  className?: string
}

/**
 * Badge d'affichage du type de document ou de la phase
 */
export function DocumentBadge({ type, phase, className }: DocumentBadgeProps) {
  if (type) {
    const color = getColorByType(type)
    return (
      <Badge
        variant="secondary"
        className={cn('font-medium', color, className)}
      >
        {TYPE_DOCUMENT_LABELS[type]}
      </Badge>
    )
  }

  if (phase) {
    return (
      <Badge variant="outline" className={className}>
        {PHASE_MARCHE_LABELS[phase]}
      </Badge>
    )
  }

  return null
}
