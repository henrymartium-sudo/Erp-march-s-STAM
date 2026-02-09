import { notFound } from 'next/navigation'
import { getMarcheById } from '@/lib/actions/marches'
import { MarcheForm } from '@/components/marches/marche-form'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { serializeMarche } from '@/lib/utils/serialize'

interface EditMarchePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditMarchePage({ params }: EditMarchePageProps) {
  const { id } = await params
  const marche = await getMarcheById(id)

  if (!marche) {
    notFound()
  }

  const serializedMarche = serializeMarche(marche)

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/marches/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
      </div>

      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Modifier le marché {marche.numero}</h1>
        <p className="text-muted-foreground">
          Modifiez les informations du marché public
        </p>
      </div>

      {/* Formulaire */}
      <MarcheForm marche={serializedMarche} />
    </div>
  )
}
