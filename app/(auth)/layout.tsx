import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion - ERP Marchés Publics',
  description: 'Connexion à l\'application de gestion des marchés publics',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
