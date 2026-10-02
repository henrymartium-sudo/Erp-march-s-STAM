'use client'

import { useRouter } from 'next/navigation'
import { CautionCard } from '@/components/cautions/caution-card'
import type { SerializedCaution } from '@/types/serialized'

/** Cartes des cautions d'une opportunité ; « Modifier » n'existe que pour les rôles qui peuvent écrire. */
export function CautionsListe({
  cautions,
  canWrite,
}: {
  cautions: SerializedCaution[]
  canWrite: boolean
}) {
  const router = useRouter()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cautions.map((caution) => (
        <CautionCard
          key={caution.id}
          caution={caution}
          mode="compact"
          onEdit={canWrite ? (id) => router.push(`/cautions/${id}/edit`) : undefined}
        />
      ))}
    </div>
  )
}
