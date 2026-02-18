'use client'

import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarcheCard } from './marche-card'
import { SortableHeader } from '@/components/shared/SortableHeader'
import { useSortable } from '@/hooks/use-sortable'
import type { SerializedMarche } from '@/types/serialized'

interface MarcheListProps {
  marches: SerializedMarche[]
}

export function MarcheList({ marches }: MarcheListProps) {
  const { sortedData, sortConfig, onSort } = useSortable<SerializedMarche>(
    marches,
    { key: 'createdAt', direction: 'desc' }
  )

  if (marches.length === 0) {
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

  return (
    <div>
      {/* Toolbar de tri */}
      <div className="flex flex-wrap items-center gap-1 mb-4">
        <span className="text-xs text-muted-foreground mr-1">Trier par :</span>
        <SortableHeader<SerializedMarche>
          field="dateNotification"
          label="Date"
          sortConfig={sortConfig}
          onSort={onSort}
        />
        <SortableHeader<SerializedMarche>
          field="montant"
          label="Montant"
          sortConfig={sortConfig}
          onSort={onSort}
        />
        <SortableHeader<SerializedMarche>
          field="statut"
          label="Statut"
          sortConfig={sortConfig}
          onSort={onSort}
        />
        <SortableHeader<SerializedMarche>
          field="autoriteContractanteNom"
          label="Organisme"
          sortConfig={sortConfig}
          onSort={onSort}
        />
        <SortableHeader<SerializedMarche>
          field="createdAt"
          label="Ajouté"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      </div>

      {/* Grille responsive de marchés */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedData.map((marche) => (
          <MarcheCard key={marche.id} marche={marche} />
        ))}
      </div>
    </div>
  )
}
