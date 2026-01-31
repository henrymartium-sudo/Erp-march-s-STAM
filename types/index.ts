// Types globaux de l'application ERP Marchés

import { Marche, TypeMarche, StatutMarche } from '@prisma/client'

// ============================================================================
// TYPES EXPORTÉS DEPUIS PRISMA
// ============================================================================

export type { Marche, TypeMarche, StatutMarche }

// ============================================================================
// TYPES PERSONNALISÉS
// ============================================================================

// Type pour les résultats de Server Actions
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// Type pour les filtres de recherche
export interface MarcheFilters {
  statut?: StatutMarche
  type?: TypeMarche
  dateDebut?: Date
  dateFin?: Date
}
