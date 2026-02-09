import Link from 'next/link'
import type { SerializedMarche } from '@/types/serialized'
import { MarcheCard } from './marche-card'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'

interface MarcheListProps {
  marches: SerializedMarche[]
}

export function MarcheList({ marches }: MarcheListProps) {
  // Trier les marchés par date de création (plus récents en premier)
  const marchesTries = [...marches].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // État vide
  if (marchesTries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucun marché trouvé</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
          Aucun marché ne correspond à vos critères de recherche. Commencez par créer
          votre premier marché.
        </p>
        <Button asChild>
          <Link href="/marches/nouveau">
            <Plus className="h-4 w-4 mr-2" />
            Créer un marché
          </Link>
        </Button>
      </div>
    )
  }

  // Grille responsive de marchés
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {marchesTries.map((marche) => (
        <MarcheCard key={marche.id} marche={marche} />
      ))}
    </div>
  )
}
