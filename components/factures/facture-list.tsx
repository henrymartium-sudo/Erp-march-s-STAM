'use client'

import Link from 'next/link'
import { Receipt, Plus } from 'lucide-react'
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
import { formatMontant, formatDateCourt } from '@/lib/utils/format'
import { STATUT_FACTURE_LABELS, STATUT_FACTURE_COLORS } from '@/lib/validations/facture'
import type { FactureWithMarche } from '@/lib/actions/factures'

interface FactureListProps {
  factures: FactureWithMarche[]
  canWrite: boolean
  showMarche?: boolean
}

export function FactureList({ factures, canWrite, showMarche = true }: FactureListProps) {
  if (factures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucune facture</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
          Aucune facture n'a encore été créée.
        </p>
        {canWrite && (
          <Button asChild>
            <Link href="/factures/nouvelle">
              <Plus className="h-4 w-4 mr-2" />
              Créer une facture
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Numéro</TableHead>
            {showMarche && <TableHead>Marché</TableHead>}
            <TableHead>Montant HT</TableHead>
            <TableHead>TVA</TableHead>
            <TableHead>Montant TTC</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Émission</TableHead>
            <TableHead>Échéance</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {factures.map((facture) => (
            <TableRow key={facture.id} className="hover:bg-muted/20">
              <TableCell className="font-medium">
                <Link
                  href={`/factures/${facture.id}`}
                  className="text-stam-primary hover:underline"
                >
                  {facture.numero}
                </Link>
              </TableCell>
              {showMarche && (
                <TableCell>
                  <Link
                    href={`/marches/${facture.marche.id}`}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {facture.marche.numero} — {facture.marche.objet.slice(0, 40)}{facture.marche.objet.length > 40 ? '…' : ''}
                  </Link>
                </TableCell>
              )}
              <TableCell className="text-right tabular-nums">
                {formatMontant(Number(facture.montantHT))}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {Number(facture.tva)}%
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {formatMontant(Number(facture.montantTTC))}
              </TableCell>
              <TableCell>
                <Badge variant={STATUT_FACTURE_COLORS[facture.statut] as any}>
                  {STATUT_FACTURE_LABELS[facture.statut] ?? facture.statut}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {facture.dateEmission ? formatDateCourt(facture.dateEmission) : '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {facture.dateEcheance ? formatDateCourt(facture.dateEcheance) : '—'}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/factures/${facture.id}`}>Voir</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
