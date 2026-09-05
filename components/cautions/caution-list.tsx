'use client';

import { CautionCard } from './caution-card';
import { Skeleton } from '@/components/ui/skeleton';
import { SortableHeader } from '@/components/shared/SortableHeader';
import { useSortable } from '@/hooks/use-sortable';
import { FileText } from 'lucide-react';
import type { SerializedCaution } from '@/types/serialized';

interface CautionListProps {
  cautions: SerializedCaution[];
  onEdit?: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Liste de cautions avec tri par colonne (asc/desc).
 *
 * La pagination est assurée côté serveur et rendue par <DataPagination> dans
 * la page : ce composant n'affiche que le lot déjà paginé qu'il reçoit.
 */
export function CautionList({
  cautions,
  onEdit,
  isLoading = false,
  className,
}: CautionListProps) {
  const { sortedData, sortConfig, onSort } = useSortable<SerializedCaution>(
    cautions,
    { key: 'dateEcheance', direction: 'asc' }
  );

  if (isLoading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (cautions.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-12 border rounded-lg">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Aucune caution</h3>
          <p className="text-muted-foreground">
            Aucune caution ne correspond à vos critères de recherche.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* En-tête avec tri et compteur */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="text-sm text-muted-foreground">
          {cautions.length} caution{cautions.length > 1 ? 's' : ''} affichée{cautions.length > 1 ? 's' : ''}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Trier par :</span>
          <SortableHeader<SerializedCaution>
            field="dateEcheance"
            label="Échéance"
            sortConfig={sortConfig}
            onSort={onSort}
          />
          <SortableHeader<SerializedCaution>
            field="montant"
            label="Montant"
            sortConfig={sortConfig}
            onSort={onSort}
          />
          <SortableHeader<SerializedCaution>
            field="statut"
            label="Statut"
            sortConfig={sortConfig}
            onSort={onSort}
          />
          <SortableHeader<SerializedCaution>
            field="createdAt"
            label="Ajoutée"
            sortConfig={sortConfig}
            onSort={onSort}
          />
        </div>
      </div>

      {/* Grille de cautions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedData.map((caution) => (
          <CautionCard
            key={caution.id}
            caution={caution}
            mode="normal"
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}
