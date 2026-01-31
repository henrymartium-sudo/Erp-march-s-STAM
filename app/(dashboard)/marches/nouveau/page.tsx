import { MarcheForm } from '@/components/marches/marche-form'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NouveauMarchePage() {
  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/marches">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
      </div>

      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Créer un marché</h1>
        <p className="text-muted-foreground">
          Remplissez les informations du nouveau marché public
        </p>
      </div>

      {/* Formulaire */}
      <MarcheForm />
    </div>
  )
}
