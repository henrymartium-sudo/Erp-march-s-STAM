// app/(dashboard)/pilotage/page.tsx

import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/utils/permissions'
import { PilotageClient } from './PilotageClient'

export const dynamic = 'force-dynamic'

export default async function PilotagePage() {
  const session = await requireRole(['ADMIN', 'AVANCE']).catch(() => null)
  if (!session) redirect('/')

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Pilotage</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Indicateurs de décision : ce que la valeur gagnée devient, et pourquoi on perd.
        </p>
      </div>
      <PilotageClient />
    </div>
  )
}
