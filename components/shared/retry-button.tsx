'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

/**
 * Bouton « Réessayer » pour les états d'erreur des pages qui font du
 * fetch server-side (correctif audit #5). router.refresh() rejoue le
 * rendu serveur (et donc la requête) sans recharger toute la page.
 */
export function RetryButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RotateCcw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Nouvelle tentative…' : 'Réessayer'}
    </Button>
  )
}
