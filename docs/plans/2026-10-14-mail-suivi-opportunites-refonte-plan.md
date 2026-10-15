# Refonte du mail « Suivi Opportunités » — Plan d'implémentation

> **Pour les agents :** SOUS-SKILL REQUIS : utiliser superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent la syntaxe à cases (`- [ ]`).

**Objectif :** remplacer le tableau de 14 colonnes du mail « Suivi Opportunités » par un mail lisible (compteurs, bloc « À traiter », cartes pour les opportunités actives, une ligne pour les terminées) et joindre un fichier Excel qui porte toutes les colonnes et les notes complètes.

**Architecture :** trois modules purs et testables, plus le câblage. `opportunite-reporting-sections.ts` classe les opportunités (à traiter, actives, terminées, compteurs). `opportunite-reporting-templates.ts` produit le HTML et le texte à partir de ce classement. `opportunite-reporting-excel.ts` produit le classeur. `opportunite-reporting-suivi.ts` assemble le tout (sujet, HTML, texte, pièce jointe) et remplace l'appel direct à `buildOpportuniteReportingEmail` dans les deux sites d'envoi.

**Stack :** TypeScript, ExcelJS (déjà installé), Nodemailer (pièce jointe), tests unitaires Playwright (`npm run test:unit`).

**Conception validée :** maquette « piste A + C » approuvée par Abel le 2026-10-14 (cartes + une ligne pour les terminées + Excel joint). Pas de document de conception séparé : ce plan fait foi.

## Contraintes globales

- Largeur du mail **fluide** : `width:100%` plafonné à 680 px (leçon de la PR #25 : un `@media` seul ne suffit pas dans Gmail mobile).
- Mise en page en **tableaux et styles en ligne** uniquement (compatibilité clients mail). Pas d'emoji dans le gabarit (aspect professionnel). Français, accents corrects.
- La signature publique `buildOpportuniteReportingEmail(ruleName, opportunites, now)` → `{ subject, html, text }` **ne change pas**.
- Le contenu venant de la base (objet, autorité, référence, notes) est **échappé** dans le HTML.
- Statuts « terminés » : `NO_GO` et `PERDUE` uniquement. Tous les autres statuts sont « actifs ».
- Seuil d'urgence : 7 jours (`SEUIL_URGENCE_JOURS`).
- **Garde 17.4 :** la règle « suivi des Opportunités » a 2 destinataires réels. **Aucun envoi sur cette règle** pendant le développement ni pour les tests. Test réel uniquement via une règle de test inactive, un seul destinataire (Abel), « Envoyer maintenant ».
- Dépôt public : aucune adresse, aucune donnée réelle dans les tests ni dans les messages de commit.
- Pas de nouvelle dépendance.

## Revue ciblée (cas que la conception ne nomme pas)

1. Opportunité « En analyse » sans aucune date ni lot : pas de plantage, aucune cellule vide (les champs absents disparaissent de la carte).
2. Objet, autorité ou notes contenant `<`, `>`, `&` ou `"` : échappés, jamais interprétés comme du HTML (Tâche 2).
3. Notes très longues : tronquées à 160 caractères **avant** échappement, dans le mail seulement ; l'Excel garde le texte intégral (Tâches 2 et 3).
4. Aucune opportunité à traiter, ou uniquement des terminées : les blocs vides sont omis, pas de titre de section sans contenu (Tâche 2).
5. Statut inconnu (valeur hors liste) : libellé de repli et couleur neutre, pas de plantage (Tâche 2).

---

### Tâche 0 : Branche de travail

**Fichiers :** aucun.

- [ ] **Étape 1 : Partir de `main` à jour**

L'arbre de travail contient des modifications qui ne sont pas de nous (`.gitignore`, `settings.local.json`, `tsconfig.tsbuildinfo`, `.claude/agent-memory/…`, fichiers non suivis). Ne jamais les ajouter : toujours `git add <chemins précis>`.

```bash
git switch main && git pull --ff-only && git switch -c feat/mail-suivi-opportunites-refonte
```
Attendu : branche créée depuis `origin/main`. Si `git switch main` refuse à cause des modifications locales, s'arrêter et demander à Abel.

---

### Tâche 1 : Classement des opportunités

**Fichiers :**
- Créer : `lib/email/opportunite-reporting-sections.ts`
- Test : `tests/unit/opportunite-reporting-sections.spec.ts`

**Interfaces :**
- Consomme : `OpportuniteForReporting` (type exporté par `lib/email/opportunite-reporting-templates.ts`, inchangé).
- Produit (utilisé par les Tâches 2 et 3) :
  - `SEUIL_URGENCE_JOURS: number` (7)
  - `STATUTS_TERMINES: readonly string[]`
  - `diffJours(date: Date, today: Date): number`
  - `type MotifATraiter = "GO_ECHEANCE" | "ATTENTE_ATTRIBUTION"`
  - `classerOpportunites(opps: OpportuniteForReporting[], now: Date): { aTraiter: { opp: OpportuniteForReporting; motif: MotifATraiter }[]; actives: OpportuniteForReporting[]; terminees: OpportuniteForReporting[]; compteurs: { statut: string; count: number }[] }`

Règles de classement :
- `terminees` : statut dans `STATUTS_TERMINES`, triées par date limite décroissante (les plus récentes d'abord), sans date en dernier.
- `actives` : tous les autres, triées par date limite croissante, sans date en dernier.
- `aTraiter` : parmi les actives, (a) statut `GO` dont la date limite est au plus à `SEUIL_URGENCE_JOURS` jours, **dépassée comprise** (motif `GO_ECHEANCE`) ; (b) statut `EN_ATTENTE_ATTRIBUTION` (motif `ATTENTE_ATTRIBUTION`). Une opportunité reste aussi dans `actives` (le bloc « À traiter » est un rappel, pas un déplacement).
- `compteurs` : un élément par statut présent, dans l'ordre `GO, NO_GO, GAGNEE, PERDUE, EN_ATTENTE_ATTRIBUTION`, puis les autres statuts dans l'ordre d'apparition.

- [ ] **Étape 1 : Écrire les tests (échec attendu)**

```ts
// tests/unit/opportunite-reporting-sections.spec.ts
import { test, expect } from '@playwright/test'
import { classerOpportunites } from '../../lib/email/opportunite-reporting-sections'
import type { OpportuniteForReporting } from '../../lib/email/opportunite-reporting-templates'

const now = new Date('2026-10-14T08:00:00Z')

function opp(id: string, statut: string, dateLimite: string | null): OpportuniteForReporting {
  return {
    id, reference: id, objet: `Objet ${id}`, autoriteContractante: 'Autorité', statut,
    montantEstime: null, lots: [], dateLimite: dateLimite ? new Date(dateLimite) : null,
    periodeValiditeDebut: null, periodeValiditeFin: null, echeanceAttributionProv: null, notes: null,
  }
}

test.describe('classement des opportunités du mail de suivi', () => {
  test('sépare actives et terminées (No Go, Perdue)', () => {
    const r = classerOpportunites([opp('a', 'GO', null), opp('b', 'NO_GO', null), opp('c', 'PERDUE', null), opp('d', 'GAGNEE', null)], now)
    expect(r.actives.map((o) => o.id)).toEqual(['a', 'd'])
    expect(r.terminees.map((o) => o.id)).toEqual(['b', 'c'])
  })

  test('à traiter : GO à échéance ≤ 7 j (dépassée comprise) et attentes d’attribution', () => {
    const r = classerOpportunites([
      opp('go-proche', 'GO', '2026-10-21T00:00:00Z'),
      opp('go-loin', 'GO', '2026-10-30T00:00:00Z'),
      opp('go-depasse', 'GO', '2026-10-01T00:00:00Z'),
      opp('go-sans-date', 'GO', null),
      opp('attente', 'EN_ATTENTE_ATTRIBUTION', '2026-08-31T00:00:00Z'),
      opp('perdue', 'PERDUE', '2026-10-15T00:00:00Z'),
    ], now)
    expect(r.aTraiter.map((x) => [x.opp.id, x.motif])).toEqual([
      ['go-depasse', 'GO_ECHEANCE'],
      ['go-proche', 'GO_ECHEANCE'],
      ['attente', 'ATTENTE_ATTRIBUTION'],
    ])
  })

  test('les actives sont triées par date limite croissante, sans date en dernier', () => {
    const r = classerOpportunites([opp('sans', 'GO', null), opp('tard', 'GO', '2026-12-01T00:00:00Z'), opp('tot', 'GO', '2026-11-01T00:00:00Z')], now)
    expect(r.actives.map((o) => o.id)).toEqual(['tot', 'tard', 'sans'])
  })

  test('les terminées sont triées par date limite décroissante, sans date en dernier', () => {
    const r = classerOpportunites([opp('vieille', 'NO_GO', '2026-02-01T00:00:00Z'), opp('sans', 'NO_GO', null), opp('recente', 'PERDUE', '2026-09-01T00:00:00Z')], now)
    expect(r.terminees.map((o) => o.id)).toEqual(['recente', 'vieille', 'sans'])
  })

  test('compteurs : ordre fixe puis autres statuts, statuts absents omis', () => {
    const r = classerOpportunites([opp('1', 'PERDUE', null), opp('2', 'GO', null), opp('3', 'EN_ANALYSE', null), opp('4', 'GO', null)], now)
    expect(r.compteurs).toEqual([
      { statut: 'GO', count: 2 },
      { statut: 'PERDUE', count: 1 },
      { statut: 'EN_ANALYSE', count: 1 },
    ])
  })

  test('liste vide : tout est vide, aucun plantage', () => {
    expect(classerOpportunites([], now)).toEqual({ aTraiter: [], actives: [], terminees: [], compteurs: [] })
  })
})
```

- [ ] **Étape 2 : Vérifier l'échec**

Lancer : `npx playwright test -c playwright.unit.config.ts opportunite-reporting-sections`
Attendu : échec (module introuvable).

- [ ] **Étape 3 : Implémenter**

```ts
// lib/email/opportunite-reporting-sections.ts
/**
 * Classement des opportunités pour le mail « Suivi Opportunités » :
 * bloc « À traiter », actives, terminées et compteurs par statut.
 */

import type { OpportuniteForReporting } from "./opportunite-reporting-templates"

export const SEUIL_URGENCE_JOURS = 7
export const STATUTS_TERMINES: readonly string[] = ["NO_GO", "PERDUE"]

const ORDRE_COMPTEURS = ["GO", "NO_GO", "GAGNEE", "PERDUE", "EN_ATTENTE_ATTRIBUTION"]

export type MotifATraiter = "GO_ECHEANCE" | "ATTENTE_ATTRIBUTION"

export interface ATraiter {
  opp: OpportuniteForReporting
  motif: MotifATraiter
}

export interface SectionsSuivi {
  aTraiter: ATraiter[]
  actives: OpportuniteForReporting[]
  terminees: OpportuniteForReporting[]
  compteurs: { statut: string; count: number }[]
}

export function diffJours(date: Date, today: Date): number {
  return Math.ceil((date.getTime() - today.getTime()) / 86400000)
}

function compareDates(a: Date | null, b: Date | null, sens: 1 | -1): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return (a.getTime() - b.getTime()) * sens
}

export function classerOpportunites(opps: OpportuniteForReporting[], now: Date): SectionsSuivi {
  const terminees = opps
    .filter((o) => STATUTS_TERMINES.includes(o.statut))
    .sort((a, b) => compareDates(a.dateLimite, b.dateLimite, -1))
  const actives = opps
    .filter((o) => !STATUTS_TERMINES.includes(o.statut))
    .sort((a, b) => compareDates(a.dateLimite, b.dateLimite, 1))

  const aTraiter: ATraiter[] = []
  for (const opp of actives) {
    if (opp.statut === "GO" && opp.dateLimite && diffJours(opp.dateLimite, now) <= SEUIL_URGENCE_JOURS) {
      aTraiter.push({ opp, motif: "GO_ECHEANCE" })
    } else if (opp.statut === "EN_ATTENTE_ATTRIBUTION") {
      aTraiter.push({ opp, motif: "ATTENTE_ATTRIBUTION" })
    }
  }

  const parStatut = new Map<string, number>()
  for (const opp of opps) parStatut.set(opp.statut, (parStatut.get(opp.statut) ?? 0) + 1)
  const connus = ORDRE_COMPTEURS.filter((s) => parStatut.has(s))
  const autres = [...parStatut.keys()].filter((s) => !ORDRE_COMPTEURS.includes(s))
  const compteurs = [...connus, ...autres].map((statut) => ({ statut, count: parStatut.get(statut)! }))

  return { aTraiter, actives, terminees, compteurs }
}
```

- [ ] **Étape 4 : Vérifier la réussite**

Lancer : `npx playwright test -c playwright.unit.config.ts opportunite-reporting-sections`
Attendu : 6 tests passent.

- [ ] **Étape 5 : Commit**

```bash
git add lib/email/opportunite-reporting-sections.ts tests/unit/opportunite-reporting-sections.spec.ts
git commit -m "feat(reporting): classement des opportunités du mail de suivi"
```

---

### Tâche 2 : Nouveau gabarit HTML et texte

**Fichiers :**
- Modifier (réécriture du corps, signature inchangée) : `lib/email/opportunite-reporting-templates.ts`
- Modifier : `tests/unit/reporting-template-lots.spec.ts` (les assertions sur l'ancienne structure sont remplacées, le comportement métier reste couvert)
- Créer : `tests/unit/reporting-template-structure.spec.ts`

**Interfaces :**
- Consomme : `classerOpportunites`, `diffJours`, `SEUIL_URGENCE_JOURS` (Tâche 1) ; `calculerAvancementLots`, `totalMontantPropose` (`lib/utils/lots`) ; `formatMontant` ; `STATUT_OPPORTUNITE_LABELS`.
- Produit : `buildOpportuniteReportingEmail(ruleName, opportunites, now?)` → `{ subject, html, text }` (signature identique) ; le type `OpportuniteForReporting` reste exporté de ce fichier.

Structure du HTML (de haut en bas) : bandeau titre (marine, date en or, « N opportunités ») · compteurs par statut · bloc « À TRAITER » (si non vide) · section « EN COURS » avec une carte par opportunité active (si non vide) · section « TERMINÉES » en une ligne par opportunité (si non vide) · pied de page. Aucun titre de section sans contenu.

Carte d'une active : bordure gauche à la couleur du statut ; référence (petit) ; objet (gras) ; autorité ; pastille de statut ; grille de chiffres 3 colonnes en ne gardant que les champs renseignés parmi Estimé / Proposé / Date limite (avec décompte) / Validité (avec décompte) / Attribution (avec décompte) ; barre de progression du dossier si la moyenne n'est pas `null` ; notes tronquées à 160 caractères avec « … voir la fiche Excel jointe ».

Ligne d'une terminée : « référence · objet », puis en gris « autorité · montant (proposé sinon estimé) · limite jj/mm/aaaa ».

Décompte de jours (sans emoji) : `dépassée de N j` (gris) ; `aujourd'hui` (rouge) ; `J-N` avec N ≤ 3 (rouge `#dc2626`), N ≤ 7 (orange `#ea580c`), sinon vert `#16a34a`.

- [ ] **Étape 1 : Écrire les nouveaux tests de structure (échec attendu)**

```ts
// tests/unit/reporting-template-structure.spec.ts
import { test, expect } from '@playwright/test'
import { buildOpportuniteReportingEmail, type OpportuniteForReporting } from '../../lib/email/opportunite-reporting-templates'

const now = new Date('2026-10-14T08:00:00Z')

function opp(over: Partial<OpportuniteForReporting>): OpportuniteForReporting {
  return {
    id: 'x', reference: 'REF-1', objet: 'Objet', autoriteContractante: 'Autorité', statut: 'GO',
    montantEstime: null, lots: [], dateLimite: null, periodeValiditeDebut: null, periodeValiditeFin: null,
    echeanceAttributionProv: null, notes: null, ...over,
  }
}
const rapport = (opps: OpportuniteForReporting[]) => buildOpportuniteReportingEmail('Règle', opps, now)

test.describe('gabarit « Suivi Opportunités » : structure', () => {
  test('affiche le total et un compteur par statut', () => {
    const { html } = rapport([opp({ id: '1', statut: 'GO' }), opp({ id: '2', statut: 'NO_GO' }), opp({ id: '3', statut: 'NO_GO' })])
    expect(html).toContain('3 opportunités')
    expect(html).toMatch(/>2<[^]*?>No Go</)
  })

  test('largeur fluide plafonnée à 680 px, plus de tableau fixe de 14 colonnes', () => {
    const { html } = rapport([opp({})])
    expect(html).toContain('max-width:680px')
    expect(html).not.toContain('table-layout:fixed')
    expect(html).not.toContain('min-width:868px')
  })

  test('bloc « À traiter » : GO à échéance proche présent, omis s’il n’y a rien à traiter', () => {
    const avec = rapport([opp({ statut: 'GO', dateLimite: new Date('2026-10-21T00:00:00Z') })]).html
    expect(avec).toContain('À TRAITER')
    const sans = rapport([opp({ statut: 'GO', dateLimite: new Date('2026-12-21T00:00:00Z') })]).html
    expect(sans).not.toContain('À TRAITER')
  })

  test('section TERMINÉES : une ligne par No Go / Perdue, sans carte ; section EN COURS omise si aucune active', () => {
    const { html } = rapport([opp({ id: '1', statut: 'NO_GO', objet: 'Marché abandonné' })])
    expect(html).toContain('TERMINÉES')
    expect(html).toContain('Marché abandonné')
    expect(html).not.toContain('EN COURS')
  })

  test('un seul statut actif, aucune terminée : pas de section TERMINÉES', () => {
    expect(rapport([opp({})]).html).not.toContain('TERMINÉES')
  })

  test('échappe le HTML venant de la base (objet, autorité, notes)', () => {
    const { html } = rapport([opp({ objet: '<script>alert(1)</script> & Cie', autoriteContractante: 'A "B"', notes: '<b>gras</b>' })])
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>gras</b>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&amp; Cie')
  })

  test('notes longues tronquées à 160 caractères dans le mail', () => {
    const longues = 'N'.repeat(400)
    const { html } = rapport([opp({ notes: longues })])
    expect(html).not.toContain('N'.repeat(161))
    expect(html).toContain('N'.repeat(160))
    expect(html).toContain('Excel')
  })

  test('opportunité sans date ni lot ni montant : aucune cellule « — » inutile, pas de plantage', () => {
    const { html } = rapport([opp({ statut: 'EN_ANALYSE' })])
    expect(html).not.toContain('>—<')
    expect(html).toContain('En analyse')
  })

  test('statut inconnu : libellé de repli, pas de plantage', () => {
    const { html } = rapport([opp({ statut: 'STATUT_INCONNU' })])
    expect(html).toContain('STATUT_INCONNU')
  })

  test('décompte de jours sans emoji', () => {
    const { html } = rapport([opp({ statut: 'GO', dateLimite: new Date('2026-10-21T00:00:00Z') })])
    expect(html).toContain('J-7')
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}✅⛔]/u)
  })

  test('version texte : une ligne par opportunité avec référence, statut et date limite', () => {
    const { text } = rapport([opp({ reference: 'REF-9', statut: 'GO', dateLimite: new Date('2026-10-21T00:00:00Z') })])
    expect(text).toContain('REF-9')
    expect(text).toContain('21/10/2026')
  })
})
```

- [ ] **Étape 2 : Adapter les tests existants `reporting-template-lots.spec.ts`**

Les trois comportements métier restent exigés (total des lots, « — » sans lot, moyenne de progression) mais les assertions liées à l'ancien tableau changent :

- Test « sans lot, le montant proposé affiche « — » » : garder l'assertion `text` (`Proposé: —`). Remplacer l'assertion sur les « cellules alignées à droite » par : le HTML contient le montant estimé (`formatMontant(5000000)`) et **ne contient pas** d'étiquette « Proposé » (le champ disparaît de la carte quand il est vide).
- Tests de progression : remplacer `'✅ 13%'` par `'Dossier 13 %'` (et `'✅ 25%'` par `'Dossier 25 %'`) ; les `not.toContain('✅ 25%')` deviennent `not.toContain('Dossier 25 %')` ; le test « sans dossier » vérifie `not.toMatch(/Dossier \d+ %/)`.
- Le texte `Proposé: ${total}` reste inchangé (version texte conservée).

- [ ] **Étape 3 : Vérifier l'échec**

Lancer : `npx playwright test -c playwright.unit.config.ts reporting-template`
Attendu : échecs sur la nouvelle structure (l'ancien gabarit est encore en place).

- [ ] **Étape 4 : Réécrire le gabarit**

Dans `lib/email/opportunite-reporting-templates.ts`, conserver l'en-tête, le type `OpportuniteForReporting` et les imports existants, ajouter `import { classerOpportunites, diffJours, SEUIL_URGENCE_JOURS, type MotifATraiter } from "./opportunite-reporting-sections"`, supprimer les anciennes fonctions `diffJours`, `joursLabel`, `joursColor`, `td`, `th`, `buildRow` et la constante `EMAIL_WIDTH`, et remplacer le corps de `buildOpportuniteReportingEmail` par :

```ts
const NAVY = "#1E3A5F"
const GOLD = "#C49A1A"
const MAX_WIDTH = 680
const NOTES_MAX = 160

const COULEURS_STATUT: Record<string, { fort: string; pale: string }> = {
  GO: { fort: "#15803d", pale: "#dcfce7" },
  NO_GO: { fort: "#6b7280", pale: "#f3f4f6" },
  GAGNEE: { fort: "#1d4ed8", pale: "#dbeafe" },
  PERDUE: { fort: "#b91c1c", pale: "#fee2e2" },
  EN_ATTENTE_ATTRIBUTION: { fort: "#b45309", pale: "#fef3c7" },
}
const NEUTRE = { fort: "#475569", pale: "#f1f5f9" }
const couleurStatut = (s: string) => COULEURS_STATUT[s] ?? NEUTRE
const libelleStatut = (s: string) => STATUT_OPPORTUNITE_LABELS[s] ?? s

function esc(valeur: string): string {
  return valeur
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatDate(date: Date | null): string {
  return date ? format(date, "dd/MM/yyyy") : "—"
}

function montantStr(val: unknown): string {
  if (val === null || val === undefined) return "—"
  const n = Number(val)
  return isNaN(n) ? "—" : formatMontant(n)
}

function decompte(date: Date, today: Date): { texte: string; couleur: string } {
  const diff = diffJours(date, today)
  if (diff < 0) return { texte: `dépassée de ${Math.abs(diff)} j`, couleur: "#6b7280" }
  if (diff === 0) return { texte: "aujourd'hui", couleur: "#dc2626" }
  if (diff <= 3) return { texte: `J-${diff}`, couleur: "#dc2626" }
  if (diff <= SEUIL_URGENCE_JOURS) return { texte: `J-${diff}`, couleur: "#ea580c" }
  return { texte: `J-${diff}`, couleur: "#16a34a" }
}

function datePlusDecompte(date: Date | null, today: Date): string | null {
  if (!date) return null
  const d = decompte(date, today)
  return `${formatDate(date)} <span style="font-weight:400;font-size:11px;color:${d.couleur};">(${d.texte})</span>`
}

function pastille(statut: string): string {
  const c = couleurStatut(statut)
  return `<span style="display:inline-block;padding:2px 9px;border-radius:10px;background:${c.pale};color:${c.fort};font-size:11px;font-weight:700;">${esc(libelleStatut(statut))}</span>`
}

function tronquerNotes(notes: string): string {
  const brut = notes.trim()
  if (brut.length <= NOTES_MAX) return esc(brut)
  return `${esc(brut.slice(0, NOTES_MAX))}… <span style="color:${NAVY};text-decoration:underline;">détail dans le fichier Excel joint</span>`
}

function cellule(libelle: string, valeurHtml: string): string {
  return `<td valign="top" style="padding:6px 8px 6px 0;width:33%;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;">${libelle}</div><div style="font-size:13px;font-weight:600;color:#111827;">${valeurHtml}</div></td>`
}

function barreDossier(pct: number): string {
  return `<table cellpadding="0" cellspacing="0" width="100%" style="margin-top:6px;"><tr><td style="font-size:11px;color:#6b7280;padding-bottom:3px;">Dossier ${pct} %</td></tr><tr><td style="background:#e5e7eb;border-radius:3px;height:5px;line-height:5px;font-size:0;"><div style="width:${pct}%;background:${NAVY};height:5px;border-radius:3px;">&nbsp;</div></td></tr></table>`
}

function carte(opp: OpportuniteForReporting, today: Date): string {
  const c = couleurStatut(opp.statut)
  const propose = totalMontantPropose(opp.lots)
  const { progressionMoyenne } = calculerAvancementLots(opp.lots)

  const champs: [string, string | null][] = [
    ["Estimé", opp.montantEstime != null && montantStr(opp.montantEstime) !== "—" ? esc(montantStr(opp.montantEstime)) : null],
    ["Proposé", propose != null && montantStr(propose) !== "—" ? esc(montantStr(propose)) : null],
    ["Date limite", datePlusDecompte(opp.dateLimite, today)],
    [
      "Validité",
      opp.periodeValiditeFin
        ? `${opp.periodeValiditeDebut ? formatDate(opp.periodeValiditeDebut) + " → " : ""}${datePlusDecompte(opp.periodeValiditeFin, today)}`
        : null,
    ],
    ["Attribution prévue", datePlusDecompte(opp.echeanceAttributionProv, today)],
  ]
  const presents = champs.filter((x): x is [string, string] => x[1] !== null)
  let lignes = ""
  for (let i = 0; i < presents.length; i += 3) {
    lignes += `<tr>${presents.slice(i, i + 3).map(([l, v]) => cellule(l, v)).join("")}</tr>`
  }
  const grille = lignes ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">${lignes}</table>` : ""
  const notes = opp.notes?.trim()
    ? `<div style="margin-top:8px;padding:8px 10px;background:#f9fafb;border-radius:4px;font-size:12px;color:#4b5563;">${tronquerNotes(opp.notes)}</div>`
    : ""

  return `<tr><td style="padding:0 20px 12px;"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-left:4px solid ${c.fort};border-radius:6px;"><tr><td style="padding:12px 14px;">
<div style="font-size:11px;color:#6b7280;">${esc(opp.reference ?? "Sans référence")}</div>
<div style="font-size:14px;font-weight:700;margin:2px 0;color:#111827;">${esc(opp.objet)}</div>
<div style="font-size:12px;color:#4b5563;margin-bottom:6px;">${esc(opp.autoriteContractante)}</div>
${pastille(opp.statut)}${grille}${progressionMoyenne !== null ? barreDossier(progressionMoyenne) : ""}${notes}
</td></tr></table></td></tr>`
}

function ligneTerminee(opp: OpportuniteForReporting, premiere: boolean): string {
  const montant = montantStr(totalMontantPropose(opp.lots)) !== "—" ? montantStr(totalMontantPropose(opp.lots)) : montantStr(opp.montantEstime)
  const details = [opp.autoriteContractante, libelleStatut(opp.statut), montant !== "—" ? montant : null, opp.dateLimite ? `limite ${formatDate(opp.dateLimite)}` : null]
    .filter(Boolean)
    .map((d) => esc(String(d)))
    .join(" · ")
  const ref = opp.reference ? `${esc(opp.reference)} · ` : ""
  return `<tr><td style="padding:8px 12px;font-size:12px;${premiere ? "" : "border-top:1px solid #f1f5f9;"}"><b>${ref}</b>${esc(opp.objet)}<br><span style="color:#6b7280;">${details}</span></td></tr>`
}

function titreSection(titre: string, couleur: string, n: number): string {
  return `<tr><td style="padding:16px 20px 8px;"><span style="font-size:13px;font-weight:700;letter-spacing:.04em;color:${couleur};">${titre}</span> <span style="font-size:12px;color:#9ca3af;">· ${n}</span></td></tr>`
}

const MOTIFS: Record<MotifATraiter, string> = {
  GO_ECHEANCE: "GO — offre à rendre",
  ATTENTE_ATTRIBUTION: "En attente d'attribution",
}

function blocATraiter(items: { opp: OpportuniteForReporting; motif: MotifATraiter }[], today: Date): string {
  if (items.length === 0) return ""
  const cartes = items
    .map(({ opp, motif }) => {
      const pourGo = motif === "GO_ECHEANCE"
      const date = pourGo ? opp.dateLimite : opp.periodeValiditeFin
      const d = date ? decompte(date, today) : null
      const bord = pourGo ? "#b45309" : "#6b7280"
      const fond = pourGo ? "#fffbeb" : "#f9fafb"
      const suite = date
        ? pourGo
          ? ` — ${formatDate(date)} (${d!.texte})`
          : ` — validité jusqu'au ${formatDate(date)} (${d!.texte})`
        : ""
      return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${fond};border:1px solid #e5e7eb;border-left:4px solid ${bord};border-radius:6px;margin-bottom:8px;"><tr><td style="padding:10px 14px;font-size:13px;"><b>${MOTIFS[motif]}${esc(suite)}</b><br><span style="color:#4b5563;">${esc(opp.reference ?? "Sans référence")} · ${esc(opp.objet)} · ${esc(opp.autoriteContractante)}</span></td></tr></table>`
    })
    .join("")
  return `<tr><td style="padding:16px 20px 0;"><div style="font-size:12px;font-weight:700;letter-spacing:.06em;color:#b45309;margin-bottom:8px;">À TRAITER</div>${cartes}</td></tr>`
}

export function buildOpportuniteReportingEmail(
  ruleName: string,
  opportunites: OpportuniteForReporting[],
  now: Date = new Date()
): { subject: string; html: string; text: string } {
  const dateLabel = format(now, "EEEE d MMMM yyyy", { locale: fr })
  const subject = `📋 Suivi Opportunités — ${ruleName} — ${format(now, "dd/MM/yyyy")}`
  const { aTraiter, actives, terminees, compteurs } = classerOpportunites(opportunites, now)
  const total = opportunites.length

  const compteursHtml = compteurs
    .map(({ statut, count }) => {
      const c = couleurStatut(statut)
      return `<div style="display:inline-block;min-width:84px;margin:3px;background:#ffffff;border:1px solid #e5e7eb;border-top:3px solid ${c.fort};border-radius:6px;padding:8px 6px;text-align:center;"><div style="font-size:20px;font-weight:700;color:${c.fort};">${count}</div><div style="font-size:10px;color:#6b7280;">${esc(libelleStatut(statut))}</div></div>`
    })
    .join("")

  const sectionActives = actives.length
    ? titreSection("EN COURS", NAVY, actives.length) + actives.map((o) => carte(o, now)).join("")
    : ""
  const sectionTerminees = terminees.length
    ? titreSection("TERMINÉES", "#6b7280", terminees.length) +
      `<tr><td style="padding:0 20px 14px;"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;">${terminees.map((o, i) => ligneTerminee(o, i === 0)).join("")}</table></td></tr>`
    : ""

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#eef0f3;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f3;">
    <tr><td align="center" style="padding:16px 8px;">
      <table cellpadding="0" cellspacing="0" style="width:100%;max-width:${MAX_WIDTH}px;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:${NAVY};padding:22px 24px;">
          <div style="color:#ffffff;font-size:19px;font-weight:700;">Suivi des opportunités</div>
          <div style="color:${GOLD};font-size:13px;margin-top:4px;">${esc(ruleName)} · ${esc(dateLabel)} · ${total} opportunité${total > 1 ? "s" : ""}</div>
        </td></tr>
        <tr><td style="padding:12px 17px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:center;">${compteursHtml}</td></tr>
        ${blocATraiter(aTraiter, now)}
        ${sectionActives}
        ${sectionTerminees}
        <tr><td style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
          Détail complet de chaque opportunité dans le fichier Excel joint · Cet email est généré automatiquement par ERP Marchés STAM
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  const textLines = [
    `SUIVI OPPORTUNITÉS — ${ruleName.toUpperCase()}`,
    format(now, "dd/MM/yyyy"),
    `Total : ${total} opportunité(s)`,
    "",
  ]
  for (const opp of [...actives, ...terminees]) {
    textLines.push(
      `- [${opp.reference ?? "—"}] ${opp.objet} | ${libelleStatut(opp.statut)} | ` +
        `Estimé: ${montantStr(opp.montantEstime)} | Proposé: ${montantStr(totalMontantPropose(opp.lots))} | ` +
        `Date limite: ${formatDate(opp.dateLimite)}`
    )
  }
  return { subject, html, text: textLines.join("\n") }
}
```

- [ ] **Étape 5 : Vérifier la réussite**

Lancer : `npx playwright test -c playwright.unit.config.ts reporting-template opportunite-reporting-sections`
Attendu : tous les tests passent. Si un test de structure échoue sur une subtilité d'expression régulière (ex. compteurs), ajuster **le test** sur le comportement visé, pas le gabarit à l'aveugle.

- [ ] **Étape 6 : Contrôle de types**

Lancer : `npm run typecheck`
Attendu : 0 erreur.

- [ ] **Étape 7 : Commit**

```bash
git add lib/email/opportunite-reporting-templates.ts tests/unit/reporting-template-lots.spec.ts tests/unit/reporting-template-structure.spec.ts
git commit -m "feat(reporting): gabarit du suivi des opportunités en cartes, terminées en une ligne"
```

---

### Tâche 3 : Fichier Excel joint

**Fichiers :**
- Créer : `lib/email/opportunite-reporting-excel.ts`
- Test : `tests/unit/opportunite-reporting-excel.spec.ts`

**Interfaces :**
- Consomme : `OpportuniteForReporting`, `totalMontantPropose`, `calculerAvancementLots`, `STATUT_OPPORTUNITE_LABELS`, `diffJours`.
- Produit : `buildOpportuniteReportingExcel(opps: OpportuniteForReporting[], now: Date): Promise<Buffer>`. Une feuille « Opportunités » ; 13 colonnes dans cet ordre : Référence, Objet, Autorité contractante, Statut, Montant estimé, Montant proposé, Date limite, Jours restants (date limite), Validité début, Validité fin, Échéance attribution, Avancement dossier (%), Notes. Montants = nombres, dates = vraies dates, notes = texte **intégral**. Ordre des lignes : `classerOpportunites` (actives puis terminées).

- [ ] **Étape 1 : Écrire les tests (échec attendu)**

```ts
// tests/unit/opportunite-reporting-excel.spec.ts
import { test, expect } from '@playwright/test'
import ExcelJS from 'exceljs'
import { buildOpportuniteReportingExcel } from '../../lib/email/opportunite-reporting-excel'
import type { OpportuniteForReporting } from '../../lib/email/opportunite-reporting-templates'

const now = new Date('2026-10-14T08:00:00Z')

function opp(over: Partial<OpportuniteForReporting>): OpportuniteForReporting {
  return {
    id: 'x', reference: 'REF-1', objet: 'Objet', autoriteContractante: 'Autorité', statut: 'GO',
    montantEstime: null, lots: [], dateLimite: null, periodeValiditeDebut: null, periodeValiditeFin: null,
    echeanceAttributionProv: null, notes: null, ...over,
  }
}

async function lire(opps: OpportuniteForReporting[]) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await buildOpportuniteReportingExcel(opps, now))
  return wb.getWorksheet('Opportunités')!
}

test.describe('Excel joint au suivi des opportunités', () => {
  test('en-têtes et une ligne par opportunité', async () => {
    const ws = await lire([opp({ id: '1' }), opp({ id: '2', statut: 'NO_GO' })])
    expect(ws.getRow(1).values).toEqual([undefined, 'Référence', 'Objet', 'Autorité contractante', 'Statut', 'Montant estimé', 'Montant proposé', 'Date limite', 'Jours restants', 'Validité début', 'Validité fin', 'Échéance attribution', 'Avancement dossier (%)', 'Notes'])
    expect(ws.rowCount).toBe(3)
  })

  test('montants numériques et notes intégrales (au-delà de 255 caractères)', async () => {
    const notes = 'Note longue. '.repeat(40)
    const ws = await lire([opp({ montantEstime: 5000000, notes, lots: [{ montantPropose: 1500000, dossier: { progression: 40 } }, { montantPropose: 2500000, dossier: { progression: 60 } }] })])
    const ligne = ws.getRow(2)
    expect(ligne.getCell(5).value).toBe(5000000)
    expect(ligne.getCell(6).value).toBe(4000000)
    expect(ligne.getCell(12).value).toBe(50)
    expect(ligne.getCell(13).value).toBe(notes.trim() === notes ? notes : notes)
    expect(String(ligne.getCell(13).value).length).toBeGreaterThan(255)
  })

  test('opportunité sans date ni montant : cellules vides, pas de plantage', async () => {
    const ws = await lire([opp({ statut: 'EN_ANALYSE' })])
    const ligne = ws.getRow(2)
    expect(ligne.getCell(5).value).toBeNull()
    expect(ligne.getCell(7).value).toBeNull()
    expect(ligne.getCell(8).value).toBeNull()
  })

  test('jours restants calculés à partir de la date limite', async () => {
    const ws = await lire([opp({ dateLimite: new Date('2026-10-21T00:00:00Z') })])
    expect(ws.getRow(2).getCell(8).value).toBe(7)
  })
})
```

- [ ] **Étape 2 : Vérifier l'échec**

Lancer : `npx playwright test -c playwright.unit.config.ts opportunite-reporting-excel`
Attendu : échec (module introuvable).

- [ ] **Étape 3 : Implémenter**

```ts
// lib/email/opportunite-reporting-excel.ts
/**
 * Classeur Excel joint au mail « Suivi Opportunités » : toutes les colonnes,
 * notes intégrales, une ligne par opportunité (actives puis terminées).
 */

import ExcelJS from "exceljs"
import { calculerAvancementLots, totalMontantPropose } from "@/lib/utils/lots"
import { STATUT_OPPORTUNITE_LABELS } from "@/lib/validations/opportunite"
import { classerOpportunites, diffJours } from "./opportunite-reporting-sections"
import type { OpportuniteForReporting } from "./opportunite-reporting-templates"

const NAVY_ARGB = "FF1E3A5F"

const COLONNES: { header: string; key: string; width: number }[] = [
  { header: "Référence", key: "reference", width: 26 },
  { header: "Objet", key: "objet", width: 50 },
  { header: "Autorité contractante", key: "autorite", width: 36 },
  { header: "Statut", key: "statut", width: 22 },
  { header: "Montant estimé", key: "estime", width: 18 },
  { header: "Montant proposé", key: "propose", width: 18 },
  { header: "Date limite", key: "dateLimite", width: 13 },
  { header: "Jours restants", key: "jours", width: 13 },
  { header: "Validité début", key: "validiteDebut", width: 14 },
  { header: "Validité fin", key: "validiteFin", width: 14 },
  { header: "Échéance attribution", key: "echeance", width: 18 },
  { header: "Avancement dossier (%)", key: "avancement", width: 16 },
  { header: "Notes", key: "notes", width: 70 },
]

function nombreOuNull(val: unknown): number | null {
  if (val === null || val === undefined) return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

export async function buildOpportuniteReportingExcel(
  opportunites: OpportuniteForReporting[],
  now: Date
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Opportunités", { views: [{ state: "frozen", ySplit: 1 }] })
  ws.columns = COLONNES

  const { actives, terminees } = classerOpportunites(opportunites, now)
  for (const opp of [...actives, ...terminees]) {
    ws.addRow({
      reference: opp.reference,
      objet: opp.objet,
      autorite: opp.autoriteContractante,
      statut: STATUT_OPPORTUNITE_LABELS[opp.statut] ?? opp.statut,
      estime: nombreOuNull(opp.montantEstime),
      propose: nombreOuNull(totalMontantPropose(opp.lots)),
      dateLimite: opp.dateLimite,
      jours: opp.dateLimite ? diffJours(opp.dateLimite, now) : null,
      validiteDebut: opp.periodeValiditeDebut,
      validiteFin: opp.periodeValiditeFin,
      echeance: opp.echeanceAttributionProv,
      avancement: calculerAvancementLots(opp.lots).progressionMoyenne,
      notes: opp.notes,
    })
  }

  const entete = ws.getRow(1)
  entete.font = { bold: true, color: { argb: "FFFFFFFF" } }
  entete.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_ARGB } }
  entete.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
  entete.height = 30

  ws.eachRow((row, n) => {
    if (n === 1) return
    row.alignment = { vertical: "top", wrapText: true }
  })
  for (const cle of ["estime", "propose"]) ws.getColumn(cle).numFmt = "#,##0"
  for (const cle of ["dateLimite", "validiteDebut", "validiteFin", "echeance"]) ws.getColumn(cle).numFmt = "dd/mm/yyyy"
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLONNES.length } }

  return Buffer.from(await wb.xlsx.writeBuffer())
}
```

Remarque pour l'exécutant : dans le test « montants numériques et notes intégrales », la ligne `expect(ligne.getCell(13).value).toBe(notes.trim() === notes ? notes : notes)` est maladroite ; la remplacer par `expect(ligne.getCell(13).value).toBe(notes)`.

- [ ] **Étape 4 : Vérifier la réussite**

Lancer : `npx playwright test -c playwright.unit.config.ts opportunite-reporting-excel`
Attendu : 4 tests passent. Si l'avancement attendu diffère (moyenne arrondie), aligner le test sur `calculerAvancementLots` (même source que le mail).

- [ ] **Étape 5 : Commit**

```bash
git add lib/email/opportunite-reporting-excel.ts tests/unit/opportunite-reporting-excel.spec.ts
git commit -m "feat(reporting): classeur Excel joint au suivi des opportunités"
```

---

### Tâche 4 : Assemblage et câblage des deux sites d'envoi

**Fichiers :**
- Créer : `lib/email/opportunite-reporting-suivi.ts`
- Test : `tests/unit/opportunite-reporting-suivi.spec.ts`
- Modifier : `lib/cron/reporting-processor.ts:224-234`
- Modifier : `lib/actions/opportunite-reporting-rules.ts:213-222`

**Interfaces :**
- Consomme : `buildOpportuniteReportingEmail` (Tâche 2), `buildOpportuniteReportingExcel` (Tâche 3).
- Produit : `construireSuiviOpportunites(ruleName: string, opps: OpportuniteForReporting[], now: Date): Promise<{ subject: string; html: string; text: string; attachments: { filename: string; content: Buffer; contentType: string }[] }>` ; nom de fichier `suivi-opportunites-AAAA-MM-JJ.xlsx`, type MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

- [ ] **Étape 1 : Écrire le test (échec attendu)**

```ts
// tests/unit/opportunite-reporting-suivi.spec.ts
import { test, expect } from '@playwright/test'
import { construireSuiviOpportunites } from '../../lib/email/opportunite-reporting-suivi'
import type { OpportuniteForReporting } from '../../lib/email/opportunite-reporting-templates'

const now = new Date('2026-10-14T08:00:00Z')
const opp: OpportuniteForReporting = {
  id: '1', reference: 'REF-1', objet: 'Objet', autoriteContractante: 'Autorité', statut: 'GO',
  montantEstime: null, lots: [], dateLimite: null, periodeValiditeDebut: null, periodeValiditeFin: null,
  echeanceAttributionProv: null, notes: null,
}

test('le suivi contient le mail et une pièce jointe Excel nommée par date', async () => {
  const r = await construireSuiviOpportunites('Règle', [opp], now)
  expect(r.subject).toContain('14/10/2026')
  expect(r.html).toContain('Suivi des opportunités')
  expect(r.attachments).toHaveLength(1)
  expect(r.attachments[0].filename).toBe('suivi-opportunites-2026-10-14.xlsx')
  expect(r.attachments[0].contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  expect(r.attachments[0].content.length).toBeGreaterThan(1000)
})
```

- [ ] **Étape 2 : Vérifier l'échec**, puis implémenter

```ts
// lib/email/opportunite-reporting-suivi.ts
import { format } from "date-fns"
import { buildOpportuniteReportingExcel } from "./opportunite-reporting-excel"
import { buildOpportuniteReportingEmail, type OpportuniteForReporting } from "./opportunite-reporting-templates"

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export async function construireSuiviOpportunites(
  ruleName: string,
  opportunites: OpportuniteForReporting[],
  now: Date
): Promise<{
  subject: string
  html: string
  text: string
  attachments: { filename: string; content: Buffer; contentType: string }[]
}> {
  const { subject, html, text } = buildOpportuniteReportingEmail(ruleName, opportunites, now)
  const content = await buildOpportuniteReportingExcel(opportunites, now)
  return {
    subject,
    html,
    text,
    attachments: [{ filename: `suivi-opportunites-${format(now, "yyyy-MM-dd")}.xlsx`, content, contentType: XLSX_MIME }],
  }
}
```

- [ ] **Étape 3 : Câbler le cron** (`lib/cron/reporting-processor.ts`)

Remplacer l'import `buildOpportuniteReportingEmail` par `import { construireSuiviOpportunites } from "@/lib/email/opportunite-reporting-suivi"` (retirer l'ancien import s'il n'est plus utilisé ailleurs dans le fichier), puis :

```ts
    const { subject, html, text, attachments } = await construireSuiviOpportunites(rule.name, opportunites, now)

    try {
      const transporter = createEmailTransport()
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? "noreply@erp-marches.local",
        to: recipients.join(", "),
        subject,
        html,
        text,
        attachments,
      })
```

La construction est placée **avant** le `try` existant, comme aujourd'hui pour le gabarit : une erreur de construction du classeur remonterait donc hors du `try`. Pour ne pas bloquer les règles suivantes de la boucle, mettre aussi l'appel `construireSuiviOpportunites` **à l'intérieur** du `try` (le déplacer en première ligne du bloc).

- [ ] **Étape 4 : Câbler « Envoyer maintenant »** (`lib/actions/opportunite-reporting-rules.ts`)

Même changement : import de `construireSuiviOpportunites`, `const { subject, html, text, attachments } = await construireSuiviOpportunites(rule.name, opportunites, now)`, et `attachments` ajouté à l'appel `sendMail`. Le `try/catch` englobant existe déjà dans cette action.

- [ ] **Étape 5 : Vérifier**

Lancer : `npm run typecheck && npx playwright test -c playwright.unit.config.ts opportunite-reporting reporting-template`
Attendu : 0 erreur de types, tous les tests passent.

Vérification du périmètre : `git grep -n "buildOpportuniteReportingEmail"` ne doit plus montrer que le gabarit lui-même, `opportunite-reporting-suivi.ts` et les tests.

- [ ] **Étape 6 : Commit**

```bash
git add lib/email/opportunite-reporting-suivi.ts tests/unit/opportunite-reporting-suivi.spec.ts lib/cron/reporting-processor.ts lib/actions/opportunite-reporting-rules.ts
git commit -m "feat(reporting): suivi des opportunités envoyé avec le classeur Excel joint"
```

---

### Tâche 5 : Aperçu fictif, contrôle visuel et CI

**Fichiers :**
- Modifier (git-ignoré, hors dépôt de fait) : `.superpowers/sdd/2026-09-28-integration-dossiers-opportunites-lots-plan/scratch/apercu-email-opportunites.ts`

- [ ] **Étape 1 : Régénérer l'aperçu avec des données fictives**

Adapter le script d'aperçu existant pour appeler `buildOpportuniteReportingEmail` avec ~12 opportunités fictives (statuts variés, une sans date, une avec `<` dans l'objet, des notes longues) et écrire le HTML dans `.superpowers/…/scratch/apercu-suivi.html`. Aucune donnée réelle.

Lancer le script comme l'aperçu du mail « échéances » (voir `apercu.ts` de ce chantier).

- [ ] **Étape 2 : Contrôle visuel**

Ouvrir le fichier dans le navigateur intégré (fichier à l'intérieur du dossier du projet), à 1920, 768 et 375 de large (`resize_window`). Vérifier : pas de défilement horizontal à 375 ; compteurs qui passent à la ligne ; cartes lisibles ; section TERMINÉES compacte ; bloc À TRAITER en tête. Corriger le gabarit si défaut, relancer les tests.

Le rendu réel dans Gmail mobile n'est confirmé qu'à l'étape 4 (envoi test).

- [ ] **Étape 3 : Portail qualité**

Lancer : `npm run ci`
Attendu : types, lint (plafond 172 avertissements maximum), tests unitaires, build : tout vert.

- [ ] **Étape 4 : Pull request, puis test réel à un seul destinataire**

1. Pousser la branche et ouvrir la PR (corps : avant/après, garde 17.4, plan).
2. Fusion de la PR **seulement après un « oui » explicite d'Abel dans le fil** (le classifieur refuse `gh pr merge` sinon). La fusion déclenche un déploiement de production.
3. Après le déploiement : créer dans l'application (page Reporting) une règle « Test refonte suivi » de type « Suivi complet », **inactive**, destinataire = Abel seul, puis « Envoyer maintenant ». Ne jamais utiliser la règle « suivi des Opportunités » (2 destinataires réels).
4. Abel contrôle sur téléphone (Gmail mobile) et sur ordinateur : lisibilité, largeur, pièce jointe Excel (ouverture, colonnes, notes complètes).
5. Si Abel valide : supprimer la règle de test. Les envois automatiques du lundi et du vendredi (9 h) utilisent alors le nouveau format. Si défaut : correctif sur nouvelle branche avant le prochain envoi réel (vendredi ou lundi).

- [ ] **Étape 5 : Trace**

Brouillon d'entrée de Journal de décisions (« mail Suivi Opportunités refondu : cartes, terminées en une ligne, Excel joint ») à faire valider par Abel avant écriture. Mettre à jour la mémoire projet (`mail-echeances-matin-en-production.md` ou une nouvelle fiche) et le handoff.

---

## Auto-revue

- **Couverture :** compteurs, bloc « À traiter », cartes actives, terminées en une ligne, notes repliées, Excel joint, largeur fluide, mobile : Tâches 1 à 3, vérifiés visuellement en Tâche 5. Câblage des deux sites d'envoi : Tâche 4.
- **Cohérence des noms :** `classerOpportunites`, `diffJours`, `SEUIL_URGENCE_JOURS`, `MotifATraiter` (Tâche 1) repris tels quels en Tâches 2 et 3 ; `buildOpportuniteReportingExcel` (Tâche 3) repris en Tâche 4 ; `construireSuiviOpportunites` identique dans le cron, l'action et le test.
- **Hors périmètre (volontaire) :** cautions dans le bloc « À traiter » (la requête actuelle ne les charge pas), lien profond vers chaque fiche (l'URL de base n'est pas disponible dans le gabarit), suppression ou refonte de la règle « Échéances du matin ».
- **Point d'attention :** le mail n'inclut pas de lien « ouvrir la fiche » : le détail est dans l'Excel joint. Si Abel veut des liens, c'est une extension à part (variable d'URL de l'application à injecter).
