'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        {/* Icône */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--stam-primary))]">
          <AlertTriangle className="h-8 w-8 text-[hsl(var(--stam-gold))]" />
        </div>

        <h1 className="mb-3 text-2xl font-bold text-[hsl(var(--stam-primary))]">
          Une erreur est survenue
        </h1>

        <p className="mb-1 text-sm text-muted-foreground leading-relaxed">
          Une erreur inattendue a interrompu cette page.
        </p>

        {error.digest && (
          <p className="mb-6 text-xs text-muted-foreground font-mono">
            Référence : {error.digest}
          </p>
        )}

        <div className="flex justify-center gap-3 mt-6">
          <Button onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Réessayer
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Accueil
          </Button>
        </div>
      </div>
    </div>
  )
}
