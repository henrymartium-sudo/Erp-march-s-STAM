import Link from 'next/link'
import { AlertOctagon, Calendar, ChevronDown, Clock, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import type { LigneATraiter, ResultatATraiter } from '@/lib/tableau-de-bord/a-traiter'
import type { Horizon } from '@/lib/tableau-de-bord/dates'
import type { BlocTableauDeBord } from '@/lib/actions/tableau-de-bord'
import { compteursHorizon, filtrerATraiter, type Vue } from '@/lib/tableau-de-bord/presentation'
import { BlocIndisponible } from './BlocIndisponible'
import { LigneATraiterItem } from './LigneATraiterItem'

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`

/** « 3 échéances, dont 1 sans rattrapage » */
function annonce(n: number, sansRattrapage: number): string {
  const base = pluriel(n, 'échéance', 'échéances')
  return sansRattrapage > 0 ? `${base}, dont ${sansRattrapage} sans rattrapage` : base
}

const DONNEES_MANQUANTES: { cle: keyof ResultatATraiter['manquants']; texte: (n: number) => string }[] = [
  { cle: 'opportunitesSansDateDepot', texte: (n) => `${pluriel(n, 'opportunité', 'opportunités')} sans date de dépôt` },
  { cle: 'marchesSansDateLivraison', texte: (n) => `${pluriel(n, 'marché', 'marchés')} en attente de livraison sans date de livraison prévue` },
  { cle: 'marchesEnExecutionSansFin', texte: (n) => `${pluriel(n, 'marché', 'marchés')} en exécution sans date de fin prévue` },
  { cle: 'facturesSansDate', texte: (n) => `${pluriel(n, 'facture', 'factures')} sans date d'émission ni d'échéance` },
]

function GroupeLignes({ titre, icone, variante, lignes, aujourdHui }: {
  titre: string; icone: React.ReactNode; variante: 'danger' | 'warning'; lignes: LigneATraiter[]; aujourdHui: Date
}) {
  if (lignes.length === 0) return null
  const sans = lignes.filter((l) => l.sansRattrapage).length
  return (
    <section aria-label={titre} className="border-t">
      <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-1 pt-3 sm:px-5">
        <Badge variant={variante} className="gap-1.5">{icone}{titre}</Badge>
        <span className="text-xs font-normal text-muted-foreground">{annonce(lignes.length, sans)}</span>
      </h3>
      <ul className="divide-y divide-transparent">
        {lignes.map((l) => <LigneATraiterItem key={l.id} ligne={l} aujourdHui={aujourdHui} />)}
      </ul>
    </section>
  )
}

/** Premier bloc de la page : ce qu'il y a à faire, par horizon, puis les données qui empêchent d'être alerté. */
export function BlocATraiter({ bloc, vue, aujourdHui }: {
  bloc: BlocTableauDeBord<ResultatATraiter>; vue: Vue; aujourdHui: Date
}) {
  if (bloc.status === 'error') return <BlocIndisponible titre="Le bloc « À traiter »" />

  const r = filtrerATraiter(bloc.value, vue)
  const c = compteursHorizon(r.lignes)
  const parHorizon = (h: Horizon) => r.lignes.filter((l) => l.horizon === h)
  const mois = parHorizon('mois')
  const manquants = DONNEES_MANQUANTES.map((d) => ({ ...d, elements: r.manquants[d.cle] })).filter((d) => d.elements.length > 0)

  return (
    <Card role="region" aria-labelledby="titre-a-traiter">
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="titre-a-traiter" className="text-base font-semibold leading-none tracking-tight">À traiter</h2>
          <CardDescription>Le retard et les 30 prochains jours. Ce qui ne se rattrape pas passe en tête de son groupe.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="danger" className="gap-1.5"><AlertOctagon className="h-3 w-3" aria-hidden="true" />{c.retard} en retard</Badge>
          <Badge variant="warning" className="gap-1.5"><Clock className="h-3 w-3" aria-hidden="true" />{c.semaine} cette semaine</Badge>
          <Badge variant="muted" className="gap-1.5"><Calendar className="h-3 w-3" aria-hidden="true" />{c.mois} ce mois-ci</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {r.lignes.length === 0 && (
          <p className="border-t px-4 py-6 text-sm text-muted-foreground sm:px-5">Rien à traiter pour le moment.</p>
        )}
        <GroupeLignes
          titre="En retard" icone={<AlertOctagon className="h-3 w-3" aria-hidden="true" />} variante="danger"
          lignes={parHorizon('retard')} aujourdHui={aujourdHui}
        />
        <GroupeLignes
          titre="Cette semaine" icone={<Clock className="h-3 w-3" aria-hidden="true" />} variante="warning"
          lignes={parHorizon('semaine')} aujourdHui={aujourdHui}
        />
        {mois.length > 0 && (
          <details className="group border-t">
            <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm font-semibold marker:hidden sm:px-5 [&::-webkit-details-marker]:hidden">
              <Badge variant="muted" className="gap-1.5"><Calendar className="h-3 w-3" aria-hidden="true" />Ce mois-ci</Badge>
              <span className="text-xs font-normal text-muted-foreground">{annonce(mois.length, c.sansRattrapage.mois)}</span>
              <ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <ul>
              {mois.map((l) => <LigneATraiterItem key={l.id} ligne={l} aujourdHui={aujourdHui} />)}
            </ul>
          </details>
        )}
        {manquants.length > 0 && (
          <section aria-label="Données manquantes" className="m-4 flex gap-3 rounded-lg bg-stam-warning-bg p-3 text-sm text-stam-warning sm:mx-5">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="font-semibold">Données manquantes</h3>
              <p className="mb-1">Ces éléments ne peuvent pas apparaître plus haut tant qu'il manque une date.</p>
              <ul className="space-y-1">
                {manquants.map((d) => (
                  <li key={d.cle}>
                    {d.texte(d.elements.length)} :{' '}
                    {d.elements.map((e, i) => (
                      <span key={e.href}>
                        {i > 0 && ', '}
                        <Link href={e.href} className="font-semibold underline underline-offset-2">{e.libelle}</Link>
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  )
}
