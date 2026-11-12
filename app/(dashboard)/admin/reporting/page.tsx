import { permanentRedirect } from 'next/navigation'
import { requireAuth } from '@/lib/utils/permissions'
import { urlOngletAlertes } from '@/lib/alertes/onglets'

// Le reporting est devenu l'onglet « Rapports programmés » de /admin/alertes.
export default async function ReportingPage() {
  await requireAuth()
  permanentRedirect(urlOngletAlertes('rapports'))
}
