import { Skeleton } from '@/components/ui/skeleton'

/** Chargement des trois blocs de la page d'accueil. */
export function SqueletteTableauDeBord() {
  return (
    <div role="status" aria-label="Chargement du tableau de bord" className="space-y-6">
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
