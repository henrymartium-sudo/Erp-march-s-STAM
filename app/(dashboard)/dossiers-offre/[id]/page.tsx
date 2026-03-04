import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChecklistView } from '@/components/dossiers-offre/checklist-view'
import { DossierDeleteButton } from '@/components/dossiers-offre/dossier-delete-button'
import { getDossierOffre } from '@/lib/actions/dossiers-offre'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { STATUT_DOSSIER_LABELS, STATUT_DOSSIER_COLORS } from '@/lib/validations/dossier-offre'
import { Pencil } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDate(val: Date | null | undefined): string {
  if (!val) return '—'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(val))
}

export default async function DossierDetailPage({ params }: PageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)

  const { id } = await params
  const result = await getDossierOffre(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const dossier = result.data

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dossiers d'offre", href: '/dossiers-offre' },
          { label: dossier.titre },
        ]}
      />
      <PageHeader
        title={dossier.titre}
        description={`${dossier.pieces.length} pièces — ${dossier.progression}% complété`}
        action={
          userCanWrite && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href={`/dossiers-offre/${id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Link>
              </Button>
              <DossierDeleteButton id={dossier.id} titre={dossier.titre} />
            </div>
          )
        }
      />

      {/* Info rapide */}
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Statut</p>
            <Badge variant={STATUT_DOSSIER_COLORS[dossier.statut] as 'success' | 'warning' | 'danger' | 'info' | 'muted'} className="mt-1">
              {STATUT_DOSSIER_LABELS[dossier.statut] ?? dossier.statut}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date de dépôt prévue</p>
            <p className="text-sm font-medium mt-1">{formatDate(dossier.dateDepot)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pièces complètes</p>
            <p className="text-sm font-medium mt-1">
              {dossier.pieces.filter((p: { statut: string }) => p.statut === 'COMPLET' || p.statut === 'VALIDE').length}
              /{dossier.pieces.length}
            </p>
          </div>
        </CardContent>
        {dossier.notes && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{dossier.notes}</p>
          </CardContent>
        )}
      </Card>

      {/* Checklist interactive */}
      <ChecklistView
        pieces={dossier.pieces}
        progression={dossier.progression}
        canWrite={userCanWrite}
      />
    </div>
  )
}
