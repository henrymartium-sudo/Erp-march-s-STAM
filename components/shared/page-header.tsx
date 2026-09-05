import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  /** Nombre d'éléments affiché comme badge à côté du titre */
  count?: number
  /** Slot pour le bouton CTA principal (ex: "Nouveau marché") */
  action?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  count,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="space-y-0.5 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
            {title}
          </h1>
          {count !== undefined && (
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-sm font-semibold tabular-nums">
              {count}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">{action}</div>}
    </div>
  )
}
