'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('[DashboardError]', error)
  }, [error])

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        {/* Icône */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--stam-primary))]">
          <AlertTriangle className="h-8 w-8 text-[hsl(var(--stam-gold))]" />
        </div>

        {/* Titre */}
        <h1 className="mb-2 text-xl font-bold text-[hsl(var(--stam-primary))]">
          Une erreur est survenue
        </h1>

        {/* Description */}
        <p className="mb-1 text-sm text-muted-foreground leading-relaxed">
          Cette page a rencontré une erreur inattendue.
          <br />
          Vous pouvez réessayer ou retourner au tableau de bord.
        </p>

        {/* Digest (aide au débogage) */}
        {error.digest && (
          <p className="mt-2 mb-6 text-xs text-muted-foreground font-mono">
            Référence : {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-3 mt-6">
          <Button
            onClick={reset}
            className="gap-2 bg-[hsl(var(--stam-primary))] hover:bg-[hsl(var(--stam-primary-dark))] text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Réessayer
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => router.push('/')}
          >
            <Home className="h-4 w-4" />
            Tableau de bord
          </Button>
        </div>
      </div>
    </div>
  )
}
