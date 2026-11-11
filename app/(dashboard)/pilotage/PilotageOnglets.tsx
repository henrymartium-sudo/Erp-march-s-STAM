'use client'

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PeriodSelector } from '@/components/analytique/PeriodSelector'
import { AnalytiquesTab } from '@/components/analytique/AnalytiquesTab'
import { usePeriodeUrl } from '@/hooks/use-periode-url'
import { avecOnglet, lireOnglet, type OngletPilotage } from '@/lib/pilotage/onglets'
import { PilotageClient } from './PilotageClient'
import { VeilleClient } from './VeilleClient'

export function PilotageOnglets() {
  const { periode, setPeriode } = usePeriodeUrl()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const onglet = lireOnglet(searchParams.get('onglet'))

  return (
    <div className="space-y-6">
      <PeriodSelector value={periode} onChange={setPeriode} />
      <p className="text-sm text-muted-foreground">
        Tous les chiffres de la page portent sur la période du{' '}
        {format(periode.dateDebut, 'dd/MM/yyyy', { locale: fr })} au {format(periode.dateFin, 'dd/MM/yyyy', { locale: fr })}, sauf le bloc « Qualité des données » (toutes périodes).
        {onglet === 'analyses' && ' Dans les Analyses, les listes de statuts montrent la situation actuelle, toutes dates.'}
      </p>
      <Tabs
        value={onglet}
        onValueChange={(v) => router.replace(`${pathname}?${avecOnglet(searchParams.toString(), v as OngletPilotage)}`, { scroll: false })}
        className="space-y-4"
      >
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="indicateurs" className="min-h-11">Indicateurs</TabsTrigger>
          <TabsTrigger value="veille" className="min-h-11">Veille</TabsTrigger>
          <TabsTrigger value="analyses" className="min-h-11">Analyses</TabsTrigger>
        </TabsList>
        <TabsContent value="indicateurs"><PilotageClient periode={periode} /></TabsContent>
        <TabsContent value="veille"><VeilleClient periode={periode} /></TabsContent>
        <TabsContent value="analyses"><AnalytiquesTab periode={periode} /></TabsContent>
      </Tabs>
    </div>
  )
}
