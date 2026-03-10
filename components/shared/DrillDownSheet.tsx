'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import type { DrillDownItem } from '@/lib/actions/drill-down'

// ── Props ─────────────────────────────────────────────────────────────────────

interface DrillDownSheetProps {
  open: boolean
  onClose: () => void
  title: string
  items: DrillDownItem[]
  isLoading?: boolean
  emptyMessage?: string
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function DrillDownSheet({
  open,
  onClose,
  title,
  items,
  isLoading = false,
  emptyMessage = 'Aucun élément',
}: DrillDownSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-[#1E3A5F]">{title}</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              {items.length} résultat{items.length > 1 ? 's' : ''}
            </p>
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between rounded-lg border p-3 gap-3"
              >
                <div className="flex-1 min-w-0">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="font-medium text-sm text-[#1E3A5F] hover:underline block truncate"
                      onClick={onClose}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <p className="font-medium text-sm truncate">{item.label}</p>
                  )}
                  {item.sublabel && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {item.sublabel}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.statut && (
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {item.statut}
                    </Badge>
                  )}
                  {item.montant !== undefined && item.montant > 0 && (
                    <span className="text-xs font-semibold text-right whitespace-nowrap">
                      {new Intl.NumberFormat('fr-FR').format(item.montant)}{' '}
                      <span className="text-muted-foreground font-normal">XOF</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
