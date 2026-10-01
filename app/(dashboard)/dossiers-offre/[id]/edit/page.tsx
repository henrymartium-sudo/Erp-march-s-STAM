import { notFound, permanentRedirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/utils/permissions'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const d = await prisma.dossierOffre.findUnique({ where: { id }, select: { opportuniteId: true, lot: { select: { numero: true } } } })
  if (!d?.opportuniteId) notFound()
  permanentRedirect(`/opportunites/${d.opportuniteId}?onglet=lots${d.lot ? `#lot-${d.lot.numero}` : ''}`)
}
