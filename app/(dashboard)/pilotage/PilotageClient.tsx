'use client'

import { useEffect, useState, useTransition } from 'react'
import { startOfYear, endOfDay } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { PeriodSelector } from '@/components/analytique/PeriodSelector'
import { AnalytiquesTab } from '@/components/analytique/AnalytiquesTab'
import { IndicateurCard } from '@/components/pilotage/IndicateurCard'
import { QualiteDonnees } from '@/components/pilotage/QualiteDonnees'
import { getPilotageData, type PilotageData } from '@/lib/actions/pilotage'
import { SEUIL_CONVERSION, MIN_CAS_ECART } from '@/lib/pilotage/calculs'
import { formatMontant } from '@/lib/utils/format'
import type { Periode } from '@/lib/analytics/types'

const pct = (v: number | null) => (v === null ? '—' : `${v} %`)

export function PilotageClient() {
  const [periode, setPeriode] = useState<Periode>({ dateDebut: startOfYear(new Date()), dateFin: endOfDay(new Date()) })
  const [data, setData] = useState<PilotageData | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        setErreur(null)
        setData(await getPilotageData({ dateDebut: periode.dateDebut.toISOString(), dateFin: periode.dateFin.toISOString() }))
      } catch {
        setErreur('Impossible de calculer les indicateurs. Réessayez ou élargissez la période.')
      }
    })
  }, [periode])

  return (
    <div className="space-y-6">
      <PeriodSelector value={periode} onChange={setPeriode} disabled={enCours} />
      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
      {enCours || !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <IndicateurCard
              titre="Conversion attribué → facturé"
              valeur={pct(data.conversion.taux)}
              alerte={data.conversion.alerte}
              sousLignes={[
                `Facturé ${formatMontant(data.conversion.facture)} sur ${formatMontant(data.conversion.valeurAttribuee)}`,
                `dont encaissé : ${pct(data.conversion.tauxEncaisse)}`,
                `Perdu après attribution (annulé ou résilié) : ${data.conversion.nbPerdusApresAttribution} marché(s), ${formatMontant(data.conversion.perduApresAttribution)}`,
              ]}
              explication={`Part de la valeur attribuée déjà facturée (TTC). Alerte sous ${SEUIL_CONVERSION} %.`}
              detail={data.conversion.marches.length > 0 ? (
                <ul className="space-y-1">
                  {data.conversion.marches.map((m) => (
                    <li key={m.id} className="flex justify-between gap-2">
                      <span className="truncate">{m.numero}{m.perdu ? ' (perdu)' : ''}</span>
                      <span className="tabular-nums">{formatMontant(m.facture)} / {formatMontant(m.montant)}</span>
                    </li>
                  ))}
                </ul>
              ) : undefined}
            />
            <IndicateurCard
              titre="Issue des offres"
              valeur={data.offres.tauxPerte === null ? '—' : `${data.offres.tauxPerte} % perdus`}
              sousLignes={[
                `Gagnés : ${data.offres.gagnes.nombre} lot(s), ${formatMontant(data.offres.gagnes.valeur)}`,
                `Perdus : ${data.offres.perdus.nombre} lot(s), ${formatMontant(data.offres.perdus.valeur)}`,
                `Sans suite (infructueux) : ${data.offres.sansSuite.nombre} lot(s), ${formatMontant(data.offres.sansSuite.valeur)}`,
                `En attente d'issue : ${data.offres.enAttente.nombre} lot(s), ${formatMontant(data.offres.enAttente.valeur)}`,
                `Taux de succès (par lot) : ${pct(data.offres.tauxSucces)}`,
              ]}
              explication="Lots soumis sur la période (date de dépôt). Taux de perte = perdus ÷ (gagnés + perdus) : les lots sans suite ou en attente n'entrent pas dans le taux. Les pertes après attribution figurent dans la conversion."
              detail={data.offres.detail.length > 0 ? (
                <ul className="space-y-1">
                  {data.offres.detail.map((d) => (
                    <li key={d.id} className="flex justify-between gap-2">
                      <span className="truncate">{d.libelle}</span>
                      <span>{d.resultat}</span>
                    </li>
                  ))}
                </ul>
              ) : undefined}
            />
            <IndicateurCard
              titre="Écart de prix face au gagnant"
              valeur={data.ecartPrix.suffisant && data.ecartPrix.ecartMoyen !== null
                ? `${data.ecartPrix.ecartMoyen > 0 ? '+' : ''}${data.ecartPrix.ecartMoyen} %`
                : 'Pas assez de données'}
              sousLignes={[`n = ${data.ecartPrix.n} lot(s) perdu(s) avec montant concurrent (minimum ${MIN_CAS_ECART})`]}
              explication="Positif : notre offre était plus chère que celle du gagnant."
              detail={data.ecartPrix.n > 0 ? (
                <ul className="space-y-1">
                  {data.ecartPrix.cas.map((c) => (
                    <li key={c.id} className="flex justify-between gap-2">
                      <span className="truncate">{c.libelle}</span>
                      <span className="tabular-nums">{c.ecart > 0 ? '+' : ''}{c.ecart} %</span>
                    </li>
                  ))}
                </ul>
              ) : undefined}
            />
          </div>
          <QualiteDonnees elements={data.qualite} />
        </>
      )}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Analyses détaillées</h2>
        <AnalytiquesTab />
      </section>
    </div>
  )
}
