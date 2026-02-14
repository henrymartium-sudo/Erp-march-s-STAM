import { PAGINATION_DEFAULTS } from '@/lib/constants/pagination';
import type { PaginationMetadata, PaginationParams } from '@/types/pagination';

/**
 * Calcule les métadonnées de pagination
 */
export function calculatePagination(
  totalItems: number,
  currentPage: number = 1,
  itemsPerPage: number = PAGINATION_DEFAULTS.ITEMS_PER_PAGE
): PaginationMetadata {
  // Validation
  const validPage = Math.max(1, currentPage);
  const validLimit = Math.min(
    Math.max(1, itemsPerPage),
    PAGINATION_DEFAULTS.MAX_ITEMS_PER_PAGE
  );

  // Calculs
  const totalPages = Math.max(1, Math.ceil(totalItems / validLimit));
  const safePage = Math.min(validPage, totalPages);
  const firstItem = totalItems === 0 ? 0 : (safePage - 1) * validLimit + 1;
  const lastItem = Math.min(safePage * validLimit, totalItems);

  return {
    currentPage: safePage,
    totalPages,
    totalItems,
    itemsPerPage: validLimit,
    firstItem,
    lastItem,
  };
}

/**
 * Calcule skip et take pour Prisma à partir des paramètres de pagination
 */
export function getPrismaSkipTake(params?: PaginationParams): {
  skip: number;
  take: number;
} {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? PAGINATION_DEFAULTS.ITEMS_PER_PAGE;

  const validPage = Math.max(1, page);
  const validLimit = Math.min(
    Math.max(1, limit),
    PAGINATION_DEFAULTS.MAX_ITEMS_PER_PAGE
  );

  return {
    skip: (validPage - 1) * validLimit,
    take: validLimit,
  };
}

/**
 * Vérifie si la pagination doit être affichée
 */
export function shouldShowPagination(totalItems: number): boolean {
  return totalItems > PAGINATION_DEFAULTS.SHOW_PAGINATION_THRESHOLD;
}

/**
 * Formate le message d'affichage de pagination
 * Ex: "Affichage 11-20 sur 97 résultats"
 */
export function formatPaginationMessage(metadata: PaginationMetadata): string {
  if (metadata.totalItems === 0) {
    return 'Aucun résultat';
  }

  if (metadata.totalItems === 1) {
    return '1 résultat';
  }

  return `Affichage ${metadata.firstItem}-${metadata.lastItem} sur ${metadata.totalItems} résultats`;
}
