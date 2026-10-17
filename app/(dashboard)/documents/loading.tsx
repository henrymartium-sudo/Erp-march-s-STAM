import { Skeleton } from '@/components/ui/skeleton'

export default function DocumentsLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Chargement des documents">
      {/* PageHeader skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
      </div>

      {/* Barre de filtres (recherche + deux listes) et bascule liste/grille */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex flex-1 flex-col gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-card lg:flex-row">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-full lg:w-48" />
          <Skeleton className="h-10 w-full lg:w-48" />
        </div>
        <Skeleton className="h-[52px] w-full self-end rounded-lg lg:w-44" />
      </div>

      {/* Sous 768 px : cartes, comme la vraie page */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>

      {/* Dès 768 px : en-tête de tableau puis lignes */}
      <div className="hidden space-y-2 md:block">
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
