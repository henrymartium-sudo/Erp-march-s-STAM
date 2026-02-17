import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth.config'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <DashboardShell
      userName={session.user.name}
      userRole={(session.user as { role?: string }).role}
    >
      {children}
    </DashboardShell>
  )
}
