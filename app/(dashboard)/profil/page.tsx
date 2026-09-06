import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth.config'
import { ProfilClient } from './ProfilClient'

export const dynamic = 'force-dynamic'

export default async function ProfilPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const userWithRole = session.user as { name?: string | null; email?: string | null; role?: string }

  return (
    <>
      <h1 className="sr-only">Mon profil</h1>
      <ProfilClient
        name={userWithRole.name ?? 'Utilisateur'}
        email={userWithRole.email ?? ''}
        role={userWithRole.role ?? 'VISITEUR'}
      />
    </>
  )
}
