/**
 * Heure limite de dépôt d'une opportunité.
 *
 * Elle est portée par `dateLimite` elle-même (pas de colonne dédiée) : minuit exact
 * signifie « heure non renseignée ». Lomé est en UTC+0, comme le serveur Vercel :
 * les accesseurs locaux du navigateur et ceux du serveur donnent la même heure.
 */

/** Heure de la date au format "HH:mm", ou null si elle n'est pas renseignée (minuit exact). */
export function heureLimiteDe(date: Date | string | null | undefined): string | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return null
  if (d.getHours() === 0 && d.getMinutes() === 0) return null
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Copie de `date` à l'heure "HH:mm" ; une saisie vide ou invalide remet minuit (heure non renseignée). */
export function appliquerHeureLimite(date: Date, heure: string): Date {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(heure)
  const copie = new Date(date)
  copie.setHours(match ? Number(match[1]) : 0, match ? Number(match[2]) : 0, 0, 0)
  return copie
}

/** Nouvelle date choisie au calendrier (minuit) : garde l'heure déjà saisie sur l'ancienne date. */
export function conserverHeureLimite(nouvelle: Date, ancienne: Date | null | undefined): Date {
  return appliquerHeureLimite(nouvelle, heureLimiteDe(ancienne) ?? '')
}
