import { permanentRedirect } from 'next/navigation'
import { requireAuth } from '@/lib/utils/permissions'
import { urlOngletAlertes } from '@/lib/alertes/onglets'

// La liste des règles est devenue l'onglet « Règles » de /admin/alertes.
export default async function AlertRulesPage() {
  await requireAuth()
  permanentRedirect(urlOngletAlertes('regles'))
}
