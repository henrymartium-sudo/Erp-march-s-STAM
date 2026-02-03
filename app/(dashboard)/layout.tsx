import Link from 'next/link'
import { FileText, Home, FolderOpen, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                <span className="text-xl font-bold">ERP Marchés</span>
              </Link>

              <nav className="hidden md:flex items-center gap-4">
                <Button variant="ghost" asChild>
                  <Link href="/">
                    <Home className="h-4 w-4 mr-2" />
                    Accueil
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/marches">
                    <FileText className="h-4 w-4 mr-2" />
                    Marchés
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/documents">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Documents
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/cautions">
                    <Shield className="h-4 w-4 mr-2" />
                    Cautions
                  </Link>
                </Button>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">MVP - Version 0.1</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ERP Marchés Publics - STAM. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
