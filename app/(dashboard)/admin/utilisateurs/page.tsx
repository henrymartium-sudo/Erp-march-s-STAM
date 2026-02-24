import { requireRole } from '@/lib/utils/permissions'
import { prisma } from '@/lib/db/prisma'
import { PageHeader } from '@/components/shared/page-header'
import { UsersAdminClient } from './UsersAdminClient'

export const dynamic = 'force-dynamic'

export default async function UsersAdminPage() {
  await requireRole(['ADMIN'])

  const users = await prisma.user.findMany({
    include: {
      identifiers: {
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: { name: 'asc' },
  })

  const serialized = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as string,
    createdAt: u.createdAt.toISOString(),
    identifiers: u.identifiers.map(i => ({
      id: i.id,
      userId: i.userId,
      email: i.email,
      isPrimary: i.isPrimary,
      createdAt: i.createdAt.toISOString(),
    })),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description="Gestion des comptes et des identités email secondaires"
        count={users.length}
      />
      <UsersAdminClient users={serialized} />
    </div>
  )
}
