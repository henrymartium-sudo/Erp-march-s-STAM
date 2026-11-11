import { permanentRedirect } from 'next/navigation'
import { requireAuth } from '@/lib/utils/permissions'
import { urlOngletVehicules } from '@/lib/vehicules/onglets'

// Ancienne adresse de la vue SAV : elle est devenue l'onglet « SAV » de /vehicules.
export default async function SavPage() {
  await requireAuth()
  permanentRedirect(urlOngletVehicules('sav'))
}
