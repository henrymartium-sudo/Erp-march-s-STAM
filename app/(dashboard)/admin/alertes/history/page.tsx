import { permanentRedirect } from 'next/navigation'
import { requireAuth } from '@/lib/utils/permissions'
import { urlOngletAlertes } from '@/lib/alertes/onglets'

// L'historique est devenu l'onglet « Historique » de /admin/alertes.
export default async function AlertHistoryPage() {
  await requireAuth()
  permanentRedirect(urlOngletAlertes('historique'))
}
