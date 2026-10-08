'use client'

import { useEffect, useState, useTransition } from 'react'
import { startOfDay, subYears, endOfDay, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { PeriodSelector } from '@/components/analytique/PeriodSelector'
import { AnalytiquesTab } from '@/components/analytique/AnalytiquesTab'
import { IndicateurCard } from '@/components/pilotage/IndicateurCard'
import { QualiteDonnees } from '@/components/pilotage/QualiteDonnees'
import { LigneIssue } from '@/components/pilotage/LigneIssue'
import { getPilotageData, type PilotageData } from '@/lib/actions/pilotage'
import { SEUIL_CONVERSION, MIN_CAS_ECART, JOURS_MARCHE_RECENT, type IssueHistorique } from '@/lib/pilotage/calculs'
import { formatMontant } from '@/lib/utils/format'
import type { Periode } from '@/lib/analytics/types'

const pct = (v: number | null) => (v === null ? '—' : `${v} %`)

const LIBELLE_ISSUE_HISTORIQUE: Record<IssueHistorique, string> = {
  GAGNE: 'Gagnés (attribués)',
  PERDU_APRES_ATTRIBUTION: 'Perdus après attribution (annulés ou résiliés)',
  SANS_SUITE: 'Sans suite (infructueux ou annulés avant attribution)',
  A_QUALIFIER: 'À qualifier (offre déposée, issue non saisie)',
}
const ORDRE_ISSUES: IssueHistorique[] = ['GAGNE', 'PERDU_APRES_ATTRIBUTION', 'SANS_SUITE', 'A_QUALIFIER']

export function PilotageClient() {
  const [periode, setPeriode] = useState<Periode>(() => ({
    dateDebut: startOfDay(subYears(new Date(), 1)),
    dateFin: endOfDay(new Date()),
  }))
  const [data, setData] = useState<PilotageData | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [enCours, startTransition] = useTransition()
  const conversion = data?.conversion.status === 'success' ? data.conversion.value : null
  const offres = data?.offres.status === 'success' ? data.offres.value : null
  const ecartPrix = data?.ecartPrix.status === 'success' ? data.ecartPrix.value : null
  const historiques = data?.historiques.status === 'success' ? data.historiques.value : null
  const erreurPartielle = data !== null && [
    data.conversion, data.offres, data.ecartPrix, data.historiques, data.qualite,
  ].some((bloc) => bloc.status === 'error')

  useEffect(() => {
    setErreur(null)
    setData(null)
    startTransition(async () => {
      try {
        setData(await getPilotageData({ dateDebut: periode.dateDebut.toISOString(), dateFin: periode.dateFin.toISOString() }))
      } catch {
        setErreur('Impossible de calculer les indicateurs. Réessayez ou élargissez la période.')
      }
    })
  }, [periode, retry])

  return (
    <div className="space-y-6">
      <PeriodSelector value={periode} onChange={setPeriode} disabled={enCours} />
      <p className="text-sm text-muted-foreground">
        Tous les chiffres de la page portent sur la période du{' '}
        {format(periode.dateDebut, 'dd/MM/yyyy', { locale: fr })} au {format(periode.dateFin, 'dd/MM/yyyy', { locale: fr })}.
      </p>
      {erreur && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-destructive">{erreur}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setRetry((n) => n + 1)}>
            Réessayer
          </Button>
        </div>
      )}
      {!erreur && erreurPartielle && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-sm text-muted-foreground">
            Certains blocs sont indisponibles ; les autres indicateurs restent affichés.
          </p>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setRetry((n) => n + 1)}>
            Réessayer les calculs
          </Button>
        </div>
      )}
      {enCours || (!data && !erreur) ? (
        <div role="status" aria-label="Chargement des indicateurs" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : data && !erreur ? (
        <>
          {conversion && offres && conversion.valeurAttribuee === 0 && offres.lotsSoumis === 0 && (historiques?.total.nombre ?? 0) === 0 && (
            <p role="status" className="text-sm text-muted-foreground">
              Aucune donnée sur cette période. Élargissez la période pour voir des indicateurs.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <IndicateurCard
              titre="Conversion attribué → facturé"
              valeur={pct(conversion?.taux ?? null)}
              erreur={data.conversion.status === 'error' ? data.conversion.message : undefined}
              alerte={conversion?.alerte}
              sousLignes={conversion ? [
                `Facturé ${formatMontant(conversion.facture)} sur ${formatMontant(conversion.valeurAttribuee)}`,
                `dont encaissé : ${pct(conversion.tauxEncaisse)}`,
                `Perdu après attribution (annulé ou résilié) : ${conversion.nbPerdusApresAttribution} marché(s), ${formatMontant(conversion.perduApresAttribution)}`,
              ] : []}
              explication={`Part de la valeur attribuée déjà facturée (TTC). Alerte sous ${SEUIL_CONVERSION} %.`}
              detail={conversion && conversion.marches.length > 0 ? (
                <ul className="space-y-1">
                  {conversion.marches.map((m) => (
                    <li key={m.id} className="flex flex-wrap justify-between gap-x-2">
                      <span>
                        <Link href={`/marches/${m.id}`} className="inline-flex min-h-11 items-center hover:underline focus-visible:underline">
                          {m.numero}{m.perdu ? ' (perdu)' : ''}
                        </Link>
                        {m.auDelaContractuel && <span> ⚠ facturé au-delà du contractuel</span>}
                        {m.recent && <span className="text-muted-foreground"> (récent : attribué depuis moins de {JOURS_MARCHE_RECENT} jours)</span>}
                      </span>
                      <span className="tabular-nums">{formatMontant(m.facture)} / {formatMontant(m.montant)}</span>
                    </li>
                  ))}
                </ul>
              ) : undefined}
            />
            <IndicateurCard
              titre="Issue des offres"
              valeur={!offres || offres.tauxPerte === null ? '—' : offres.suffisant ? `${offres.tauxPerte} % perdus` : 'Pas assez de données'}
              erreur={data.offres.status === 'error' ? data.offres.message : undefined}
              sousLignes={offres ? [
                !offres.suffisant && offres.tauxPerte !== null
                  ? `Taux calculé sur ${offres.gagnes.nombre + offres.perdus.nombre} dossier(s) clos (minimum ${MIN_CAS_ECART})`
                  : null,
                `Gagnés : ${offres.gagnes.nombre} lot(s), ${formatMontant(offres.gagnes.valeur)}`,
                `Perdus : ${offres.perdus.nombre} lot(s), ${formatMontant(offres.perdus.valeur)}`,
                `Sans suite (infructueux) : ${offres.sansSuite.nombre} lot(s), ${formatMontant(offres.sansSuite.valeur)}`,
                `En attente d'issue : ${offres.enAttente.nombre} lot(s), ${formatMontant(offres.enAttente.valeur)}`,
                `Taux de succès (par lot) : ${offres.suffisant ? pct(offres.tauxSucces) : '—'}`,
              ].filter((l): l is string => l !== null) : []}
              explication="Lots soumis sur la période (date de dépôt). Taux de perte = perdus ÷ (gagnés + perdus) : les lots sans suite ou en attente n'entrent pas dans le taux. Les pertes après attribution figurent dans la conversion."
              detail={offres && offres.detail.length > 0 ? (
                <ul className="space-y-2">
                  {offres.detail.map((d) => <LigneIssue key={d.id} ligne={d} />)}
                </ul>
              ) : undefined}
            />
            <IndicateurCard
              titre="Écart de prix face au gagnant"
              valeur={ecartPrix?.suffisant && ecartPrix.ecartMoyen !== null
                ? `${ecartPrix.ecartMoyen > 0 ? '+' : ''}${ecartPrix.ecartMoyen} %`
                : 'Pas assez de données'}
              erreur={data.ecartPrix.status === 'error' ? data.ecartPrix.message : undefined}
              sousLignes={ecartPrix ? [`n = ${ecartPrix.n} lot(s) perdu(s) avec montant concurrent (minimum ${MIN_CAS_ECART})`] : []}
              explication="Positif : notre offre était plus chère que celle du gagnant."
              detail={ecartPrix && ecartPrix.n > 0 ? (
                <ul className="space-y-1">
                  {ecartPrix.cas.map((c) => (
                    <li key={c.id}>
                      <Link href={`/opportunites/${c.opportuniteId}`} className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 hover:underline focus-visible:underline">
                        <span className="break-words">{c.libelle}</span>
                        <span className="tabular-nums">{formatMontant(c.notreOffre)} / {formatMontant(c.offreGagnante)} : {c.ecart > 0 ? '+' : ''}{c.ecart} %</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : undefined}
            />
            <IndicateurCard
              titre="Marchés historiques"
              valeur={historiques ? `${historiques.total.nombre} marché(s)` : '—'}
              erreur={data.historiques.status === 'error' ? data.historiques.message : undefined}
              sousLignes={historiques
                ? ORDRE_ISSUES.map((i) => `${LIBELLE_ISSUE_HISTORIQUE[i]} : ${historiques.parIssue[i].nombre}, ${formatMontant(historiques.parIssue[i].valeur)}`)
                : []}
              explication="Marchés sans opportunité liée, attribués ou arrêtés sur la période. Présentés à part, sans taux : les offres perdues d'avant les lots n'ont pas été saisies."
              detail={historiques && historiques.lignes.length > 0 ? (
                <ul className="space-y-1">
                  {historiques.lignes.map((l) => (
                    <li key={l.id}>
                      <Link href={l.href} className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 hover:underline focus-visible:underline">
                        <span className="break-words">{l.numero} — {LIBELLE_ISSUE_HISTORIQUE[l.issue]}</span>
                        <span className="tabular-nums">{formatMontant(l.montant)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : undefined}
            />
          </div>
          <QualiteDonnees
            elements={data.qualite.status === 'success' ? data.qualite.value : []}
            erreur={data.qualite.status === 'error' ? data.qualite.message : undefined}
          />
        </>
      ) : null}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Analyses détaillées</h2>
        <AnalytiquesTab periode={periode} />
      </section>
    </div>
  )
}
