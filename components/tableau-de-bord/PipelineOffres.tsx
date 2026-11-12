import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import type { TableauDeBordData } from '@/lib/actions/tableau-de-bord'
import { pipelineVisible, type Vue } from '@/lib/tableau-de-bord/presentation'
import { formatMontant } from '@/lib/utils/format'
import { BlocIndisponible } from './BlocIndisponible'

/** Pipeline des offres : une barre par phase, chaque phase mène à la liste des lignes comptées. */
export function PipelineOffres({ pipeline, vue }: { pipeline: TableauDeBordData['pipeline']; vue: Vue }) {
  if (pipeline === null || !pipelineVisible(vue)) return null
  if (pipeline.status === 'error') return <BlocIndisponible titre="Le pipeline des offres" />

  const { phases, total } = pipeline.value
  const max = Math.max(1, ...phases.map((p) => p.nombre))
  return (
    <Card role="region" aria-labelledby="titre-pipeline">
      <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="titre-pipeline" className="text-base font-semibold leading-none tracking-tight">Pipeline des offres</h2>
          <CardDescription>Opportunités actives par phase. Un clic ouvre la liste de la phase.</CardDescription>
        </div>
        <Link href="/opportunites" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline">
          Toutes les opportunités
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent>
        {total.nombre === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune offre en cours.</p>
        ) : (
          <>
            <ol className="space-y-1">
              {phases.map((p) => (
                <li key={p.statut}>
                  <Link
                    href={p.href}
                    className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-md px-2 py-1.5 hover:bg-muted/60 focus-visible:bg-muted/60 sm:grid-cols-[12rem_minmax(0,1fr)_3rem_8rem]"
                  >
                    <span className="font-medium">{p.libelle}</span>
                    <span className="order-last col-span-2 h-2.5 overflow-hidden rounded bg-muted sm:order-none sm:col-span-1" aria-hidden="true">
                      <span className="block h-full rounded bg-primary" style={{ width: `${(p.nombre / max) * 100}%` }} />
                    </span>
                    <span className="text-right font-semibold tabular-nums">{p.nombre}</span>
                    {p.montant !== null && (
                      <span className="col-span-2 text-sm text-muted-foreground tabular-nums sm:col-span-1 sm:text-right">{formatMontant(p.montant)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
            <p className="mt-3 flex flex-wrap justify-between gap-x-4 border-t pt-3 text-sm text-muted-foreground">
              <span><b className="text-foreground">{total.nombre}</b> {total.nombre > 1 ? 'opportunités actives' : 'opportunité active'}</span>
              {total.montant !== null && <span>Montant estimé total <b className="text-foreground">{formatMontant(total.montant)}</b></span>}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
