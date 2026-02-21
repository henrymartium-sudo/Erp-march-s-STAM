'use client'

import { useTransition } from 'react'
import type { Intervention, StatutIntervention } from '@prisma/client'
import { Trash2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { StatutInterventionBadge } from './statut-intervention-badge'
import {
  TYPE_INTERVENTION_LABELS,
  STATUT_INTERVENTION_LABELS,
} from '@/lib/constants/intervention'
import { updateInterventionStatut, deleteIntervention } from '@/lib/actions/interventions'
import { getAvailableStatutsIntervention } from '@/lib/sav/workflow'
import { toast } from '@/lib/utils/toast'
import { formatDateLong } from '@/lib/utils/format'

interface InterventionsTableProps {
  interventions: Intervention[]
  canWrite: boolean
  canDelete: boolean
}

export function InterventionsTable({ interventions, canWrite, canDelete }: InterventionsTableProps) {
  const [isPending, startTransition] = useTransition()

  if (interventions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic text-center py-6">
        Aucune intervention enregistrée
      </p>
    )
  }

  function handleChangeStatut(id: string, statut: StatutIntervention) {
    startTransition(async () => {
      const result = await updateInterventionStatut({ id, statut })
      if (result.success) {
        toast.success('Statut mis à jour')
      } else {
        toast.error(result.error ?? 'Erreur lors de la mise à jour')
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette intervention ?')) return
    startTransition(async () => {
      const result = await deleteIntervention(id)
      if (result.success) {
        toast.success('Intervention supprimée')
      } else {
        toast.error(result.error ?? 'Erreur lors de la suppression')
      }
    })
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Garantie</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          {canWrite && <TableHead className="w-[100px]">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {interventions.map((intervention) => {
          const disponibles = getAvailableStatutsIntervention(intervention.statut)
          return (
            <TableRow key={intervention.id}>
              <TableCell className="font-medium">
                {TYPE_INTERVENTION_LABELS[intervention.type]}
              </TableCell>
              <TableCell>
                {canWrite && disponibles.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-auto p-0" disabled={isPending}>
                        <StatutInterventionBadge statut={intervention.statut} size="sm" />
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {disponibles.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => handleChangeStatut(intervention.id, s)}
                        >
                          → {STATUT_INTERVENTION_LABELS[s]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <StatutInterventionBadge statut={intervention.statut} size="sm" />
                )}
              </TableCell>
              <TableCell>
                <Badge variant={intervention.sousGarantie ? 'success' : 'secondary'} className="text-xs">
                  {intervention.sousGarantie ? 'Garantie' : 'Hors garantie'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateLong(intervention.signaleAt.toISOString())}
              </TableCell>
              <TableCell className="text-sm max-w-[200px] truncate">
                {intervention.description || '—'}
              </TableCell>
              {canWrite && (
                <TableCell>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(intervention.id)}
                      disabled={isPending}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
