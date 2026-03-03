export const AUDIT_ACTION = {
  CREATE:          'CREATE',
  UPDATE:          'UPDATE',
  DELETE:          'DELETE',
  LOGIN:           'LOGIN',
  LOGIN_FAILED:    'LOGIN_FAILED',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  EXPORT:          'EXPORT',
} as const

export type AuditAction = typeof AUDIT_ACTION[keyof typeof AUDIT_ACTION]

export const AUDIT_ENTITY = {
  MARCHE:       'MARCHE',
  CAUTION:      'CAUTION',
  VEHICULE:     'VEHICULE',
  DOCUMENT:     'DOCUMENT',
  INTERVENTION: 'INTERVENTION',
  ALERT_RULE:   'ALERT_RULE',
  AUTH:         'AUTH',
  EXPORT:       'EXPORT',
  FACTURE:      'FACTURE',
  OPPORTUNITE:  'OPPORTUNITE',
} as const

export type AuditEntity = typeof AUDIT_ENTITY[keyof typeof AUDIT_ENTITY]

export const ENTITY_LABELS: Record<string, string> = {
  MARCHE:       'Marché',
  CAUTION:      'Caution',
  VEHICULE:     'Véhicule',
  DOCUMENT:     'Document',
  INTERVENTION: 'Intervention SAV',
  ALERT_RULE:   'Règle d\'alerte',
  AUTH:         'Authentification',
  EXPORT:       'Export',
  FACTURE:      'Facture',
  OPPORTUNITE:  'Opportunité',
}

export const ACTION_LABELS: Record<string, string> = {
  CREATE:          'Création',
  UPDATE:          'Modification',
  DELETE:          'Suppression',
  LOGIN:           'Connexion',
  LOGIN_FAILED:    'Connexion échouée',
  CHANGE_PASSWORD: 'Changement MDP',
  EXPORT:          'Export',
}
