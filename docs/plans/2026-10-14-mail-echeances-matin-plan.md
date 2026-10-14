# Mail « échéances du matin » — plan d'implémentation

> **Pour les agents d'exécution :** sous-skill REQUIS : `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans`. Les étapes utilisent des cases à cocher (`- [ ]`). Avant toute étape de base de données ou de déploiement, appliquer le skill `disciplined-execution` (étape « Mise en production »).

**Objectif :** envoyer chaque matin à 8 h un mail listant les offres à rendre dans les 7 jours, à un ou plusieurs destinataires, construit depuis `Opportunite`, sans modifier l'ancien mail de suivi.

**Architecture :** des fonctions pures (classement, affichage) testées sans base ; un gabarit HTML/texte ; un champ `reportType` sur `OpportuniteReportingRule` ; un module d'envoi par destinataire partagé entre le cron et l'envoi manuel ; l'écran d'administration existant pour régler type, heure et destinataires.

**Stack :** Next.js 15 (Server Actions), Prisma 7, Nodemailer, Zod, tests unitaires Playwright (`npm run test:unit`).

**Conception :** [2026-10-14-mail-echeances-matin-design.md](./2026-10-14-mail-echeances-matin-design.md) (décisions 1 à 7, règles, vigilance). Les exécutants lisent les deux documents.

## Contraintes globales

- **Dépôt public** : aucune adresse e-mail réelle, aucun secret, aucune URL d'infrastructure, aucun chemin local dans le code, les tests, les exemples ni les messages de commit. Les destinataires viennent de la base (règle d'envoi) ; l'URL de l'application vient de `NEXTAUTH_URL`.
- **E-mails irréversibles** : aucun envoi réel pendant le développement. Les tests utilisent un faux transporteur. Un envoi réel n'a lieu qu'à l'étape 11, avec l'accord explicite de l'administrateur, vers une seule adresse.
- **Base de production** : aucune migration appliquée sans sauvegarde préalable ; ne jamais lancer une commande Prisma sans forcer `DATABASE_URL` sur la base locale (`.env` pointe sur la production). Utiliser le lanceur hors dépôt `avec-env-test.js` (voir tâche 4).
- Valider toute entrée avec Zod côté serveur ; rôle `ADMIN` dans chaque Server Action de règle.
- Fuseau : toutes les dates sont lues en UTC (Lomé = UTC+0 = serveur).
- Interface : composants shadcn/ui existants, pas de nouvelle dépendance. Vérification navigateur à 1920, 768 et 375 px.
- Spécifications en français ; commits de la forme `feat(echeances): …`.

## Revue ciblée (cas probables non couverts par la spec)

1. Un objet ou une autorité contenant `<`, `&` ou des guillemets ne doit ni casser le HTML ni injecter de balise : tâche 3.
2. Une opportunité sans `dateLimite` ne doit jamais apparaître ni faire planter le classement : tâche 1.
3. Destinataires en double, avec espaces ou en majuscules : un seul envoi par adresse : tâche 5.
4. Un destinataire en échec n'empêche pas les autres, et le cron répond 500 pour rendre l'échec visible : tâches 5 et 6.
5. Aucune offre à rendre : le mail vide part quand même (contrairement à l'ancien mail) : tâche 6.
6. Une règle `ECHEANCES_MATIN` n'est exécutée qu'à son heure configurée, une seule fois par jour : tâche 6.
7. Une offre très ancienne restée à un statut « avant soumission » : elle reste dans « À régulariser » : tâche 1 et étape 11.

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `lib/echeances/classement.ts` (créer) | Fonctions pures : échéance effective, blocs, gras d'alerte, groupement et tri |
| `lib/echeances/affichage.ts` (créer) | Fonctions pures : montant proposé affiché, délai, échéance lisible, objet du mail |
| `lib/email/echeances-matin-templates.ts` (créer) | Gabarit HTML et texte du mail |
| `lib/email/envoi-destinataires.ts` (créer) | Nettoyage des destinataires et envoi individuel |
| `lib/echeances/charger.ts` (créer) | Requête Prisma des offres à rendre |
| `lib/cron/echeances-matin.ts` (créer) | Orchestration : charger, grouper, construire, envoyer |
| `prisma/schema.prisma` + migration (modifier / créer) | Enum et colonne `reportType` |
| `lib/cron/reporting-processor.ts` (modifier) | Branche `ECHEANCES_MATIN` dans le cron |
| `lib/actions/opportunite-reporting-rules.ts` (modifier) | Schéma Zod, envoi manuel |
| `app/(dashboard)/admin/reporting/OpportuniteReportingRulesClient.tsx` (modifier) | Choix du type, textes |
| `lib/utils/opportunite-filters.ts` (modifier) | Filtre de liste « à rendre » |
| `tests/unit/echeances-*.spec.ts` (créer) | Tests unitaires |

Branche : `feat/mail-echeances-matin`, créée depuis `origin/main` à jour (après fusion de la PR « heure limite de dépôt », ou indépendante d'elle : aucun fichier commun).

---

### Tâche 1 : classement pur

**Fichiers :**
- Créer : `lib/echeances/classement.ts`
- Test : `tests/unit/echeances-classement.spec.ts`

**Interfaces :**
- Produit : `STATUTS_A_RENDRE`, `type BlocEcheance = 'rouge' | 'orange' | 'bleu'`, `interface OffreEcheance`, `echeanceEffective(d: Date): Date`, `ecartJours(d: Date, now: Date): number`, `classerOffre(o, now): BlocEcheance | null`, `alerteGras(o, now): boolean`, `grouperEcheances(offres, now): GroupesEcheances`.

- [ ] **Étape 1 : écrire les tests qui échouent**

```ts
// tests/unit/echeances-classement.spec.ts
import { test, expect } from '@playwright/test'
import {
  alerteGras, classerOffre, echeanceEffective, ecartJours, grouperEcheances,
  type OffreEcheance,
} from '../../lib/echeances/classement'

const NOW = new Date(Date.UTC(2026, 9, 15, 8, 0)) // jeudi 15 octobre 2026, 08:00
const jour = (n: number, h = 0, m = 0) => new Date(Date.UTC(2026, 9, 15 + n, h, m))

function offre(statut: OffreEcheance['statut'], dateLimite: Date | null, id = 'o'): OffreEcheance {
  return { id, reference: 'REF', objet: 'Objet', autoriteContractante: 'Autorité', statut, dateLimite, lots: [] }
}

test.describe('classement des échéances', () => {
  test('sans heure, l\'échéance effective est 23 h 59 le jour de la date limite', () => {
    expect(echeanceEffective(jour(2)).toISOString()).toBe(jour(2, 23, 59).toISOString())
    expect(echeanceEffective(jour(2, 17, 30)).toISOString()).toBe(jour(2, 17, 30).toISOString())
  })

  test('statuts clos ou de soumission : jamais dans un bloc', () => {
    for (const s of ['NO_GO', 'SOUMISE', 'OFFRE_SOUMISE', 'EN_ATTENTE_ATTRIBUTION', 'ATTRIBUE_PROVISOIREMENT', 'GAGNEE', 'PERDUE'] as const) {
      expect(classerOffre(offre(s, jour(1)), NOW)).toBeNull()
    }
  })

  test('statuts à rendre : classés', () => {
    for (const s of ['IDENTIFIEE', 'EN_ANALYSE', 'GO', 'DOSSIER_EN_PREPARATION'] as const) {
      expect(classerOffre(offre(s, jour(1)), NOW)).toBe('orange')
    }
  })

  test('une offre sans date limite n\'apparaît nulle part', () => {
    expect(classerOffre(offre('GO', null), NOW)).toBeNull()
  })

  test('frontières : aujourd\'hui, demain, surlendemain, J+7 inclus, J+8 exclu', () => {
    expect(classerOffre(offre('GO', jour(0, 12)), NOW)).toBe('orange')
    expect(classerOffre(offre('GO', jour(1, 9)), NOW)).toBe('orange')
    expect(classerOffre(offre('GO', jour(2, 9)), NOW)).toBe('bleu')
    expect(classerOffre(offre('GO', jour(7, 9)), NOW)).toBe('bleu')
    expect(classerOffre(offre('GO', jour(8, 9)), NOW)).toBeNull()
  })

  test('échéance passée : toujours « À régulariser », même très ancienne', () => {
    expect(classerOffre(offre('GO', jour(0, 7, 59)), NOW)).toBe('rouge')
    expect(classerOffre(offre('GO', jour(-1, 17)), NOW)).toBe('rouge')
    expect(classerOffre(offre('GO', new Date(Date.UTC(2025, 0, 10, 12))), NOW)).toBe('rouge')
  })

  test('sans heure, aujourd\'hui reste à rendre (23 h 59) ; hier est dépassé', () => {
    expect(classerOffre(offre('GO', jour(0)), NOW)).toBe('orange')
    expect(classerOffre(offre('GO', jour(-1)), NOW)).toBe('rouge')
  })

  test('écart en jours calendaires UTC', () => {
    expect(ecartJours(jour(0, 23, 59), NOW)).toBe(0)
    expect(ecartJours(jour(1, 0, 0), NOW)).toBe(1)
    expect(ecartJours(jour(-1, 17), NOW)).toBe(-1)
  })

  test('gras : détectée à J0..J+2, jamais en rouge, jamais pour une offre en préparation', () => {
    expect(alerteGras(offre('EN_ANALYSE', jour(0, 12)), NOW)).toBe(true)
    expect(alerteGras(offre('IDENTIFIEE', jour(2, 9)), NOW)).toBe(true)
    expect(alerteGras(offre('EN_ANALYSE', jour(3, 9)), NOW)).toBe(false)
    expect(alerteGras(offre('EN_ANALYSE', jour(-1, 17)), NOW)).toBe(false)
    expect(alerteGras(offre('EN_ANALYSE', jour(0, 7, 59)), NOW)).toBe(false)
    expect(alerteGras(offre('GO', jour(1, 9)), NOW)).toBe(false)
    expect(alerteGras(offre('DOSSIER_EN_PREPARATION', jour(1, 9)), NOW)).toBe(false)
  })

  test('chaque offre est dans un seul bloc, triée par échéance effective', () => {
    const offres = [
      offre('GO', jour(5, 9), 'c'), offre('GO', jour(-2, 9), 'a'), offre('GO', jour(1), 'b'),
      offre('GO', jour(0, 12), 'd'), offre('PERDUE', jour(1), 'x'), offre('GO', null, 'y'), offre('GO', jour(3, 9), 'e'),
    ]
    const g = grouperEcheances(offres, NOW)
    expect(g.rouge.map((o) => o.id)).toEqual(['a'])
    expect(g.orange.map((o) => o.id)).toEqual(['d', 'b'])
    expect(g.bleu.map((o) => o.id)).toEqual(['e', 'c'])
    const tous = [...g.rouge, ...g.orange, ...g.bleu].map((o) => o.id)
    expect(new Set(tous).size).toBe(tous.length)
  })
})
```

- [ ] **Étape 2 : lancer et constater l'échec**

Run : `npx playwright test -c playwright.unit.config.ts tests/unit/echeances-classement.spec.ts`
Attendu : échec (module introuvable).

- [ ] **Étape 3 : implémenter**

```ts
// lib/echeances/classement.ts
/**
 * Classement des offres à rendre pour le mail « échéances du matin ».
 * Fonctions pures : la date du jour est un paramètre. Fuseau : UTC (Lomé = UTC+0).
 */

import type { StatutOpportunite } from '@prisma/client'
import { STATUTS_AVANT_SOUMISSION } from '@/lib/utils/opportunite-filters'

const JOUR_MS = 86_400_000

/** Statuts pour lesquels l'offre est encore à rendre : source unique, partagée avec la liste. */
export const STATUTS_A_RENDRE: StatutOpportunite[] = STATUTS_AVANT_SOUMISSION

const STATUTS_DETECTEE: StatutOpportunite[] = ['IDENTIFIEE', 'EN_ANALYSE']

export type BlocEcheance = 'rouge' | 'orange' | 'bleu'

export interface OffreEcheance {
  id: string
  reference: string | null
  objet: string
  autoriteContractante: string
  statut: StatutOpportunite
  dateLimite: Date | null
  lots: { numero: number; montantPropose: unknown; dossier: { progression: number } | null }[]
}

export interface GroupesEcheances {
  rouge: OffreEcheance[]
  orange: OffreEcheance[]
  bleu: OffreEcheance[]
}

/** dateLimite avec son heure ; minuit exact (UTC) = heure non renseignée = 23 h 59 le même jour. */
export function echeanceEffective(dateLimite: Date): Date {
  if (dateLimite.getTime() % JOUR_MS === 0) return new Date(dateLimite.getTime() + JOUR_MS - 60_000)
  return dateLimite
}

/** Nombre de jours calendaires (UTC) entre le jour de `now` et celui de `dateLimite`. */
export function ecartJours(dateLimite: Date, now: Date): number {
  return Math.floor(dateLimite.getTime() / JOUR_MS) - Math.floor(now.getTime() / JOUR_MS)
}

export function classerOffre(
  offre: Pick<OffreEcheance, 'statut' | 'dateLimite'>,
  now: Date
): BlocEcheance | null {
  if (!offre.dateLimite || !STATUTS_A_RENDRE.includes(offre.statut)) return null
  if (echeanceEffective(offre.dateLimite).getTime() < now.getTime()) return 'rouge'
  const ecart = ecartJours(offre.dateLimite, now)
  if (ecart <= 1) return 'orange'
  if (ecart <= 7) return 'bleu'
  return null
}

/** Offre « détectée » dont l'échéance tombe d'aujourd'hui à J+2 ; jamais dans le bloc rouge. */
export function alerteGras(
  offre: Pick<OffreEcheance, 'statut' | 'dateLimite'>,
  now: Date
): boolean {
  if (!offre.dateLimite || !STATUTS_DETECTEE.includes(offre.statut)) return false
  if (classerOffre(offre, now) === 'rouge') return false
  const ecart = ecartJours(offre.dateLimite, now)
  return ecart >= 0 && ecart <= 2
}

/** Répartit les offres dans leur bloc, triées de l'échéance effective la plus proche à la plus lointaine. */
export function grouperEcheances(offres: OffreEcheance[], now: Date): GroupesEcheances {
  const groupes: GroupesEcheances = { rouge: [], orange: [], bleu: [] }
  for (const offre of offres) {
    const bloc = classerOffre(offre, now)
    if (bloc) groupes[bloc].push(offre)
  }
  const parEcheance = (a: OffreEcheance, b: OffreEcheance) =>
    echeanceEffective(a.dateLimite as Date).getTime() - echeanceEffective(b.dateLimite as Date).getTime()
  groupes.rouge.sort(parEcheance)
  groupes.orange.sort(parEcheance)
  groupes.bleu.sort(parEcheance)
  return groupes
}
```

- [ ] **Étape 4 : relancer, tout doit passer**

Run : `npx playwright test -c playwright.unit.config.ts tests/unit/echeances-classement.spec.ts`
Attendu : tous les tests passent.

- [ ] **Étape 5 : commit**

```bash
git add lib/echeances/classement.ts tests/unit/echeances-classement.spec.ts
git commit -m "feat(echeances): classement pur des offres à rendre (blocs, gras, tri)"
```

---

### Tâche 2 : affichage pur

**Fichiers :**
- Créer : `lib/echeances/affichage.ts`
- Test : `tests/unit/echeances-affichage.spec.ts`

**Interfaces :**
- Consomme : `BlocEcheance`, `GroupesEcheances`, `ecartJours`, `echeanceEffective` (tâche 1) ; `totalMontantPropose`, `lotsSansMontantPropose` (`lib/utils/lots.ts`) ; `formatMontant` (`lib/utils/format.ts`).
- Produit : `montantProposeAffiche(lots)`, `delaiTexte(dateLimite, now, bloc)`, `echeanceLisible(dateLimite)`, `objetMail(groupes)`, `type MontantAffiche = { texte: string; vide: boolean; note: string | null }`.

- [ ] **Étape 1 : tests qui échouent**

```ts
// tests/unit/echeances-affichage.spec.ts
import { test, expect } from '@playwright/test'
import { delaiTexte, echeanceLisible, montantProposeAffiche, objetMail } from '../../lib/echeances/affichage'
import { formatMontant } from '../../lib/utils/format'
import type { GroupesEcheances, OffreEcheance } from '../../lib/echeances/classement'

const NOW = new Date(Date.UTC(2026, 9, 15, 8, 0))
const jour = (n: number, h = 0, m = 0) => new Date(Date.UTC(2026, 9, 15 + n, h, m))
const lot = (numero: number, montantPropose: number | null) => ({ numero, montantPropose, dossier: null })

test.describe('affichage du mail échéances', () => {
  test('montant : aucun lot ou aucun montant → À définir', () => {
    expect(montantProposeAffiche([])).toEqual({ texte: 'À définir', vide: true, note: null })
    expect(montantProposeAffiche([lot(1, null)])).toEqual({ texte: 'À définir', vide: true, note: null })
  })

  test('montant : tous renseignés → total simple', () => {
    const m = montantProposeAffiche([lot(1, 10_000_000), lot(2, 5_000_000)])
    expect(m.texte).toBe(formatMontant(15_000_000))
    expect(m.note).toBeNull()
    expect(m.vide).toBe(false)
  })

  test('montant : lots manquants → total partiel avec les lots nommés', () => {
    expect(montantProposeAffiche([lot(1, 12_000_000), lot(2, null)]).note).toBe('total partiel — lot 2 sans montant')
    expect(montantProposeAffiche([lot(1, 1_000_000), lot(2, null), lot(3, null)]).note).toBe('total partiel — lots 2 et 3 sans montant')
    expect(montantProposeAffiche([lot(1, 1_000_000), lot(2, null), lot(3, null), lot(4, null)]).note).toBe('total partiel — lots 2, 3 et 4 sans montant')
  })

  test('délai selon le bloc', () => {
    expect(delaiTexte(jour(-1, 17), NOW, 'rouge')).toBe('Dépassée de 1 jour')
    expect(delaiTexte(jour(-3, 17), NOW, 'rouge')).toBe('Dépassée de 3 jours')
    expect(delaiTexte(jour(0, 7), NOW, 'rouge')).toBe('Heure dépassée aujourd\'hui')
    expect(delaiTexte(jour(0, 12), NOW, 'orange')).toBe('Aujourd\'hui')
    expect(delaiTexte(jour(1, 12), NOW, 'orange')).toBe('Demain')
    expect(delaiTexte(jour(3, 12), NOW, 'bleu')).toBe('Dans 3 jours')
  })

  test('échéance lisible : avec ou sans heure', () => {
    expect(echeanceLisible(jour(5, 17, 30))).toEqual({ date: '20 oct. 2026', heure: '17:30' })
    expect(echeanceLisible(jour(5))).toEqual({ date: '20 oct. 2026', heure: null })
  })

  test('objet du mail : résume la situation, y compris vide', () => {
    const o = (id: string): OffreEcheance => ({ id, reference: null, objet: '', autoriteContractante: '', statut: 'GO', dateLimite: null, lots: [] })
    const g = (r: number, or: number, b: number): GroupesEcheances => ({
      rouge: Array.from({ length: r }, (_, i) => o(`r${i}`)),
      orange: Array.from({ length: or }, (_, i) => o(`o${i}`)),
      bleu: Array.from({ length: b }, (_, i) => o(`b${i}`)),
    })
    expect(objetMail(g(0, 0, 0))).toBe('Aucune offre à rendre dans les 7 jours')
    expect(objetMail(g(1, 2, 3))).toBe('6 offres à rendre : 1 à régulariser, 2 aujourd\'hui ou demain, 3 dans la semaine')
    expect(objetMail(g(0, 1, 0))).toBe('1 offre à rendre : 1 aujourd\'hui ou demain')
  })
})
```

- [ ] **Étape 2 : lancer, constater l'échec** (`npx playwright test -c playwright.unit.config.ts tests/unit/echeances-affichage.spec.ts`).

- [ ] **Étape 3 : implémenter**

```ts
// lib/echeances/affichage.ts
/** Textes du mail « échéances du matin » : fonctions pures. Fuseau : UTC (Lomé). */

import { formatMontant } from '@/lib/utils/format'
import { lotsSansMontantPropose, totalMontantPropose } from '@/lib/utils/lots'
import { ecartJours, type BlocEcheance, type GroupesEcheances } from './classement'

export interface MontantAffiche {
  texte: string
  vide: boolean
  note: string | null
}

function listeLots(numeros: number[]): string {
  if (numeros.length === 1) return `lot ${numeros[0]}`
  return `lots ${numeros.slice(0, -1).join(', ')} et ${numeros[numeros.length - 1]}`
}

export function montantProposeAffiche(
  lots: { numero: number; montantPropose: unknown }[]
): MontantAffiche {
  const total = totalMontantPropose(lots)
  if (total === null) return { texte: 'À définir', vide: true, note: null }
  const manquants = lotsSansMontantPropose(lots)
  return {
    texte: formatMontant(total),
    vide: false,
    note: manquants.length > 0 ? `total partiel — ${listeLots(manquants)} sans montant` : null,
  }
}

export function delaiTexte(dateLimite: Date, now: Date, bloc: BlocEcheance): string {
  const ecart = ecartJours(dateLimite, now)
  if (bloc === 'rouge') {
    if (ecart >= 0) return 'Heure dépassée aujourd\'hui'
    return `Dépassée de ${-ecart} jour${-ecart > 1 ? 's' : ''}`
  }
  if (ecart === 0) return 'Aujourd\'hui'
  if (ecart === 1) return 'Demain'
  return `Dans ${ecart} jours`
}

const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function echeanceLisible(dateLimite: Date): { date: string; heure: string | null } {
  const sansHeure = dateLimite.getUTCHours() === 0 && dateLimite.getUTCMinutes() === 0
  const heure = sansHeure
    ? null
    : `${String(dateLimite.getUTCHours()).padStart(2, '0')}:${String(dateLimite.getUTCMinutes()).padStart(2, '0')}`
  return { date: FORMAT_DATE.format(dateLimite), heure }
}

export function objetMail(g: GroupesEcheances): string {
  const total = g.rouge.length + g.orange.length + g.bleu.length
  if (total === 0) return 'Aucune offre à rendre dans les 7 jours'
  const parties: string[] = []
  if (g.rouge.length) parties.push(`${g.rouge.length} à régulariser`)
  if (g.orange.length) parties.push(`${g.orange.length} aujourd'hui ou demain`)
  if (g.bleu.length) parties.push(`${g.bleu.length} dans la semaine`)
  return `${total} offre${total > 1 ? 's' : ''} à rendre : ${parties.join(', ')}`
}
```

> Vérifier à l'étape 4 que `Intl` rend bien « 20 oct. 2026 » ; si l'environnement rend « 20 oct 2026 » (sans point), ajuster l'attendu du test, pas le code.

- [ ] **Étape 4 : relancer** (même commande), tout doit passer.

- [ ] **Étape 5 : commit**

```bash
git add lib/echeances/affichage.ts tests/unit/echeances-affichage.spec.ts
git commit -m "feat(echeances): montant proposé, délai, échéance et objet du mail"
```

---

### Tâche 3 : gabarit du mail

**Fichiers :**
- Créer : `lib/email/echeances-matin-templates.ts`
- Test : `tests/unit/echeances-gabarit.spec.ts`

**Interfaces :**
- Consomme : tâches 1 et 2 ; `calculerAvancementLots` (`lib/utils/lots.ts`) ; `STATUT_OPPORTUNITE_LABELS` (`lib/validations/opportunite.ts`).
- Produit : `buildEcheancesMatinEmail(groupes: GroupesEcheances, now: Date, baseUrl: string): { subject: string; html: string; text: string }`, `SEUIL_COMPACT = 5`, `SEUIL_TOTAL = 15`.

Mise en page validée sur la maquette : en-tête bleu marine (`#1E3A5F`, or `#C49A1A`), trois compteurs, trois blocs (rouge `#B91C1C`, orange `#C2410C`, bleu `#1D4ED8`), cartes complètes pour rouge et orange, lignes compactes pour le bloc bleu au-delà de 5 offres, bouton « Voir les N autres dans l'ERP » au-delà de 15 offres au total, tableaux HTML et styles en ligne uniquement (compatibilité des clients de messagerie), largeur 640 px, repli mobile par `@media (max-width:480px)`.

- [ ] **Étape 1 : tests qui échouent**

```ts
// tests/unit/echeances-gabarit.spec.ts
import { test, expect } from '@playwright/test'
import { buildEcheancesMatinEmail } from '../../lib/email/echeances-matin-templates'
import { grouperEcheances, type OffreEcheance } from '../../lib/echeances/classement'

const NOW = new Date(Date.UTC(2026, 9, 15, 8, 0))
const jour = (n: number, h = 0, m = 0) => new Date(Date.UTC(2026, 9, 15 + n, h, m))
const BASE = 'https://app.exemple.invalid'

function offre(id: string, dateLimite: Date, extra: Partial<OffreEcheance> = {}): OffreEcheance {
  return { id, reference: `REF-${id}`, objet: `Objet ${id}`, autoriteContractante: 'Autorité', statut: 'GO', dateLimite, lots: [], ...extra }
}
const mail = (offres: OffreEcheance[]) => buildEcheancesMatinEmail(grouperEcheances(offres, NOW), NOW, BASE)
const compter = (html: string, motif: string) => html.split(motif).length - 1

test.describe('gabarit du mail échéances', () => {
  test('mail vide : produit un mail, avec un message clair', () => {
    const { subject, html, text } = mail([])
    expect(subject).toBe('Aucune offre à rendre dans les 7 jours')
    expect(html).toContain('Rien à rendre dans les 7 prochains jours')
    expect(text).toContain('Aucune offre à rendre')
  })

  test('une carte par offre urgente, un bouton vers la fiche', () => {
    const { html } = mail([offre('a', jour(-1, 17)), offre('b', jour(0, 12)), offre('c', jour(1, 9))])
    expect(compter(html, 'Ouvrir la fiche')).toBe(3)
    expect(html).toContain(`${BASE}/opportunites/a`)
  })

  test('bloc bleu : cartes jusqu\'à 5 offres, lignes compactes au-delà', () => {
    const cinq = Array.from({ length: 5 }, (_, i) => offre(`b${i}`, jour(3, 9 + i)))
    expect(compter(mail(cinq).html, 'Ouvrir la fiche')).toBe(5)
    const six = Array.from({ length: 6 }, (_, i) => offre(`b${i}`, jour(3, 9 + i)))
    expect(compter(mail(six).html, 'Ouvrir la fiche')).toBe(0)
    expect(compter(mail(six).html, `${BASE}/opportunites/b`)).toBe(6)
  })

  test('plafond de 15 offres : le reste va derrière un bouton ; les urgentes ne sont jamais coupées', () => {
    const urgentes = [offre('r', jour(-1, 17)), offre('o1', jour(0, 12)), offre('o2', jour(1, 9))]
    const bleues = Array.from({ length: 22 }, (_, i) => offre(`b${i}`, jour(2 + (i % 6), 9 + (i % 8))))
    const { html } = mail([...urgentes, ...bleues])
    expect(compter(html, 'Ouvrir la fiche')).toBe(3)
    expect(html).toContain('Voir les 10 autres dans l’ERP')
    expect(html).toContain(`${BASE}/opportunites?echeance=a-rendre`)
  })

  test('sans dépassement du plafond : pas de bouton « autres »', () => {
    expect(mail([offre('a', jour(2, 9))]).html).not.toContain('autres dans l’ERP')
  })

  test('le texte de l\'objet et de l\'autorité est échappé (pas d\'injection HTML)', () => {
    const piege = offre('p', jour(1, 9), { objet: '<script>alert(1)</script> & "x"', autoriteContractante: '<img src=x onerror=1>' })
    const { html } = mail([piege])
    expect(html).not.toContain('<script>alert')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&amp;')
  })

  test('une offre détectée proche est marquée « À décider », pas une offre en préparation', () => {
    const { html } = mail([offre('d', jour(1, 9), { statut: 'EN_ANALYSE' }), offre('e', jour(1, 10), { statut: 'DOSSIER_EN_PREPARATION' })])
    expect(compter(html, 'À décider')).toBe(1)
  })

  test('montant proposé et non estimé ; mention « À définir »', () => {
    const { html } = mail([offre('m', jour(1, 9), { lots: [{ numero: 1, montantPropose: 12_000_000, dossier: null }, { numero: 2, montantPropose: null, dossier: null }] }), offre('n', jour(1, 10))])
    expect(html).toContain('Montant proposé')
    expect(html).not.toContain('Montant estimé')
    expect(html).toContain('lot 2 sans montant')
    expect(html).toContain('À définir')
  })

  test('la version texte liste les offres par bloc', () => {
    const { text } = mail([offre('a', jour(-1, 17)), offre('b', jour(2, 9))])
    expect(text).toContain('À RÉGULARISER')
    expect(text).toContain('DANS LES 7 JOURS')
    expect(text).toContain('REF-a')
  })
})
```

- [ ] **Étape 2 : lancer, constater l'échec.**

- [ ] **Étape 3 : implémenter** `lib/email/echeances-matin-templates.ts`

```ts
// lib/email/echeances-matin-templates.ts
/**
 * Mail « échéances du matin » : offres à rendre dans les 7 jours.
 * HTML en tableaux avec styles en ligne (compatibilité des clients de messagerie).
 */

import { calculerAvancementLots } from '@/lib/utils/lots'
import { STATUT_OPPORTUNITE_LABELS } from '@/lib/validations/opportunite'
import {
  alerteGras, echeanceEffective, type BlocEcheance, type GroupesEcheances, type OffreEcheance,
} from '@/lib/echeances/classement'
import { delaiTexte, echeanceLisible, montantProposeAffiche, objetMail } from '@/lib/echeances/affichage'

export const SEUIL_COMPACT = 5
export const SEUIL_TOTAL = 15

const NAVY = '#1E3A5F'
const GOLD = '#C49A1A'

const BLOCS: Record<BlocEcheance, { titre: string; sous: string; couleur: string; fond: string }> = {
  rouge: { titre: 'À régulariser', sous: 'Échéance déjà passée', couleur: '#B91C1C', fond: '#FEF2F2' },
  orange: { titre: 'Aujourd’hui et demain', sous: 'À finaliser en priorité', couleur: '#C2410C', fond: '#FFF7ED' },
  bleu: { titre: 'Dans les 7 jours', sous: 'À planifier', couleur: '#1D4ED8', fond: '#EFF6FF' },
}

const echapper = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const FORMAT_JOUR = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

function etiquette(texte: string): string {
  return `<div style="font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#6B7280;margin-bottom:3px;">${texte}</div>`
}

function barre(progression: number | null): string {
  if (progression === null) return '<span style="color:#9CA3AF;">Pas commencé</span>'
  return `<span style="font-weight:600;">${progression} %</span><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:4px;"><tr><td width="${progression}%" style="background:${NAVY};height:6px;font-size:0;line-height:0;">&nbsp;</td><td style="background:#E5E7EB;height:6px;font-size:0;line-height:0;">&nbsp;</td></tr></table>`
}

function carte(o: OffreEcheance, bloc: BlocEcheance, now: Date, baseUrl: string): string {
  const c = BLOCS[bloc]
  const gras = alerteGras(o, now)
  const { date, heure } = echeanceLisible(o.dateLimite as Date)
  const echeance = heure
    ? `${date} à ${heure}`
    : `${date}<br><span style="font-size:12px;font-weight:400;color:#6B7280;">heure non précisée</span>`
  const m = montantProposeAffiche(o.lots)
  const montant = m.vide
    ? `<span style="color:#9CA3AF;">${m.texte}</span>`
    : `<span style="font-weight:600;">${m.texte}</span>${m.note ? `<div style="font-size:12px;color:#C2410C;margin-top:2px;">${m.note}</div>` : ''}`
  const { progressionMoyenne } = calculerAvancementLots(o.lots)
  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 12px 0;border:1px solid #E5E7EB;border-left:5px solid ${c.couleur};background:#FFFFFF;">
  <tr><td style="padding:14px 16px 4px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
    <td style="font-size:12px;color:#6B7280;font-weight:600;">${echapper(o.reference ?? '—')}${gras ? ' <span style="color:#C2410C;">· À décider</span>' : ''}</td>
    <td align="right"><span style="display:inline-block;padding:2px 9px;background:#F3F4F6;color:#374151;font-size:11px;font-weight:600;white-space:nowrap;">${echapper(STATUT_OPPORTUNITE_LABELS[o.statut] ?? o.statut)}</span></td>
  </tr></table></td></tr>
  <tr><td style="padding:2px 16px 0 16px;font-size:16px;line-height:1.35;color:#111827;font-weight:${gras ? 700 : 600};">${echapper(o.objet)}</td></tr>
  <tr><td style="padding:2px 16px 10px 16px;font-size:13px;color:#4B5563;">${echapper(o.autoriteContractante)}</td></tr>
  <tr><td style="padding:0 16px 12px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #F0F0F0;">
    <tr>
      <td class="col" width="50%" valign="top" style="padding:10px 8px 6px 0;font-size:14px;color:#111827;">${etiquette('Échéance')}<span style="font-weight:600;">${echeance}</span></td>
      <td class="col" width="50%" valign="top" style="padding:10px 0 6px 8px;font-size:14px;">${etiquette('Délai')}<span style="font-weight:${gras ? 800 : 700};color:${c.couleur};">${delaiTexte(o.dateLimite as Date, now, bloc)}</span></td>
    </tr><tr>
      <td class="col" width="50%" valign="top" style="padding:6px 8px 4px 0;font-size:14px;color:#111827;">${etiquette('Montant proposé')}${montant}</td>
      <td class="col" width="50%" valign="top" style="padding:6px 0 4px 8px;font-size:14px;color:#111827;">${etiquette('Dossier')}${barre(progressionMoyenne)}</td>
    </tr></table></td></tr>
  <tr><td style="padding:0 16px 14px 16px;"><a href="${baseUrl}/opportunites/${encodeURIComponent(o.id)}" style="display:inline-block;padding:8px 16px;background:${NAVY};color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;">Ouvrir la fiche &rarr;</a></td></tr>
</table>`
}

function ligne(o: OffreEcheance, bloc: BlocEcheance, now: Date, baseUrl: string, i: number): string {
  const c = BLOCS[bloc]
  const { date, heure } = echeanceLisible(o.dateLimite as Date)
  const fond = i % 2 ? '#F9FAFB' : '#FFFFFF'
  return `<tr>
    <td style="padding:9px 10px;background:${fond};border-bottom:1px solid #EEF0F3;font-size:13px;color:#111827;line-height:1.35;">
      <a href="${baseUrl}/opportunites/${encodeURIComponent(o.id)}" style="color:#111827;text-decoration:none;"><span style="color:#6B7280;font-weight:600;">${echapper(o.reference ?? '—')}</span> &middot; ${echapper(o.objet)}</a>
      <div style="font-size:12px;color:#6B7280;margin-top:2px;">${echapper(o.autoriteContractante)} &middot; ${echapper(STATUT_OPPORTUNITE_LABELS[o.statut] ?? o.statut)}</div>
    </td>
    <td class="col" align="right" valign="top" style="padding:9px 10px;background:${fond};border-bottom:1px solid #EEF0F3;font-size:12px;white-space:nowrap;"><span style="color:#374151;">${date}${heure ? ` · ${heure}` : ''}</span><div style="font-weight:700;color:${c.couleur};margin-top:2px;">${delaiTexte(o.dateLimite as Date, now, bloc)}</div></td>
  </tr>`
}

function section(bloc: BlocEcheance, offres: OffreEcheance[], now: Date, baseUrl: string, limite: number): string {
  if (offres.length === 0) return ''
  const c = BLOCS[bloc]
  const visibles = offres.slice(0, Math.max(0, limite))
  const caches = offres.length - visibles.length
  const compact = bloc === 'bleu' && offres.length > SEUIL_COMPACT
  const corps = compact
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #E5E7EB;border-left:5px solid ${c.couleur};">${visibles.map((o, i) => ligne(o, bloc, now, baseUrl, i)).join('')}</table>`
    : visibles.map((o) => carte(o, bloc, now, baseUrl)).join('')
  const reste = caches > 0
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;"><tr><td align="center" style="padding:12px;background:${c.fond};"><a href="${baseUrl}/opportunites?echeance=a-rendre" style="display:inline-block;padding:9px 18px;background:${NAVY};color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;">Voir les ${caches} autre${caches > 1 ? 's' : ''} dans l’ERP &rarr;</a></td></tr></table>`
    : ''
  return `
<tr><td style="padding:22px 24px 6px 24px;">
  <div style="font-size:17px;font-weight:700;color:${c.couleur};">${c.titre} <span style="display:inline-block;margin-left:6px;padding:1px 9px;background:${c.fond};font-size:13px;">${offres.length}</span></div>
  <div style="font-size:12px;color:#6B7280;padding-bottom:10px;">${c.sous}</div>
  ${corps}${reste}
</td></tr>`
}

function compteur(n: number, titre: string, couleur: string): string {
  return `<td align="center" width="33%" style="padding:12px 4px;"><div style="font-size:26px;font-weight:700;color:${n ? couleur : '#9CA3AF'};line-height:1;">${n}</div><div style="font-size:11px;color:#4B5563;margin-top:4px;">${titre}</div></td>`
}

export function buildEcheancesMatinEmail(
  g: GroupesEcheances,
  now: Date,
  baseUrl: string
): { subject: string; html: string; text: string } {
  const subject = objetMail(g)
  const total = g.rouge.length + g.orange.length + g.bleu.length
  const limiteBleu = SEUIL_TOTAL - g.rouge.length - g.orange.length
  const corps = total
    ? section('rouge', g.rouge, now, baseUrl, g.rouge.length) +
      section('orange', g.orange, now, baseUrl, g.orange.length) +
      section('bleu', g.bleu, now, baseUrl, limiteBleu)
    : `<tr><td style="padding:34px 24px;text-align:center;"><div style="font-size:17px;font-weight:700;color:#111827;">Rien à rendre dans les 7 prochains jours</div><div style="font-size:13px;color:#6B7280;margin-top:6px;">Ce mail confirme que le suivi fonctionne : l’absence de mail, elle, serait un signal à vérifier.</div></td></tr>`

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${echapper(subject)}</title>
<style>@media only screen and (max-width:480px){.wrap{width:100% !important}.col{display:block !important;width:100% !important;padding-left:0 !important;padding-right:0 !important}.pad{padding-left:16px !important;padding-right:16px !important}}</style></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${echapper(subject)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:16px 0;"><tr><td align="center">
<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:100%;background:#FFFFFF;">
  <tr><td class="pad" style="background:${NAVY};padding:24px 24px 20px 24px;">
    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${GOLD};font-weight:700;">ERP Marchés STAM</div>
    <div style="font-size:22px;font-weight:700;color:#FFFFFF;margin-top:6px;">Échéances du matin</div>
    <div style="font-size:13px;color:#D1D5DB;margin-top:4px;">${FORMAT_JOUR.format(now)}</div>
  </td></tr>
  <tr><td style="background:#F9FAFB;border-bottom:1px solid #E5E7EB;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    ${compteur(g.rouge.length, 'À régulariser', BLOCS.rouge.couleur)}${compteur(g.orange.length, 'Aujourd’hui / demain', BLOCS.orange.couleur)}${compteur(g.bleu.length, 'Sous 7 jours', BLOCS.bleu.couleur)}
  </tr></table></td></tr>
  ${corps}
  <tr><td style="padding:18px 24px 22px 24px;border-top:1px solid #E5E7EB;background:#F9FAFB;font-size:12px;color:#6B7280;line-height:1.5;">
    Sont listées les offres au statut En analyse, GO ou Dossier en préparation, dont l’échéance est dépassée ou tombe dans les 7 jours. Sans heure renseignée, l’échéance est à 23 h 59.<br>Généré automatiquement par ERP Marchés STAM.
  </td></tr>
</table></td></tr></table></body></html>`

  const texteBloc = (bloc: BlocEcheance, titre: string, offres: OffreEcheance[]) =>
    offres.length === 0
      ? []
      : ['', `${titre} (${offres.length})`, ...offres.map((o) => {
          const { date, heure } = echeanceLisible(o.dateLimite as Date)
          return `- [${o.reference ?? '—'}] ${o.objet} | ${o.autoriteContractante} | ${date}${heure ? ` ${heure}` : ''} | ${delaiTexte(o.dateLimite as Date, now, bloc)} | ${montantProposeAffiche(o.lots).texte}`
        })]
  const text = [
    `ÉCHÉANCES DU MATIN — ${FORMAT_JOUR.format(now)}`,
    subject,
    ...texteBloc('rouge', 'À RÉGULARISER', g.rouge),
    ...texteBloc('orange', 'AUJOURD’HUI ET DEMAIN', g.orange),
    ...texteBloc('bleu', 'DANS LES 7 JOURS', g.bleu),
    ...(total === 0 ? ['', 'Aucune offre à rendre dans les 7 prochains jours.'] : []),
  ].join('\n')

  return { subject, html, text }
}
```

- [ ] **Étape 4 : relancer** `tests/unit/echeances-gabarit.spec.ts`, tout doit passer. Si le décompte « 10 autres » diffère, recalculer : 3 urgentes + 12 lignes bleues visibles = 15 ; 22 bleues − 12 = 10 cachées.

- [ ] **Étape 5 : commit**

```bash
git add lib/email/echeances-matin-templates.ts tests/unit/echeances-gabarit.spec.ts
git commit -m "feat(echeances): gabarit HTML et texte du mail échéances du matin"
```

---

### Tâche 4 : champ `reportType` (migration additive)

**Fichiers :**
- Modifier : `prisma/schema.prisma` (modèle `OpportuniteReportingRule`, ligne ≈ 534)
- Créer : `prisma/migrations/<horodatage>_add_type_rapport_opportunite/migration.sql`

**Interfaces :** Produit : enum Prisma `TypeRapportOpportunite { SUIVI ECHEANCES_MATIN }` et champ `reportType` sur `OpportuniteReportingRule` (défaut `SUIVI`).

- [ ] **Étape 1 : modifier le schéma**

```prisma
enum TypeRapportOpportunite {
  SUIVI             // Suivi complet de toutes les opportunités (comportement historique)
  ECHEANCES_MATIN   // Offres à rendre dans les 7 jours
}

model OpportuniteReportingRule {
  id              String   @id @default(cuid())
  name            String
  description     String?
  reportType      TypeRapportOpportunite @default(SUIVI)
  recipientEmails String[]   // Emails destinataires
  scheduleConfig  Json?      // ReportingScheduleConfig | null (null = MANUAL)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("opportunite_reporting_rules")
}
```

- [ ] **Étape 2 : générer la migration sur la base de test locale uniquement** (Docker démarré, port 5433)

```bash
node .superpowers/sdd/2026-09-28-integration-dossiers-opportunites-lots-plan/scratch/avec-env-test.js npx prisma migrate dev --name add_type_rapport_opportunite --create-only
```

Le lanceur refuse de démarrer si la base n'est pas `127.0.0.1:5433`. Ne jamais lancer `prisma migrate` sans lui : `.env` pointe sur la production. S'il manque, recréer le même garde-fou avant de continuer.

- [ ] **Étape 3 : vérifier le SQL généré** (doit être exactement additif, sans `DROP`) :

```sql
CREATE TYPE "TypeRapportOpportunite" AS ENUM ('SUIVI', 'ECHEANCES_MATIN');
ALTER TABLE "opportunite_reporting_rules" ADD COLUMN "reportType" "TypeRapportOpportunite" NOT NULL DEFAULT 'SUIVI';
```

- [ ] **Étape 4 : appliquer en local, régénérer le client, typecheck**

```bash
node .superpowers/sdd/2026-09-28-integration-dossiers-opportunites-lots-plan/scratch/avec-env-test.js npx prisma migrate deploy
npx prisma generate
npx tsc --noEmit
```

Attendu : migration appliquée en local, 0 erreur de type. **Ne rien appliquer en production ici** (étape 11).

- [ ] **Étape 5 : commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): type de rapport sur les règles d'envoi des opportunités"
```

---

### Tâche 5 : envoi à plusieurs destinataires

**Fichiers :**
- Créer : `lib/email/envoi-destinataires.ts`
- Test : `tests/unit/echeances-envoi.spec.ts`

**Interfaces :**
- Produit : `MAX_DESTINATAIRES = 20`, `nettoyerDestinataires(emails: string[]): string[]`, `envoyerAChaqueDestinataire(transporter, from, destinataires, contenu): Promise<ResultatEnvoi>`, `interface ResultatEnvoi { envoyes: number; echecs: { email: string; erreur: string }[] }`.

- [ ] **Étape 1 : tests qui échouent**

```ts
// tests/unit/echeances-envoi.spec.ts
import { test, expect } from '@playwright/test'
import { envoyerAChaqueDestinataire, nettoyerDestinataires, MAX_DESTINATAIRES } from '../../lib/email/envoi-destinataires'

const contenu = { subject: 'Objet', html: '<p>x</p>', text: 'x' }

function fauxTransporteur(echoue: string[] = []) {
  const envois: { to: string }[] = []
  return {
    envois,
    async sendMail(opts: { to: string }) {
      if (echoue.includes(opts.to)) throw new Error('refusé')
      envois.push({ to: opts.to })
      return {}
    },
  }
}

test.describe('envoi à plusieurs destinataires', () => {
  test('nettoyage : espaces, casse, doublons, adresses invalides', () => {
    expect(nettoyerDestinataires([' A@x.test ', 'a@x.test', 'b@x.test', 'pas-un-mail', ''])).toEqual(['a@x.test', 'b@x.test'])
  })

  test('un envoi individuel par destinataire, sans exposer les autres adresses', async () => {
    const t = fauxTransporteur()
    const r = await envoyerAChaqueDestinataire(t, 'ERP <noreply@x.test>', ['a@x.test', 'b@x.test'], contenu)
    expect(t.envois.map((e) => e.to)).toEqual(['a@x.test', 'b@x.test'])
    expect(r).toEqual({ envoyes: 2, echecs: [] })
  })

  test('un destinataire en échec n\'empêche pas les autres et est signalé', async () => {
    const t = fauxTransporteur(['b@x.test'])
    const r = await envoyerAChaqueDestinataire(t, 'ERP <noreply@x.test>', ['a@x.test', 'b@x.test', 'c@x.test'], contenu)
    expect(t.envois.map((e) => e.to)).toEqual(['a@x.test', 'c@x.test'])
    expect(r.envoyes).toBe(2)
    expect(r.echecs).toEqual([{ email: 'b@x.test', erreur: 'refusé' }])
  })

  test('aucun destinataire valide : rien n\'est envoyé', async () => {
    const t = fauxTransporteur()
    const r = await envoyerAChaqueDestinataire(t, 'ERP <noreply@x.test>', [], contenu)
    expect(r).toEqual({ envoyes: 0, echecs: [] })
  })

  test('limite de destinataires exposée', () => {
    expect(MAX_DESTINATAIRES).toBe(20)
  })
})
```

- [ ] **Étape 2 : lancer, constater l'échec.**

- [ ] **Étape 3 : implémenter**

```ts
// lib/email/envoi-destinataires.ts
/** Envoi d'un même mail à plusieurs destinataires, un message par destinataire. */

export const MAX_DESTINATAIRES = 20

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ResultatEnvoi {
  envoyes: number
  echecs: { email: string; erreur: string }[]
}

export interface Transporteur {
  sendMail(options: { from: string; to: string; subject: string; html: string; text: string }): Promise<unknown>
}

/** Retire espaces et doublons (casse ignorée), écarte les adresses invalides. */
export function nettoyerDestinataires(emails: string[]): string[] {
  const vus = new Set<string>()
  for (const brut of emails) {
    const email = brut.trim().toLowerCase()
    if (EMAIL.test(email)) vus.add(email)
  }
  return [...vus]
}

/**
 * Un message par destinataire : les adresses ne sont pas exposées entre elles et un refus
 * n'empêche pas les autres envois. Envois en série pour ménager le quota du serveur SMTP.
 */
export async function envoyerAChaqueDestinataire(
  transporteur: Transporteur,
  from: string,
  destinataires: string[],
  contenu: { subject: string; html: string; text: string }
): Promise<ResultatEnvoi> {
  const resultat: ResultatEnvoi = { envoyes: 0, echecs: [] }
  for (const email of nettoyerDestinataires(destinataires)) {
    try {
      await transporteur.sendMail({ from, to: email, ...contenu })
      resultat.envoyes++
    } catch (err) {
      resultat.echecs.push({ email, erreur: err instanceof Error ? err.message : 'erreur inconnue' })
    }
  }
  return resultat
}
```

- [ ] **Étape 4 : relancer**, tout doit passer.

- [ ] **Étape 5 : commit**

```bash
git add lib/email/envoi-destinataires.ts tests/unit/echeances-envoi.spec.ts
git commit -m "feat(echeances): envoi individuel à plusieurs destinataires"
```

---

### Tâche 6 : chargement, orchestration et cron

**Fichiers :**
- Créer : `lib/echeances/charger.ts`, `lib/cron/echeances-matin.ts`
- Modifier : `lib/cron/reporting-processor.ts` (fonction `runOpportuniteReportingCron`, ≈ lignes 154-223)
- Test : `tests/unit/echeances-orchestration.spec.ts`

**Interfaces :**
- Consomme : tâches 1, 3, 5.
- Produit : `chargerOffresARendre(now: Date): Promise<OffreEcheance[]>`, `envoyerEcheancesMatin(destinataires: string[], now: Date, deps?: DependancesEcheances): Promise<ResultatEnvoi>`.

- [ ] **Étape 1 : test de l'orchestration avec dépendances injectées** (aucune base, aucun envoi)

```ts
// tests/unit/echeances-orchestration.spec.ts
import { test, expect } from '@playwright/test'
import { envoyerEcheancesMatin } from '../../lib/cron/echeances-matin'
import type { OffreEcheance } from '../../lib/echeances/classement'

const NOW = new Date(Date.UTC(2026, 9, 15, 8, 0))
const offre = (id: string, statut: OffreEcheance['statut'], h: number): OffreEcheance => ({
  id, reference: id, objet: `Objet ${id}`, autoriteContractante: 'Autorité', statut,
  dateLimite: new Date(Date.UTC(2026, 9, 16, h)), lots: [],
})

function deps(offres: OffreEcheance[], echoue: string[] = []) {
  const envois: { to: string; subject: string }[] = []
  return {
    envois,
    charger: async () => offres,
    transporteur: {
      async sendMail(o: { to: string; subject: string }) {
        if (echoue.includes(o.to)) throw new Error('refusé')
        envois.push({ to: o.to, subject: o.subject })
        return {}
      },
    },
    from: 'ERP <noreply@x.test>',
    baseUrl: 'https://app.exemple.invalid',
  }
}

test.describe('orchestration du mail échéances', () => {
  test('envoie à tous les destinataires, objet résumé', async () => {
    const d = deps([offre('a', 'GO', 9)])
    const r = await envoyerEcheancesMatin(['a@x.test', 'b@x.test'], NOW, d)
    expect(r).toEqual({ envoyes: 2, echecs: [] })
    expect(d.envois.map((e) => e.to)).toEqual(['a@x.test', 'b@x.test'])
    expect(d.envois[0].subject).toBe('1 offre à rendre : 1 aujourd\'hui ou demain')
  })

  test('aucune offre à rendre : le mail vide part quand même', async () => {
    const d = deps([offre('x', 'PERDUE', 9)])
    const r = await envoyerEcheancesMatin(['a@x.test'], NOW, d)
    expect(r.envoyes).toBe(1)
    expect(d.envois[0].subject).toBe('Aucune offre à rendre dans les 7 jours')
  })

  test('un échec d\'envoi est remonté', async () => {
    const d = deps([], ['b@x.test'])
    const r = await envoyerEcheancesMatin(['a@x.test', 'b@x.test'], NOW, d)
    expect(r.envoyes).toBe(1)
    expect(r.echecs).toHaveLength(1)
  })
})
```

- [ ] **Étape 2 : lancer, constater l'échec.**

- [ ] **Étape 3 : implémenter**

```ts
// lib/echeances/charger.ts
import { prisma } from '@/lib/db/prisma'
import { STATUTS_A_RENDRE, type OffreEcheance } from './classement'

const JOUR_MS = 86_400_000

/** Offres à statut « avant soumission » dont la date limite est renseignée et au plus à J+8 (pré-filtre large ; le classement tranche). */
export async function chargerOffresARendre(now: Date): Promise<OffreEcheance[]> {
  return prisma.opportunite.findMany({
    where: {
      statut: { in: STATUTS_A_RENDRE },
      dateLimite: { not: null, lte: new Date(now.getTime() + 8 * JOUR_MS) },
    },
    select: {
      id: true, reference: true, objet: true, autoriteContractante: true, statut: true, dateLimite: true,
      lots: { select: { numero: true, montantPropose: true, dossier: { select: { progression: true } } } },
    },
  })
}
```

```ts
// lib/cron/echeances-matin.ts
/** Orchestration du mail « échéances du matin » : charger, classer, construire, envoyer. */

import { createEmailTransport } from '@/lib/config/email'
import { chargerOffresARendre } from '@/lib/echeances/charger'
import { grouperEcheances, type OffreEcheance } from '@/lib/echeances/classement'
import { buildEcheancesMatinEmail } from '@/lib/email/echeances-matin-templates'
import { envoyerAChaqueDestinataire, type ResultatEnvoi, type Transporteur } from '@/lib/email/envoi-destinataires'

export interface DependancesEcheances {
  charger: (now: Date) => Promise<OffreEcheance[]>
  transporteur: Transporteur
  from: string
  baseUrl: string
}

function dependancesParDefaut(): DependancesEcheances {
  return {
    charger: chargerOffresARendre,
    transporteur: createEmailTransport(),
    from: process.env.SMTP_FROM ?? 'noreply@erp-marches.local',
    baseUrl: (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  }
}

/** Même chemin pour le cron et l'envoi manuel. Le mail part même sans offre à rendre. */
export async function envoyerEcheancesMatin(
  destinataires: string[],
  now: Date,
  deps: DependancesEcheances = dependancesParDefaut()
): Promise<ResultatEnvoi> {
  const groupes = grouperEcheances(await deps.charger(now), now)
  const contenu = buildEcheancesMatinEmail(groupes, now, deps.baseUrl)
  return envoyerAChaqueDestinataire(deps.transporteur, deps.from, destinataires, contenu)
}
```

Dans `lib/cron/reporting-processor.ts`, importer `envoyerEcheancesMatin` et, dans la boucle de `runOpportuniteReportingCron`, **juste après le contrôle des destinataires et avant la requête `findMany`**, ajouter :

```ts
    if (rule.reportType === "ECHEANCES_MATIN") {
      try {
        const resultat = await envoyerEcheancesMatin(recipients, now)
        if (resultat.echecs.length > 0) {
          console.error(`❌ Échéances "${rule.name}" : ${resultat.echecs.length} envoi(s) en échec`)
          failed++
        } else {
          console.log(`✅ Échéances "${rule.name}" envoyé à ${resultat.envoyes} destinataire(s)`)
          sent++
        }
      } catch (err) {
        console.error(`❌ Échec échéances "${rule.name}":`, err)
        failed++
      }
      continue
    }
```

Les règles `SUIVI` (valeur par défaut) suivent le chemin historique, inchangé.

- [ ] **Étape 4 : relancer** les tests, puis `npx tsc --noEmit` (0 erreur).

- [ ] **Étape 5 : commit**

```bash
git add lib/echeances/charger.ts lib/cron/echeances-matin.ts lib/cron/reporting-processor.ts tests/unit/echeances-orchestration.spec.ts
git commit -m "feat(echeances): chargement, orchestration et branche du cron"
```

---

### Tâche 7 : Server Actions des règles

**Fichiers :**
- Modifier : `lib/actions/opportunite-reporting-rules.ts` (schéma Zod ≈ lignes 32-38 ; `sendOpportuniteReportingRuleNow` ≈ lignes 187-244)
- Test : `tests/unit/echeances-regles-schema.spec.ts`

**Interfaces :** Consomme `nettoyerDestinataires`, `MAX_DESTINATAIRES` (tâche 5), `envoyerEcheancesMatin` (tâche 6). Produit : schéma exporté `OpportuniteReportingRuleSchema` (jusqu'ici non exporté : l'exporter pour le tester ; fichier `"use server"` : n'exporter que des fonctions async est exigé, donc **déplacer le schéma** dans `lib/validations/opportunite-reporting-rule.ts` et l'importer).

- [ ] **Étape 1 : tests qui échouent**

```ts
// tests/unit/echeances-regles-schema.spec.ts
import { test, expect } from '@playwright/test'
import { OpportuniteReportingRuleSchema } from '../../lib/validations/opportunite-reporting-rule'

const base = { name: 'Échéances du matin', recipientEmails: ['a@x.test'], scheduleConfig: { type: 'DAILY', hour: 8 } }

test.describe('schéma des règles d\'envoi', () => {
  test('type par défaut : SUIVI', () => {
    expect(OpportuniteReportingRuleSchema.parse(base).reportType).toBe('SUIVI')
  })
  test('type ECHEANCES_MATIN accepté, type inconnu refusé', () => {
    expect(OpportuniteReportingRuleSchema.parse({ ...base, reportType: 'ECHEANCES_MATIN' }).reportType).toBe('ECHEANCES_MATIN')
    expect(OpportuniteReportingRuleSchema.safeParse({ ...base, reportType: 'AUTRE' }).success).toBe(false)
  })
  test('destinataires nettoyés (casse, espaces, doublons)', () => {
    const r = OpportuniteReportingRuleSchema.parse({ ...base, recipientEmails: ['A@x.test', 'a@x.test', 'b@x.test'] })
    expect(r.recipientEmails).toEqual(['a@x.test', 'b@x.test'])
  })
  test('au moins un destinataire, au plus 20', () => {
    expect(OpportuniteReportingRuleSchema.safeParse({ ...base, recipientEmails: [] }).success).toBe(false)
    const trop = Array.from({ length: 21 }, (_, i) => `u${i}@x.test`)
    expect(OpportuniteReportingRuleSchema.safeParse({ ...base, recipientEmails: trop }).success).toBe(false)
  })
})
```

- [ ] **Étape 2 : lancer, constater l'échec.**

- [ ] **Étape 3 : implémenter**

```ts
// lib/validations/opportunite-reporting-rule.ts
import { z } from 'zod'
import { MAX_DESTINATAIRES, nettoyerDestinataires } from '@/lib/email/envoi-destinataires'

export const ReportingScheduleConfigSchema = z
  .object({
    type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'MANUAL']),
    hour: z.number().int().min(0).max(23),
    days: z.array(z.number().int().min(1).max(31)).optional(),
  })
  .nullable()

export const OpportuniteReportingRuleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  reportType: z.enum(['SUIVI', 'ECHEANCES_MATIN']).default('SUIVI'),
  recipientEmails: z
    .array(z.string().email('Adresse e-mail invalide'))
    .min(1, 'Sélectionnez au moins un destinataire')
    .max(MAX_DESTINATAIRES, `Au plus ${MAX_DESTINATAIRES} destinataires`)
    .transform(nettoyerDestinataires),
  scheduleConfig: ReportingScheduleConfigSchema.optional().default(null),
  isActive: z.boolean().default(true),
})
```

Dans `lib/actions/opportunite-reporting-rules.ts` : supprimer les deux schémas locaux, importer `OpportuniteReportingRuleSchema` depuis `@/lib/validations/opportunite-reporting-rule` (le champ `reportType` est alors transmis à Prisma par `...data`). Dans `sendOpportuniteReportingRuleNow`, juste après le contrôle des destinataires :

```ts
    if (rule.reportType === "ECHEANCES_MATIN") {
      const resultat = await envoyerEcheancesMatin(recipients, new Date())
      await logAction({
        userId: session.user.id,
        userEmail: session.user.email ?? undefined,
        action: AUDIT_ACTION.CREATE,
        entityType: AUDIT_ENTITY.ALERT_RULE,
        entityId: id,
        metadata: { type: "echeances-matin-manual-send", envoyes: resultat.envoyes, echecs: resultat.echecs.length },
      })
      if (resultat.echecs.length > 0) {
        return { success: false, error: `${resultat.echecs.length} envoi(s) en échec sur ${resultat.envoyes + resultat.echecs.length}` }
      }
      return { success: true, data: { sent: resultat.envoyes } }
    }
```

(le message d'erreur ne contient pas d'adresse).

- [ ] **Étape 4 : relancer** les tests ; `npx tsc --noEmit` (0 erreur).

- [ ] **Étape 5 : commit**

```bash
git add lib/validations/opportunite-reporting-rule.ts lib/actions/opportunite-reporting-rules.ts tests/unit/echeances-regles-schema.spec.ts
git commit -m "feat(echeances): type de règle, destinataires nettoyés et envoi manuel"
```

---

### Tâche 8 : écran d'administration

**Fichiers :** Modifier `app/(dashboard)/admin/reporting/OpportuniteReportingRulesClient.tsx` (types ≈ lignes 59 et 109, `emptyForm`/`ruleToForm`/`formToPayload` ≈ lignes 115-160, encart d'information ≈ ligne 394, liste ≈ ligne 575) et `app/(dashboard)/admin/reporting/page.tsx` si la règle sérialisée y est typée.

**Interfaces :** Consomme `reportType` (tâche 4/7).

- [ ] **Étape 1 : étendre les types et l'état du formulaire**

```tsx
type ReportType = "SUIVI" | "ECHEANCES_MATIN"
// SerializedOpportuniteReportingRule : ajouter  reportType: ReportType
// FormState : ajouter  reportType: ReportType
// emptyForm()  : reportType: "SUIVI"
// ruleToForm() : reportType: rule.reportType
// formToPayload() : reportType: form.reportType
```

- [ ] **Étape 2 : ajouter le choix du type** avant le champ « Destinataires » (composant `Select` shadcn déjà utilisé dans le fichier pour la planification ; sinon `Select` de `@/components/ui/select`) et remplacer l'encart d'information par un rendu conditionnel :

```tsx
<div>
  <Label className="mb-1 block">Type de rapport</Label>
  <Select value={form.reportType} onValueChange={(v) => patch({ reportType: v as ReportType })}>
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="SUIVI">Suivi complet des opportunités</SelectItem>
      <SelectItem value="ECHEANCES_MATIN">Échéances du matin (offres à rendre sous 7 jours)</SelectItem>
    </SelectContent>
  </Select>
</div>

<div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
  <p className="text-xs text-blue-700 font-medium">
    {form.reportType === "ECHEANCES_MATIN"
      ? "ℹ️ Ce rapport liste les offres à rendre (en analyse, GO, dossier en préparation) dont l'échéance est dépassée ou tombe dans les 7 jours. Il est envoyé même s'il n'y a rien à rendre."
      : "ℹ️ Ce rapport inclut toutes les opportunités sans filtre. Chaque email contiendra le tableau synthétique complet avec décomptes des échéances."}
  </p>
</div>
```

- [ ] **Étape 3 : indiquer la limite de destinataires** sous le champ à étiquettes : `<p className="mt-1 text-xs text-muted-foreground">Jusqu'à 20 destinataires ; chacun reçoit son propre message.</p>`, et afficher le type dans la liste des règles (à côté du nombre d'adresses) : « Échéances du matin » ou « Suivi complet ».

- [ ] **Étape 4 : vérifier** `npx tsc --noEmit` et `npx eslint` sur le fichier ; puis vérification navigateur (tâche 10).

- [ ] **Étape 5 : commit**

```bash
git add "app/(dashboard)/admin/reporting"
git commit -m "feat(echeances): choix du type de rapport dans l'écran d'administration"
```

---

### Tâche 9 : filtre de liste « à rendre » (cible du bouton « autres »)

**Fichiers :** Modifier `lib/utils/opportunite-filters.ts` (type `OpportuniteEcheance` ≈ ligne 50, libellés ≈ ligne 52, `buildOpportuniteWhere` ≈ lignes 123-131, analyse de l'URL : chercher la fonction qui valide la valeur de `echeance`) ; test `tests/unit/echeances-filtre.spec.ts`.

**Interfaces :** Produit : valeur `'a-rendre'` du filtre `echeance` = statuts « avant soumission » et `dateLimite` ≤ maintenant + 7 jours (dépassées incluses).

- [ ] **Étape 1 : test qui échoue**

```ts
// tests/unit/echeances-filtre.spec.ts
import { test, expect } from '@playwright/test'
import { buildOpportuniteWhere } from '../../lib/utils/opportunite-filters'

test('le filtre « à rendre » couvre les statuts avant soumission jusqu\'à J+7, dépassées incluses', () => {
  const now = new Date(Date.UTC(2026, 9, 15, 8, 0))
  const where = buildOpportuniteWhere({ echeance: 'a-rendre' } as never, now) as { AND: unknown[] }
  const json = JSON.stringify(where)
  expect(json).toContain('IDENTIFIEE')
  expect(json).toContain('DOSSIER_EN_PREPARATION')
  expect(json).not.toContain('OFFRE_SOUMISE')
  expect(json).toContain(new Date(Date.UTC(2026, 9, 22, 8, 0)).toISOString())
  expect(json).not.toContain('"gte"')
})
```

- [ ] **Étape 2 : lancer, constater l'échec.**

- [ ] **Étape 3 : implémenter** : ajouter `'a-rendre'` au type `OpportuniteEcheance`, le libellé `'a-rendre': 'À rendre (7 jours)'` à `ECHEANCE_LABELS`, la valeur aux valeurs acceptées par l'analyse de l'URL, et la branche :

```ts
  } else if (filters.echeance === 'a-rendre') {
    const dans7Jours = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    and.push({ statut: { in: STATUTS_AVANT_SOUMISSION } })
    and.push({ dateLimite: { lte: dans7Jours } })
  }
```

- [ ] **Étape 4 : relancer** ; `npx tsc --noEmit`. Vérifier que le bouton du mail (`/opportunites?echeance=a-rendre`) donne la liste attendue : tâche 10.

- [ ] **Étape 5 : commit**

```bash
git add lib/utils/opportunite-filters.ts tests/unit/echeances-filtre.spec.ts
git commit -m "feat(opportunites): filtre de liste « à rendre » sous 7 jours"
```

---

### Tâche 10 : vérification complète (base locale, aucun envoi réel)

- [ ] **Étape 1 :** `npm run typecheck` (0 erreur), `npm run lint` (sous le plafond), `npm run test:unit` (tout vert).
- [ ] **Étape 2 :** navigateur sur la base de test locale (Docker, `dev-test`, serveur redémarré à neuf, notes `e2e-playwright-dev-test-machine-4go` et `browser-pane-dev-test-lent`) : créer une règle `ECHEANCES_MATIN` avec 3 destinataires fictifs ; vérifier la liste des règles, le texte conditionnel, la limite de 20, l'enregistrement et le rechargement ; vérifier `/opportunites?echeance=a-rendre` sur des opportunités de test `[E2E…]`. Tailles 1920, 768, 375 ; navigation au clavier.
- [ ] **Étape 3 :** vérifier le rendu du mail sur des données locales de test **sans l'envoyer** : appeler `buildEcheancesMatinEmail` via un petit script hors dépôt et ouvrir le HTML dans le navigateur (cas vide, 6 offres, 25 offres, 375 px).
- [ ] **Étape 4 :** nettoyer les données `[E2E…]`, arrêter `dev-test`.
- [ ] **Étape 5 :** push de la branche, ouverture de la PR (corps : résumé, ce qui est vérifié et non vérifié, rappel « le déploiement de production est une validation distincte »).

---

### Tâche 11 : mise en production (validations distinctes, rien n'est enchaîné)

Appliquer le skill `disciplined-execution` (étapes de production). Chaque case ci-dessous est une validation explicite de l'administrateur.

- [ ] **11.1 Relecture de la PR** par l'administrateur, puis fusion. La fusion sur `main` déclenche un déploiement de production automatique : **appliquer la migration (11.2) avant la fusion**, car le code lit `reportType`.
- [ ] **11.2 Sauvegarde puis migration** : sauvegarde de la base de production (`pg_dump` 17 hors dépôt), contrôle de l'état des migrations, application de la migration additive via un script gardé (modèle : `hs-prod.js` du chantier précédent, avec contrôle de l'empreinte des règles existantes avant/après). Annulation : `ALTER TABLE ... DROP COLUMN "reportType"; DROP TYPE "TypeRapportOpportunite";`.
- [ ] **11.3 Fusion et déploiement**, contrôle des sondes et des journaux ; repli : redéploiement du déploiement précédent.
- [ ] **11.4 Comptage en lecture seule** des offres qui apparaîtraient dans « À régulariser » (statut avant soumission, date limite passée) : annoncer à l'administrateur le volume du premier mail.
- [ ] **11.5 Vérifier la configuration** : `NEXTAUTH_URL` définie en production (nom seulement, jamais la valeur affichée) ; alerte d'échec du service de déclenchement horaire active et dirigée vers la boîte de l'administrateur.
- [ ] **11.6 Mail de test réel** : créer la règle depuis l'écran avec **un seul destinataire** (l'administrateur), type « Échéances du matin », heure 8, puis « Envoyer maintenant ». L'administrateur contrôle le mail dans sa messagerie (ordinateur et téléphone) et valide.
- [ ] **11.7 Activation** : ajouter les autres destinataires, activer la règle ; vérifier le premier envoi de 8 h dans les journaux et la réception.
- [ ] **11.8 Coupure de la feuille Google** (script Apps Script désactivé) le jour de la mise en service, sur décision explicite de l'administrateur.
- [ ] **11.9 Bilan à un mois** : critère « savoir en moins d'une minute chaque matin quelles offres sont à rendre dans les 7 jours ».

---

## Auto-contrôle

- **Couverture de la conception** : décision 1 (tâche 4), 2 (mail vide : tâches 3 et 6 ; envoi de test : 11.6 ; alerte : 11.5), 3 (tâche 3), 4 (tâche 2), 5 (tâche 2), 6 (tâche 3), 7 (tâches 5 et 7) ; règles de classement (tâche 1) ; filtre cible du bouton (tâche 9) ; vigilance « première exécution » (11.4).
- **Cohérence des noms** : `STATUTS_A_RENDRE`, `grouperEcheances`, `GroupesEcheances`, `buildEcheancesMatinEmail`, `envoyerAChaqueDestinataire`, `ResultatEnvoi`, `envoyerEcheancesMatin`, `chargerOffresARendre` sont utilisés à l'identique dans toutes les tâches.
- **Points à confirmer à l'exécution** (non vérifiés au moment de l'écriture) : forme exacte de la sortie de `formatMontant` (les tests la comparent à elle-même) ; rendu `Intl` « 20 oct. 2026 » ; emplacement exact de l'analyse du paramètre `echeance` dans `opportunite-filters.ts` ; composant `Select` déjà importé dans l'écran d'administration.
