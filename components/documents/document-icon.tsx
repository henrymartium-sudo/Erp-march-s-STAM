import { TypeDocument } from '@prisma/client'
import { getIconByType } from '@/lib/utils/document'
import { cn } from '@/lib/utils'

interface DocumentIconProps {
  type: TypeDocument
  className?: string
  size?: number
}

/**
 * Icône représentant le type de document
 */
export function DocumentIcon({ type, className, size = 20 }: DocumentIconProps) {
  const Icon = getIconByType(type)

  return (
    <Icon
      className={cn('text-muted-foreground', className)}
      size={size}
    />
  )
}
