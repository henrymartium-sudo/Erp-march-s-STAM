'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const ONGLETS = ['infos', 'lots', 'pieces', 'cautions'] as const
type Onglet = (typeof ONGLETS)[number]

export function OpportuniteTabs({
  infos, lots, pieces, nbLots, cautions, nbCautions = 0,
}: {
  infos: React.ReactNode
  lots: React.ReactNode
  pieces: React.ReactNode
  nbLots: number
  /** Absent tant que l'opportunité n'est pas au statut « Dossier en préparation » ou au-delà. */
  cautions?: React.ReactNode
  nbCautions?: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const demande = params.get('onglet') ?? ''
  const disponible = (ONGLETS as readonly string[]).includes(demande) && (demande !== 'cautions' || cautions !== undefined)
  const courant = disponible ? (demande as Onglet) : 'infos'

  return (
    <Tabs
      value={courant}
      onValueChange={(v) => router.replace(`${pathname}?onglet=${v}`, { scroll: false })}
    >
      <TabsList className="h-auto max-w-full flex-wrap justify-start gap-y-1">
        <TabsTrigger value="infos">Informations</TabsTrigger>
        <TabsTrigger value="lots">Lots &amp; dossiers ({nbLots})</TabsTrigger>
        <TabsTrigger value="pieces">Pièces communes</TabsTrigger>
        {cautions !== undefined && <TabsTrigger value="cautions">Cautions ({nbCautions})</TabsTrigger>}
      </TabsList>
      <TabsContent value="infos">{infos}</TabsContent>
      <TabsContent value="lots">{lots}</TabsContent>
      <TabsContent value="pieces">{pieces}</TabsContent>
      {cautions !== undefined && <TabsContent value="cautions">{cautions}</TabsContent>}
    </Tabs>
  )
}
