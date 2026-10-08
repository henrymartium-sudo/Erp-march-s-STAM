// Calculs de la Veille concurrentielle — fonctions pures, sans accès base (testées en unitaire).

// ── Normalisation des noms ──────────────────────────────────────────────────────────────

/** Formes juridiques courantes, en minuscules sans accents (liste fermée, testée). */
const FORMES_JURIDIQUES = [
  'sarlu', 'sarl', 'suarl', 'sas', 'scs', 'sa', 'ets', 'etablissements', 'etablissement',
  'ste', 'societe', 'cie', 'compagnie', 'ltd', 'groupe', 'gie',
]

/** Minuscules, sans accents, ponctuation et espaces multiples ramenés à une seule espace. */
export function normaliserTexte(brut: string): string {
  return brut
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(?<=\b[a-z])\.(?=[a-z]\b)/g, '') // « s.a.r.l » → « sarl »
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Forme de comparaison d'un nom de concurrent : texte normalisé, formes juridiques retirées. */
export function normaliserNom(brut: string): string {
  const mots = normaliserTexte(brut).split(' ').filter(Boolean)
  const utiles = mots.filter((m) => !FORMES_JURIDIQUES.includes(m))
  const normalise = (utiles.length > 0 ? utiles : mots).join(' ')
  return normalise || brut.trim().toLowerCase()
}

/** Distance de Levenshtein (insertions, suppressions, substitutions). */
export function distanceLevenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const sauvegarde = prev[j]!
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = sauvegarde
    }
  }
  return prev[b.length]!
}

/** Orthographe affichée d'un groupe : la plus fréquente ; à égalité la plus longue, puis l'ordre alphabétique. */
export function libelleRetenu(bruts: string[]): string {
  const compte = new Map<string, number>()
  for (const b of bruts) compte.set(b, (compte.get(b) ?? 0) + 1)
  const classes = [...compte.entries()].sort(
    ([la, na], [lb, nb]) => nb - na || lb.length - la.length || la.localeCompare(lb, 'fr'),
  )
  return classes[0]![0]
}

// ── Doublons possibles ──────────────────────────────────────────────────────────────────

export interface GroupeNom { cle: string; libelle: string; nombre: number }
export interface DoublonPossible { a: GroupeNom; b: GroupeNom }

const LONGUEUR_MIN_DOUBLON = 5
const DISTANCE_MAX_DOUBLON = 2

/** Noms proches mais non regroupés : à corriger à la source, jamais fusionnés automatiquement. */
export function trouverDoublons(groupes: GroupeNom[]): DoublonPossible[] {
  const resultat: DoublonPossible[] = []
  for (let i = 0; i < groupes.length; i++) {
    for (let j = i + 1; j < groupes.length; j++) {
      const a = groupes[i]!
      const b = groupes[j]!
      if (a.cle === b.cle || a.cle.length < LONGUEUR_MIN_DOUBLON || b.cle.length < LONGUEUR_MIN_DOUBLON) continue
      const court = a.cle.length <= b.cle.length ? a.cle : b.cle
      const long = court === a.cle ? b.cle : a.cle
      if (distanceLevenshtein(a.cle, b.cle) <= DISTANCE_MAX_DOUBLON || long.startsWith(`${court} `)) {
        resultat.push({ a, b })
      }
    }
  }
  return resultat
}
