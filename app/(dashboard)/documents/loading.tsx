import { Skeleton } from '@/components/ui/skeleton'
import { ListSkeleton } from '@/components/ui/skeleton'

export default function DocumentsLoading() {
  return (
    <div className="space-y-6">
      {/* PageHeader skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
      </div>

      {/* Filter bar + toggle skeleton */}
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* Table skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
