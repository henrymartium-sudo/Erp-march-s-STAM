// Onglets de /admin/alertes, lus et écrits dans l'adresse (/admin/alertes = Envoi manuel, ?onglet=… = les autres).
// Les rôles ci-dessous reprennent ceux des pages d'origine ; les actions serveur gardent leur propre contrôle.

export type OngletAlertes = 'envoi' | 'regles' | 'rapports' | 'historique'

const ONGLETS: { valeur: OngletAlertes; roles: string[] }[] = [
  { valeur: 'envoi', roles: ['ADMIN', 'AVANCE', 'EXPLOITATION'] },
  { valeur: 'regles', roles: ['ADMIN', 'AVANCE'] },
  { valeur: 'rapports', roles: ['ADMIN'] },
  { valeur: 'historique', roles: ['ADMIN', 'AVANCE'] },
]

/** Valeur absente, vide ou inconnue : Envoi manuel. Paramètre répété : première valeur. */
export function lireOngletAlertes(valeur: string | string[] | undefined): OngletAlertes {
  const premiere = Array.isArray(valeur) ? valeur[0] : valeur
  return ONGLETS.find((o) => o.valeur === premiere)?.valeur ?? 'envoi'
}

export function urlOngletAlertes(onglet: OngletAlertes): string {
  return onglet === 'envoi' ? '/admin/alertes' : `/admin/alertes?onglet=${onglet}`
}

export function ongletsAutorises(role: string | undefined): OngletAlertes[] {
  return ONGLETS.filter((o) => role !== undefined && o.roles.includes(role)).map((o) => o.valeur)
}

export function ongletAutorise(onglet: OngletAlertes, role: string | undefined): boolean {
  return ongletsAutorises(role).includes(onglet)
}
