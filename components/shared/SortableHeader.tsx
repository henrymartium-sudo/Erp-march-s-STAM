'use client'

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SortConfig } from '@/hooks/use-sortable'

interface SortableHeaderProps<T> {
  field: keyof T
  label: string
  sortConfig: SortConfig<T> | null
  onSort: (key: keyof T) => void
  className?: string
}

/**
 * Bouton de tri réutilisable — à utiliser en toolbar (vues cartes) ou en en-tête de tableau.
 * Affiche une flèche ↑ / ↓ si actif, sinon une icône neutre ⇅.
 */
export function SortableHeader<T>({
  field,
  label,
  sortConfig,
  onSort,
  className,
}: SortableHeaderProps<T>) {
  const isActive = sortConfig?.key === field
  const direction = isActive ? sortConfig!.direction : null

  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      onClick={() => onSort(field)}
      className={cn('h-11 md:h-9 gap-1 text-xs font-medium', className)}
    >
      {label}
      {direction === 'asc' ? (
        <ChevronUp className="h-3 w-3" />
      ) : direction === 'desc' ? (
        <ChevronDown className="h-3 w-3" />
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-40" />
      )}
    </Button>
  )
}
