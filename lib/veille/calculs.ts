// Calculs de la Veille concurrentielle — fonctions pures, sans accès base (testées en unitaire).

import type { ElementLie, Periode } from '@/lib/pilotage/calculs'

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

// ── Pertes ──────────────────────────────────────────────────────────────────────────────

export interface LotVeille {
  id: string
  opportuniteId: string
  /** « <référence ou objet> — Lot <n> » (intituleLot) */
  libelle: string
  autorite: string
  resultat: 'EN_COURS' | 'ATTRIBUE_PROVISOIREMENT' | 'GAGNE' | 'PERDU' | 'INFRUCTUEUX'
  /** opportunité au statut offre soumise ou ultérieur */
  soumis: boolean
  /** dateLimite de l'opportunité */
  dateDepot: Date | null
  montantPropose: number | null
  montantOffreConcurrent: number | null
  concurrentGagnant: string | null
  motif: string | null
  vehicules: { marque: string; modele: string }[]
}

export type ElementManquant = 'concurrent' | 'montant du concurrent' | 'notre montant' | 'motif' | 'véhicule'

export interface PerteVeille {
  id: string
  opportuniteId: string
  libelle: string
  autorite: string
  /** nom brut du concurrent gagnant, null si non renseigné */
  concurrent: string | null
  /** forme normalisée du nom (clé de regroupement), null si non renseigné */
  concurrentCle: string | null
  notreMontant: number | null
  montantConcurrent: number | null
  /** écart en %, non arrondi ; null si un des deux montants manque */
  ecartPct: number | null
  ecartFcfa: number | null
  motif: string | null
  /** libellé affiché des véhicules proposés */
  vehicules: string
  /** clé de regroupement des véhicules, vide si aucun */
  vehiculesCle: string
  /** date de dépôt, ISO 8601 */
  dateDepot: string
  documentee: boolean
  manquants: ElementManquant[]
}

const positif = (v: number | null): v is number => v !== null && v > 0
const dansPeriode = (d: Date, p: Periode): boolean => d >= p.dateDebut && d <= p.dateFin
const texte = (s: string | null): string | null => (s && s.trim().length > 0 ? s.trim() : null)

/** Clé et libellé d'une combinaison de véhicules : triés, sans doublon, indépendants de la casse. */
export function cleVehicules(vehicules: { marque: string; modele: string }[]): { cle: string; libelle: string } {
  const parCle = new Map<string, string>()
  for (const v of vehicules) {
    const libelle = `${v.marque.trim()} ${v.modele.trim()}`.trim()
    const cle = normaliserTexte(libelle)
    if (cle && !parCle.has(cle)) parCle.set(cle, libelle)
  }
  if (parCle.size === 0) return { cle: '', libelle: 'Véhicule non renseigné' }
  const triees = [...parCle.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr'))
  return { cle: triees.map(([c]) => c).join(' + '), libelle: triees.map(([, l]) => l).join(' + ') }
}

export function construirePertes(
  lots: LotVeille[],
  periode: Periode,
): { pertes: PerteVeille[]; exclusSansDate: ElementLie[] } {
  const pertes: PerteVeille[] = []
  const exclusSansDate: ElementLie[] = []

  for (const l of lots) {
    if (!l.soumis || l.resultat !== 'PERDU') continue
    if (!l.dateDepot) {
      exclusSansDate.push({ libelle: l.libelle, href: `/opportunites/${l.opportuniteId}` })
      continue
    }
    if (!dansPeriode(l.dateDepot, periode)) continue

    const concurrent = texte(l.concurrentGagnant)
    const motif = texte(l.motif)
    const propose = positif(l.montantPropose) ? l.montantPropose : null
    const gagnant = positif(l.montantOffreConcurrent) ? l.montantOffreConcurrent : null
    const vehicules = cleVehicules(l.vehicules)

    const manquants: ElementManquant[] = []
    if (!concurrent) manquants.push('concurrent')
    if (gagnant === null) manquants.push('montant du concurrent')
    if (propose === null) manquants.push('notre montant')
    if (!motif) manquants.push('motif')
    if (vehicules.cle === '') manquants.push('véhicule')

    pertes.push({
      id: l.id,
      opportuniteId: l.opportuniteId,
      libelle: l.libelle,
      autorite: l.autorite,
      concurrent,
      concurrentCle: concurrent ? normaliserNom(concurrent) : null,
      notreMontant: propose,
      montantConcurrent: gagnant,
      ecartPct: propose !== null && gagnant !== null ? ((propose - gagnant) / gagnant) * 100 : null,
      ecartFcfa: propose !== null && gagnant !== null ? propose - gagnant : null,
      motif,
      vehicules: vehicules.libelle,
      vehiculesCle: vehicules.cle,
      dateDepot: l.dateDepot.toISOString(),
      documentee: concurrent !== null && propose !== null && gagnant !== null,
      manquants,
    })
  }
  return { pertes, exclusSansDate }
}
