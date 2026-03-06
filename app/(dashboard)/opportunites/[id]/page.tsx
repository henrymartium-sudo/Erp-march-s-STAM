import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OpportuniteDeleteButton } from '@/components/opportunites/opportunite-delete-button'
import { OpportuniteDetailActions } from '@/components/opportunites/opportunite-detail-actions'
import { getOpportunite } from '@/lib/actions/opportunites'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import {
  STATUT_OPPORTUNITE_LABELS,
  STATUT_OPPORTUNITE_COLORS,
} from '@/lib/validations/opportunite'
import { Pencil } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

function formatMontant(val: unknown): string {
  if (val === null || val === undefined) return '—'
  const n = parseFloat((val as { toString(): string }).toString())
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
}

function formatDate(val: Date | null | undefined): string {
  if (!val) return '—'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(val))
}

export default async function OpportuniteDetailPage({ params }: PageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)

  const { id } = await params
  const result = await getOpportunite(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const opp = result.data

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: 'Opportunités', href: '/opportunites' },
          { label: opp.objet },
        ]}
      />
      <PageHeader
        title={opp.objet}
        description={opp.autoriteContractante}
        action={
          userCanWrite && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href={`/opportunites/${id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Link>
              </Button>
              <OpportuniteDetailActions
                opportuniteId={opp.id}
                currentStatut={opp.statut}
                hasMarcheLinked={!!opp.marche}
                canWrite={userCanWrite}
              />
              <OpportuniteDeleteButton id={opp.id} objet={opp.objet} />
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Statut</span>
              <Badge variant={STATUT_OPPORTUNITE_COLORS[opp.statut] as 'success' | 'warning' | 'danger' | 'info' | 'muted'}>
                {STATUT_OPPORTUNITE_LABELS[opp.statut]}
              </Badge>
            </div>
            {opp.reference && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Référence</span>
                <span className="text-sm font-medium">{opp.reference}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Montant estimé</span>
              <span className="text-sm font-medium">{formatMontant(opp.montantEstime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Probabilité de gain</span>
              <span className="text-sm font-medium">
                {opp.probabiliteGain != null ? `${opp.probabiliteGain}%` : '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dates clés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date de publication</span>
              <span className="text-sm">{formatDate(opp.datePublication)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date limite de dépôt</span>
              <span className="text-sm">{formatDate(opp.dateLimite)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Marché lié</span>
              <span className="text-sm">
                {opp.marche ? (
                  <Link href={`/marches/${opp.marche.id}`} className="text-primary hover:underline">
                    {opp.marche.numero}
                  </Link>
                ) : '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {opp.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{opp.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Informations sur la perte — visible uniquement si statut PERDUE et données renseignées */}
      {opp.statut === 'PERDUE' && (
        (opp as unknown as { motifPerte?: string | null }).motifPerte ||
        (opp as unknown as { concurrentGagnant?: string | null }).concurrentGagnant
      ) && (
        <Card>
          <CardHeader>
            <CardTitle>Informations sur la perte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(opp as unknown as { motifPerte?: string | null }).motifPerte && (
              <div>
                <span className="text-sm text-muted-foreground block mb-1">Motif</span>
                <p className="text-sm whitespace-pre-wrap">
                  {(opp as unknown as { motifPerte: string }).motifPerte}
                </p>
              </div>
            )}
            {(opp as unknown as { concurrentGagnant?: string | null }).concurrentGagnant && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Concurrent retenu</span>
                <span className="text-sm font-medium">
                  {(opp as unknown as { concurrentGagnant: string }).concurrentGagnant}
                </span>
              </div>
            )}
            {(opp as unknown as { montantOffreConcurrent?: unknown }).montantOffreConcurrent != null && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Montant offre concurrente</span>
                <span className="text-sm font-medium">
                  {formatMontant((opp as unknown as { montantOffreConcurrent: unknown }).montantOffreConcurrent)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
