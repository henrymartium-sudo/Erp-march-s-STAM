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

// Champs disponibles par type d'événement (pour le condition builder)
export const EVENT_FIELDS: Record<AlertEventType, Array<{ field: string; label: string; type: "number" | "string" }>> = {
  CAUTION_EXPIRING: [
    { field: "joursRestants", label: "Jours restants", type: "number" },
    { field: "statut",        label: "Statut",         type: "string" },
    { field: "montant",       label: "Montant (XOF)",  type: "number" },
  ],
  MARCHE_EXPIRING: [
    { field: "joursRestants", label: "Jours restants", type: "number" },
    { field: "statut",        label: "Statut",         type: "string" },
  ],
  MARCHE_STATUS_CHANGED: [
    { field: "ancienStatut",  label: "Ancien statut",  type: "string" },
    { field: "nouveauStatut", label: "Nouveau statut", type: "string" },
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
