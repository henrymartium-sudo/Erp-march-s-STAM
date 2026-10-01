# Véhicules proposés par lot — plan d'implémentation

> **Pour les agents d'exécution :** utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans`, tâche par tâche. Les étapes utilisent des cases `- [ ]`.

**Objectif :** saisir, pour chaque lot d'une opportunité, un ou plusieurs véhicules proposés (marque, modèle, quantité, prix unitaire), avec suggestions issues des saisies précédentes, et en déduire le montant proposé du lot.

**Architecture :** nouvelle table `vehicules_proposes` liée à `lots`. Une Server Action unique remplace la liste des véhicules d'un lot dans une transaction et recalcule `Lot.montantPropose` dans cette même transaction (les consommateurs existants de `montantPropose` ne changent pas). Une boîte de dialogue par lot édite la liste.

**Stack :** Next.js 15 (Server Actions), Prisma 7, Zod 4, react-hook-form + shadcn/ui, tests Playwright (unitaires dans `tests/unit`, E2E dans `tests/v1`).

**Spec :** [`2026-10-01-vehicules-proposes-par-lot-design.md`](./2026-10-01-vehicules-proposes-par-lot-design.md)

## Contraintes globales

- Interface et messages en français, sans mode sombre, composants shadcn/ui existants, **aucune nouvelle dépendance** (suggestions par `<datalist>` natif).
- Validation Zod côté serveur ; rôle vérifié dans chaque Server Action avec `canWrite` (ADMIN et AVANCE, comme les lots).
- Migration **additive uniquement** (aucune colonne existante modifiée).
- **Base de test locale uniquement** (`127.0.0.1:5433`, `.env.test`). Ne jamais lancer Prisma, un seed ou un test E2E avec le `.env` (production). Rien en production sans l'accord explicite d'Abel (tâche 8).
- Dépôt public : aucun secret, aucun chemin local ni donnée client dans le code, les tests ou les messages de commit.
- Chaque commit se termine par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Tests d'interface : desktop 1920×1080, tablette 768×1024, mobile 375×667.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| `lib/utils/lots.ts` (modifier) | Règles pures : statuts éditables, gel, calcul du montant. |
| `lib/utils/vehicules-proposes.ts` (créer) | Construction des suggestions (dédoublonnage insensible à la casse et aux accents). |
| `lib/validations/vehicule-propose.ts` (créer) | Schémas Zod d'une ligne et de la liste d'un lot. |
| `prisma/schema.prisma` + `prisma/migrations/<horodatage>_add_vehicules_proposes/migration.sql` | Table et relation. |
| `lib/actions/vehicules-proposes.ts` (créer) | `setVehiculesProposes`, `listerSuggestionsVehicules`. |
| `lib/actions/lots.ts` (modifier) | `updateLot` ignore `montantPropose` quand le lot a des véhicules. |
| `lib/utils/serialize.ts`, `lib/actions/opportunites.ts` (modifier) | Chargement et sérialisation des véhicules. |
| `components/opportunites/vehicules-propose-dialog.tsx` (créer) | Édition de la liste d'un lot. |
| `components/opportunites/lots-section.tsx`, `lot-form-dialog.tsx`, `app/(dashboard)/opportunites/[id]/page.tsx` (modifier) | Affichage, bouton, montant en lecture seule. |
| `tests/unit/lots.spec.ts`, `tests/unit/vehicules-proposes.spec.ts`, `tests/v1/vehicules-proposes.spec.ts` | Tests. |

---

### Task 1 : règles pures dans `lib/utils/lots.ts`

**Fichiers :** modifier `lib/utils/lots.ts` ; tester dans `tests/unit/lots.spec.ts`.

**Interfaces — produit :**
- `STATUTS_EDITION_VEHICULES: StatutOpportunite[]`
- `vehiculesModifiables(opp: { statut: StatutOpportunite; createdAt: Date; marche: { createdAt: Date } | null }): boolean`
- `totalLigneVehicule(v: { quantite: number; prixUnitaire: number }): number`
- `calculerMontantVehicules(vehicules: { quantite: number; prixUnitaire: number }[]): number | null`

- [ ] **Étape 1 : écrire les tests qui échouent.** Dans `tests/unit/lots.spec.ts`, ajouter `calculerMontantVehicules`, `totalLigneVehicule`, `vehiculesModifiables`, `STATUTS_EDITION_VEHICULES` à l'import de `../../lib/utils/lots`, puis en fin de fichier :

```ts
test.describe('calculerMontantVehicules', () => {
  test('aucun véhicule → null', () => {
    expect(calculerMontantVehicules([])).toBeNull()
  })
  test('somme des quantités × prix unitaires', () => {
    expect(calculerMontantVehicules([
      { quantite: 2, prixUnitaire: 30000000 },
      { quantite: 1, prixUnitaire: 12500000.5 },
    ])).toBe(72500000.5)
  })
  test('pas de dérive de virgule flottante', () => {
    expect(calculerMontantVehicules([{ quantite: 3, prixUnitaire: 0.1 }])).toBe(0.3)
  })
  test('total d\'une ligne', () => {
    expect(totalLigneVehicule({ quantite: 4, prixUnitaire: 250 })).toBe(1000)
  })
})

test.describe('vehiculesModifiables', () => {
  const avant = new Date('2026-01-01')
  const apres = new Date('2026-02-01')
  const base = { createdAt: avant, marche: null }

  test('éditable de « Dossier en préparation » à « Gagnée »', () => {
    for (const statut of ['DOSSIER_EN_PREPARATION', 'OFFRE_SOUMISE', 'SOUMISE', 'EN_ATTENTE_ATTRIBUTION', 'ATTRIBUE_PROVISOIREMENT', 'GAGNEE'] as const) {
      expect(vehiculesModifiables({ ...base, statut }), statut).toBe(true)
    }
  })
  test('non éditable avant la préparation, perdue, no-go', () => {
    for (const statut of ['IDENTIFIEE', 'EN_ANALYSE', 'GO', 'NO_GO', 'PERDUE'] as const) {
      expect(vehiculesModifiables({ ...base, statut }), statut).toBe(false)
    }
  })
  test('figé quand le marché a été créé depuis les lots', () => {
    expect(vehiculesModifiables({ statut: 'GAGNEE', createdAt: avant, marche: { createdAt: apres } })).toBe(false)
  })
  test('marché antérieur à l\'opportunité (converti) : ne fige pas', () => {
    expect(vehiculesModifiables({ statut: 'GAGNEE', createdAt: apres, marche: { createdAt: avant } })).toBe(true)
  })
  test('STATUTS_EDITION_VEHICULES contient 6 statuts', () => {
    expect(STATUTS_EDITION_VEHICULES).toHaveLength(6)
  })
})
```

- [ ] **Étape 2 : constater l'échec.** `npx playwright test tests/unit/lots.spec.ts` → échec (exports absents).

- [ ] **Étape 3 : implémenter.** Dans `lib/utils/lots.ts`, après `resultatsLotsFiges` :

```ts
/** Statuts de l'opportunité dans lesquels les véhicules proposés d'un lot se saisissent (design §5). */
export const STATUTS_EDITION_VEHICULES: StatutOpportunite[] = [
  'DOSSIER_EN_PREPARATION',
  'OFFRE_SOUMISE',
  'SOUMISE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
  'GAGNEE',
]

/** Les véhicules se modifient de la préparation à l'attribution, jusqu'à la création du marché depuis les lots. */
export function vehiculesModifiables(opportunite: {
  statut: StatutOpportunite
  createdAt: Date
  marche: { createdAt: Date } | null
}): boolean {
  return STATUTS_EDITION_VEHICULES.includes(opportunite.statut) && !resultatsLotsFiges(opportunite)
}

/** Total d'une ligne en centimes entiers, pour éviter la dérive des flottants. */
export function totalLigneVehicule(v: { quantite: number; prixUnitaire: number }): number {
  return (Math.round(v.prixUnitaire * 100) * v.quantite) / 100
}

/** Montant proposé d'un lot déduit de ses véhicules ; null s'il n'y en a aucun. */
export function calculerMontantVehicules(vehicules: { quantite: number; prixUnitaire: number }[]): number | null {
  if (vehicules.length === 0) return null
  const centimes = vehicules.reduce((somme, v) => somme + Math.round(v.prixUnitaire * 100) * v.quantite, 0)
  return centimes / 100
}
```

- [ ] **Étape 4 : constater le succès.** `npx playwright test tests/unit/lots.spec.ts` → tout passe.

- [ ] **Étape 5 : commit.**

```bash
git add lib/utils/lots.ts tests/unit/lots.spec.ts
git commit -m "feat(lots): règles pures des véhicules proposés (statuts, gel, montant)"
```

---

### Task 2 : validation Zod et suggestions

**Fichiers :** créer `lib/validations/vehicule-propose.ts`, `lib/utils/vehicules-proposes.ts`, `tests/unit/vehicules-proposes.spec.ts`.

**Interfaces — produit :**
- `vehiculeProposeSchema` (une ligne), `vehiculesLotSchema` (`{ lotId, vehicules[] }`), `MONTANT_MAX_LOT = 9_999_999_999_999`
- `type SuggestionVehicule = { marque: string; modele: string; prixUnitaire: number }`
- `construireSuggestions(lignes: SuggestionVehicule[]): SuggestionVehicule[]` — `lignes` arrive de la plus récente à la plus ancienne ; garde la première occurrence de chaque couple marque/modèle normalisé.

- [ ] **Étape 1 : tests qui échouent** dans `tests/unit/vehicules-proposes.spec.ts` :

```ts
import { test, expect } from '@playwright/test'
import { vehiculeProposeSchema, vehiculesLotSchema } from '../../lib/validations/vehicule-propose'
import { construireSuggestions } from '../../lib/utils/vehicules-proposes'

const ligne = { marque: 'Toyota', modele: 'Hilux', quantite: 2, prixUnitaire: 25000000 }

test.describe('vehiculeProposeSchema', () => {
  test('ligne valide, valeurs de formulaire en chaînes acceptées', () => {
    const r = vehiculeProposeSchema.safeParse({ ...ligne, quantite: '2', prixUnitaire: '25000000' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.quantite).toBe(2)
  })
  test('marque et modèle obligatoires', () => {
    expect(vehiculeProposeSchema.safeParse({ ...ligne, marque: '  ' }).success).toBe(false)
    expect(vehiculeProposeSchema.safeParse({ ...ligne, modele: '' }).success).toBe(false)
  })
  test('quantité entière ≥ 1', () => {
    expect(vehiculeProposeSchema.safeParse({ ...ligne, quantite: 0 }).success).toBe(false)
    expect(vehiculeProposeSchema.safeParse({ ...ligne, quantite: 1.5 }).success).toBe(false)
    expect(vehiculeProposeSchema.safeParse({ ...ligne, quantite: '' }).success).toBe(false)
  })
  test('prix obligatoire et positif ou nul', () => {
    expect(vehiculeProposeSchema.safeParse({ ...ligne, prixUnitaire: '' }).success).toBe(false)
    expect(vehiculeProposeSchema.safeParse({ ...ligne, prixUnitaire: -1 }).success).toBe(false)
    expect(vehiculeProposeSchema.safeParse({ ...ligne, prixUnitaire: 0 }).success).toBe(true)
  })
})

test.describe('vehiculesLotSchema', () => {
  test('liste vide acceptée (retour à la saisie manuelle)', () => {
    expect(vehiculesLotSchema.safeParse({ lotId: 'l1', vehicules: [] }).success).toBe(true)
  })
  test('20 lignes au plus', () => {
    expect(vehiculesLotSchema.safeParse({ lotId: 'l1', vehicules: Array(21).fill(ligne) }).success).toBe(false)
  })
  test('total du lot limité à la capacité de la colonne', () => {
    const enorme = { ...ligne, quantite: 999, prixUnitaire: 999999999 }
    expect(vehiculesLotSchema.safeParse({ lotId: 'l1', vehicules: Array(20).fill(enorme) }).success).toBe(false)
  })
})

test.describe('construireSuggestions', () => {
  test('garde la plus récente par couple, insensible à la casse et aux accents', () => {
    const r = construireSuggestions([
      { marque: 'Toyota', modele: 'Hilux', prixUnitaire: 26000000 },
      { marque: 'TOYOTA', modele: 'hilux', prixUnitaire: 25000000 },
      { marque: 'Renault', modele: 'Duster', prixUnitaire: 15000000 },
    ])
    expect(r).toEqual([
      { marque: 'Toyota', modele: 'Hilux', prixUnitaire: 26000000 },
      { marque: 'Renault', modele: 'Duster', prixUnitaire: 15000000 },
    ])
  })
  test('accents : « Citroën » et « Citroen » sont le même couple', () => {
    expect(construireSuggestions([
      { marque: 'Citroën', modele: 'Jumpy', prixUnitaire: 1 },
      { marque: 'Citroen', modele: 'Jumpy', prixUnitaire: 2 },
    ])).toHaveLength(1)
  })
  test('liste vide', () => {
    expect(construireSuggestions([])).toEqual([])
  })
})
```

- [ ] **Étape 2 : constater l'échec.** `npx playwright test tests/unit/vehicules-proposes.spec.ts` → échec (modules absents).

- [ ] **Étape 3 : implémenter.**

`lib/validations/vehicule-propose.ts` :

```ts
import { z } from 'zod'

/** Capacité de `Lot.montantPropose` : Decimal(15, 2) → 13 chiffres avant la virgule. */
export const MONTANT_MAX_LOT = 9_999_999_999_999

const texte = (message: string) => z.string().trim().min(1, message).max(100)

// Une chaîne vide venue du formulaire doit échouer, pas valoir 0 : on la convertit en `undefined` avant la coercition.
const nombreObligatoire = (message: string) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number({ message }))

export const vehiculeProposeSchema = z.object({
  marque: texte('La marque est obligatoire'),
  modele: texte('Le modèle est obligatoire'),
  quantite: nombreObligatoire('La quantité est obligatoire')
    .pipe(z.number().int('La quantité doit être un entier').min(1, 'La quantité minimale est 1').max(999)),
  prixUnitaire: nombreObligatoire('Le prix unitaire est obligatoire')
    .pipe(z.number().nonnegative('Le prix unitaire doit être positif').max(999_999_999)),
})

export const vehiculesLotSchema = z
  .object({
    lotId: z.string().min(1),
    vehicules: z.array(vehiculeProposeSchema).max(20, '20 véhicules au plus par lot'),
  })
  .refine(
    (d) => d.vehicules.reduce((s, v) => s + Math.round(v.prixUnitaire * 100) * v.quantite, 0) / 100 <= MONTANT_MAX_LOT,
    { message: 'Le total du lot dépasse le montant maximal autorisé', path: ['vehicules'] }
  )

export type VehiculePropose = z.output<typeof vehiculeProposeSchema>
```

`lib/utils/vehicules-proposes.ts` :

```ts
import { normalizeText } from '@/lib/utils/search'

export interface SuggestionVehicule {
  marque: string
  modele: string
  prixUnitaire: number
}

/** Une suggestion par couple marque/modèle ; `lignes` va de la plus récente à la plus ancienne, la plus récente gagne. */
export function construireSuggestions(lignes: SuggestionVehicule[]): SuggestionVehicule[] {
  const vues = new Set<string>()
  const resultat: SuggestionVehicule[] = []
  for (const l of lignes) {
    const cle = `${normalizeText(l.marque)}|${normalizeText(l.modele)}`
    if (vues.has(cle)) continue
    vues.add(cle)
    resultat.push(l)
  }
  return resultat
}
```

Si les tests unitaires ne résolvent pas l'alias `@/` (les tests existants importent en relatif), remplacer l'import par `./search`.

- [ ] **Étape 4 : constater le succès.** `npx playwright test tests/unit/vehicules-proposes.spec.ts` → tout passe.

- [ ] **Étape 5 : commit.**

```bash
git add lib/validations/vehicule-propose.ts lib/utils/vehicules-proposes.ts tests/unit/vehicules-proposes.spec.ts
git commit -m "feat(lots): validation et suggestions des véhicules proposés"
```

---

### Task 3 : schéma Prisma et migration (base locale)

**Fichiers :** modifier `prisma/schema.prisma` ; créer `prisma/migrations/20261001170000_add_vehicules_proposes/migration.sql`.

- [ ] **Étape 1 : cibler la base locale.** Dans PowerShell, depuis la racine du projet :

```powershell
$env:DATABASE_URL = ((Get-Content .env.test | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', '').Trim('"')
if ($env:DATABASE_URL -notmatch '127\.0\.0\.1:5433') { throw 'STOP : pas la base locale' }
npx prisma migrate status
```

Attendu : « Database schema is up to date ». Sinon s'arrêter et remonter.

- [ ] **Étape 2 : ajouter le modèle** à la suite de `Lot` dans `prisma/schema.prisma`, et la relation inverse `vehiculesProposes VehiculePropose[]` dans `Lot` (après la ligne `dossier`) :

```prisma
model VehiculePropose {
  id           String   @id @default(cuid())
  lotId        String
  lot          Lot      @relation(fields: [lotId], references: [id], onDelete: Cascade)
  marque       String
  modele       String
  quantite     Int      @default(1)
  prixUnitaire Decimal  @db.Decimal(15, 2)
  ordre        Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([lotId])
  @@index([marque, modele])
  @@map("vehicules_proposes")
}
```

- [ ] **Étape 3 : écrire la migration** `prisma/migrations/20261001170000_add_vehicules_proposes/migration.sql` :

```sql
-- CreateTable
CREATE TABLE "vehicules_proposes" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaire" DECIMAL(15,2) NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicules_proposes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicules_proposes_lotId_idx" ON "vehicules_proposes"("lotId");

-- CreateIndex
CREATE INDEX "vehicules_proposes_marque_modele_idx" ON "vehicules_proposes"("marque", "modele");

-- AddForeignKey
ALTER TABLE "vehicules_proposes" ADD CONSTRAINT "vehicules_proposes_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Étape 4 : appliquer et vérifier l'absence de dérive** (toujours avec `DATABASE_URL` locale de l'étape 1) :

```powershell
npx prisma migrate deploy
npx prisma generate
npx prisma migrate dev --create-only --name verif_derive
```

Attendu pour la dernière commande : « Already in sync, no schema change or pending migration was found. » (aucun dossier créé). Si Prisma crée un dossier de migration, la migration écrite à la main diffère du schéma : supprimer ce dossier, corriger le SQL ou le schéma, recommencer.

- [ ] **Étape 5 : écrire et tester le retour arrière.** Créer le script hors dépôt (dossier `sauvegardes-erp-stam` ou scratchpad), contenu : `DROP TABLE "vehicules_proposes"; DELETE FROM "_prisma_migrations" WHERE migration_name = '20261001170000_add_vehicules_proposes';`. L'exécuter sur la base locale, vérifier que la table a disparu, puis relancer `npx prisma migrate deploy` pour la recréer.

- [ ] **Étape 6 : commit** (le script de retour arrière n'est pas versionné).

```bash
git add prisma/schema.prisma prisma/migrations/20261001170000_add_vehicules_proposes
git commit -m "feat(lots): table des véhicules proposés par lot (migration additive)"
```

---

### Task 4 : Server Actions et garde dans `updateLot`

**Fichiers :** créer `lib/actions/vehicules-proposes.ts` ; modifier `lib/actions/lots.ts` (`updateLot`).

**Interfaces — consomme :** tâches 1, 2, 3. **Produit :**
- `setVehiculesProposes(data: unknown): Promise<ActionResult<{ montantPropose: number | null }>>` — `data = { lotId, vehicules: { marque, modele, quantite, prixUnitaire }[] }`
- `listerSuggestionsVehicules(): Promise<ActionResult<SuggestionVehicule[]>>`

- [ ] **Étape 1 : créer `lib/actions/vehicules-proposes.ts`.**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { vehiculesLotSchema } from '@/lib/validations/vehicule-propose'
import { calculerMontantVehicules, vehiculesModifiables } from '@/lib/utils/lots'
import { construireSuggestions, type SuggestionVehicule } from '@/lib/utils/vehicules-proposes'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import type { ActionResult } from '@/types'

async function sessionEcriture() {
  const session = await requireAuth()
  const user = session.user as { id?: string; email?: string; role?: string } | undefined
  if (!canWrite(user?.role)) return null
  return user
}

const versNombre = (v: unknown): number | null => (v == null ? null : Number(v))

/**
 * Remplace la liste des véhicules proposés d'un lot et recalcule son montant proposé dans la même transaction.
 * Liste vide : le montant proposé est conservé (retour à la saisie manuelle).
 */
export async function setVehiculesProposes(data: unknown): Promise<ActionResult<{ montantPropose: number | null }>> {
  try {
    const user = await sessionEcriture()
    if (!user) return { success: false, error: 'Permissions insuffisantes' }
    const parsed = vehiculesLotSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    const { lotId, vehicules } = parsed.data

    const res = await prisma.$transaction(async (tx) => {
      const lot = await tx.lot.findUnique({ where: { id: lotId }, select: { opportuniteId: true, montantPropose: true } })
      if (!lot) throw new Error('LOT_INTROUVABLE')

      // Verrou de la ligne opportunité : sérialise avec les autres écritures sur ses lots (comme setResultatLot).
      await tx.$queryRaw`SELECT id FROM opportunites WHERE id = ${lot.opportuniteId} FOR UPDATE`
      const opportunite = await tx.opportunite.findUnique({
        where: { id: lot.opportuniteId },
        select: { statut: true, createdAt: true, marche: { select: { createdAt: true } } },
      })
      if (!opportunite) throw new Error('LOT_INTROUVABLE')
      if (!vehiculesModifiables(opportunite)) throw new Error('NON_MODIFIABLE')

      const ancien = versNombre(lot.montantPropose)
      const montantCalcule = calculerMontantVehicules(vehicules)
      await tx.vehiculePropose.deleteMany({ where: { lotId } })
      if (vehicules.length > 0) {
        await tx.vehiculePropose.createMany({ data: vehicules.map((v, ordre) => ({ lotId, ...v, ordre })) })
      }
      if (montantCalcule !== null) {
        await tx.lot.update({ where: { id: lotId }, data: { montantPropose: montantCalcule } })
      }
      return {
        opportuniteId: lot.opportuniteId,
        ancien,
        nouveau: montantCalcule ?? ancien,
        apresDepot: opportunite.statut !== 'DOSSIER_EN_PREPARATION',
      }
    }, { maxWait: 10000, timeout: 20000 })

    await logAction({
      userId: user.id, userEmail: user.email, action: AUDIT_ACTION.UPDATE, entityType: AUDIT_ENTITY.LOT, entityId: lotId,
      metadata: { source: 'vehicules_proposes', nbVehicules: vehicules.length, ancienMontantPropose: res.ancien, nouveauMontantPropose: res.nouveau, apresDepot: res.apresDepot },
    })
    revalidatePath(`/opportunites/${res.opportuniteId}`)
    revalidatePath('/opportunites')
    return { success: true, data: { montantPropose: res.nouveau } }
  } catch (error) {
    const msg = (error as Error).message
    if (msg === 'LOT_INTROUVABLE') return { success: false, error: 'Lot introuvable.' }
    if (msg === 'NON_MODIFIABLE') {
      return { success: false, error: "Les véhicules proposés ne sont plus modifiables : l'opportunité n'est pas en préparation ou au-delà, est clôturée, ou son marché est déjà créé." }
    }
    console.error('setVehiculesProposes error:', error)
    return { success: false, error: 'Erreur lors de l’enregistrement des véhicules proposés.' }
  }
}

/** Couples marque/modèle déjà saisis, avec le dernier prix unitaire utilisé (les plus récents d'abord). */
export async function listerSuggestionsVehicules(): Promise<ActionResult<SuggestionVehicule[]>> {
  try {
    const user = await sessionEcriture()
    if (!user) return { success: false, error: 'Permissions insuffisantes' }
    const lignes = await prisma.vehiculePropose.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { marque: true, modele: true, prixUnitaire: true },
    })
    return {
      success: true,
      data: construireSuggestions(lignes.map((l) => ({ marque: l.marque, modele: l.modele, prixUnitaire: Number(l.prixUnitaire) }))),
    }
  } catch (error) {
    console.error('listerSuggestionsVehicules error:', error)
    return { success: false, error: 'Impossible de charger les suggestions.' }
  }
}
```

- [ ] **Étape 2 : garde dans `updateLot`** (`lib/actions/lots.ts`). Remplacer la ligne `await prisma.lot.update({ where: { id }, data: parsed.data })` par :

```ts
    // Montant proposé calculé depuis les véhicules : la saisie manuelle est ignorée dès qu'il y en a (design §4).
    const nbVehicules = await prisma.vehiculePropose.count({ where: { lotId: id } })
    const { montantPropose: _ignore, ...sansMontantPropose } = parsed.data
    await prisma.lot.update({ where: { id }, data: nbVehicules > 0 ? sansMontantPropose : parsed.data })
```

- [ ] **Étape 3 : vérifier la compilation.** `npx tsc --noEmit` : aucune nouvelle erreur dans les fichiers touchés (des erreurs préexistantes ailleurs sont connues ; comparer avec `git stash` si doute).

- [ ] **Étape 4 : commit.**

```bash
git add lib/actions/vehicules-proposes.ts lib/actions/lots.ts
git commit -m "feat(lots): actions de saisie des véhicules proposés et montant du lot calculé"
```

---

### Task 5 : chargement et sérialisation

**Fichiers :** modifier `lib/utils/serialize.ts`, `lib/actions/opportunites.ts`.

**Interfaces — produit :** `SerializedLot.vehiculesProposes: SerializedVehiculePropose[]` avec `SerializedVehiculePropose = { id, lotId, marque, modele, quantite, prixUnitaire: number, ordre, createdAt: string, updatedAt: string }` ; `OpportuniteDetail.marche` contient `createdAt`.

- [ ] **Étape 1 : `lib/utils/serialize.ts`.** Importer `VehiculePropose` depuis `@prisma/client` (ligne 10), puis ajouter avant `SerializedLot` :

```ts
export type SerializedVehiculePropose = Omit<VehiculePropose, 'prixUnitaire' | 'createdAt' | 'updatedAt'> & {
  prixUnitaire: number
  createdAt: string
  updatedAt: string
}
```

Ajouter `vehiculesProposes: SerializedVehiculePropose[]` dans le type `SerializedLot`, et dans `serializeLot`, après la propriété `dossier` :

```ts
    vehiculesProposes: (lot.vehiculesProposes ?? []).map((v: any) => ({
      ...v,
      prixUnitaire: Number(v.prixUnitaire),
      createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : String(v.createdAt),
      updatedAt: v.updatedAt instanceof Date ? v.updatedAt.toISOString() : String(v.updatedAt),
    })),
```

- [ ] **Étape 2 : `getOpportunite`** (`lib/actions/opportunites.ts`) : ajouter `createdAt: true` au `select` de `marche`, et dans `lots.include` : `vehiculesProposes: { orderBy: { ordre: 'asc' } },`.

- [ ] **Étape 3 : compilation.** `npx tsc --noEmit` ; corriger tout endroit qui construit un `SerializedLot` à la main (le compilateur les signale).

- [ ] **Étape 4 : commit.**

```bash
git add lib/utils/serialize.ts lib/actions/opportunites.ts
git commit -m "feat(lots): chargement et sérialisation des véhicules proposés"
```

---

### Task 6 : interface

**Fichiers :** créer `components/opportunites/vehicules-propose-dialog.tsx` ; modifier `components/opportunites/lots-section.tsx`, `components/opportunites/lot-form-dialog.tsx`, `app/(dashboard)/opportunites/[id]/page.tsx`.

**Interfaces — consomme :** `setVehiculesProposes`, `listerSuggestionsVehicules`, `vehiculeProposeSchema`, `calculerMontantVehicules`, `totalLigneVehicule`, `SerializedVehiculePropose`. **Produit :** `<VehiculesProposeDialog lotId numeroLot vehicules />`.

- [ ] **Étape 1 : créer le dialogue.**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Car, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/utils/toast'
import { setVehiculesProposes, listerSuggestionsVehicules } from '@/lib/actions/vehicules-proposes'
import { vehiculeProposeSchema } from '@/lib/validations/vehicule-propose'
import { calculerMontantVehicules, totalLigneVehicule } from '@/lib/utils/lots'
import { normalizeText } from '@/lib/utils/search'
import type { SuggestionVehicule } from '@/lib/utils/vehicules-proposes'
import type { SerializedVehiculePropose } from '@/lib/utils/serialize'

const formSchema = z.object({ vehicules: z.array(vehiculeProposeSchema).max(20, '20 véhicules au plus par lot') })
type FormInput = z.input<typeof formSchema>
type FormOutput = z.output<typeof formSchema>

const LIGNE_VIDE = { marque: '', modele: '', quantite: 1, prixUnitaire: '' } as const

function formatMontant(val: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(val)
}

interface VehiculesProposeDialogProps {
  lotId: string
  numeroLot: number
  vehicules: SerializedVehiculePropose[]
}

export function VehiculesProposeDialog({ lotId, numeroLot, vehicules }: VehiculesProposeDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionVehicule[]>([])

  function valeursInitiales(): FormInput {
    return {
      vehicules: vehicules.length > 0
        ? vehicules.map((v) => ({ marque: v.marque, modele: v.modele, quantite: v.quantite, prixUnitaire: v.prixUnitaire }))
        : [{ ...LIGNE_VIDE }],
    }
  }

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: valeursInitiales(),
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'vehicules' })
  const lignes = form.watch('vehicules')

  const montantTotal = calculerMontantVehicules(
    (lignes ?? [])
      .map((l) => ({ quantite: Number(l.quantite), prixUnitaire: Number(l.prixUnitaire) }))
      .filter((l) => Number.isFinite(l.quantite) && Number.isFinite(l.prixUnitaire) && String(l.prixUnitaire) !== '')
  )

  async function handleOpenChange(v: boolean) {
    if (v) {
      form.reset(valeursInitiales())
      const res = await listerSuggestionsVehicules()
      if (res.success && res.data) setSuggestions(res.data)
    }
    setOpen(v)
  }

  const marques = Array.from(new Map(suggestions.map((s) => [normalizeText(s.marque), s.marque])).values())

  function modelesDe(marque: string) {
    const cle = normalizeText(marque ?? '')
    return suggestions.filter((s) => normalizeText(s.marque) === cle)
  }

  // Un modèle déjà connu pré-remplit le dernier prix utilisé, sans écraser un prix déjà saisi.
  function surChangementModele(index: number, modele: string) {
    const connu = modelesDe(form.getValues(`vehicules.${index}.marque`)).find((s) => normalizeText(s.modele) === normalizeText(modele))
    const prix = form.getValues(`vehicules.${index}.prixUnitaire`)
    if (connu && (prix === '' || prix == null)) form.setValue(`vehicules.${index}.prixUnitaire`, connu.prixUnitaire)
  }

  async function onSubmit(values: FormOutput) {
    setLoading(true)
    try {
      const result = await setVehiculesProposes({ lotId, vehicules: values.vehicules })
      if (result.success) {
        toast.success('Véhicules proposés enregistrés')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Erreur lors de l’enregistrement des véhicules proposés')
      }
    } finally {
      setLoading(false)
    }
  }

  // Enregistrer une liste vide supprime les véhicules : la ligne vide initiale est donc ignorée à l'envoi.
  async function enregistrer() {
    const saisies = form.getValues('vehicules')
    const toutesVides = saisies.every((l) => !l.marque && !l.modele && (l.prixUnitaire === '' || l.prixUnitaire == null))
    if (toutesVides) {
      await onSubmit({ vehicules: [] })
      return
    }
    await form.handleSubmit(onSubmit)()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Véhicules proposés du lot ${numeroLot}`}>
          <Car className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Véhicules proposés — Lot {numeroLot}</DialogTitle>
          <DialogDescription>
            Le montant proposé du lot est la somme des totaux de lignes. Les marques et modèles déjà saisis sont suggérés.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => { e.preventDefault(); void enregistrer() }} className="space-y-4">
            <div className="space-y-3">
              {fields.map((field, index) => {
                const l = lignes?.[index]
                const total = l && Number.isFinite(Number(l.quantite)) && l.prixUnitaire !== '' && Number.isFinite(Number(l.prixUnitaire))
                  ? totalLigneVehicule({ quantite: Number(l.quantite), prixUnitaire: Number(l.prixUnitaire) })
                  : null
                return (
                  <div key={field.id} className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-12 sm:items-start">
                    <FormField control={form.control} name={`vehicules.${index}.marque`} render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Marque *</FormLabel>
                        <FormControl><Input list="vehicules-marques" autoComplete="off" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`vehicules.${index}.modele`} render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Modèle *</FormLabel>
                        <FormControl>
                          <Input
                            list={`vehicules-modeles-${index}`}
                            autoComplete="off"
                            {...field}
                            onChange={(e) => { field.onChange(e); surChangementModele(index, e.target.value) }}
                          />
                        </FormControl>
                        <datalist id={`vehicules-modeles-${index}`}>
                          {modelesDe(l?.marque ?? '').map((s) => <option key={s.modele} value={s.modele} />)}
                        </datalist>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`vehicules.${index}.quantite`} render={({ field }) => (
                      <FormItem className="sm:col-span-1">
                        <FormLabel>Qté *</FormLabel>
                        <FormControl><Input type="number" min={1} {...field} value={(field.value ?? '') as string | number} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`vehicules.${index}.prixUnitaire`} render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Prix unitaire (XOF) *</FormLabel>
                        <FormControl><Input type="number" min={0} {...field} value={(field.value ?? '') as string | number} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex items-end justify-between gap-2 sm:col-span-2 sm:flex-col sm:items-end">
                      <p className="text-sm tabular-nums text-muted-foreground" aria-label={`Total de la ligne ${index + 1}`}>
                        {total !== null ? formatMontant(total) : '—'}
                      </p>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label={`Retirer la ligne ${index + 1}`}>
                        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              <datalist id="vehicules-marques">
                {marques.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={() => append({ ...LIGNE_VIDE })} disabled={fields.length >= 20}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Ajouter un véhicule
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <p className="text-sm font-medium">
                Montant proposé du lot : <span className="tabular-nums">{montantTotal !== null ? formatMontant(montantTotal) : '—'}</span>
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Étape 2 : `lots-section.tsx`.** Ajouter la prop `vehiculesModifiables: boolean`, importer `VehiculesProposeDialog`, puis :
  - `const peutEditerVehicules = canWrite && vehiculesModifiables` ; `const avecActions = peutEditerLots || peutSaisirResultat || peutEditerVehicules`.
  - Sous `<p className="text-sm text-muted-foreground">{lot.intitule}</p>`, ajouter la liste lisible par tous :

```tsx
{lot.vehiculesProposes.length > 0 && (
  <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground" aria-label={`Véhicules proposés du lot ${lot.numero}`}>
    {lot.vehiculesProposes.map((v) => (
      <li key={v.id}>{v.quantite} × {v.marque} {v.modele} — {formatMontant(v.prixUnitaire)}</li>
    ))}
  </ul>
)}
```

  - Dans la cellule d'actions, envelopper les boutons dans `<div className="flex flex-wrap gap-1">` et ajouter, avant `LotFormDialog` :

```tsx
{peutEditerVehicules && (
  <VehiculesProposeDialog lotId={lot.id} numeroLot={lot.numero} vehicules={lot.vehiculesProposes} />
)}
```

  - Passer `montantCalcule={lot.vehiculesProposes.length > 0}` à `LotFormDialog` (édition).

- [ ] **Étape 3 : `lot-form-dialog.tsx`.** Ajouter la prop `montantCalcule?: boolean` ; sur le champ « Montant proposé (XOF) », mettre `disabled={montantCalcule}` sur l'`Input` et, sous le `FormControl`, `{montantCalcule && <p className="text-xs text-muted-foreground">Calculé à partir des véhicules proposés.</p>}`.

- [ ] **Étape 4 : `page.tsx`.** Importer `vehiculesModifiables` depuis `@/lib/utils/lots` et passer à `LotsSection` : `vehiculesModifiables={vehiculesModifiables(opp)}` (le type de `opp` porte `createdAt` et `marche.createdAt` grâce à la tâche 5).

- [ ] **Étape 5 : compilation et lint.** `npx tsc --noEmit` puis `npm run lint` : aucune nouvelle erreur.

- [ ] **Étape 6 : commit.**

```bash
git add components/opportunites app/(dashboard)/opportunites/[id]/page.tsx
git commit -m "feat(lots): saisie des véhicules proposés par lot dans la fiche opportunité"
```

---

### Task 7 : tests E2E, build et vérification visuelle (base locale)

**Fichiers :** créer `tests/v1/vehicules-proposes.spec.ts`.

Précautions (voir mémoire projet « E2E Playwright contre `dev-test` ») : serveur `dev-test` via `.claude/launch.json` (jamais `.env`), redémarré avant chaque run, routes chauffées, données `[E2E-VEH]` nettoyées en `beforeAll` et `afterAll`, SQL limité à `127.0.0.1:5433`.

- [ ] **Étape 1 : créer le fichier** en reprenant de `tests/v1/lots-dossiers.spec.ts` les lignes 1-4 (imports), 21-24 (délais), 34-79 (`requeteLocale`, `supprimerDonneesE2E`, `idOpportunite`), 81-191 (`avecPage`, `allerA`, `cliquerApresHydratation`, `validerEtAttendreToast`, `creerOpportunite`, `ajouterLot`, `changerStatut`, `saisirResultat`), 207-227 (`beforeAll` de connexion) ; remplacer `[E2E-LOTS]` par `[E2E-VEH]`, `OBJET_A` par `'[E2E-VEH] Véhicules par lot'`, et `supprimerDonneesE2E` pour viser `like '[E2E-VEH]%'` (opportunités et marchés). Déclarer `const OBJET_A = '[E2E-VEH] Véhicules par lot'`, `const AC = 'Ministère Test E2E Véhicules'` et `let oppId = ''`, et renommer `adminCookies` tel quel. Puis ajouter les scénarios :

```ts
test.describe.serial('Véhicules proposés par lot', () => {
  // beforeAll / afterAll repris de lots-dossiers (connexion admin, nettoyage [E2E-VEH])

  test('V1 : pas de bouton véhicules avant « Dossier en préparation »', async ({ browser }) => {
    await avecPage(browser, async (page) => {
      await creerOpportunite(page, OBJET_A)
      oppId = await idOpportunite(OBJET_A)
      await ajouterLot(page, oppId, 1, 'Lot bus', 0)
      await expect(page.getByRole('button', { name: 'Véhicules proposés du lot 1' })).toHaveCount(0)
    })
  })

  test('V2 : saisie de 2 véhicules → montant du lot calculé et champ du lot en lecture seule', async ({ browser }) => {
    await avecPage(browser, async (page) => {
      await changerStatut(page, oppId, 'Go')
      await changerStatut(page, oppId, 'Dossier en préparation')
      await allerA(page, `/opportunites/${oppId}?onglet=lots`)
      await cliquerApresHydratation(page.getByRole('button', { name: 'Véhicules proposés du lot 1' }))
      const d = page.getByRole('dialog')
      await d.getByLabel('Marque *').first().fill('Toyota')
      await d.getByLabel('Modèle *').first().fill('Coaster')
      await d.getByLabel('Qté *').first().fill('2')
      await d.getByLabel('Prix unitaire (XOF) *').first().fill('30000000')
      await d.getByRole('button', { name: 'Ajouter un véhicule' }).click()
      await d.getByLabel('Marque *').nth(1).fill('Renault')
      await d.getByLabel('Modèle *').nth(1).fill('Master')
      await d.getByLabel('Qté *').nth(1).fill('1')
      await d.getByLabel('Prix unitaire (XOF) *').nth(1).fill('15000000')
      await expect(d.getByText(/75\s?000\s?000/)).toBeVisible()
      await validerEtAttendreToast(page, d.getByRole('button', { name: 'Enregistrer' }), 'Véhicules proposés enregistrés')
      await expect(d).toBeHidden()
      await expect(page.getByText('2 × Toyota Coaster')).toBeVisible({ timeout: 15000 })
      const ligne = page.getByRole('row').filter({ hasText: 'Lot bus' })
      await expect(ligne).toContainText(/75\s?000\s?000/)
      await cliquerApresHydratation(page.getByRole('button', { name: 'Modifier le lot 1' }))
      await expect(page.getByRole('dialog').getByLabel('Montant proposé (XOF)')).toBeDisabled()
    })
  })

  test('V3 : suggestions et pré-remplissage du prix à la 2e saisie', async ({ browser }) => {
    await avecPage(browser, async (page) => {
      await ajouterLot(page, oppId, 2, 'Lot pick-up', 0)
      await cliquerApresHydratation(page.getByRole('button', { name: 'Véhicules proposés du lot 2' }))
      const d = page.getByRole('dialog')
      await d.getByLabel('Marque *').first().fill('Toyota')
      await d.getByLabel('Modèle *').first().fill('Coaster')
      await expect(d.getByLabel('Prix unitaire (XOF) *').first()).toHaveValue('30000000')
    })
  })

  test('V4 : saisie encore possible après le dépôt', async ({ browser }) => {
    await avecPage(browser, async (page) => {
      await changerStatut(page, oppId, 'Offre soumise')
      await allerA(page, `/opportunites/${oppId}?onglet=lots`)
      await expect(page.getByRole('button', { name: 'Véhicules proposés du lot 1' })).toBeVisible()
    })
  })

  test('V5 : figé une fois le marché créé depuis les lots', async ({ browser }) => {
    test.setTimeout(180000)
    await avecPage(browser, async (page) => {
      await changerStatut(page, oppId, 'En attente d'attribution', { recharger: false })
      await saisirResultat(page, oppId, 1, 'Gagné', 'Résultat enregistré — opportunité : Gagnée')

      // Avant la création du marché : saisie encore possible (renégociation)
      await allerA(page, `/opportunites/${oppId}?onglet=lots`)
      await expect(page.getByRole('button', { name: 'Véhicules proposés du lot 1' })).toBeVisible({ timeout: 15000 })

      // Création du marché depuis les lots (même geste qu'au test 4b de lots-dossiers.spec.ts)
      await allerA(page, `/opportunites/${oppId}`)
      await cliquerApresHydratation(page.getByRole('button', { name: 'Créer le marché' }))
      await expect
        .poll(async () => (await requeteLocale<{ marcheId: string | null }>('select "marcheId" from opportunites where id = $1', [oppId]))[0]?.marcheId ?? null, { timeout: 60000 })
        .not.toBeNull()

      // Après : plus de bouton, la liste reste lisible
      await allerA(page, `/opportunites/${oppId}?onglet=lots`)
      await expect(page.getByText('2 × Toyota Coaster')).toBeVisible({ timeout: 15000 })
      await expect(page.getByRole('button', { name: 'Véhicules proposés du lot 1' })).toHaveCount(0)
    })
  })
})
```

- [ ] **Étape 2 : lancer les E2E sur la base locale.** Redémarrer `dev-test` (`preview_stop` puis `preview_start` avec `dev-test`), chauffer `/login`, `/opportunites` puis la fiche, puis :

```bash
npx playwright test tests/v1/vehicules-proposes.spec.ts tests/v1/lots-dossiers.spec.ts
```

Attendu : tous verts (les 7 scénarios existants de `lots-dossiers` restent verts : non-régression). En cas d'échec d'infrastructure (connexion refusée, délai de connexion), relancer après redémarrage de `dev-test` avant de conclure à un défaut du code.

- [ ] **Étape 3 : build.** `npm run build` → réussit.

- [ ] **Étape 4 : vérification visuelle** dans le Browser pane sur `dev-test` (admin local) : fiche d'une opportunité en « Dossier en préparation », onglet Lots, dialogue des véhicules, aux trois tailles (1920×1080, 768×1024, 375×667) ; contrôler l'absence de débordement horizontal (comparer `scrollWidth` et `clientWidth`, voir mémoire « mesure du débordement en émulation mobile »), la navigation au clavier (Tab, Entrée, Échap) et les messages d'erreur (quantité 0, prix vide). Remettre la fenêtre en `desktop` ensuite.

- [ ] **Étape 5 : commit.**

```bash
git add tests/v1/vehicules-proposes.spec.ts
git commit -m "test(lots): E2E des véhicules proposés par lot"
```

---

### Task 8 : mise en production — **SUR ACCORD EXPLICITE D'ABEL UNIQUEMENT**

Cette tâche n'est pas exécutée par l'agent sans demander. Elle suit `disciplined-execution` (étapes de production).

- [ ] **Étape 1 :** revue de code finale indépendante de la branche, correction des défauts, puis accord d'Abel pour la suite.
- [ ] **Étape 2 :** fusion de la branche dans `main` (squash en commit unique, comme pour les lots) et vérification avant tout push (dépôt public) : `git diff origin/main --stat`, recherche de secrets, chemins locaux et données réelles ; aucun décompte réel dans les messages ni les tests.
- [ ] **Étape 3 :** sauvegarde fraîche de la base de production (`pg_dump` 17 via `postgres:17-alpine`, hors dépôt, procédure de la mémoire « sauvegarde prod »), contrôle de lisibilité du dump, répétition de la migration sur une restauration locale de ce dump.
- [ ] **Étape 4 :** appliquer la migration en production (`prisma migrate deploy`, port 5432 en mode session), vérifier que la table existe et que `lots` est inchangée (mêmes effectifs et montants qu'avant), puis déployer le code.
- [ ] **Étape 5 :** vérifications en production en lecture seule : sondes, journaux, fiche d'une opportunité existante qui s'affiche sans erreur. Aucune saisie de test sur des données réelles.
- [ ] **Étape 6 :** retour arrière prêt : script `DROP TABLE` de la tâche 3 conservé hors dépôt ; un redéploiement de la version précédente suffit côté code (la table en trop ne gêne pas l'ancien code).
- [ ] **Étape 7 :** trace : brouillon d'entrée au Journal de décisions (proposé à Abel, jamais écrit sans sa validation), mise à jour de `PRD.md` si le périmètre est modifié, note de mémoire projet.

---

## Auto-revue

- **Couverture de la spec :** données (T3), saisie quantité et prix unitaire (T2, T6), montant calculé et lecture seule (T1, T4, T6), apprentissage par suggestions (T2, T6), statuts et gel (T1, T4), droits (T4 `canWrite`), audit (T4), migration prudente (T3, T8), tests (T1, T2, T7).
- **Écart assumé avec le design :** la Server Action remplace la liste entière du lot (au lieu d'un CRUD par ligne) : atomique, plus simple, même résultat. Corrigé dans le design.
- **Droits :** `canWrite` = ADMIN et AVANCE, comme pour les lots. Le design disait « EXPLOITATION » à tort : corrigé.
- **Risque accepté :** la création du marché depuis les lots ne verrouille pas la ligne de l'opportunité. Une saisie de véhicules simultanée à la création du marché pourrait théoriquement passer ; fenêtre négligeable pour le nombre d'utilisateurs, à revoir si la création de marché est un jour verrouillée.
- **Cohérence des noms :** `setVehiculesProposes`, `listerSuggestionsVehicules`, `vehiculesModifiables`, `calculerMontantVehicules`, `totalLigneVehicule`, `construireSuggestions`, `SerializedVehiculePropose`, `VehiculesProposeDialog` sont utilisés de façon identique dans toutes les tâches.
