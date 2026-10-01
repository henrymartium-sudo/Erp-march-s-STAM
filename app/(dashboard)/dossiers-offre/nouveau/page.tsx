import { permanentRedirect } from 'next/navigation'
import { requireAuth } from '@/lib/utils/permissions'

export default async function Page() {
  await requireAuth()
  permanentRedirect('/opportunites')
}
