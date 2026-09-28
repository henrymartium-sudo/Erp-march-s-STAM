import Link from 'next/link'
import { Pencil, Plus, Target } from 'lucide-react'
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
import { STATUTS_AVANT_SOUMISSION } from '@/lib/utils/opportunite-filters'
import { cn } from '@/lib/utils'
import type { OpportuniteWithMarche } from '@/lib/actions/opportunites'

interface OpportuniteListProps {
  opportunites: OpportuniteWithMarche[]
  canWrite: boolean
  hasFilters: boolean
}

function formatMontant(val: unknown): string | null {
  if (val === null || val === undefined) return null
  const n = typeof val === 'object' && val !== null
    ? parseFloat((val as { toString(): string }).toString())
    : Number(val)
  if (isNaN(n)) return null
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
}

function formatDate(val: Date | null | undefined): string {
  if (!val) return '—'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(val))
}

const JOUR_MS = 24 * 60 * 60 * 1000

/**
 * Indicateur d'échéance, uniquement tant que l'offre n'est pas soumise :
 * après soumission, une date limite passée est normale et n'appelle aucune action.
 */
function EcheanceIndicator({ opp }: { opp: OpportuniteWithMarche }) {
  if (!opp.dateLimite || !STATUTS_AVANT_SOUMISSION.includes(opp.statut)) return null

  const debutJour = new Date()
  debutJour.setHours(0, 0, 0, 0)
  const limite = new Date(opp.dateLimite)
  limite.setHours(0, 0, 0, 0)
  const jours = Math.round((limite.getTime() - debutJour.getTime()) / JOUR_MS)

  if (jours < 0) {
    return <span className="text-xs font-medium text-muted-foreground">Dépassée</span>
  }
  if (jours === 0) {
    return <span className="text-xs font-semibold text-destructive">Aujourd&apos;hui</span>
  }
  return (
    <span className={cn('text-xs font-medium', jours <= 7 ? 'text-stam-warning' : 'text-muted-foreground')}>
      J-{jours}
    </span>
  )
}

export function OpportuniteList({ opportunites, canWrite, hasFilters }: OpportuniteListProps) {
  if (opportunites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border px-4 py-16">
        <Target className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <h3 className="mb-2 text-lg font-semibold">Aucune opportunité trouvée</h3>
        <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
          {hasFilters
            ? 'Aucune opportunité ne correspond à ces critères. Modifiez ou effacez les filtres.'
            : 'Aucune opportunité dans cette phase du pipeline.'}
        </p>
        {canWrite && !hasFilters && (
          <Button asChild>
            <Link href="/opportunites/nouvelle">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nouvelle opportunité
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px] sm:min-w-[260px]">Objet</TableHead>
            <TableHead className="hidden min-w-[180px] xl:table-cell">Autorité contractante</TableHead>
            <TableHead className="hidden sm:table-cell">Statut</TableHead>
            <TableHead className="hidden xl:table-cell">Date limite</TableHead>
            <TableHead className="hidden text-right xl:table-cell">Montant</TableHead>
            {canWrite && <TableHead className="w-[100px]"><span className="sr-only">Actions</span></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunites.map((opp) => {
            const montantEstime = formatMontant(opp.montantEstime)
            const montantPropose = formatMontant(opp.montantPropose)
            return (
              <TableRow key={opp.id}>
                <TableCell className="max-w-[360px] align-top">
                  <Link
                    href={`/opportunites/${opp.id}`}
                    className="line-clamp-2 font-medium hover:underline"
                    title={opp.objet}
                  >
                    {opp.objet}
                  </Link>
                  {opp.reference && (
                    <span className="font-mono-marche mt-1 block truncate text-xs text-muted-foreground" title={opp.reference}>
                      {opp.reference}
                    </span>
                  )}
                  {opp.marche && (
                    <Link
                      href={`/marches/${opp.marche.id}`}
                      className="font-mono-marche mt-1 inline-block text-xs text-primary hover:underline"
                    >
                      Marché {opp.marche.numero}
                    </Link>
                  )}
                  {/* Colonnes masquées sur petit écran : leur contenu passe sous l'objet */}
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground xl:hidden" title={opp.autoriteContractante}>
                    {opp.autoriteContractante}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs xl:hidden">
                    <Badge
                      variant={STATUT_OPPORTUNITE_COLORS[opp.statut] as 'success' | 'warning' | 'danger' | 'info' | 'muted'}
                      className="whitespace-nowrap sm:hidden"
                    >
                      {STATUT_OPPORTUNITE_LABELS[opp.statut] ?? opp.statut}
                    </Badge>
                    {opp.dateLimite && (
                      <span className="tabular-nums text-muted-foreground">
                        Limite {formatDate(opp.dateLimite)} <EcheanceIndicator opp={opp} />
                      </span>
                    )}
                    {montantEstime && <span className="tabular-nums">{montantEstime}</span>}
                  </div>
                </TableCell>
                <TableCell className="hidden max-w-[220px] align-top xl:table-cell">
                  <span className="line-clamp-2 text-sm" title={opp.autoriteContractante}>
                    {opp.autoriteContractante}
                  </span>
                </TableCell>
                <TableCell className="hidden align-top sm:table-cell">
                  <Badge
                    variant={STATUT_OPPORTUNITE_COLORS[opp.statut] as 'success' | 'warning' | 'danger' | 'info' | 'muted'}
                    className="whitespace-nowrap"
                  >
                    {STATUT_OPPORTUNITE_LABELS[opp.statut] ?? opp.statut}
                  </Badge>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap align-top xl:table-cell">
                  <div className="text-sm tabular-nums">{formatDate(opp.dateLimite)}</div>
                  <EcheanceIndicator opp={opp} />
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-right align-top tabular-nums xl:table-cell">
                  {montantEstime ?? <span className="text-muted-foreground">—</span>}
                  {montantPropose && (
                    <div className="text-xs text-muted-foreground">Proposé : {montantPropose}</div>
                  )}
                </TableCell>
                {canWrite && (
                  <TableCell className="align-top">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/opportunites/${opp.id}/edit`} aria-label={`Modifier l'opportunité ${opp.objet}`}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                      <OpportuniteDeleteButton id={opp.id} objet={opp.objet} />
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
