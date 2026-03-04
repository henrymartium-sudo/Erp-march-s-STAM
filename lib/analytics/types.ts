// lib/analytics/types.ts

export interface Periode {
  dateDebut: Date
  dateFin: Date
}

// ── Performance ──────────────────────────────────────────────────────────────

export interface PerformanceStats {
  totalMarches: number
  marchesGagnes: number       // statuts "attribués" et après
  marchesDeposes: number      // OFFRE_DEPOSEE et après (hors INFRUCTUEUX/ANNULE)
  winRate: number             // 0-100
  montantTotal: number
  montantMoyen: number
  delaiMoyenJours: number
  parStatut: { statut: string; label: string; count: number }[]
  parType: { type: string; label: string; count: number; montant: number; winRate: number }[]
  topConcurrents: { nom: string; count: number }[]
}

// ── Financière ────────────────────────────────────────────────────────────────

export interface FinancialStats {
  caContractualise: number    // SUM montant marchés EN_EXECUTION + CLOTURE + EXECUTE_ATTENTE
  caEncaisse: number          // SUM montantTTC factures PAYEE
  caEnAttente: number         // SUM montantTTC factures EMISE + EN_ATTENTE
  cautionsActives: number     // SUM montant cautions ACTIVE
  cautionsLiberees: number    // SUM montant cautions LIBEREE
  tauxRecouvrement: number    // caEncaisse / caContractualise * 100
  facturesParStatut: { statut: string; count: number; montant: number }[]
}

// ── Capitalisation ────────────────────────────────────────────────────────────

export interface CapitalisationStats {
  topAC: {
    nom: string
    total: number
    gagnes: number
    montant: number
    winRate: number
  }[]
  parSegment: {
    type: string
    label: string
    total: number
    gagnes: number
    montant: number
    winRate: number
  }[]
  saisonnalite: { mois: string; label: string; count: number }[]
}

// ── SAV ───────────────────────────────────────────────────────────────────────

export interface SAVStats {
  totalInterventions: number
  interventionsResolues: number
  tauxResolution: number      // 0-100
  delaiMoyenResolutionJours: number
  coutTotal: number
  parType: { type: string; label: string; count: number; cout: number }[]
  parStatut: { statut: string; label: string; count: number }[]
  topVehicules: {
    vehiculeId: string
    immatriculation: string
    marque: string
    modele: string
    count: number
    cout: number
  }[]
}

// ── Données complètes ─────────────────────────────────────────────────────────

export interface AllAnalyticsData {
  performance: PerformanceStats
  financiere: FinancialStats
  capitalisation: CapitalisationStats
  sav: SAVStats
}
