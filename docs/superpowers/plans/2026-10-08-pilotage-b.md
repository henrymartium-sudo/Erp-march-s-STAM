# Pilotage B — Veille concurrentielle — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une page `/veille` (ADMIN et AVANCE) qui regroupe les lots perdus de la période et les lit par concurrent, autorité contractante, combinaison de véhicules et chronologie, avec couverture, seuil de 3 lots, regroupement des noms et période partagée avec `/pilotage` par l'adresse.

**Architecture:** Un module de calculs purs `lib/veille/calculs.ts` (testé en unitaire) reçoit une liste de lots et la période, et renvoie un `ResultatVeille`. Une server action en lecture seule `getVeilleData` lit les lots perdus et leurs véhicules, puis appelle le module. Une page cliente affiche le résultat ; la période vit dans l'URL grâce à un hook partagé avec `/pilotage`.

**Tech Stack:** Next.js 15 (App Router, Server Actions), React 19, Prisma (lecture seule), Zod, shadcn/ui, date-fns, Playwright (tests unitaires `tests/unit` et E2E `tests/v1`).

**Spec:** `docs/superpowers/specs/2026-10-08-pilotage-b-design.md` (lire en entier avant de commencer).

## Global Constraints

- Branche `feat/pilotage-b`, partie de `origin/main`. Lecture seule : aucune modification du schéma Prisma ni des données ; aucun envoi d'e-mail.
- Aucune nouvelle dépendance : réutiliser shadcn/ui (`@/components/ui/*`), `date-fns`, `lucide-react`, `zod`.
- Ne pas modifier `lib/actions/pilotage.ts` ni `lib/pilotage/calculs.ts` ; importer `MIN_CAS_ECART`, `intituleLot`, `ElementLie`, `Periode` depuis `@/lib/pilotage/calculs`.
- TypeScript strict avec `noUncheckedIndexedAccess` : toute lecture d'index de tableau est `T | undefined` (utiliser `!` ou `??`).
- Écart de prix : (notre offre − offre du gagnant) ÷ offre du gagnant, positif quand STAM est plus chère ; moyennes sur valeurs non arrondies, arrondi à l'affichage seulement.
- Seuil : `MIN_CAS_ECART` = 3 lots documentés, appliqué par ligne de classement et à l'écart global.
- Un lot est documenté s'il a un nom de concurrent, le montant du concurrent > 0 et notre montant > 0.
- Aucune comparaison de statut en SQL : filtres en mémoire (colonne de statut en TEXT en production pour `historique_statuts`).
- Interface en français, sans mode sombre, composants shadcn/ui, contrôles d'au moins 44 px (`min-h-11`), pas de défilement horizontal à 375, 768 et 1920 px, atteignable au clavier.
- Dépôt public : aucun nom de concurrent, d'autorité, montant ni chemin local réels dans le code, les tests, les documents ou les messages de commit. Les données de test portent le préfixe `[E2E-VEILLE]`.
- Les tests E2E tournent uniquement contre la base Docker locale `127.0.0.1:5433` (jamais la production) ; ne jamais lancer le serveur de dev par défaut, qui lit `.env`.
- Messages de commit en français, terminés par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `lib/veille/calculs.ts` (créer) | Types, normalisation des noms, doublons, construction des pertes, quatre angles, couverture, écart global. Fonctions pures. |
| `lib/veille/periode.ts` (créer) | Lecture et écriture de la période dans l'adresse. Fonctions pures. |
| `lib/veille/affichage.ts` (créer) | Mise en forme de l'écart (pure, testée). |
| `hooks/use-periode-url.ts` (créer) | Hook client : période lue et écrite dans `?debut=&fin=`. |
| `lib/actions/veille.ts` (créer) | Server action `getVeilleData`, lecture seule, ADMIN et AVANCE. |
| `components/veille/LignePerte.tsx` (créer) | Une perte, avec lien vers l'opportunité. |
| `components/veille/ClassementAngle.tsx` (créer) | Liste de lignes de classement avec détail repliable. |
| `components/veille/NonDocumentees.tsx`, `components/veille/DoublonsPossibles.tsx` (créer) | Blocs « non documentées » et « doublons possibles ». |
| `app/(dashboard)/veille/page.tsx`, `VeilleClient.tsx` (créer) | Page et logique cliente. |
| `components/layout/dashboard-shell.tsx` (modifier) | Entrée de menu et titre de page. |
| `app/(dashboard)/pilotage/PilotageClient.tsx`, `page.tsx` (modifier) | Période dans l'adresse, lien vers la veille, `Suspense`. |
| `tests/unit/veille-calculs.spec.ts`, `veille-periode.spec.ts`, `veille-affichage.spec.ts` (créer) | Tests unitaires. |
| `tests/helpers/base-locale.ts` (créer), `tests/v1/veille.spec.ts` (créer) | Accès SQL local sécurisé et E2E. |

Commande des tests unitaires d'un fichier : `npx playwright test -c playwright.unit.config.ts tests/unit/<fichier>`.

---

### Task 1: Normalisation des noms et doublons possibles

**Files:**
- Create: `lib/veille/calculs.ts`
- Test: `tests/unit/veille-calculs.spec.ts`

**Interfaces:**
- Produces (exports de `lib/veille/calculs.ts`) :
  - `normaliserTexte(brut: string): string`
  - `normaliserNom(brut: string): string`
  - `distanceLevenshtein(a: string, b: string): number`
  - `libelleRetenu(bruts: string[]): string`
  - `interface GroupeNom { cle: string; libelle: string; nombre: number }`
  - `interface DoublonPossible { a: GroupeNom; b: GroupeNom }`
  - `trouverDoublons(groupes: GroupeNom[]): DoublonPossible[]`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `tests/unit/veille-calculs.spec.ts` :

```ts
import { test, expect } from '@playwright/test'
import {
  normaliserTexte, normaliserNom, distanceLevenshtein, libelleRetenu, trouverDoublons,
} from '../../lib/veille/calculs'

test.describe('normalisation des noms', () => {
  test('ignore la casse, les accents, la ponctuation et les espaces multiples', () => {
    expect(normaliserTexte('  Étoile   Motors, ')).toBe('etoile motors')
    expect(normaliserTexte('AUTO-PLUS')).toBe('auto plus')
  })

  test('retire les formes juridiques courantes', () => {
    expect(normaliserNom('Auto Plus SARL')).toBe('auto plus')
    expect(normaliserNom('Société AUTO-PLUS S.A.R.L.')).toBe('auto plus')
    expect(normaliserNom('Ets. Kodjo')).toBe('kodjo')
    expect(normaliserNom('Kodjo Cie')).toBe('kodjo')
  })

  test('deux orthographes qui ne diffèrent que par ces détails ont la même forme', () => {
    expect(normaliserNom('AUTO PLUS')).toBe(normaliserNom('  auto-plus sa '))
  })

  test('un nom réduit à une forme juridique ou à de la ponctuation reste exploitable', () => {
    expect(normaliserNom('SARL')).toBe('sarl')
    expect(normaliserNom('---')).toBe('---')
  })
})

test.describe('distanceLevenshtein', () => {
  test('compte les insertions, suppressions et substitutions', () => {
    expect(distanceLevenshtein('kodjo', 'kodjo')).toBe(0)
    expect(distanceLevenshtein('toyota', 'toyata')).toBe(1)
    expect(distanceLevenshtein('abc', '')).toBe(3)
    expect(distanceLevenshtein('', 'abc')).toBe(3)
  })
})

test.describe('libelleRetenu', () => {
  test('retient l’orthographe la plus fréquente', () => {
    expect(libelleRetenu(['AUTO PLUS', 'Auto Plus', 'Auto Plus'])).toBe('Auto Plus')
  })
  test('à égalité, la plus longue, puis l’ordre alphabétique', () => {
    expect(libelleRetenu(['Kodjo', 'Kodjo SA'])).toBe('Kodjo SA')
    expect(libelleRetenu(['Beta', 'Alfa'])).toBe('Alfa')
  })
})

test.describe('trouverDoublons', () => {
  const g = (cle: string, nombre = 1) => ({ cle, libelle: cle, nombre })

  test('signale deux noms à 2 lettres près', () => {
    const r = trouverDoublons([g('auto plus'), g('auto pluss')])
    expect(r).toHaveLength(1)
    expect(r[0]?.a.cle).toBe('auto plus')
  })

  test('signale un nom qui commence l’autre au mot près', () => {
    expect(trouverDoublons([g('auto plus'), g('auto plus togo')])).toHaveLength(1)
  })

  test('ne signale pas un simple préfixe de lettres (il faut un mot entier)', () => {
    expect(trouverDoublons([g('autoplus'), g('autoplusmobile')])).toHaveLength(0)
  })

  test('ignore les noms de moins de 5 caractères', () => {
    expect(trouverDoublons([g('abcd'), g('abce')])).toHaveLength(0)
  })

  test('ne signale pas des noms éloignés', () => {
    expect(trouverDoublons([g('garage central'), g('camion express')])).toHaveLength(0)
  })

  test('ne compare pas un groupe avec lui-même', () => {
    expect(trouverDoublons([g('auto plus')])).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx playwright test -c playwright.unit.config.ts tests/unit/veille-calculs.spec.ts`
Expected: FAIL (module `lib/veille/calculs` introuvable).

- [ ] **Step 3: Écrire l'implémentation minimale**

Créer `lib/veille/calculs.ts` :

```ts
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
    .replace(/[\u0300-\u036f]/g, '')
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
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx playwright test -c playwright.unit.config.ts tests/unit/veille-calculs.spec.ts`
Expected: tous les tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/veille/calculs.ts tests/unit/veille-calculs.spec.ts
git commit -m "feat(veille): normalisation des noms de concurrents et doublons possibles

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Construction des pertes (population, documentation, écart)

**Files:**
- Modify: `lib/veille/calculs.ts` (ajouter après les doublons ; remplacer l'en-tête par les imports)
- Modify: `tests/unit/veille-calculs.spec.ts` (ajouter un bloc et un import)

**Interfaces:**
- Consumes: `normaliserTexte`, `normaliserNom` (Task 1) ; `MIN_CAS_ECART`, `ElementLie`, `Periode` de `@/lib/pilotage/calculs`.
- Produces :
  - `interface LotVeille { id; opportuniteId; libelle; autorite; resultat; soumis; dateDepot: Date | null; montantPropose: number | null; montantOffreConcurrent: number | null; concurrentGagnant: string | null; motif: string | null; vehicules: { marque: string; modele: string }[] }`
  - `type ElementManquant = 'concurrent' | 'montant du concurrent' | 'notre montant' | 'motif' | 'véhicule'`
  - `interface PerteVeille` (voir le code)
  - `cleVehicules(vehicules): { cle: string; libelle: string }`
  - `construirePertes(lots: LotVeille[], periode: Periode): { pertes: PerteVeille[]; exclusSansDate: ElementLie[] }`

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `tests/unit/veille-calculs.spec.ts`, remplacer le bloc d'import par :

```ts
import { test, expect } from '@playwright/test'
import {
  normaliserTexte, normaliserNom, distanceLevenshtein, libelleRetenu, trouverDoublons,
  construirePertes, cleVehicules, type LotVeille,
} from '../../lib/veille/calculs'

const PERIODE = { dateDebut: new Date('2026-01-01'), dateFin: new Date('2026-12-31T23:59:59') }

function lot(p: Partial<LotVeille> = {}): LotVeille {
  return {
    id: p.id ?? 'l1', opportuniteId: p.opportuniteId ?? 'o1', libelle: p.libelle ?? 'AO test — Lot 1',
    autorite: p.autorite ?? 'Mairie A', resultat: p.resultat ?? 'PERDU', soumis: p.soumis ?? true,
    dateDepot: p.dateDepot === undefined ? new Date('2026-03-01') : p.dateDepot,
    montantPropose: p.montantPropose === undefined ? 1000 : p.montantPropose,
    montantOffreConcurrent: p.montantOffreConcurrent === undefined ? 800 : p.montantOffreConcurrent,
    concurrentGagnant: p.concurrentGagnant === undefined ? 'Auto Plus' : p.concurrentGagnant,
    motif: p.motif === undefined ? 'Prix' : p.motif,
    vehicules: p.vehicules ?? [{ marque: 'Toyota', modele: 'Hilux' }],
  }
}
```

Puis ajouter à la fin du fichier :

```ts
test.describe('cleVehicules', () => {
  test('la clé ne dépend ni de l’ordre ni de la casse ni des doublons', () => {
    const a = cleVehicules([{ marque: 'Toyota', modele: 'Hilux' }, { marque: 'Isuzu', modele: 'D-Max' }])
    const b = cleVehicules([{ marque: 'isuzu', modele: 'd-max' }, { marque: 'TOYOTA', modele: 'HILUX' }, { marque: 'Toyota', modele: 'Hilux' }])
    expect(a.cle).toBe(b.cle)
    expect(a.libelle).toBe('Isuzu D-Max + Toyota Hilux')
  })
  test('aucun véhicule : clé vide et libellé explicite', () => {
    expect(cleVehicules([])).toEqual({ cle: '', libelle: 'Véhicule non renseigné' })
  })
})

test.describe('construirePertes', () => {
  test('ne garde que les lots perdus, soumis, dans la période', () => {
    const { pertes } = construirePertes([
      lot({ id: 'a' }),
      lot({ id: 'gagne', resultat: 'GAGNE' }),
      lot({ id: 'nonsoumis', soumis: false }),
      lot({ id: 'hors', dateDepot: new Date('2025-06-01') }),
    ], PERIODE)
    expect(pertes.map((p) => p.id)).toEqual(['a'])
  })

  test('un lot perdu sans date de dépôt est exclu et signalé avec son lien', () => {
    const r = construirePertes([lot({ id: 'a', opportuniteId: 'opp9', libelle: 'AO — Lot 2', dateDepot: null })], PERIODE)
    expect(r.pertes).toHaveLength(0)
    expect(r.exclusSansDate).toEqual([{ libelle: 'AO — Lot 2', href: '/opportunites/opp9' }])
  })

  test('un lot complet est documenté, avec son écart non arrondi', () => {
    const { pertes } = construirePertes([lot({ montantPropose: 1000, montantOffreConcurrent: 800 })], PERIODE)
    const p = pertes[0]!
    expect(p.documentee).toBe(true)
    expect(p.manquants).toEqual([])
    expect(p.ecartPct).toBeCloseTo(25, 10)
    expect(p.ecartFcfa).toBe(200)
  })

  test('chaque information manquante rend le lot non documenté (sauf le motif et le véhicule)', () => {
    const cas: [Partial<LotVeille>, string[], boolean][] = [
      [{ concurrentGagnant: null }, ['concurrent'], false],
      [{ concurrentGagnant: '   ' }, ['concurrent'], false],
      [{ montantOffreConcurrent: null }, ['montant du concurrent'], false],
      [{ montantOffreConcurrent: 0 }, ['montant du concurrent'], false],
      [{ montantPropose: null }, ['notre montant'], false],
      [{ motif: null }, ['motif'], true],
      [{ vehicules: [] }, ['véhicule'], true],
    ]
    for (const [surcharge, manquants, documentee] of cas) {
      const p = construirePertes([lot(surcharge)], PERIODE).pertes[0]!
      expect(p.manquants, JSON.stringify(surcharge)).toEqual(manquants)
      expect(p.documentee, JSON.stringify(surcharge)).toBe(documentee)
    }
  })

  test('sans montant du concurrent, aucun écart n’est calculé', () => {
    const p = construirePertes([lot({ montantOffreConcurrent: null })], PERIODE).pertes[0]!
    expect(p.ecartPct).toBeNull()
    expect(p.ecartFcfa).toBeNull()
  })

  test('la clé du concurrent est la forme normalisée du nom', () => {
    const p = construirePertes([lot({ concurrentGagnant: ' Société AUTO-PLUS SARL ' })], PERIODE).pertes[0]!
    expect(p.concurrent).toBe('Société AUTO-PLUS SARL')
    expect(p.concurrentCle).toBe('auto plus')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx playwright test -c playwright.unit.config.ts tests/unit/veille-calculs.spec.ts`
Expected: FAIL (`construirePertes` et `cleVehicules` non exportés).

- [ ] **Step 3: Écrire l'implémentation**

Dans `lib/veille/calculs.ts`, remplacer la première ligne de commentaire par :

```ts
// Calculs de la Veille concurrentielle — fonctions pures, sans accès base (testées en unitaire).

import type { ElementLie, Periode } from '@/lib/pilotage/calculs'
```

Puis ajouter à la fin du fichier :

```ts
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
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx playwright test -c playwright.unit.config.ts tests/unit/veille-calculs.spec.ts`
Expected: tous les tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/veille/calculs.ts tests/unit/veille-calculs.spec.ts
git commit -m "feat(veille): construction des pertes, documentation et écart de prix

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Quatre angles, couverture et écart global

**Files:**
- Modify: `lib/veille/calculs.ts` (ajouter ; retirer le `SEUIL_ECART` provisoire)
- Modify: `tests/unit/veille-calculs.spec.ts` (ajouter un import et un bloc)

**Interfaces:**
- Consumes: `construirePertes`, `PerteVeille`, `LotVeille`, `trouverDoublons`, `libelleRetenu`, `normaliserTexte` (Tasks 1-2) ; `MIN_CAS_ECART`.
- Produces :
  - `interface LigneClassement { cle; libelle; nombre; valeurPerdue; valeurGagneeParLesConcurrents; associes: string[]; ecartMoyenPct: number | null; ecartMoyenFcfa: number | null; suffisant: boolean; pertes: PerteVeille[] }`
  - `interface EcartGlobal { n: number; moyennePct: number | null; moyenneFcfa: number | null; suffisant: boolean }`
  - `interface ResultatVeille { couverture: { documentees: number; total: number }; parConcurrent; parAutorite; parVehicule: LigneClassement[]; chronologie: PerteVeille[]; nonDocumentees: PerteVeille[]; doublons: DoublonPossible[]; ecartGlobal: EcartGlobal; exclusSansDate: ElementLie[] }`
  - `calculerVeille(lots: LotVeille[], periode: Periode): ResultatVeille`

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `tests/unit/veille-calculs.spec.ts`, ajouter `calculerVeille` à l'import de `../../lib/veille/calculs`, ajouter `import { calculerEcartPrix, type LotPilotage } from '../../lib/pilotage/calculs'`, puis à la fin :

```ts
test.describe('calculerVeille', () => {
  test('deux orthographes d’un même concurrent donnent une seule ligne', () => {
    const r = calculerVeille([
      lot({ id: '1', concurrentGagnant: 'AUTO PLUS' }),
      lot({ id: '2', concurrentGagnant: 'Auto Plus' }),
      lot({ id: '3', concurrentGagnant: 'auto-plus sarl' }),
    ], PERIODE)
    expect(r.parConcurrent).toHaveLength(1)
    expect(r.parConcurrent[0]?.nombre).toBe(3)
  })

  test('le seuil de 3 lots s’applique à chaque ligne', () => {
    const deux = calculerVeille([lot({ id: '1' }), lot({ id: '2' })], PERIODE)
    expect(deux.parConcurrent[0]?.suffisant).toBe(false)
    expect(deux.parConcurrent[0]?.ecartMoyenPct).toBeNull()
    expect(deux.parConcurrent[0]?.pertes).toHaveLength(2)
    expect(deux.ecartGlobal.suffisant).toBe(false)

    const trois = calculerVeille([lot({ id: '1' }), lot({ id: '2' }), lot({ id: '3', montantOffreConcurrent: 1000 })], PERIODE)
    const l = trois.parConcurrent[0]!
    expect(l.suffisant).toBe(true)
    // écarts : 25 %, 25 %, 0 % → moyenne 16,67 (non arrondie)
    expect(l.ecartMoyenPct).toBeCloseTo(50 / 3, 10)
    expect(l.ecartMoyenFcfa).toBeCloseTo((200 + 200 + 0) / 3, 10)
    expect(trois.ecartGlobal.moyennePct).toBeCloseTo(50 / 3, 10)
  })

  test('chaque perte documentée figure une fois dans chaque angle, les autres uniquement dans « non documentées »', () => {
    const lots = [
      lot({ id: 'a', concurrentGagnant: 'Alpha Motors', autorite: 'Mairie A', vehicules: [{ marque: 'Toyota', modele: 'Hilux' }] }),
      lot({ id: 'b', concurrentGagnant: 'Beta Auto', autorite: 'mairie a', vehicules: [{ marque: 'Toyota', modele: 'Hilux' }, { marque: 'Isuzu', modele: 'D-Max' }] }),
      lot({ id: 'c', concurrentGagnant: 'Alpha Motors', autorite: 'Région B', vehicules: [] }),
      lot({ id: 'd', concurrentGagnant: null }),
      lot({ id: 'e', montantOffreConcurrent: null }),
    ]
    const r = calculerVeille(lots, PERIODE)
    const ids = (lignes: { pertes: { id: string }[] }[]) => lignes.flatMap((l) => l.pertes.map((p) => p.id)).sort()
    expect(ids(r.parConcurrent)).toEqual(['a', 'b', 'c'])
    expect(ids(r.parAutorite)).toEqual(['a', 'b', 'c'])
    expect(ids(r.parVehicule)).toEqual(['a', 'b', 'c'])
    expect(r.nonDocumentees.map((p) => p.id).sort()).toEqual(['d', 'e'])
    expect(r.chronologie.map((p) => p.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
    // les autorités « Mairie A » et « mairie a » forment une seule ligne
    expect(r.parAutorite.map((l) => l.nombre).sort()).toEqual([1, 2])
    // trois combinaisons de véhicules distinctes, dont « Véhicule non renseigné »
    expect(r.parVehicule.map((l) => l.libelle).sort()).toEqual(['Isuzu D-Max + Toyota Hilux', 'Toyota Hilux', 'Véhicule non renseigné'])
  })

  test('la couverture égale les lignes affichées', () => {
    const r = calculerVeille([lot({ id: '1' }), lot({ id: '2', concurrentGagnant: null }), lot({ id: '3' })], PERIODE)
    expect(r.couverture).toEqual({ documentees: 2, total: 3 })
    expect(r.parConcurrent.reduce((s, l) => s + l.nombre, 0) + r.nonDocumentees.length).toBe(r.couverture.total)
  })

  test('une période sans perte donne des listes vides et une couverture nulle', () => {
    const r = calculerVeille([lot({ resultat: 'GAGNE' })], PERIODE)
    expect(r.couverture).toEqual({ documentees: 0, total: 0 })
    expect(r.parConcurrent).toEqual([])
    expect(r.chronologie).toEqual([])
    expect(r.ecartGlobal.moyennePct).toBeNull()
  })

  test('la chronologie met la plus récente en premier', () => {
    const r = calculerVeille([
      lot({ id: 'ancien', dateDepot: new Date('2026-02-01') }),
      lot({ id: 'recent', dateDepot: new Date('2026-09-01') }),
      lot({ id: 'milieu', dateDepot: new Date('2026-05-01') }),
    ], PERIODE)
    expect(r.chronologie.map((p) => p.id)).toEqual(['recent', 'milieu', 'ancien'])
  })

  test('les doublons possibles viennent des groupes de concurrents', () => {
    const r = calculerVeille([
      lot({ id: '1', concurrentGagnant: 'Auto Plus' }),
      lot({ id: '2', concurrentGagnant: 'Auto Pluss' }),
    ], PERIODE)
    expect(r.parConcurrent).toHaveLength(2)
    expect(r.doublons).toHaveLength(1)
  })

  test('les valeurs et les associés sont agrégés par ligne', () => {
    const r = calculerVeille([
      lot({ id: '1', montantPropose: 1000, montantOffreConcurrent: 800, autorite: 'Mairie A' }),
      lot({ id: '2', montantPropose: 2000, montantOffreConcurrent: 1500, autorite: 'Région B' }),
    ], PERIODE)
    const l = r.parConcurrent[0]!
    expect(l.valeurPerdue).toBe(3000)
    expect(l.valeurGagneeParLesConcurrents).toBe(2300)
    expect(l.associes).toEqual(['Mairie A', 'Région B'])
  })

  test('l’écart global arrondi égale celui de /pilotage quand tous les lots avec montants ont un nom', () => {
    const lots = [
      lot({ id: '1', montantPropose: 1000, montantOffreConcurrent: 800 }),
      lot({ id: '2', montantPropose: 2000, montantOffreConcurrent: 1900, concurrentGagnant: 'Beta Auto' }),
      lot({ id: '3', montantPropose: 700, montantOffreConcurrent: 650, concurrentGagnant: 'Gamma' }),
    ]
    const pilotage: LotPilotage[] = lots.map((l) => ({
      id: l.id, opportuniteId: l.opportuniteId, libelle: l.libelle, resultat: l.resultat,
      montantPropose: l.montantPropose, montantOffreConcurrent: l.montantOffreConcurrent,
      dateDepot: l.dateDepot, soumis: l.soumis, motifRenseigne: !!l.motif, autorite: l.autorite,
      concurrentGagnant: l.concurrentGagnant, motif: l.motif,
    }))
    const veille = calculerVeille(lots, PERIODE)
    expect(Math.round(veille.ecartGlobal.moyennePct!)).toBe(calculerEcartPrix(pilotage, PERIODE).ecartMoyen)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx playwright test -c playwright.unit.config.ts tests/unit/veille-calculs.spec.ts`
Expected: FAIL (`calculerVeille` non exporté).

- [ ] **Step 3: Écrire l'implémentation**

Dans `lib/veille/calculs.ts`, ajouter `import { MIN_CAS_ECART } from '@/lib/pilotage/calculs'` sous l'import de types existant, puis ajouter à la fin du fichier :

```ts
// ── Classements par angle ───────────────────────────────────────────────────────────────

export interface LigneClassement {
  cle: string
  libelle: string
  nombre: number
  /** somme de nos offres perdues */
  valeurPerdue: number
  /** somme des offres gagnantes (celles des concurrents) */
  valeurGagneeParLesConcurrents: number
  /** valeurs liées distinctes : autorités (angle concurrent) ou concurrents (autres angles) */
  associes: string[]
  ecartMoyenPct: number | null
  ecartMoyenFcfa: number | null
  /** au moins MIN_CAS_ECART lots documentés */
  suffisant: boolean
  pertes: PerteVeille[]
}

export interface EcartGlobal { n: number; moyennePct: number | null; moyenneFcfa: number | null; suffisant: boolean }

export interface ResultatVeille {
  couverture: { documentees: number; total: number }
  parConcurrent: LigneClassement[]
  parAutorite: LigneClassement[]
  parVehicule: LigneClassement[]
  /** toutes les pertes, la plus récente d'abord */
  chronologie: PerteVeille[]
  nonDocumentees: PerteVeille[]
  doublons: DoublonPossible[]
  ecartGlobal: EcartGlobal
  exclusSansDate: ElementLie[]
}

const somme = (valeurs: number[]): number => valeurs.reduce((s, v) => s + v, 0)
const moyenne = (valeurs: number[]): number => somme(valeurs) / valeurs.length
const parDateDecroissante = (a: PerteVeille, b: PerteVeille): number =>
  b.dateDepot.localeCompare(a.dateDepot) || a.libelle.localeCompare(b.libelle, 'fr')

function distincts(valeurs: string[]): string[] {
  const parCle = new Map<string, string[]>()
  for (const v of valeurs) {
    const cle = normaliserTexte(v)
    parCle.set(cle, [...(parCle.get(cle) ?? []), v])
  }
  return [...parCle.values()].map(libelleRetenu).sort((a, b) => a.localeCompare(b, 'fr'))
}

function statsEcart(pertes: PerteVeille[]): { n: number; moyennePct: number | null; moyenneFcfa: number | null; suffisant: boolean } {
  const pcts = pertes.map((p) => p.ecartPct).filter((v): v is number => v !== null)
  const fcfas = pertes.map((p) => p.ecartFcfa).filter((v): v is number => v !== null)
  const suffisant = pcts.length >= MIN_CAS_ECART
  return {
    n: pcts.length,
    moyennePct: suffisant ? moyenne(pcts) : null,
    moyenneFcfa: suffisant ? moyenne(fcfas) : null,
    suffisant,
  }
}

function regrouper(
  pertes: PerteVeille[],
  cleDe: (p: PerteVeille) => string,
  libelleBrutDe: (p: PerteVeille) => string,
  associeDe: (p: PerteVeille) => string,
): LigneClassement[] {
  const groupes = new Map<string, PerteVeille[]>()
  for (const p of pertes) {
    const cle = cleDe(p)
    groupes.set(cle, [...(groupes.get(cle) ?? []), p])
  }
  return [...groupes.entries()]
    .map(([cle, ps]) => {
      const stats = statsEcart(ps)
      return {
        cle,
        libelle: libelleRetenu(ps.map(libelleBrutDe)),
        nombre: ps.length,
        valeurPerdue: somme(ps.map((p) => p.notreMontant ?? 0)),
        valeurGagneeParLesConcurrents: somme(ps.map((p) => p.montantConcurrent ?? 0)),
        associes: distincts(ps.map(associeDe)),
        ecartMoyenPct: stats.moyennePct,
        ecartMoyenFcfa: stats.moyenneFcfa,
        suffisant: stats.suffisant,
        pertes: [...ps].sort(parDateDecroissante),
      }
    })
    .sort((a, b) => b.nombre - a.nombre || a.libelle.localeCompare(b.libelle, 'fr'))
}

export function calculerVeille(lots: LotVeille[], periode: Periode): ResultatVeille {
  const { pertes, exclusSansDate } = construirePertes(lots, periode)
  const documentees = pertes.filter((p) => p.documentee)
  const nonDocumentees = pertes.filter((p) => !p.documentee).sort(parDateDecroissante)

  const parConcurrent = regrouper(documentees, (p) => p.concurrentCle ?? '', (p) => p.concurrent ?? '', (p) => p.autorite)
  const parAutorite = regrouper(documentees, (p) => normaliserTexte(p.autorite), (p) => p.autorite, (p) => p.concurrent ?? '')
  const parVehicule = regrouper(documentees, (p) => p.vehiculesCle, (p) => p.vehicules, (p) => p.concurrent ?? '')
  const global = statsEcart(documentees)

  return {
    couverture: { documentees: documentees.length, total: pertes.length },
    parConcurrent,
    parAutorite,
    parVehicule,
    chronologie: [...pertes].sort(parDateDecroissante),
    nonDocumentees,
    doublons: trouverDoublons(parConcurrent.map((l) => ({ cle: l.cle, libelle: l.libelle, nombre: l.nombre }))),
    ecartGlobal: { n: global.n, moyennePct: global.moyennePct, moyenneFcfa: global.moyenneFcfa, suffisant: global.suffisant },
    exclusSansDate,
  }
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx playwright test -c playwright.unit.config.ts tests/unit/veille-calculs.spec.ts`
Expected: tous les tests PASS.

- [ ] **Step 5: Vérifier les types puis commiter**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

```bash
git add lib/veille/calculs.ts tests/unit/veille-calculs.spec.ts
git commit -m "feat(veille): quatre angles de lecture, couverture, seuil de 3 lots et écart global

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Période dans l'adresse et mise en forme de l'écart

**Files:**
- Create: `lib/veille/periode.ts`, `lib/veille/affichage.ts`
- Test: `tests/unit/veille-periode.spec.ts`, `tests/unit/veille-affichage.spec.ts`

**Interfaces:**
- Produces :
  - `periodeParDefaut(maintenant?: Date): Periode` — 12 mois glissants : `startOfDay(subYears(maintenant, 1))` → `endOfDay(maintenant)`
  - `lirePeriodeUrl(debut: string | null, fin: string | null, maintenant?: Date): Periode` — valeurs absentes, mal formées ou inversées → période par défaut
  - `parametresPeriode(periode: Periode): string` — `debut=AAAA-MM-JJ&fin=AAAA-MM-JJ`
  - `formaterEcart(pct: number | null, fcfa: number | null): string | null`
  - `formaterPourcentage(pct: number): string`

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/unit/veille-periode.spec.ts` :

```ts
import { test, expect } from '@playwright/test'
import { format } from 'date-fns'
import { periodeParDefaut, lirePeriodeUrl, parametresPeriode } from '../../lib/veille/periode'

const MAINTENANT = new Date(2026, 9, 8, 15, 30) // 8 octobre 2026, heure locale

test.describe('période dans l’adresse', () => {
  test('la période par défaut couvre 12 mois glissants', () => {
    const p = periodeParDefaut(MAINTENANT)
    expect(format(p.dateDebut, 'yyyy-MM-dd HH:mm')).toBe('2025-10-08 00:00')
    expect(format(p.dateFin, 'yyyy-MM-dd')).toBe('2026-10-08')
    expect(p.dateFin.getHours()).toBe(23)
  })

  test('lit des dates valides, de minuit à 23 h 59', () => {
    const p = lirePeriodeUrl('2026-01-01', '2026-06-30', MAINTENANT)
    expect(format(p.dateDebut, 'yyyy-MM-dd HH:mm')).toBe('2026-01-01 00:00')
    expect(format(p.dateFin, 'yyyy-MM-dd')).toBe('2026-06-30')
    expect(p.dateFin.getHours()).toBe(23)
  })

  test('retombe sur la période par défaut quand les valeurs sont absentes, mal formées ou inversées', () => {
    const defaut = periodeParDefaut(MAINTENANT)
    for (const [d, f] of [[null, null], ['2026-01-01', null], ['n’importe quoi', '2026-06-30'], ['2026-13-40', '2026-06-30'], ['2026-06-30', '2026-01-01']] as [string | null, string | null][]) {
      const p = lirePeriodeUrl(d, f, MAINTENANT)
      expect(p.dateDebut.getTime(), `${d} / ${f}`).toBe(defaut.dateDebut.getTime())
      expect(p.dateFin.getTime(), `${d} / ${f}`).toBe(defaut.dateFin.getTime())
    }
  })

  test('écrire puis relire redonne la même période', () => {
    const p = lirePeriodeUrl('2026-02-03', '2026-08-09', MAINTENANT)
    const parametres = new URLSearchParams(parametresPeriode(p))
    expect(parametresPeriode(p)).toBe('debut=2026-02-03&fin=2026-08-09')
    const relue = lirePeriodeUrl(parametres.get('debut'), parametres.get('fin'), MAINTENANT)
    expect(relue.dateDebut.getTime()).toBe(p.dateDebut.getTime())
    expect(relue.dateFin.getTime()).toBe(p.dateFin.getTime())
  })
})
```

`tests/unit/veille-affichage.spec.ts` :

```ts
import { test, expect } from '@playwright/test'
import { formaterEcart, formaterPourcentage } from '../../lib/veille/affichage'

test.describe('mise en forme de l’écart', () => {
  test('un écart positif porte le signe plus', () => {
    const t = formaterEcart(25, 1_500_000)
    expect(t).not.toBeNull()
    expect(t!.startsWith('+')).toBe(true)
    expect(t!.endsWith('(+25 %)')).toBe(true)
    expect(t).toContain('FCFA')
  })

  test('un écart négatif garde son signe moins et un écart nul n’a pas de signe', () => {
    expect(formaterEcart(-10, -100)!.endsWith('(-10 %)')).toBe(true)
    expect(formaterEcart(0, 0)!.endsWith('(0 %)')).toBe(true)
  })

  test('arrondit le pourcentage à l’affichage seulement', () => {
    expect(formaterPourcentage(16.666)).toBe('+17 %')
    expect(formaterPourcentage(-0.4)).toBe('0 %')
  })

  test('sans écart calculable, rien à afficher', () => {
    expect(formaterEcart(null, 100)).toBeNull()
    expect(formaterEcart(10, null)).toBeNull()
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx playwright test -c playwright.unit.config.ts tests/unit/veille-periode.spec.ts tests/unit/veille-affichage.spec.ts`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Écrire l'implémentation**

`lib/veille/periode.ts` :

```ts
// Période partagée entre /pilotage et /veille, lue et écrite dans l'adresse (?debut=AAAA-MM-JJ&fin=AAAA-MM-JJ).

import { startOfDay, endOfDay, subYears, format, parse, isValid } from 'date-fns'
import type { Periode } from '@/lib/analytics/types'

/** 12 mois glissants, comme le défaut de /pilotage. */
export function periodeParDefaut(maintenant: Date = new Date()): Periode {
  return { dateDebut: startOfDay(subYears(maintenant, 1)), dateFin: endOfDay(maintenant) }
}

function lireDate(texte: string | null): Date | null {
  if (!texte || !/^\d{4}-\d{2}-\d{2}$/.test(texte)) return null
  const date = parse(texte, 'yyyy-MM-dd', new Date())
  return isValid(date) ? date : null
}

/** Valeurs absentes, mal formées ou inversées : période par défaut. */
export function lirePeriodeUrl(debut: string | null, fin: string | null, maintenant: Date = new Date()): Periode {
  const d = lireDate(debut)
  const f = lireDate(fin)
  if (!d || !f || d > f) return periodeParDefaut(maintenant)
  return { dateDebut: startOfDay(d), dateFin: endOfDay(f) }
}

export function parametresPeriode(periode: Periode): string {
  return `debut=${format(periode.dateDebut, 'yyyy-MM-dd')}&fin=${format(periode.dateFin, 'yyyy-MM-dd')}`
}
```

`lib/veille/affichage.ts` :

```ts
import { formatMontant } from '@/lib/utils/format'

const signe = (valeur: number): string => (valeur > 0 ? '+' : '')

/** Pourcentage arrondi à l'affichage seulement ; −0,4 s'affiche « 0 % ». */
export function formaterPourcentage(pct: number): string {
  const arrondi = Math.round(pct)
  return `${signe(arrondi)}${arrondi === 0 ? 0 : arrondi} %`
}

/** « +200 FCFA (+25 %) » : positif quand notre offre est plus chère que celle du gagnant. */
export function formaterEcart(pct: number | null, fcfa: number | null): string | null {
  if (pct === null || fcfa === null) return null
  return `${signe(fcfa)}${formatMontant(fcfa)} (${formaterPourcentage(pct)})`
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx playwright test -c playwright.unit.config.ts tests/unit/veille-periode.spec.ts tests/unit/veille-affichage.spec.ts`
Expected: tous les tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/veille/periode.ts lib/veille/affichage.ts tests/unit/veille-periode.spec.ts tests/unit/veille-affichage.spec.ts
git commit -m "feat(veille): période dans l'adresse et mise en forme de l'écart

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Hook de période et branchement de `/pilotage`

**Files:**
- Create: `hooks/use-periode-url.ts`
- Modify: `app/(dashboard)/pilotage/PilotageClient.tsx` (imports lignes 4 et 17, état lignes 30-33, lien après le paragraphe lignes 61-64)
- Modify: `app/(dashboard)/pilotage/page.tsx`

**Interfaces:**
- Consumes: `lirePeriodeUrl`, `parametresPeriode` (Task 4).
- Produces: `usePeriodeUrl(): { periode: Periode; setPeriode: (p: Periode) => void; parametres: string }` — `parametres` vaut `debut=…&fin=…` pour construire les liens.

- [ ] **Step 1: Créer le hook**

`hooks/use-periode-url.ts` :

```ts
'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Periode } from '@/lib/analytics/types'
import { lirePeriodeUrl, parametresPeriode } from '@/lib/veille/periode'

/**
 * Période de la page, lue et écrite dans l'adresse (?debut=&fin=). Sans paramètre valide : 12 mois glissants.
 * L'objet `periode` ne change que si les paramètres changent (il sert de dépendance à des effets).
 */
export function usePeriodeUrl(): { periode: Periode; setPeriode: (p: Periode) => void; parametres: string } {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debut = searchParams.get('debut')
  const fin = searchParams.get('fin')

  const periode = useMemo(() => lirePeriodeUrl(debut, fin), [debut, fin])
  const setPeriode = useCallback(
    (p: Periode) => router.replace(`${pathname}?${parametresPeriode(p)}`, { scroll: false }),
    [router, pathname],
  )
  return { periode, setPeriode, parametres: parametresPeriode(periode) }
}
```

- [ ] **Step 2: Brancher `PilotageClient`**

Dans `app/(dashboard)/pilotage/PilotageClient.tsx` :

Remplacer
```tsx
import { startOfDay, subYears, endOfDay, format } from 'date-fns'
```
par
```tsx
import { format } from 'date-fns'
```

Supprimer la ligne `import type { Periode } from '@/lib/analytics/types'` et ajouter, avec les autres imports :
```tsx
import { usePeriodeUrl } from '@/hooks/use-periode-url'
```

Remplacer
```tsx
  const [periode, setPeriode] = useState<Periode>(() => ({
    dateDebut: startOfDay(subYears(new Date(), 1)),
    dateFin: endOfDay(new Date()),
  }))
```
par
```tsx
  const { periode, setPeriode, parametres } = usePeriodeUrl()
```

Juste après le paragraphe « Tous les chiffres de la page portent sur la période du … » (fermant `</p>`), ajouter :
```tsx
      <Link
        href={`/veille?${parametres}`}
        className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline focus-visible:underline"
      >
        Voir la veille concurrentielle
      </Link>
```

- [ ] **Step 3: Envelopper la page dans `Suspense`**

Dans `app/(dashboard)/pilotage/page.tsx`, ajouter `import { Suspense } from 'react'` et remplacer `<PilotageClient />` par :
```tsx
      <Suspense fallback={null}>
        <PilotageClient />
      </Suspense>
```

- [ ] **Step 4: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: aucune erreur (en particulier aucun import orphelin : `useState`, `useEffect`, `useTransition` restent utilisés dans `PilotageClient`).

- [ ] **Step 5: Commit**

```bash
git add hooks/use-periode-url.ts "app/(dashboard)/pilotage/PilotageClient.tsx" "app/(dashboard)/pilotage/page.tsx"
git commit -m "feat(pilotage): période partagée dans l'adresse et lien vers la veille

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Le comportement de `/pilotage` est vérifié en Task 9 (E2E existant `tests/v1/pilotage.spec.ts` relancé).

---

### Task 6: Server action `getVeilleData`

**Files:**
- Create: `lib/actions/veille.ts`

**Interfaces:**
- Consumes: `calculerVeille`, `LotVeille`, `ResultatVeille` (Task 3) ; `intituleLot`, `STATUTS_OPPORTUNITE_OFFRE_SOUMISE`, `capturerOperation`, `requireRole`, `prisma`.
- Produces: `type VeilleData = { status: 'success'; value: ResultatVeille } | { status: 'error'; message: string }` ; `getVeilleData(input: { dateDebut: string; dateFin: string }): Promise<VeilleData>`.

- [ ] **Step 1: Écrire l'action**

`lib/actions/veille.ts` :

```ts
'use server'

import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/permissions'
import { STATUTS_OPPORTUNITE_OFFRE_SOUMISE } from '@/lib/constants/marche'
import { capturerOperation } from '@/lib/pilotage/capturer-operation'
import { intituleLot } from '@/lib/pilotage/calculs'
import { calculerVeille, type LotVeille, type ResultatVeille } from '@/lib/veille/calculs'

export type VeilleData =
  | { status: 'success'; value: ResultatVeille }
  | { status: 'error'; message: string }

const periodeSchema = z.object({ dateDebut: z.string().datetime(), dateFin: z.string().datetime() })

function renseigne(s: string | null | undefined): s is string {
  return !!s && s.trim().length > 0
}

/** Veille concurrentielle : lots perdus de la période, lus sous quatre angles. Lecture seule. */
export async function getVeilleData(input: { dateDebut: string; dateFin: string }): Promise<VeilleData> {
  await requireRole(['ADMIN', 'AVANCE'])
  const p = periodeSchema.parse(input)
  const periode = { dateDebut: new Date(p.dateDebut), dateFin: new Date(p.dateFin) }

  const resultat = await capturerOperation(async () => {
    // Volume de quelques centaines de lots : le filtre (résultat, statut, période) se fait en mémoire.
    const lotsRaw = await prisma.lot.findMany({
      select: {
        id: true, numero: true, resultat: true, montantPropose: true, montantOffreConcurrent: true,
        motifPerte: true, concurrentGagnant: true,
        vehiculesProposes: { select: { marque: true, modele: true }, orderBy: { ordre: 'asc' } },
        opportunite: {
          select: { id: true, reference: true, objet: true, statut: true, dateLimite: true, autoriteContractante: true },
        },
      },
    })

    const lots: LotVeille[] = lotsRaw.map((l) => ({
      id: l.id,
      opportuniteId: l.opportunite.id,
      libelle: intituleLot(l.opportunite.reference, l.opportunite.objet, l.numero),
      autorite: l.opportunite.autoriteContractante,
      resultat: l.resultat,
      soumis: STATUTS_OPPORTUNITE_OFFRE_SOUMISE.includes(l.opportunite.statut),
      dateDepot: l.opportunite.dateLimite,
      montantPropose: l.montantPropose === null ? null : Number(l.montantPropose),
      montantOffreConcurrent: l.montantOffreConcurrent === null ? null : Number(l.montantOffreConcurrent),
      concurrentGagnant: renseigne(l.concurrentGagnant) ? l.concurrentGagnant.trim() : null,
      motif: renseigne(l.motifPerte) ? l.motifPerte.trim() : null,
      vehicules: l.vehiculesProposes,
    }))
    return calculerVeille(lots, periode)
  })

  if (resultat.status === 'success') return resultat
  console.error('[getVeilleData] calcul indisponible', resultat.error)
  return { status: 'error', message: 'Veille indisponible. Réessayez.' }
}
```

- [ ] **Step 2: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: aucune erreur. Si `renseigne(...) ? l.concurrentGagnant.trim()` signale une erreur de rétrécissement de type, remplacer par `l.concurrentGagnant!.trim()` comme dans `lib/actions/pilotage.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/veille.ts
git commit -m "feat(veille): action serveur de lecture des lots perdus (ADMIN et AVANCE)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Composants et page `/veille`

**Files:**
- Create: `components/veille/LignePerte.tsx`, `components/veille/ClassementAngle.tsx`, `components/veille/NonDocumentees.tsx`, `components/veille/DoublonsPossibles.tsx`
- Create: `app/(dashboard)/veille/page.tsx`, `app/(dashboard)/veille/VeilleClient.tsx`

**Interfaces:**
- Consumes: `getVeilleData`, `VeilleData` (Task 6) ; `ResultatVeille`, `LigneClassement`, `PerteVeille`, `DoublonPossible`, `MIN_CAS_ECART` ; `formaterEcart`, `formaterPourcentage` (Task 4) ; `usePeriodeUrl` (Task 5) ; `PeriodSelector`, `Skeleton`, `Button`, `Tabs*`, `formatMontant`.
- Produces: la page `/veille`. Textes stables sur lesquels s'appuient les E2E : titre « Veille concurrentielle » ; « Voir les pertes » ; « Retour au pilotage » ; « Aucune perte sur cette période. » ; « Non documentées » ; « Doublons possibles » ; onglets « Concurrent », « Autorité », « Véhicule », « Chronologie » ; « N lot(s) perdu(s) » par ligne ; « Il manque : … ».

- [ ] **Step 1: `LignePerte`**

`components/veille/LignePerte.tsx` :

```tsx
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { PerteVeille } from '@/lib/veille/calculs'
import { formaterEcart } from '@/lib/veille/affichage'
import { formatMontant } from '@/lib/utils/format'

interface Props {
  perte: PerteVeille
  /** affiche la liste de ce qui manque (bloc « non documentées ») */
  afficherManquants?: boolean
}

export function LignePerte({ perte, afficherManquants = false }: Props) {
  const ecart = formaterEcart(perte.ecartPct, perte.ecartFcfa)
  return (
    <li className="rounded-md border p-2">
      <Link
        href={`/opportunites/${perte.opportuniteId}`}
        className="block min-h-11 space-y-1 hover:underline focus-visible:underline"
      >
        <span className="flex flex-wrap justify-between gap-x-2">
          <span className="font-medium break-words">{perte.libelle}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {format(new Date(perte.dateDepot), 'dd/MM/yyyy', { locale: fr })}
          </span>
        </span>
        <span className="block text-muted-foreground break-words">{perte.autorite}</span>
        <span className="block tabular-nums">
          Notre offre : {perte.notreMontant === null ? '—' : formatMontant(perte.notreMontant)}
        </span>
        <span className="block text-muted-foreground tabular-nums break-words">
          Gagnant : {perte.concurrent ?? 'non renseigné'}
          {perte.montantConcurrent !== null && ` — ${formatMontant(perte.montantConcurrent)}`}
          {ecart && ` — écart ${ecart}`}
        </span>
        <span className="block text-muted-foreground break-words">Véhicules : {perte.vehicules}</span>
        <span className="block text-muted-foreground break-words">
          {perte.motif ? `Motif : ${perte.motif}` : 'Motif non renseigné'}
        </span>
        {afficherManquants && perte.manquants.length > 0 && (
          <span className="block font-medium text-destructive">Il manque : {perte.manquants.join(', ')}</span>
        )}
      </Link>
    </li>
  )
}
```

- [ ] **Step 2: `ClassementAngle`**

`components/veille/ClassementAngle.tsx` :

```tsx
'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LignePerte } from '@/components/veille/LignePerte'
import { MIN_CAS_ECART } from '@/lib/pilotage/calculs'
import type { LigneClassement } from '@/lib/veille/calculs'
import { formaterEcart } from '@/lib/veille/affichage'
import { formatMontant } from '@/lib/utils/format'

interface Props {
  lignes: LigneClassement[]
  /** intitulé des valeurs liées : « Autorités concernées » ou « Concurrents » */
  libelleAssocies: string
  vide: string
}

export function ClassementAngle({ lignes, libelleAssocies, vide }: Props) {
  if (lignes.length === 0) {
    return <p role="status" className="text-sm text-muted-foreground">{vide}</p>
  }
  return (
    <ul className="space-y-3">
      {lignes.map((ligne) => (
        <CarteLigne key={ligne.cle || 'sans-cle'} ligne={ligne} libelleAssocies={libelleAssocies} />
      ))}
    </ul>
  )
}

function CarteLigne({ ligne, libelleAssocies }: { ligne: LigneClassement; libelleAssocies: string }) {
  const [ouvert, setOuvert] = useState(false)
  const detailId = useId()
  const ecart = ligne.suffisant ? formaterEcart(ligne.ecartMoyenPct, ligne.ecartMoyenFcfa) : null
  return (
    <li className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-medium break-words">{ligne.libelle}</span>
        <span className="tabular-nums">{ligne.nombre} lot(s) perdu(s)</span>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Nos offres perdues</dt>
          <dd className="tabular-nums">{formatMontant(ligne.valeurPerdue)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Offres gagnantes</dt>
          <dd className="tabular-nums">{formatMontant(ligne.valeurGagneeParLesConcurrents)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Écart moyen</dt>
          <dd className="tabular-nums">{ecart ?? `Pas assez de lots (minimum ${MIN_CAS_ECART})`}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{libelleAssocies}</dt>
          <dd className="break-words">{ligne.associes.join(', ') || '—'}</dd>
        </div>
      </dl>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        aria-expanded={ouvert}
        aria-controls={detailId}
        onClick={() => setOuvert((v) => !v)}
      >
        Voir les pertes
        <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${ouvert ? 'rotate-180' : ''}`} aria-hidden="true" />
      </Button>
      {ouvert && (
        <ul id={detailId} className="space-y-2 text-sm">
          {ligne.pertes.map((p) => <LignePerte key={p.id} perte={p} />)}
        </ul>
      )}
    </li>
  )
}
```

- [ ] **Step 3: `NonDocumentees` et `DoublonsPossibles`**

`components/veille/NonDocumentees.tsx` :

```tsx
import { LignePerte } from '@/components/veille/LignePerte'
import type { PerteVeille } from '@/lib/veille/calculs'

export function NonDocumentees({ pertes }: { pertes: PerteVeille[] }) {
  return (
    <section aria-labelledby="non-documentees" className="space-y-2">
      <h2 id="non-documentees" className="text-lg font-semibold">Non documentées</h2>
      <p className="text-sm text-muted-foreground">
        Pertes sans concurrent ou sans montant : à compléter dans le lot concerné pour entrer dans les classements.
      </p>
      {pertes.length === 0 ? (
        <p role="status" className="text-sm text-muted-foreground">Toutes les pertes de la période sont documentées.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {pertes.map((p) => <LignePerte key={p.id} perte={p} afficherManquants />)}
        </ul>
      )}
    </section>
  )
}
```

`components/veille/DoublonsPossibles.tsx` :

```tsx
import type { DoublonPossible } from '@/lib/veille/calculs'

export function DoublonsPossibles({ doublons }: { doublons: DoublonPossible[] }) {
  return (
    <section aria-labelledby="doublons-possibles" className="space-y-2">
      <h2 id="doublons-possibles" className="text-lg font-semibold">Doublons possibles</h2>
      <p className="text-sm text-muted-foreground">
        Noms proches non regroupés. Corrigez l’orthographe dans le lot concerné pour les réunir.
      </p>
      {doublons.length === 0 ? (
        <p role="status" className="text-sm text-muted-foreground">Aucun doublon possible.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {doublons.map((d) => (
            <li key={`${d.a.cle}|${d.b.cle}`} className="break-words">
              « {d.a.libelle} » ({d.a.nombre} lot(s)) et « {d.b.libelle} » ({d.b.nombre} lot(s))
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Page et client**

`app/(dashboard)/veille/page.tsx` :

```tsx
// app/(dashboard)/veille/page.tsx

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/utils/permissions'
import { VeilleClient } from './VeilleClient'

export const dynamic = 'force-dynamic'

export default async function VeillePage() {
  const session = await requireRole(['ADMIN', 'AVANCE']).catch(() => null)
  if (!session) redirect('/')

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-stam-primary">Veille concurrentielle</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Qui nous bat, de combien on perd, pourquoi on perd.
        </p>
      </div>
      <Suspense fallback={null}>
        <VeilleClient />
      </Suspense>
    </div>
  )
}
```

`app/(dashboard)/veille/VeilleClient.tsx` :

```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PeriodSelector } from '@/components/analytique/PeriodSelector'
import { ClassementAngle } from '@/components/veille/ClassementAngle'
import { LignePerte } from '@/components/veille/LignePerte'
import { NonDocumentees } from '@/components/veille/NonDocumentees'
import { DoublonsPossibles } from '@/components/veille/DoublonsPossibles'
import { usePeriodeUrl } from '@/hooks/use-periode-url'
import { getVeilleData, type VeilleData } from '@/lib/actions/veille'
import { MIN_CAS_ECART } from '@/lib/pilotage/calculs'
import { formaterEcart } from '@/lib/veille/affichage'

export function VeilleClient() {
  const { periode, setPeriode, parametres } = usePeriodeUrl()
  const [data, setData] = useState<VeilleData | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [enCours, startTransition] = useTransition()
  const veille = data?.status === 'success' ? data.value : null

  useEffect(() => {
    setErreur(null)
    setData(null)
    startTransition(async () => {
      try {
        setData(await getVeilleData({ dateDebut: periode.dateDebut.toISOString(), dateFin: periode.dateFin.toISOString() }))
      } catch {
        setErreur('Impossible de calculer la veille. Réessayez ou élargissez la période.')
      }
    })
  }, [periode, retry])

  const messageErreur = erreur ?? (data?.status === 'error' ? data.message : null)
  const ecartGlobal = veille?.ecartGlobal.suffisant
    ? formaterEcart(veille.ecartGlobal.moyennePct, veille.ecartGlobal.moyenneFcfa)
    : null

  return (
    <div className="space-y-6">
      <PeriodSelector value={periode} onChange={setPeriode} disabled={enCours} />
      <p className="text-sm text-muted-foreground">
        Toutes les données de la page portent sur la période du {format(periode.dateDebut, 'dd/MM/yyyy', { locale: fr })} au{' '}
        {format(periode.dateFin, 'dd/MM/yyyy', { locale: fr })}.
      </p>
      <Link
        href={`/pilotage?${parametres}`}
        className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline focus-visible:underline"
      >
        Retour au pilotage
      </Link>

      {messageErreur && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-destructive">{messageErreur}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setRetry((n) => n + 1)}>
            Réessayer
          </Button>
        </div>
      )}

      {enCours || (!data && !erreur) ? (
        <div role="status" aria-label="Chargement de la veille" className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : veille && !messageErreur ? (
        <>
          <section aria-label="Couverture" className="space-y-1">
            <p className="text-lg font-semibold tabular-nums">
              {veille.couverture.documentees} lot(s) sur {veille.couverture.total} documenté(s)
            </p>
            <p className="text-sm text-muted-foreground">
              Cette page ne lit que les lots perdus : les offres perdues d’avant les lots n’ont pas été saisies.
            </p>
            {veille.exclusSansDate.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {veille.exclusSansDate.length} lot(s) perdu(s) exclu(s) faute de date de dépôt :{' '}
                {veille.exclusSansDate.map((e, i) => (
                  <span key={e.href}>
                    {i > 0 && ', '}
                    <Link href={e.href} className="underline-offset-4 hover:underline focus-visible:underline">{e.libelle}</Link>
                  </span>
                ))}
              </p>
            )}
          </section>

          {veille.couverture.total === 0 ? (
            <p role="status" className="text-sm text-muted-foreground">Aucune perte sur cette période.</p>
          ) : (
            <>
              <p className="text-sm tabular-nums">
                Écart moyen global : {ecartGlobal ?? `pas assez de lots documentés (minimum ${MIN_CAS_ECART})`}
              </p>
              <Tabs defaultValue="concurrent" className="space-y-4">
                <TabsList className="h-auto flex-wrap justify-start">
                  <TabsTrigger value="concurrent" className="min-h-11">Concurrent</TabsTrigger>
                  <TabsTrigger value="autorite" className="min-h-11">Autorité</TabsTrigger>
                  <TabsTrigger value="vehicule" className="min-h-11">Véhicule</TabsTrigger>
                  <TabsTrigger value="chronologie" className="min-h-11">Chronologie</TabsTrigger>
                </TabsList>
                <TabsContent value="concurrent">
                  <ClassementAngle lignes={veille.parConcurrent} libelleAssocies="Autorités concernées" vide="Aucune perte documentée par concurrent sur cette période." />
                </TabsContent>
                <TabsContent value="autorite">
                  <ClassementAngle lignes={veille.parAutorite} libelleAssocies="Concurrents gagnants" vide="Aucune perte documentée par autorité sur cette période." />
                </TabsContent>
                <TabsContent value="vehicule">
                  <ClassementAngle lignes={veille.parVehicule} libelleAssocies="Concurrents gagnants" vide="Aucune perte documentée par véhicule sur cette période." />
                </TabsContent>
                <TabsContent value="chronologie">
                  <ul className="space-y-2 text-sm">
                    {veille.chronologie.map((p) => <LignePerte key={p.id} perte={p} />)}
                  </ul>
                </TabsContent>
              </Tabs>
              <NonDocumentees pertes={veille.nonDocumentees} />
              <DoublonsPossibles doublons={veille.doublons} />
            </>
          )}
        </>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 5: Vérifier les types et le lint**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npx eslint components/veille app/(dashboard)/veille lib/veille lib/actions/veille.ts hooks/use-periode-url.ts`
Expected: 0 erreur (les avertissements existants du dépôt ne doivent pas augmenter).

- [ ] **Step 6: Commit**

```bash
git add components/veille "app/(dashboard)/veille"
git commit -m "feat(veille): page /veille, classements par angle, non documentées et doublons possibles

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Entrée de menu et titre de page

**Files:**
- Modify: `components/layout/dashboard-shell.tsx` (import `lucide-react` ligne ~23, tableau de navigation ligne ~65, `pageTitles` ligne ~81)

- [ ] **Step 1: Ajouter l'icône, l'entrée et le titre**

Dans le bloc d'import de `lucide-react`, ajouter `Eye,` juste après `Gauge,`.

Dans le tableau de navigation, juste après la ligne de `/pilotage`, ajouter :
```tsx
  { href: '/veille',                label: 'Veille',           icon: Eye,           roles: ['ADMIN', 'AVANCE'] },
```

Dans `pageTitles`, après `'/pilotage':           'Pilotage',`, ajouter :
```tsx
  '/veille':             'Veille concurrentielle',
```

- [ ] **Step 2: Vérifier que rien d'autre ne liste les routes**

Run: `grep -rn "'/pilotage'" --include=*.ts --include=*.tsx . | grep -v node_modules | grep -v ".claude/" | grep -v tests/`
Expected: seules les occurrences connues (menu, titre, liens). Si une autre liste de routes protégées apparaît (middleware, permissions), y ajouter `/veille` avec les mêmes rôles.

- [ ] **Step 3: Vérifier les types et commiter**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

```bash
git add components/layout/dashboard-shell.tsx
git commit -m "feat(veille): entrée de menu Veille pour ADMIN et AVANCE

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Tests E2E

**Files:**
- Create: `tests/helpers/base-locale.ts`
- Create: `tests/v1/veille.spec.ts`

**Interfaces:**
- Consumes: la page `/veille`, `/pilotage` et leurs textes ; `login`, `TEST_USERS` de `tests/helpers/auth.ts`.
- Produces: données de test préfixées `[E2E-VEILLE]`, supprimées en `beforeAll` et `afterAll`.

- [ ] **Step 1: Accès SQL restreint à la base locale**

`tests/helpers/base-locale.ts` :

```ts
import { Client } from 'pg'

/**
 * Exécute une requête sur la base de test Docker locale (127.0.0.1:5433), et nulle part ailleurs :
 * l'hôte et le port sont vérifiés avant toute connexion. Usage réservé au dépôt et au nettoyage
 * des données de test préfixées « [E2E-… ] ».
 */
export async function requeteLocale<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL absente : la base de test locale est introuvable.')

  let hote = ''
  let port = ''
  try {
    const u = new URL(url)
    hote = u.hostname
    port = u.port
  } catch {
    throw new Error('DATABASE_URL illisible : connexion refusée.')
  }
  if (hote !== '127.0.0.1' || port !== '5433') {
    throw new Error(`Connexion refusée : la base de test doit être 127.0.0.1:5433 (hôte lu : ${hote}, port lu : ${port}).`)
  }

  const client = new Client({ connectionString: url })
  await client.connect()
  try {
    const res = await client.query(sql, params)
    return res.rows as T[]
  } finally {
    await client.end()
  }
}
```

- [ ] **Step 2: Écrire l'E2E**

`tests/v1/veille.spec.ts` :

```ts
import { test, expect as expectBase } from '@playwright/test'
import type { Page } from '@playwright/test'
import { randomUUID } from 'crypto'
import { login, TEST_USERS } from '../helpers/auth'
import { requeteLocale } from '../helpers/base-locale'

/**
 * Tests E2E — Veille concurrentielle
 *
 * 1 : accès réservé à ADMIN et AVANCE (menu et adresse directe)
 * 2 : un concurrent écrit de trois façons forme une seule ligne, avec écart moyen au-delà de 3 lots
 * 3 : les pertes sans concurrent ou sans montant sont listées avec ce qui manque ; les noms proches sont signalés
 * 4 : la période est conservée entre /pilotage et /veille, dans les deux sens
 * 5 : période sans perte → message explicite
 * 6 : pas de défilement horizontal à 375, 768 et 1920 px
 * 7 : détail d'une ligne atteignable et repliable au clavier
 *
 * Données de test : préfixe [E2E-VEILLE], supprimées en beforeAll et afterAll (lots et véhicules par cascade).
 * Les assertions portent sur les lignes de ces données : la base de test peut contenir d'autres lots.
 */

const expect = expectBase.configure({ timeout: 15000 })
test.use({ actionTimeout: 30000 })

const PREFIXE = '[E2E-VEILLE]'
const AUTORITE = 'Autorité Veille E2E'

async function supprimerDonnees() {
  await requeteLocale(`delete from opportunites where objet like '${PREFIXE}%'`)
}

async function inserer() {
  const [utilisateur] = await requeteLocale<{ id: string }>('select id from users where email = $1', [TEST_USERS.admin.email])
  if (!utilisateur) throw new Error('Utilisateur de test introuvable en base locale.')

  const opportunite = async (objet: string): Promise<string> => {
    const id = randomUUID()
    await requeteLocale(
      `insert into opportunites (id, objet, "autoriteContractante", "dateLimite", statut, "userId", "updatedAt")
       values ($1, $2, $3, now() - interval '10 days', 'PERDUE', $4, now())`,
      [id, `${PREFIXE} ${objet}`, AUTORITE, utilisateur.id],
    )
    return id
  }
  const lot = async (oppId: string, numero: number, propose: number | null, concurrent: string | null, montant: number | null, motif: string | null) => {
    const id = randomUUID()
    await requeteLocale(
      `insert into lots (id, "opportuniteId", numero, intitule, "montantPropose", resultat, "motifPerte", "concurrentGagnant", "montantOffreConcurrent", "updatedAt")
       values ($1, $2, $3, $4, $5, 'PERDU', $6, $7, $8, now())`,
      [id, oppId, numero, `Lot ${numero}`, propose, motif, concurrent, montant],
    )
    return id
  }
  const vehicule = async (lotId: string, marque: string, modele: string, ordre: number) => {
    await requeteLocale(
      `insert into vehicules_proposes (id, "lotId", marque, modele, quantite, "prixUnitaire", ordre, "updatedAt")
       values ($1, $2, $3, $4, 1, 1000000, $5, now())`,
      [randomUUID(), lotId, marque, modele, ordre],
    )
  }

  // Un même concurrent écrit de trois façons : 3 lots, écarts 25 %, 25 % et 0 %
  const a = await opportunite('Concurrent trois orthographes')
  const l1 = await lot(a, 1, 1_000_000, 'E2E Auto Plus SARL', 800_000, 'Prix trop élevé')
  const l2 = await lot(a, 2, 2_000_000, 'e2e auto plus', 1_600_000, null)
  const l3 = await lot(a, 3, 1_500_000, 'E2E Auto Plus', 1_500_000, 'Prix')
  await vehicule(l1, 'Toyota', 'Hilux', 0)
  await vehicule(l2, 'Toyota', 'Hilux', 0)
  await vehicule(l2, 'Isuzu', 'D-Max', 1)
  await vehicule(l3, 'Toyota', 'Hilux', 0)
  // Perte non documentée : ni concurrent ni montant du concurrent
  await lot(a, 4, 900_000, null, null, null)
  // Nom proche (une lettre de plus) : doublon possible
  const b = await opportunite('Concurrent nom proche')
  await lot(b, 1, 700_000, 'E2E Auto Pluss', 650_000, 'Conformité')
}

async function sansDefilementHorizontal(page: Page, largeur: number) {
  await page.setViewportSize({ width: largeur, height: 900 })
  await page.goto('/veille')
  await expect(page.getByRole('heading', { name: 'Veille concurrentielle' })).toBeVisible()
  await expect(page.getByRole('status', { name: 'Chargement de la veille' })).toHaveCount(0)
  const debordement = await page.evaluate(() => {
    const racine = document.documentElement
    return { scroll: racine.scrollWidth, client: racine.clientWidth }
  })
  expect(debordement.scroll, `scrollWidth ${debordement.scroll} > clientWidth ${debordement.client} à ${largeur}px`).toBeLessThanOrEqual(debordement.client)
}

test.describe('Veille concurrentielle', () => {
  test.beforeAll(async () => {
    await supprimerDonnees()
    await inserer()
  })
  test.afterAll(async () => {
    await supprimerDonnees()
    const [reste] = await requeteLocale<{ n: number }>(`select count(*)::int as n from opportunites where objet like '${PREFIXE}%'`)
    expect(reste?.n).toBe(0)
  })

  test('1 — accès réservé à ADMIN et AVANCE', async ({ page, browser }) => {
    await login(page, TEST_USERS.avance)
    await expect(page.getByRole('link', { name: 'Veille', exact: true })).toBeVisible()
    await page.goto('/veille')
    await expect(page.getByRole('heading', { name: 'Veille concurrentielle' })).toBeVisible()

    for (const utilisateur of [TEST_USERS.exploitation, TEST_USERS.visiteur]) {
      const contexte = await browser.newContext()
      const autre = await contexte.newPage()
      await login(autre, utilisateur)
      await autre.goto('/veille')
      await expect(autre.getByRole('heading', { name: 'Veille concurrentielle' })).toHaveCount(0)
      await expect(autre.getByRole('link', { name: 'Veille', exact: true })).toHaveCount(0)
      await contexte.close()
    }
  })

  test('2 — un concurrent écrit de trois façons forme une seule ligne, avec son écart moyen', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/veille')
    await expect(page.getByText(/\d+ lot\(s\) sur \d+ documenté\(s\)/)).toBeVisible()
    const ligne = page.getByRole('listitem').filter({ hasText: 'E2E Auto Plus SARL' }).filter({ hasText: '3 lot(s) perdu(s)' })
    await expect(ligne).toHaveCount(1)
    // moyenne de 25 %, 25 % et 0 % = 16,67 %, affichée arrondie
    await expect(ligne).toContainText('(+17 %)')
    await expect(ligne.getByText('Autorités concernées')).toBeVisible()
    await expect(ligne).toContainText(AUTORITE)
  })

  test('3 — les pertes non documentées indiquent ce qui manque, les noms proches sont signalés', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/veille')
    const nonDocumentees = page.getByRole('region', { name: 'Non documentées' })
    await expect(nonDocumentees).toContainText('Il manque : concurrent, montant du concurrent, motif')
    const doublons = page.getByRole('region', { name: 'Doublons possibles' })
    await expect(doublons).toContainText('E2E Auto Plus SARL')
    await expect(doublons).toContainText('E2E Auto Pluss')
  })

  test('4 — la période est conservée entre /pilotage et /veille', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/veille?debut=2026-01-01&fin=2026-06-30')
    await expect(page.getByText(/période du 01\/01\/2026 au 30\/06\/2026/)).toBeVisible()
    const retour = page.getByRole('link', { name: 'Retour au pilotage' })
    await expect(retour).toHaveAttribute('href', '/pilotage?debut=2026-01-01&fin=2026-06-30')
    await retour.click()
    await expect(page).toHaveURL(/\/pilotage\?debut=2026-01-01&fin=2026-06-30/)
    await expect(page.getByText(/période du 01\/01\/2026 au 30\/06\/2026/)).toBeVisible()
    const aller = page.getByRole('link', { name: 'Voir la veille concurrentielle' })
    await expect(aller).toHaveAttribute('href', '/veille?debut=2026-01-01&fin=2026-06-30')
  })

  test('5 — une période sans perte affiche un message explicite', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/veille?debut=2000-01-01&fin=2000-12-31')
    await expect(page.getByText('Aucune perte sur cette période.')).toBeVisible()
    await expect(page.getByText('0 lot(s) sur 0 documenté(s)')).toBeVisible()
  })

  test('6 — pas de défilement horizontal à 375, 768 et 1920 px', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    for (const largeur of [375, 768, 1920]) {
      await sansDefilementHorizontal(page, largeur)
    }
  })

  test('7 — le détail d’une ligne s’ouvre et se referme au clavier', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/veille')
    const ligne = page.getByRole('listitem').filter({ hasText: 'E2E Auto Plus SARL' }).filter({ hasText: '3 lot(s) perdu(s)' })
    const bouton = ligne.getByRole('button', { name: 'Voir les pertes' })
    await expect(bouton).toHaveAttribute('aria-expanded', 'false')
    await bouton.focus()
    await page.keyboard.press('Enter')
    await expect(bouton).toHaveAttribute('aria-expanded', 'true')
    await expect(ligne.getByRole('link')).toHaveCount(3)
    await page.keyboard.press('Enter')
    await expect(bouton).toHaveAttribute('aria-expanded', 'false')
  })
})
```

Si la région « Non documentées » n'est pas trouvée par `getByRole('region', …)`, c'est que `<section aria-labelledby>` n'a pas de nom accessible au moment du test : vérifier que `id` et `aria-labelledby` correspondent dans `NonDocumentees.tsx` et `DoublonsPossibles.tsx`.

- [ ] **Step 3: Lancer les E2E sur la base de test locale**

Préparer : démarrer le serveur `dev-test` (base Docker `127.0.0.1:5433`, variables d'envoi vidées), le redémarrer avant chaque run, puis chauffer `/login`, `/pilotage` et `/veille` (compilation à froid de plusieurs minutes sur la machine de 4 Go). Ne jamais lancer le serveur de dev par défaut.

Run: `MSYS_NO_PATHCONV=1 npx playwright test tests/v1/veille.spec.ts tests/v1/pilotage.spec.ts --workers=1`
Expected: les 7 tests de Veille et les tests existants de `pilotage.spec.ts` PASS (le sélecteur unique, le détail au clavier et la nouvelle période dans l'adresse n'ont pas régressé). En cas d'échec de connexion dû à un démarrage à froid, rechauffer les pages et relancer ; ne pas allonger les délais au-delà de ce que font les autres specs.

- [ ] **Step 4: Contrôle visuel**

Avec `dev-test` démarré, ouvrir `/veille` dans le Browser pane à 375, 768 et 1920 px (en mesurant `scrollWidth` contre `clientWidth` à 375) : hiérarchie lisible, onglets accessibles, aucune console d'erreur.

- [ ] **Step 5: Commit**

```bash
git add tests/helpers/base-locale.ts tests/v1/veille.spec.ts
git commit -m "test(veille): E2E accès, regroupement des noms, période partagée, responsive et clavier

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Vérifications finales, recoupement et PR

**Files:** aucun fichier de code.

- [ ] **Step 1: Portes de qualité**

Run: `npx tsc --noEmit && npm run lint && npm run test:unit`
Expected: 0 erreur de type ; ESLint sous le plafond de 172 avertissements ; tous les tests unitaires PASS (les 166 existants et les nouveaux).

- [ ] **Step 2: Recoupement sur des données réelles (lecture seule)**

Restaurer une copie du dump de production (hors dépôt) dans un conteneur Docker temporaire, jamais la base de production ni la base de test. Calculer par SQL indépendant, pour une période donnée : le nombre de lots perdus soumis dont la date de dépôt est dans la période, le nombre de lots documentés (nom du concurrent, montant du concurrent et notre montant renseignés) et l'écart moyen par concurrent (même formule, sur valeurs non arrondies). Lancer l'application contre la copie et comparer avec la page `/veille` pour la même période. Écart attendu : nul. Supprimer ensuite le conteneur. Ne reporter aucun chiffre ni nom réel dans le dépôt.

- [ ] **Step 3: Balayage « dépôt public » avant le push**

Run: `git diff origin/main...HEAD | grep -nE "^\+" | grep -niE "password|secret|token|C:\\\\Users|@[a-z0-9-]+\.(com|tg)" | head`
Expected: aucune ligne. Relire aussi les messages de commit : aucun chiffre, nom de concurrent ou d'autorité réel.

- [ ] **Step 4: Demander l'accord d'Abel, puis pousser et ouvrir la PR**

Ne rien pousser sans l'accord d'Abel : la fusion sur `main` déclenche un déploiement de production automatique, et le dépôt est public. Après accord :

```bash
git push -u origin feat/pilotage-b
gh pr create --repo henrymartium-sudo/Erp-march-s-STAM --base main --head feat/pilotage-b --title "feat(pilotage): tranche B, veille concurrentielle" --body "<résumé, vérifications, point à signaler : la période de /pilotage est désormais dans l'adresse>"
```

Corps de la PR : ce que fait la page, les quatre angles, ce qui est vérifié (types, lint, unitaires, E2E, recoupement à écart nul), ce qui ne l'est pas (marchés historiques exclus par décision, contenu de production non relu par l'équipe), et la mention « la période de `/pilotage` est maintenant partageable par l'adresse ». Terminer par : `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 5: Fusion et vérification en production**

Fusionner (squash) une fois les contrôles verts, avec l'accord d'Abel. Vérifier le déploiement (état READY, sondes publiques `/login` 200 et `/veille` 307 vers la connexion, journaux sans erreur), puis une lecture authentifiée de `/veille` par Abel. Repli : le déploiement précédent de Vercel.

---

## Auto-relecture du plan (couverture de la spec)

| Exigence de la spec | Tâche |
|---|---|
| Lots perdus seulement, marchés historiques exclus, message sur les pertes d'avant les lots | 2 (population), 7 (message) |
| Population : soumis, période, exclus faute de date | 2, 7 |
| Documenté / non documenté, ce qui manque, motif non bloquant | 2, 7 |
| Couverture « X lots sur Y documentés » et invariant | 3 (test), 7 |
| Écart non arrondi, positif quand STAM est plus chère, seuil de 3 par ligne et global | 2, 3 |
| Normalisation, formes juridiques, nom affiché, doublons possibles | 1 |
| Quatre angles, une perte une seule fois, combinaison de véhicules | 3 |
| Écart global égal à `/pilotage` hors conflit de nom | 3 (test) |
| Action en lecture seule, rôles, Zod, filtres en mémoire | 6 |
| Page, garde de rôle, menu, titre | 7, 8 |
| Période dans l'adresse, liens dans les deux sens, valeurs invalides ignorées | 4, 5, 7, 9 |
| États : chargement, période vide, moins de 3 lots, erreur avec « Réessayer » | 7, 9 |
| Responsive sans défilement horizontal, clavier | 7, 9 |
| Tests unitaires et E2E, base locale uniquement | 1-4, 9 |
| Recoupement avant mise en ligne, accord avant push, balayage public, repli | 10 |
