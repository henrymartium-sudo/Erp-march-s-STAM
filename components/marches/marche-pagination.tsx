'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { formatPaginationMessage } from '@/lib/utils/pagination';
import type { PaginationMetadata } from '@/types/pagination';

interface MarchePaginationProps {
  pagination: PaginationMetadata;
}

export function MarchePagination({ pagination }: MarchePaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { currentPage, totalPages } = pagination;

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // Générer les numéros de pages à afficher
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5; // Nombre maximum de pages visibles

    if (totalPages <= maxVisible) {
      // Afficher toutes les pages si <= 5
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logique pour grandes listes
      if (currentPage <= 3) {
        // Début : 1 2 3 4 ... last
        pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Fin : 1 ... last-3 last-2 last-1 last
        pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Milieu : 1 ... current-1 current current+1 ... last
        pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      {/* Message d'affichage */}
      <p className="text-sm text-muted-foreground">
        {formatPaginationMessage(pagination)}
      </p>

      {/* Pagination */}
      <Pagination>
        <PaginationContent>
          {/* Bouton Précédent */}
          <PaginationItem>
            <PaginationPrevious
              onClick={() => handlePageChange(currentPage - 1)}
              aria-disabled={currentPage === 1}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>

          {/* Numéros de pages */}
          {pageNumbers.map((page, index) => (
            <PaginationItem key={index}>
              {page === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => handlePageChange(page as number)}
                  isActive={page === currentPage}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          {/* Bouton Suivant */}
          <PaginationItem>
            <PaginationNext
              onClick={() => handlePageChange(currentPage + 1)}
              aria-disabled={currentPage === totalPages}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
