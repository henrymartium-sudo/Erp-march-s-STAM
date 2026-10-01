'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const ONGLETS = ['infos', 'lots', 'pieces'] as const
type Onglet = (typeof ONGLETS)[number]

export function OpportuniteTabs({
  infos, lots, pieces, nbLots,
}: { infos: React.ReactNode; lots: React.ReactNode; pieces: React.ReactNode; nbLots: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const courant = (ONGLETS as readonly string[]).includes(params.get('onglet') ?? '') ? (params.get('onglet') as Onglet) : 'infos'

  return (
    <Tabs
      value={courant}
      onValueChange={(v) => router.replace(`${pathname}?onglet=${v}`, { scroll: false })}
    >
      <TabsList className="h-auto max-w-full flex-wrap justify-start gap-y-1">
        <TabsTrigger value="infos">Informations</TabsTrigger>
        <TabsTrigger value="lots">Lots &amp; dossiers ({nbLots})</TabsTrigger>
        <TabsTrigger value="pieces">Pièces communes</TabsTrigger>
      </TabsList>
      <TabsContent value="infos">{infos}</TabsContent>
      <TabsContent value="lots">{lots}</TabsContent>
      <TabsContent value="pieces">{pieces}</TabsContent>
    </Tabs>
  )
}
