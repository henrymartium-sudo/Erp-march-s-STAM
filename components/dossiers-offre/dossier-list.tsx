import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DossierDeleteButton } from './dossier-delete-button'
import {
  STATUT_DOSSIER_LABELS,
  STATUT_DOSSIER_COLORS,
} from '@/lib/validations/dossier-offre'
import type { DossierOffreWithPieces } from '@/lib/actions/dossiers-offre'

interface DossierListProps {
  dossiers: DossierOffreWithPieces[]
  canWrite: boolean
}

function formatDate(val: Date | null | undefined): string {
  if (!val) return '—'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(val))
}

export function DossierList({ dossiers, canWrite }: DossierListProps) {
  if (dossiers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun dossier d&apos;offre enregistré.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Progression</TableHead>
            <TableHead>Pièces</TableHead>
            <TableHead>Date dépôt</TableHead>
            {canWrite && <TableHead className="w-[100px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {dossiers.map((d) => {
            const nbDone = d.pieces.filter(
              (p) => p.statut === 'COMPLET' || p.statut === 'VALIDE'
            ).length
            return (
              <TableRow key={d.id}>
                <TableCell className="font-medium max-w-[250px]">
                  <Link href={`/dossiers-offre/${d.id}`} className="hover:underline truncate block">
                    {d.titre}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUT_DOSSIER_COLORS[d.statut] as 'success' | 'warning' | 'danger' | 'info' | 'muted'}>
                    {STATUT_DOSSIER_LABELS[d.statut] ?? d.statut}
                  </Badge>
                </TableCell>
                <TableCell className="w-[120px]">
                  <div className="space-y-1">
                    <Progress value={d.progression} className="h-2" />
                    <span className="text-xs text-muted-foreground">{d.progression}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  {d.pieces.length > 0 ? `${nbDone}/${d.pieces.length}` : '—'}
                </TableCell>
                <TableCell>{formatDate(d.dateDepot)}</TableCell>
                {canWrite && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dossiers-offre/${d.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DossierDeleteButton id={d.id} titre={d.titre} />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
