'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMontant, formatDateCourt } from '@/lib/utils/format'
import { getFactures } from '@/lib/actions/factures'
import { STATUT_FACTURE_LABELS, STATUT_FACTURE_COLORS } from '@/lib/validations/facture'
import type { FactureWithMarche } from '@/lib/actions/factures'

interface MarcheFacturesSectionProps {
  marcheId: string
  marcheNumero: string
  canWrite: boolean
}

export function MarcheFacturesSection({
  marcheId,
  marcheNumero,
  canWrite,
}: MarcheFacturesSectionProps) {
  const [factures, setFactures] = useState<FactureWithMarche[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFactures({ marcheId, limit: 20 }).then((result) => {
      if (result.success) setFactures(result.data.data)
      setLoading(false)
    })
  }, [marcheId])

  // Calcul stats
  const montantTotalTTC = factures.reduce((s, f) => s + Number(f.montantTTC), 0)
  const montantPaye = factures
    .filter((f) => f.statut === 'PAYEE')
    .reduce((s, f) => s + Number(f.montantTTC), 0)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" /> Facturation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          Facturation
          {factures.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {factures.length}
            </Badge>
          )}
        </CardTitle>
        {canWrite && (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/factures/nouvelle?marcheId=${marcheId}`}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Ajouter
            </Link>
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stats rapides */}
        {factures.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Total TTC</p>
              <p className="text-sm font-semibold tabular-nums">
                {formatMontant(montantTotalTTC)}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Payé</p>
              <p className="text-sm font-semibold tabular-nums text-green-700">
                {formatMontant(montantPaye)}
              </p>
            </div>
          </div>
        )}

        {/* Liste factures */}
        {factures.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune facture pour ce marché
          </p>
        ) : (
          <div className="space-y-2">
            {factures.map((facture) => (
              <Link
                key={facture.id}
                href={`/factures/${facture.id}`}
                className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" title={facture.numero}>{facture.numero}</p>
                  {facture.dateEmission && (
                    <p className="text-xs text-muted-foreground">
                      Émise le {formatDateCourt(facture.dateEmission)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="text-sm tabular-nums font-semibold">
                    {formatMontant(Number(facture.montantTTC))}
                  </span>
                  <Badge variant={STATUT_FACTURE_COLORS[facture.statut] as any} className="text-xs">
                    {STATUT_FACTURE_LABELS[facture.statut] ?? facture.statut}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Lien vers toutes les factures du marché */}
        {factures.length >= 5 && (
          <Button variant="ghost" size="sm" asChild className="w-full text-xs">
            <Link href={`/factures?marcheId=${marcheId}`}>
              Voir toutes les factures de {marcheNumero}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
