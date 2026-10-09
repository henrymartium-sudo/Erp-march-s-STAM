// app/(dashboard)/veille/page.tsx

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/utils/permissions'
import { VeilleClient } from './VeilleClient'

export const dynamic = 'force-dynamic'

export default async function VeillePage() {
  const session = await requireRole(['ADMIN', 'AVANCE']).catch(() => null)
  if (!session) redirect('/')

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-stam-primary">Veille concurrentielle</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Qui nous bat, de combien on perd, pourquoi on perd.
        </p>
      </div>
      <Suspense fallback={null}>
        <VeilleClient />
      </Suspense>
    </div>
  )
}
