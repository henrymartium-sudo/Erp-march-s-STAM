import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OpportuniteDeleteButton } from '@/components/opportunites/opportunite-delete-button'
import { OpportuniteDetailActions } from '@/components/opportunites/opportunite-detail-actions'
import { OpportuniteTabs } from '@/components/opportunites/opportunite-tabs'
import { LotsSection } from '@/components/opportunites/lots-section'
import { PiecesCommunes } from '@/components/opportunites/pieces-communes'
import { getOpportunite } from '@/lib/actions/opportunites'
import { calculerTotauxLots, vehiculesModifiables } from '@/lib/utils/lots'
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
  const totauxLots = calculerTotauxLots(opp.lots)

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        showHome
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
              {/* key : le composant garde le statut en état local ; on le remonte quand le serveur le change (résultat de lot) */}
              <OpportuniteDetailActions
                key={opp.statut}
                opportuniteId={opp.id}
                currentStatut={opp.statut}
                nbLots={opp.lots.length}
                hasMarcheLinked={!!opp.marche}
                canWrite={userCanWrite}
              />
              <OpportuniteDeleteButton id={opp.id} objet={opp.objet} />
            </div>
          )
        }
      />

      <Suspense fallback={null}>
        <OpportuniteTabs
          nbLots={opp.lots.length}
          infos={
            <div className="space-y-6">
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
                    {/* MOD-6 — période de validité offre */}
                    {(opp as unknown as { periodeValiditeDebut?: Date | null }).periodeValiditeDebut && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Début validité offre</span>
                        <span className="text-sm">{formatDate((opp as unknown as { periodeValiditeDebut: Date }).periodeValiditeDebut)}</span>
                      </div>
                    )}
                    {(opp as unknown as { periodeValiditeFin?: Date | null }).periodeValiditeFin && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Fin validité offre</span>
                        <span className="text-sm">{formatDate((opp as unknown as { periodeValiditeFin: Date }).periodeValiditeFin)}</span>
                      </div>
                    )}
                    {/* MOD-7 — échéance attribution provisoire */}
                    {(opp as unknown as { echeanceAttributionProv?: Date | null }).echeanceAttributionProv && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Échéance attribution prov.</span>
                        <span className="text-sm">{formatDate((opp as unknown as { echeanceAttributionProv: Date }).echeanceAttributionProv)}</span>
                      </div>
                    )}
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

              {/* Agrégats des lots — remplace l'ancien affichage du résultat au niveau opportunité */}
              {opp.lots.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Lots</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Nombre de lots</span>
                      <span className="text-sm font-medium">{opp.lots.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Lots gagnés</span>
                      <span className="text-sm font-medium">
                        {totauxLots.nbGagnes} / {totauxLots.nbLots}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Montant total estimé</span>
                      <span className="text-sm font-medium">{formatMontant(totauxLots.totalEstime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Montant total proposé</span>
                      <span className="text-sm font-semibold">{formatMontant(totauxLots.totalPropose)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

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
            </div>
          }
          lots={
            <LotsSection
              opportuniteId={opp.id}
              statutOpportunite={opp.statut}
              lots={opp.lots}
              canWrite={userCanWrite}
              vehiculesModifiables={vehiculesModifiables(opp)}
            />
          }
          pieces={
            <PiecesCommunes
              pieces={opp.piecesCommunes}
              canWrite={userCanWrite}
              statutOpportunite={opp.statut}
            />
          }
        />
      </Suspense>
    </div>
  )
}
