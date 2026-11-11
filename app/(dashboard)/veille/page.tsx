import { permanentRedirect } from 'next/navigation'
import { requireAuth } from '@/lib/utils/permissions'
import { urlVeilleVersPilotage } from '@/lib/pilotage/onglets'

export default async function VeillePage({
  searchParams,
}: {
  searchParams: Promise<{ debut?: string | string[]; fin?: string | string[] }>
}) {
  await requireAuth()
  const { debut, fin } = await searchParams
  permanentRedirect(urlVeilleVersPilotage(debut, fin))
}
