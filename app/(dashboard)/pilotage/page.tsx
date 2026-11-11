// app/(dashboard)/pilotage/page.tsx

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/utils/permissions'
import { PilotageOnglets } from './PilotageOnglets'

export const dynamic = 'force-dynamic'

export default async function PilotagePage() {
  const session = await requireRole(['ADMIN', 'AVANCE']).catch(() => null)
  if (!session) redirect('/')

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-stam-primary">Pilotage</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Indicateurs de décision, veille concurrentielle et analyses, sur une même période.
        </p>
      </div>
      <Suspense fallback={null}>
        <PilotageOnglets />
      </Suspense>
    </div>
  )
}
