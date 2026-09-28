import { Skeleton } from '@/components/ui/skeleton'

export default function OpportunitesLoading() {
  return (
    <div className="space-y-6">
      {/* PageHeader skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-44 rounded-lg" />
        </div>
      </div>

      {/* Onglets + filtres */}
      <Skeleton className="h-10 w-full max-w-lg rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />

      {/* Table */}
      <div className="space-y-2 rounded-xl border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  )
}
