/**
 * Types pour la pagination
 */

/**
 * Métadonnées de pagination retournées par les Server Actions
 */
export interface PaginationMetadata {
  /**
   * Page actuelle (1-indexed)
   */
  currentPage: number;

  /**
   * Nombre total de pages
   */
  totalPages: number;

  /**
   * Nombre total d'items (tous confondus)
   */
  totalItems: number;

  /**
   * Nombre d'items par page
   */
  itemsPerPage: number;

  /**
   * Index du premier item de la page actuelle (1-indexed)
   */
  firstItem: number;

  /**
   * Index du dernier item de la page actuelle (1-indexed)
   */
  lastItem: number;
}

/**
 * Paramètres de pagination acceptés par les Server Actions
 */
export interface PaginationParams {
  /**
   * Numéro de page (1-indexed, défaut: 1)
   */
  page?: number;

  /**
   * Nombre d'items par page (défaut: 10)
   */
  limit?: number;
}

/**
 * Réponse paginée générique
 */
export interface PaginatedResponse<T> {
  /**
   * Données de la page actuelle
   */
  data: T[];

  /**
   * Métadonnées de pagination
   */
  pagination: PaginationMetadata;
}
