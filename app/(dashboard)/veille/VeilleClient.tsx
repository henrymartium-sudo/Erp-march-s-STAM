'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PeriodSelector } from '@/components/analytique/PeriodSelector'
import { ClassementAngle } from '@/components/veille/ClassementAngle'
import { LignePerte } from '@/components/veille/LignePerte'
import { NonDocumentees } from '@/components/veille/NonDocumentees'
import { DoublonsPossibles } from '@/components/veille/DoublonsPossibles'
import { usePeriodeUrl } from '@/hooks/use-periode-url'
import { getVeilleData, type VeilleData } from '@/lib/actions/veille'
import { MIN_CAS_ECART } from '@/lib/pilotage/calculs'
import { formaterEcart } from '@/lib/veille/affichage'

export function VeilleClient() {
  const { periode, setPeriode, parametres } = usePeriodeUrl()
  const [data, setData] = useState<VeilleData | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [enCours, startTransition] = useTransition()
  const veille = data?.status === 'success' ? data.value : null

  useEffect(() => {
    setErreur(null)
    setData(null)
    startTransition(async () => {
      try {
        setData(await getVeilleData({ dateDebut: periode.dateDebut.toISOString(), dateFin: periode.dateFin.toISOString() }))
      } catch {
        setErreur('Impossible de calculer la veille. Réessayez ou élargissez la période.')
      }
    })
  }, [periode, retry])

  const messageErreur = erreur ?? (data?.status === 'error' ? data.message : null)
  const ecartGlobal = veille?.ecartGlobal.suffisant
    ? formaterEcart(veille.ecartGlobal.moyennePct, veille.ecartGlobal.moyenneFcfa)
    : null

  return (
    <div className="space-y-6">
      <PeriodSelector value={periode} onChange={setPeriode} disabled={enCours} />
      <p className="text-sm text-muted-foreground">
        Toutes les données de la page portent sur la période du {format(periode.dateDebut, 'dd/MM/yyyy', { locale: fr })} au{' '}
        {format(periode.dateFin, 'dd/MM/yyyy', { locale: fr })}.
      </p>
      <Link
        href={`/pilotage?${parametres}`}
        className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline focus-visible:underline"
      >
        Retour au pilotage
      </Link>

      {messageErreur && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-destructive">{messageErreur}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setRetry((n) => n + 1)}>
            Réessayer
          </Button>
        </div>
      )}

      {enCours || (!data && !erreur) ? (
        <div role="status" aria-label="Chargement de la veille" className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : veille && !messageErreur ? (
        <>
          <section aria-label="Couverture" className="space-y-1">
            <p className="text-lg font-semibold tabular-nums">
              {veille.couverture.documentees} lot(s) sur {veille.couverture.total} documenté(s)
            </p>
            <p className="text-sm text-muted-foreground">
              Cette page ne lit que les lots perdus : les offres perdues d’avant les lots n’ont pas été saisies.
            </p>
            {veille.exclusSansDate.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {veille.exclusSansDate.length} lot(s) perdu(s) exclu(s) faute de date de dépôt :{' '}
                {veille.exclusSansDate.map((e, i) => (
                  <span key={e.href}>
                    {i > 0 && ', '}
                    <Link href={e.href} className="underline-offset-4 hover:underline focus-visible:underline">{e.libelle}</Link>
                  </span>
                ))}
              </p>
            )}
          </section>

          {veille.couverture.total === 0 ? (
            <p role="status" className="text-sm text-muted-foreground">Aucune perte sur cette période.</p>
          ) : (
            <>
              <p className="text-sm tabular-nums">
                Écart moyen global : {ecartGlobal ?? `pas assez de lots documentés (minimum ${MIN_CAS_ECART})`}
              </p>
              <Tabs defaultValue="concurrent" className="space-y-4">
                <TabsList className="h-auto flex-wrap justify-start">
                  <TabsTrigger value="concurrent" className="min-h-11">Concurrent</TabsTrigger>
                  <TabsTrigger value="autorite" className="min-h-11">Autorité</TabsTrigger>
                  <TabsTrigger value="vehicule" className="min-h-11">Véhicule</TabsTrigger>
                  <TabsTrigger value="chronologie" className="min-h-11">Chronologie</TabsTrigger>
                </TabsList>
                <TabsContent value="concurrent">
                  <ClassementAngle lignes={veille.parConcurrent} libelleAssocies="Autorités concernées" vide="Aucune perte documentée par concurrent sur cette période." />
                </TabsContent>
                <TabsContent value="autorite">
                  <ClassementAngle lignes={veille.parAutorite} libelleAssocies="Concurrents gagnants" vide="Aucune perte documentée par autorité sur cette période." />
                </TabsContent>
                <TabsContent value="vehicule">
                  <ClassementAngle lignes={veille.parVehicule} libelleAssocies="Concurrents gagnants" vide="Aucune perte documentée par véhicule sur cette période." />
                </TabsContent>
                <TabsContent value="chronologie">
                  <ul className="space-y-2 text-sm">
                    {veille.chronologie.map((p) => <LignePerte key={p.id} perte={p} />)}
                  </ul>
                </TabsContent>
              </Tabs>
              <NonDocumentees pertes={veille.nonDocumentees} />
              <DoublonsPossibles doublons={veille.doublons} />
            </>
          )}
        </>
      ) : null}
    </div>
  )
}
