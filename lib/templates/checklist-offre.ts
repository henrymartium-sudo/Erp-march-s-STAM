// Template de pièces standard pour un dossier d'offre marché public (fourniture véhicules)

export interface TemplatePiece {
  nom: string
  description: string
  obligatoire: boolean
  ordre: number
}

export const CHECKLIST_STANDARD: TemplatePiece[] = [
  {
    nom: 'Lettre de soumission',
    description: 'Lettre de soumission signée et cachetée par le soumissionnaire',
    obligatoire: true,
    ordre: 1,
  },
  {
    nom: 'Caution de soumission',
    description: 'Caution bancaire de soumission du montant exigé par le DAO',
    obligatoire: true,
    ordre: 2,
  },
  {
    nom: 'Registre du commerce',
    description: 'Extrait du registre du commerce et du crédit mobilier (RCCM) en cours de validité',
    obligatoire: true,
    ordre: 3,
  },
  {
    nom: 'Attestation fiscale',
    description: "Attestation de situation fiscale régulière délivrée par l'administration fiscale",
    obligatoire: true,
    ordre: 4,
  },
  {
    nom: 'Attestation CNSS',
    description: 'Attestation de situation régulière vis-à-vis de la CNSS',
    obligatoire: true,
    ordre: 5,
  },
  {
    nom: 'Statuts de la société',
    description: 'Copie des statuts de la société certifiée conforme',
    obligatoire: true,
    ordre: 6,
  },
  {
    nom: 'Références techniques',
    description: "Liste des marchés similaires exécutés avec attestation de bonne fin d'exécution",
    obligatoire: true,
    ordre: 7,
  },
  {
    nom: 'Bilans financiers',
    description: 'Bilans financiers certifiés des 3 dernières années',
    obligatoire: true,
    ordre: 8,
  },
  {
    nom: 'Offre technique',
    description: 'Mémoire technique, planning, méthodologie et organisation',
    obligatoire: true,
    ordre: 9,
  },
  {
    nom: 'Offre financière (BPU/DQE)',
    description: 'Bordereau de prix unitaires et décompte quantitatif et estimatif',
    obligatoire: true,
    ordre: 10,
  },
  {
    nom: "Agrément ou autorisation d'exercice",
    description: "Agrément ou autorisation professionnelle délivrée par l'autorité compétente",
    obligatoire: false,
    ordre: 11,
  },
  {
    nom: 'Attestation assurance RC',
    description: 'Attestation assurance responsabilité civile professionnelle en cours de validité',
    obligatoire: false,
    ordre: 12,
  },
]
