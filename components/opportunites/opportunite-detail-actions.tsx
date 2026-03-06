'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatutOpportunite } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { StatutChangerOpportuniteButton } from './statut-changer-button'
import { createMarcheFromOpportunite } from '@/lib/actions/opportunites'
import { toast } from '@/lib/utils/toast'

interface OpportuniteDetailActionsProps {
  opportuniteId: string
  currentStatut: StatutOpportunite
  hasMarcheLinked: boolean
  canWrite: boolean
}

export function OpportuniteDetailActions({
  opportuniteId,
  currentStatut,
  hasMarcheLinked,
  canWrite,
}: OpportuniteDetailActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [statut, setStatut] = useState<StatutOpportunite>(currentStatut)

  async function handleCreateMarche() {
    setLoading(true)
    const result = await createMarcheFromOpportunite(opportuniteId)
    setLoading(false)

    if (result.success) {
      toast.success('Marché créé avec succès')
      router.push(`/marches/${result.data.marcheId}`)
    } else {
      toast.error(result.error ?? 'Erreur lors de la création du marché')
    }
  }

  if (!canWrite) return null

  return (
    <div className="flex items-center gap-2">
      <StatutChangerOpportuniteButton
        opportuniteId={opportuniteId}
        currentStatut={statut}
        onStatutChanged={setStatut}
      />
      {statut === 'GAGNEE' && !hasMarcheLinked && (
        <Button onClick={handleCreateMarche} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1.5" />
          )}
          Créer le marché
        </Button>
      )}
    </div>
  )
}
