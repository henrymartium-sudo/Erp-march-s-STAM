import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OpportuniteDeleteButton } from './opportunite-delete-button'
import {
  STATUT_OPPORTUNITE_LABELS,
  STATUT_OPPORTUNITE_COLORS,
} from '@/lib/validations/opportunite'
import type { OpportuniteWithMarche } from '@/lib/actions/opportunites'

interface OpportuniteListProps {
  opportunites: OpportuniteWithMarche[]
  canWrite: boolean
}

function formatMontant(val: unknown): string {
  if (val === null || val === undefined) return '—'
  const n = typeof val === 'object' && val !== null
    ? parseFloat((val as { toString(): string }).toString())
    : Number(val)
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
}

function formatDate(val: Date | null | undefined): string {
  if (!val) return '—'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(val))
}

export function OpportuniteList({ opportunites, canWrite }: OpportuniteListProps) {
  if (opportunites.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune opportunité enregistrée.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Objet</TableHead>
            <TableHead>Autorité contractante</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date limite</TableHead>
            <TableHead>Montant estimé</TableHead>
            <TableHead>Montant proposé</TableHead>
            <TableHead>Marché lié</TableHead>
            {canWrite && <TableHead className="w-[100px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunites.map((opp) => (
            <TableRow key={opp.id}>
              <TableCell className="font-medium max-w-[200px]">
                <Link href={`/opportunites/${opp.id}`} className="hover:underline truncate block">
                  {opp.objet}
                </Link>
                {opp.reference && (
                  <span className="text-xs text-muted-foreground">{opp.reference}</span>
                )}
              </TableCell>
              <TableCell>{opp.autoriteContractante}</TableCell>
              <TableCell>
                <Badge variant={STATUT_OPPORTUNITE_COLORS[opp.statut] as 'success' | 'warning' | 'danger' | 'info' | 'muted'}>
                  {STATUT_OPPORTUNITE_LABELS[opp.statut]}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(opp.dateLimite)}</TableCell>
              <TableCell>{formatMontant(opp.montantEstime)}</TableCell>
              <TableCell>{formatMontant(opp.montantPropose)}</TableCell>
              <TableCell>
                {opp.marche ? (
                  <Link href={`/marches/${opp.marche.id}`} className="text-sm hover:underline text-primary">
                    {opp.marche.numero}
                  </Link>
                ) : '—'}
              </TableCell>
              {canWrite && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/opportunites/${opp.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <OpportuniteDeleteButton id={opp.id} objet={opp.objet} />
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
