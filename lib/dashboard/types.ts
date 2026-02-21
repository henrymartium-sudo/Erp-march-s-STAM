/**
 * Types pour le Dashboard enrichi
 */

export interface DashboardStats {
  totalMarches: number
  totalCautions: number
  marchesEnCours: number
  montantTotal: number
}

export interface StatutCount {
  statut: string
  label: string
  count: number
  pourcentage: number
  couleur: string
}

export interface EcheanceItem {
  id: string
  type: 'MARCHE' | 'CAUTION'
  reference: string
  titre: string
  dateEcheance: Date
  joursRestants: number
  criticite: 'CRITIQUE' | 'ATTENTION' | 'INFO'
}

export interface MarcheRecent {
  id: string
  numero: string
  objet: string
  montant: number
  statut: string
  dateNotification: Date
}

export interface MontantMensuel {
  mois: string
  montant: number
}

export interface CAEffectifPoint {
  label: string  // mois ISO "YYYY-MM" pour agréger côté client
  moisLabel: string  // "janv. 2026"
  montant: number
}
