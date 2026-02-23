// lib/alertes/types.ts

export const ALERT_EVENT_TYPES = {
  CAUTION_EXPIRING:       "CAUTION_EXPIRING",
  MARCHE_EXPIRING:        "MARCHE_EXPIRING",
  MARCHE_STATUS_CHANGED:  "MARCHE_STATUS_CHANGED",
  SAV_TICKET_CREATED:     "SAV_TICKET_CREATED",
  SAV_TICKET_ESCALATED:   "SAV_TICKET_ESCALATED",
  SAV_SLA_BREACH:         "SAV_SLA_BREACH",
  DOCUMENT_EXPIRING:      "DOCUMENT_EXPIRING",
} as const

export type AlertEventType = typeof ALERT_EVENT_TYPES[keyof typeof ALERT_EVENT_TYPES]

export const ALERT_CHANNELS = {
  EMAIL:   "EMAIL",
  IN_APP:  "IN_APP",
  WEBHOOK: "WEBHOOK",
} as const

export type AlertChannel = typeof ALERT_CHANNELS[keyof typeof ALERT_CHANNELS]

export const NOTIFICATION_STATUS = {
  PENDING: "PENDING",
  SENT:    "SENT",
  FAILED:  "FAILED",
  READ:    "READ",
} as const

export type NotificationStatus = typeof NOTIFICATION_STATUS[keyof typeof NOTIFICATION_STATUS]

export type ComparisonOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "nin"

export interface RuleCondition {
  field: string
  op: ComparisonOp
  value: string | number | string[]
}

export interface RuleConditions {
  operator: "AND" | "OR"
  conditions: RuleCondition[]
}

// Labels lisibles pour l'UI
export const EVENT_TYPE_LABELS: Record<AlertEventType, string> = {
  CAUTION_EXPIRING:      "Caution proche de l'échéance",
  MARCHE_EXPIRING:       "Marché en fin d'exécution",
  MARCHE_STATUS_CHANGED: "Changement de statut marché",
  SAV_TICKET_CREATED:    "Ticket SAV créé",
  SAV_TICKET_ESCALATED:  "Ticket SAV escaladé",
  SAV_SLA_BREACH:        "Dépassement SLA SAV",
  DOCUMENT_EXPIRING:     "Document expirant",
}

// Type pour la définition d'un champ de condition
export interface FieldDef {
  field: string
  label: string
  type: "number" | "string"
  enumValues?: string[]
  enumLabels?: Record<string, string>
}

// Constantes enum pour les selects
const STATUT_MARCHE_VALUES = [
  "OPPORTUNITE_IDENTIFIEE",
  "EN_COURS_ANALYSE",
  "SOUMISSION_EN_COURS",
  "SOUMIS",
  "EN_ATTENTE_ATTRIBUTION",
  "ATTRIBUE",
  "EN_EXECUTION",
  "EN_ATTENTE_LIVRAISON_OS",
  "CLOTURE",
  "INFRUCTUEUX",
  "ANNULE",
] as const

const STATUT_MARCHE_LABELS: Record<string, string> = {
  OPPORTUNITE_IDENTIFIEE:  "Opportunité identifiée",
  EN_COURS_ANALYSE:        "En cours d'analyse",
  SOUMISSION_EN_COURS:     "Soumission en cours",
  SOUMIS:                  "Soumis",
  EN_ATTENTE_ATTRIBUTION:  "En attente d'attribution",
  ATTRIBUE:                "Attribué",
  EN_EXECUTION:            "En exécution",
  EN_ATTENTE_LIVRAISON_OS: "En attente livraison OS",
  CLOTURE:                 "Clôturé",
  INFRUCTUEUX:             "Infructueux",
  ANNULE:                  "Annulé",
}

const STATUT_CAUTION_VALUES = ["ACTIVE", "LIBEREE", "APPELEE", "EXPIREE"] as const
const STATUT_CAUTION_LABELS: Record<string, string> = {
  ACTIVE:  "Active",
  LIBEREE: "Libérée",
  APPELEE: "Appelée",
  EXPIREE: "Expirée",
}

const STATUT_MARCHE_ACTIFS = ["EN_EXECUTION", "EN_ATTENTE_LIVRAISON_OS", "ATTRIBUE"] as const
const STATUT_MARCHE_ACTIFS_LABELS: Record<string, string> = {
  EN_EXECUTION:            "En exécution",
  EN_ATTENTE_LIVRAISON_OS: "En attente livraison OS",
  ATTRIBUE:                "Attribué",
}

// Champs disponibles par type d'événement (pour le condition builder)
export const EVENT_FIELDS: Record<AlertEventType, FieldDef[]> = {
  CAUTION_EXPIRING: [
    { field: "joursRestants", label: "Jours restants", type: "number" },
    {
      field: "statut", label: "Statut", type: "string",
      enumValues: [...STATUT_CAUTION_VALUES],
      enumLabels: STATUT_CAUTION_LABELS,
    },
    { field: "montant", label: "Montant (XOF)", type: "number" },
  ],
  MARCHE_EXPIRING: [
    { field: "joursRestants", label: "Jours restants", type: "number" },
    {
      field: "statut", label: "Statut", type: "string",
      enumValues: [...STATUT_MARCHE_ACTIFS],
      enumLabels: STATUT_MARCHE_ACTIFS_LABELS,
    },
  ],
  MARCHE_STATUS_CHANGED: [
    {
      field: "ancienStatut", label: "Ancien statut", type: "string",
      enumValues: [...STATUT_MARCHE_VALUES],
      enumLabels: STATUT_MARCHE_LABELS,
    },
    {
      field: "nouveauStatut", label: "Nouveau statut", type: "string",
      enumValues: [...STATUT_MARCHE_VALUES],
      enumLabels: STATUT_MARCHE_LABELS,
    },
  ],
  SAV_TICKET_CREATED:   [],
  SAV_TICKET_ESCALATED: [],
  SAV_SLA_BREACH: [
    { field: "heuresDepassement", label: "Heures de dépassement", type: "number" },
  ],
  DOCUMENT_EXPIRING: [
    { field: "joursRestants", label: "Jours restants", type: "number" },
  ],
}
