import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DocumentsEtatVideProps {
  filtresActifs: boolean
  canWrite: boolean
}

/** État vide de la liste (table et grille) : explique pourquoi et propose la suite logique. */
export function DocumentsEtatVide({ filtresActifs, canWrite }: DocumentsEtatVideProps) {
  return (
    <div
      data-testid="documents-etat-vide"
      className="flex flex-col items-center justify-center rounded-xl border px-4 py-16"
    >
      <FileText className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h2 className="mb-2 text-lg font-semibold">Aucun document trouvé</h2>
      <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
        {filtresActifs
          ? 'Aucun document ne correspond à ces critères. Modifiez ou effacez les filtres.'
          : canWrite
            ? 'Ajoutez un premier document : il apparaîtra ici avec ceux de vos marchés.'
            : "Aucun document n'a encore été ajouté."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {filtresActifs && (
          <Button asChild variant="outline">
            <Link href="/documents">Effacer les filtres</Link>
          </Button>
        )}
        {canWrite && (
          <Button asChild>
            <Link href="/documents/upload">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nouveau document
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
