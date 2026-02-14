/**
 * Configuration par défaut de la pagination
 */

export const PAGINATION_DEFAULTS = {
  /**
   * Nombre d'items par page par défaut
   */
  ITEMS_PER_PAGE: 10,

  /**
   * Nombre maximum d'items par page autorisé
   */
  MAX_ITEMS_PER_PAGE: 100,

  /**
   * Seuil pour afficher la pagination
   * Si totalItems <= SHOW_PAGINATION_THRESHOLD, pas de pagination affichée
   */
  SHOW_PAGINATION_THRESHOLD: 10,
} as const;
