/**
 * Calcule le niveau d'urgence d'une date limite par rapport à aujourd'hui.
 *
 * - 'expired'  : date dépassée
 * - 'critical' : dans les 3 jours
 * - 'warning'  : dans les 7 jours
 * - 'normal'   : plus de 7 jours
 * - 'none'     : pas de date
 */
export type UrgencyLevel = 'expired' | 'critical' | 'warning' | 'normal' | 'none'

export function getUrgencyLevel(date: Date | string | null | undefined): UrgencyLevel {
  if (!date) return 'none'

  const target = typeof date === 'string' ? new Date(date) : date
  if (isNaN(target.getTime())) return 'none'

  const now = new Date()
  // Comparaison en jours entiers (ignorer l'heure)
  const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const targetMs = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
  const diffDays = Math.round((targetMs - todayMs) / 86_400_000)

  if (diffDays < 0) return 'expired'
  if (diffDays <= 3) return 'critical'
  if (diffDays <= 7) return 'warning'
  return 'normal'
}

/** Retourne le variant badge shadcn/ui correspondant au niveau d'urgence. */
export function urgencyToBadgeVariant(level: UrgencyLevel): string {
  switch (level) {
    case 'expired':  return 'danger'
    case 'critical': return 'danger'
    case 'warning':  return 'warning'
    case 'normal':   return 'success'
    default:         return 'muted'
  }
}

/** Retourne un libellé court pour le niveau d'urgence. */
export function urgencyToLabel(level: UrgencyLevel, diffDays?: number): string {
  switch (level) {
    case 'expired':  return 'Expirée'
    case 'critical': return diffDays === 0 ? "Aujourd'hui" : `${diffDays}j`
    case 'warning':  return `${diffDays}j`
    case 'normal':   return `${diffDays}j`
    default:         return '—'
  }
}
