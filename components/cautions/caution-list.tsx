'use client';

import { useState } from 'react';
import { CautionCard } from './caution-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SortableHeader } from '@/components/shared/SortableHeader';
import { useSortable } from '@/hooks/use-sortable';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import type { SerializedCaution } from '@/types/serialized';

interface CautionListProps {
  cautions: SerializedCaution[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
  itemsPerPage?: number;
  className?: string;
}

/**
 * Liste paginée de cautions avec tri par colonne (asc/desc).
 */
export function CautionList({
  cautions,
  onEdit,
  onDelete,
  isLoading = false,
  itemsPerPage = 20,
  className,
}: CautionListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const { sortedData, sortConfig, onSort } = useSortable<SerializedCaution>(
    cautions,
    { key: 'dateEcheance', direction: 'asc' }
  );

  // Pagination sur les données triées
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCautions = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Réinitialiser la page quand le tri change
  const handleSort = (key: keyof SerializedCaution) => {
    setCurrentPage(1);
    onSort(key);
  };

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
          {cautions.length} caution{cautions.length > 1 ? 's' : ''} trouvée{cautions.length > 1 ? 's' : ''}
          {totalPages > 1 && ` (page ${currentPage} sur ${totalPages})`}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Trier par :</span>
          <SortableHeader<SerializedCaution>
            field="dateEcheance"
            label="Échéance"
            sortConfig={sortConfig}
            onSort={handleSort}
          />
          <SortableHeader<SerializedCaution>
            field="montant"
            label="Montant"
            sortConfig={sortConfig}
            onSort={handleSort}
          />
          <SortableHeader<SerializedCaution>
            field="statut"
            label="Statut"
            sortConfig={sortConfig}
            onSort={handleSort}
          />
          <SortableHeader<SerializedCaution>
            field="createdAt"
            label="Ajoutée"
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        </div>
      </div>

      {/* Grille de cautions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedCautions.map((caution) => (
          <CautionCard
            key={caution.id}
            caution={caution}
            mode="normal"
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNumber: number;

              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  size="sm"
                  className="w-8"
                  onClick={() => handlePageChange(pageNumber)}
                >
                  {pageNumber}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
