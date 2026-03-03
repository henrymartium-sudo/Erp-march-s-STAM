'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/lib/utils/toast'
import { updatePieceStatut } from '@/lib/actions/dossiers-offre'
import { STATUT_PIECE_LABELS } from '@/lib/validations/dossier-offre'
import type { StatutPiece } from '@prisma/client'

interface PieceStatutButtonProps {
  pieceId: string
  statut: StatutPiece
  canWrite: boolean
}

const STATUTS: StatutPiece[] = ['ABSENT', 'INCOMPLET', 'COMPLET', 'VALIDE']

const STATUT_STYLE: Record<string, string> = {
  ABSENT:    'text-destructive',
  INCOMPLET: 'text-amber-600',
  COMPLET:   'text-blue-600',
  VALIDE:    'text-green-600',
}

export function PieceStatutButton({ pieceId, statut, canWrite }: PieceStatutButtonProps) {
  const [current, setCurrent] = useState<StatutPiece>(statut)
  const [loading, setLoading] = useState(false)

  async function handleChange(value: string) {
    const newStatut = value as StatutPiece
    setLoading(true)
    const result = await updatePieceStatut(pieceId, newStatut)
    setLoading(false)
    if (result.success) {
      setCurrent(newStatut)
    } else {
      toast.error(result.error ?? 'Erreur de mise à jour')
    }
  }

  if (!canWrite) {
    return (
      <span className={`text-xs font-medium ${STATUT_STYLE[current]}`}>
        {STATUT_PIECE_LABELS[current]}
      </span>
    )
  }

  return (
    <Select value={current} onValueChange={handleChange} disabled={loading}>
      <SelectTrigger className={`h-7 w-[110px] text-xs border-0 bg-transparent p-0 ${STATUT_STYLE[current]}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUTS.map((s) => (
          <SelectItem key={s} value={s} className={`text-xs ${STATUT_STYLE[s]}`}>
            {STATUT_PIECE_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
