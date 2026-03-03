import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getFacture, deleteFacture } from '@/lib/actions/factures'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { formatMontant, formatDateCourt, formatDateLong } from '@/lib/utils/format'
import { STATUT_FACTURE_LABELS, STATUT_FACTURE_COLORS } from '@/lib/validations/facture'
import { FactureDeleteButton } from '@/components/factures/facture-delete-button'
import { Edit, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface FacturePageProps {
  params: Promise<{ id: string }>
}

export default async function FacturePage({ params }: FacturePageProps) {
  const { id } = await params
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)

  const result = await getFacture(id)
  if (!result.success) notFound()

  const facture = result.data

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: 'Factures', href: '/factures' },
          { label: facture.numero },
        ]}
      />

      <PageHeader
        title={facture.numero}
        description={`Marché ${facture.marche.numero} — ${facture.marche.autoriteContractanteNom}`}
        action={
          userCanWrite && (
            <div className="flex gap-2">
              <FactureDeleteButton factureId={facture.id} factureNumero={facture.numero} />
              <Button asChild>
                <Link href={`/factures/${facture.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Link>
              </Button>
            </div>
          )
        }
      />

      {/* Badge statut */}
      <div className="flex items-center gap-3">
        <Badge variant={STATUT_FACTURE_COLORS[facture.statut] as any} className="text-sm px-3 py-1">
          {STATUT_FACTURE_LABELS[facture.statut] ?? facture.statut}
        </Badge>
        {facture.reference && (
          <span className="text-sm text-muted-foreground">Réf. {facture.reference}</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Montants */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Montants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant HT</span>
              <span className="tabular-nums font-medium">{formatMontant(Number(facture.montantHT))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA ({Number(facture.tva)}%)</span>
              <span className="tabular-nums text-muted-foreground">
                {formatMontant(Number(facture.montantTTC) - Number(facture.montantHT))}
              </span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-semibold">Montant TTC</span>
              <span className="tabular-nums font-bold text-lg">{formatMontant(Number(facture.montantTTC))}</span>
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Date d'émission", value: facture.dateEmission },
              { label: "Date d'échéance", value: facture.dateEcheance },
              { label: "Date de paiement", value: facture.datePaiement },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span>{value ? formatDateCourt(value) : '—'}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Marché */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Marché associé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">{facture.marche.numero}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{facture.marche.objet}</p>
            <p className="text-sm text-muted-foreground">{facture.marche.autoriteContractanteNom}</p>
            <Button variant="outline" size="sm" asChild className="mt-2 w-full">
              <Link href={`/marches/${facture.marche.id}`}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Voir le marché
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {facture.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{facture.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Métadonnées */}
      <p className="text-xs text-muted-foreground text-right">
        Créée le {formatDateLong(facture.createdAt)} · Dernière modification le {formatDateLong(facture.updatedAt)}
      </p>
    </div>
  )
}
