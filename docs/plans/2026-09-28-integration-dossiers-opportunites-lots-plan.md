# Intégration Dossiers d'offre ↔ Opportunités par lot — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Sur ce projet, appliquer `disciplines-actives` avant chaque étape structurelle (commit, migration, déploiement).

**Goal:** Faire de l'opportunité la source de vérité de ses dossiers d'offre, avec un modèle `Lot` qui porte le résultat par lot, des pièces communes + pièces par lot, et « Dossiers d'offre » réduit à un onglet de la fiche opportunité.

**Architecture:** Migration **additive** (table `lots`, enum `ResultatLot`, `dossiers_offre.lotId`, `pieces_offre.opportuniteId`), logique métier en **fonctions pures** (`lib/utils/lots.ts`) testées isolément, Server Actions transactionnelles qui recalculent le statut de l'opportunité à chaque changement de résultat de lot. Les anciens champs restent en base jusqu'à la phase 3 (hors de ce plan, tâche 13 = gate).

**Tech Stack:** Next.js 15 App Router, Server Actions, Prisma 7.3 (PostgreSQL Supabase), Zod, shadcn/ui (Tabs, Table, Badge, Dialog), Playwright (seul lanceur de tests du projet).

**Spec:** `docs/plans/2026-09-28-integration-dossiers-opportunites-lots-design.md`

## Global Constraints

- Toute commande `prisma migrate *` : `DATABASE_URL` sur le port **5432** (le pooler 6543 bloque `pg_advisory_lock`).
- **Aucune migration sur la prod sans sauvegarde vérifiée** (tâche 0). Développement et tests sur la base `.env.test`.
- **Base de test = PostgreSQL local Docker** (conteneur `erp-stam-test-db`, `127.0.0.1:5433`, SSL auto-signé, créée le 2026-09-28 — avant cette date `.env.test` pointait sur la PROD). `prisma.config.ts` charge `.env` (= prod) : **toute commande Prisma ou script DB doit d'abord faire** `export DATABASE_URL=$(node -e "console.log(require('dotenv').parse(require('fs').readFileSync('.env.test')).DATABASE_URL)")` **puis vérifier que la valeur contient `127.0.0.1:5433`, sinon s'arrêter.** Ne jamais lancer `prisma migrate reset`, `db push --force-reset` ni `--accept-data-loss`.
- L'historique `prisma/migrations` ne rejoue pas depuis zéro (tables initiales créées hors migration) : la base locale est alignée par `prisma db push` ; les nouvelles migrations se **génèrent par diff** (voir Task 1).
- Aucun email de reporting déclenché pour tester (cron Nodemailer = envoi réel).
- Dépôt public : aucun secret, chemin local ou identifiant d'infra dans les commits.
- Rôles : toute Server Action qui écrit vérifie `requireAuth()` + `canWrite(role)`.
- Validation Zod côté serveur de toute entrée ; libellés UI en français ; pas de mode sombre.
- Montants : `Decimal(15,2)`, affichés en XOF via `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })`.
- Tests unitaires purs : fichiers `tests/unit/*.spec.ts` avec `@playwright/test` **sans fixture `page`** ; lancer avec `PLAYWRIGHT_BASE_URL=https://none npx playwright test tests/unit --project=chromium` (le préfixe `https://` désactive le `webServer` dans `playwright.config.ts:95`).
- Commits directs sur `main`, un par tâche, message conventionnel en français + ligne `Co-Authored-By`.

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `prisma/schema.prisma` | + `enum ResultatLot`, `model Lot`, `DossierOffre.lotId`, `PieceOffre.opportuniteId`, `PieceOffre.dossierId` facultatif |
| `prisma/migrations/<ts>_add_lots/migration.sql` | migration additive générée |
| `lib/utils/lots.ts` (créé) | fonctions pures : agrégation, état dérivé du dossier, progression, verrou pièces |
| `lib/templates/checklist-offre.ts` | + champ `portee: 'COMMUNE' \| 'LOT'` |
| `lib/validations/lot.ts` (créé) | schémas Zod lot / résultat |
| `lib/actions/lots.ts` (créé) | CRUD lots + `setResultatLot` (transaction + agrégation) |
| `lib/actions/statuts-opportunite.ts` | déclenchement par lot, verrou des statuts post-attribution |
| `lib/actions/dossiers-offre.ts` | statut dérivé, progression avec pièces communes, verrou après dépôt |
| `prisma/reprise-lots.ts` (créé) | reprise idempotente avec `--dry-run` |
| `components/opportunites/opportunite-tabs.tsx` (créé) | onglets fiche |
| `components/opportunites/lots-section.tsx` (créé) | tableau lots + dossiers |
| `components/opportunites/lot-resultat-dialog.tsx` (créé) | saisie résultat d'un lot |
| `components/opportunites/pieces-communes.tsx` (créé) | checklist pièces communes |
| `app/(dashboard)/dossiers-offre/**` | redirections 308 |
| `components/layout/dashboard-shell.tsx:61,77` | retrait entrée menu |
| analytique / exports / emails | lecture des résultats depuis les lots |

---

### Task 0: Sauvegarde de la base de production (gate manuel — Abel)

**Files:** aucun.

- [ ] **Step 1:** Abel se connecte au tableau de bord Supabase avec le compte propriétaire du projet, vérifie qu'une sauvegarde quotidienne récente existe (Database → Backups) ou en déclenche une / exporte la base.
- [ ] **Step 2:** Abel confirme dans le fil : date/heure de la sauvegarde. **Sans cette confirmation, les tâches 3 (exécution prod) et 13 sont interdites.** Les tâches 1-2 et 4-12 se développent sur `.env.test`.

---

### Task 1: Schéma Prisma additif + migration

**Files:**
- Modify: `prisma/schema.prisma` (modèles `Opportunite` l.612, `DossierOffre` l.660, `PieceOffre` l.680)
- Create: `prisma/migrations/<timestamp>_add_lots/migration.sql` (généré)

**Interfaces:**
- Produces: modèle Prisma `Lot` { id, opportuniteId, numero, intitule, montantEstime, montantPropose, resultat: ResultatLot, motifPerte, concurrentGagnant, montantOffreConcurrent, dossier? }, `DossierOffre.lotId: string | null` (unique), `PieceOffre.opportuniteId: string | null`, `PieceOffre.dossierId: string | null`.

- [ ] **Step 1: Modifier le schéma**

Ajouter après `enum StatutPiece` :

```prisma
enum ResultatLot {
  EN_COURS
  ATTRIBUE_PROVISOIREMENT
  GAGNE
  PERDU
  INFRUCTUEUX
}

model Lot {
  id                     String        @id @default(cuid())
  opportuniteId          String
  opportunite            Opportunite   @relation(fields: [opportuniteId], references: [id], onDelete: Cascade)
  numero                 Int
  intitule               String
  montantEstime          Decimal?      @db.Decimal(15, 2)
  montantPropose         Decimal?      @db.Decimal(15, 2)
  resultat               ResultatLot   @default(EN_COURS)
  motifPerte             String?       @db.Text
  concurrentGagnant      String?
  montantOffreConcurrent Decimal?      @db.Decimal(15, 2)
  dossier                DossierOffre?
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  @@unique([opportuniteId, numero])
  @@index([opportuniteId])
  @@map("lots")
}
```

Dans `model Opportunite`, ajouter sous `dossiers DossierOffre[]` :

```prisma
  lots                   Lot[]
  piecesCommunes         PieceOffre[]      @relation("PiecesCommunes")
```

Dans `model DossierOffre`, ajouter :

```prisma
  lotId         String?      @unique
  lot           Lot?         @relation(fields: [lotId], references: [id], onDelete: Cascade)
```

Remplacer `model PieceOffre` par :

```prisma
model PieceOffre {
  id            String        @id @default(cuid())
  dossierId     String?
  dossier       DossierOffre? @relation(fields: [dossierId], references: [id], onDelete: Cascade)
  opportuniteId String?
  opportunite   Opportunite?  @relation("PiecesCommunes", fields: [opportuniteId], references: [id], onDelete: Cascade)
  nom           String
  description   String?
  statut        StatutPiece   @default(ABSENT)
  obligatoire   Boolean       @default(true)
  ordre         Int           @default(0)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([dossierId])
  @@index([opportuniteId])
  @@map("pieces_offre")
}
```

- [ ] **Step 2: Générer la migration sur la base de test** (`.env.test` chargé, port 5432)

Avant de modifier le schéma (Step 1), copier l'ancien : `git show HEAD:prisma/schema.prisma > /tmp/schema-avant.prisma`. Puis générer le SQL par diff (aucune base touchée) :
`mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_add_lots && npx prisma migrate diff --from-schema /tmp/schema-avant.prisma --to-schema prisma/schema.prisma --script > prisma/migrations/<dossier>/migration.sql`
Puis ajouter en fin du `migration.sql` généré la contrainte « exactement un parent » :

```sql
ALTER TABLE "pieces_offre" ADD CONSTRAINT "pieces_offre_un_parent_chk"
  CHECK (("dossierId" IS NOT NULL) <> ("opportuniteId" IS NOT NULL));
```

Vérifier que le SQL ne contient **aucun** `DROP` ni `ALTER COLUMN ... TYPE` (seulement `CREATE TYPE`, `CREATE TABLE`, `ADD COLUMN`, `DROP NOT NULL` sur `pieces_offre.dossierId`, index, FK, CHECK).

- [ ] **Step 3: Appliquer sur la base de test et typer**

Run (DATABASE_URL local exporté et vérifié) : `docker exec -i erp-stam-test-db psql -U stam_test -d erp_stam_test < prisma/migrations/<dossier>/migration.sql && npx prisma generate && npx tsc --noEmit` (la base locale n'a pas de table `_prisma_migrations` fiable ; on applique le SQL directement pour vérifier qu'il passe)
Expected: migration appliquée ; erreurs TS éventuelles uniquement là où `piece.dossierId` était supposé non nul (corriger avec une garde `if (!piece.dossierId)` dans `lib/actions/dossiers-offre.ts`).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/actions/dossiers-offre.ts
git commit -m "feat(lots): modèle Lot, résultat par lot et pièces communes (migration additive)"
```

---

### Task 2: Fonctions pures métier (`lib/utils/lots.ts`)

**Files:**
- Create: `lib/utils/lots.ts`
- Test: `tests/unit/lots.spec.ts`

**Interfaces:**
- Consumes: enums `ResultatLot`, `StatutOpportunite` (`@prisma/client`).
- Produces:
  - `agregerStatutOpportunite(resultats: ResultatLot[]): StatutOpportunite | null` — `null` si aucun lot.
  - `type EtatDossier = 'EN_PREPARATION' | 'SOUMIS' | 'CLOS' | 'AUCUN'`
  - `deriverEtatDossier(statut: StatutOpportunite): EtatDossier`
  - `piecesModifiables(statut: StatutOpportunite): boolean`
  - `calculerProgression(pieces: { statut: StatutPiece }[]): number` (0-100)
  - `STATUTS_PILOTES_PAR_LOTS: StatutOpportunite[]` = `['ATTRIBUE_PROVISOIREMENT','GAGNEE','PERDUE']`

- [ ] **Step 1: Écrire les tests (échouent)**

```ts
// tests/unit/lots.spec.ts
import { test, expect } from '@playwright/test'
import {
  agregerStatutOpportunite,
  deriverEtatDossier,
  piecesModifiables,
  calculerProgression,
} from '../../lib/utils/lots'

test.describe('agregerStatutOpportunite', () => {
  test('aucun lot → null', () => {
    expect(agregerStatutOpportunite([])).toBeNull()
  })
  test('un lot gagné parmi des perdus → GAGNEE', () => {
    expect(agregerStatutOpportunite(['PERDU', 'GAGNE', 'INFRUCTUEUX'])).toBe('GAGNEE')
  })
  test('provisoire sans gagné → ATTRIBUE_PROVISOIREMENT', () => {
    expect(agregerStatutOpportunite(['PERDU', 'ATTRIBUE_PROVISOIREMENT', 'EN_COURS'])).toBe('ATTRIBUE_PROVISOIREMENT')
  })
  test('un lot encore en cours → EN_ATTENTE_ATTRIBUTION', () => {
    expect(agregerStatutOpportunite(['PERDU', 'EN_COURS'])).toBe('EN_ATTENTE_ATTRIBUTION')
  })
  test('tous perdus ou infructueux → PERDUE', () => {
    expect(agregerStatutOpportunite(['PERDU', 'INFRUCTUEUX'])).toBe('PERDUE')
    expect(agregerStatutOpportunite(['INFRUCTUEUX'])).toBe('PERDUE')
  })
})

test.describe('deriverEtatDossier', () => {
  test('avant préparation → AUCUN', () => {
    for (const s of ['EN_ANALYSE', 'GO', 'NO_GO', 'IDENTIFIEE'] as const) {
      expect(deriverEtatDossier(s)).toBe('AUCUN')
    }
  })
  test('préparation → EN_PREPARATION', () => {
    expect(deriverEtatDossier('DOSSIER_EN_PREPARATION')).toBe('EN_PREPARATION')
  })
  test('déposé → SOUMIS (legacy SOUMISE inclus)', () => {
    for (const s of ['OFFRE_SOUMISE', 'SOUMISE', 'EN_ATTENTE_ATTRIBUTION'] as const) {
      expect(deriverEtatDossier(s)).toBe('SOUMIS')
    }
  })
  test('attribué → CLOS', () => {
    for (const s of ['ATTRIBUE_PROVISOIREMENT', 'GAGNEE', 'PERDUE'] as const) {
      expect(deriverEtatDossier(s)).toBe('CLOS')
    }
  })
})

test('piecesModifiables uniquement en préparation', () => {
  expect(piecesModifiables('DOSSIER_EN_PREPARATION')).toBe(true)
  expect(piecesModifiables('OFFRE_SOUMISE')).toBe(false)
  expect(piecesModifiables('GO')).toBe(false)
})

test('calculerProgression compte COMPLET et VALIDE', () => {
  expect(calculerProgression([])).toBe(0)
  expect(
    calculerProgression([
      { statut: 'COMPLET' }, { statut: 'VALIDE' }, { statut: 'ABSENT' }, { statut: 'INCOMPLET' },
    ])
  ).toBe(50)
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `PLAYWRIGHT_BASE_URL=https://none npx playwright test tests/unit/lots.spec.ts --project=chromium`
Expected: FAIL — `Cannot find module '../../lib/utils/lots'`.

- [ ] **Step 3: Implémenter**

```ts
// lib/utils/lots.ts
import type { ResultatLot, StatutOpportunite, StatutPiece } from '@prisma/client'

export type EtatDossier = 'EN_PREPARATION' | 'SOUMIS' | 'CLOS' | 'AUCUN'

/** Statuts de l'opportunité qui ne se fixent plus à la main mais via les résultats des lots. */
export const STATUTS_PILOTES_PAR_LOTS: StatutOpportunite[] = [
  'ATTRIBUE_PROVISOIREMENT',
  'GAGNEE',
  'PERDUE',
]

/** Statut de l'opportunité déduit des résultats de ses lots (design §5). */
export function agregerStatutOpportunite(resultats: ResultatLot[]): StatutOpportunite | null {
  if (resultats.length === 0) return null
  if (resultats.includes('GAGNE')) return 'GAGNEE'
  if (resultats.includes('ATTRIBUE_PROVISOIREMENT')) return 'ATTRIBUE_PROVISOIREMENT'
  if (resultats.includes('EN_COURS')) return 'EN_ATTENTE_ATTRIBUTION'
  return 'PERDUE'
}

/** État d'un dossier, dérivé du statut de son opportunité (design §4). */
export function deriverEtatDossier(statut: StatutOpportunite): EtatDossier {
  switch (statut) {
    case 'DOSSIER_EN_PREPARATION':
      return 'EN_PREPARATION'
    case 'OFFRE_SOUMISE':
    case 'SOUMISE':
    case 'EN_ATTENTE_ATTRIBUTION':
      return 'SOUMIS'
    case 'ATTRIBUE_PROVISOIREMENT':
    case 'GAGNEE':
    case 'PERDUE':
      return 'CLOS'
    default:
      return 'AUCUN'
  }
}

export function piecesModifiables(statut: StatutOpportunite): boolean {
  return deriverEtatDossier(statut) === 'EN_PREPARATION'
}

export function calculerProgression(pieces: { statut: StatutPiece }[]): number {
  if (pieces.length === 0) return 0
  const faites = pieces.filter((p) => p.statut === 'COMPLET' || p.statut === 'VALIDE').length
  return Math.round((faites / pieces.length) * 100)
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `PLAYWRIGHT_BASE_URL=https://none npx playwright test tests/unit/lots.spec.ts --project=chromium`
Expected: PASS (tous les tests).

- [ ] **Step 5: Commit**

```bash
git add lib/utils/lots.ts tests/unit/lots.spec.ts
git commit -m "feat(lots): règles pures d'agrégation et d'état dérivé du dossier"
```

---

### Task 3: Script de reprise des données (`prisma/reprise-lots.ts`)

**Files:**
- Create: `prisma/reprise-lots.ts`
- Modify: `package.json` (script `reprise:lots`)

**Interfaces:**
- Consumes: modèles Task 1, `agregerStatutOpportunite` (Task 2).
- Produces: pour chaque opportunité sans lot, un `Lot` n°1 « Lot unique » ; dossiers existants rattachés (`lotId`) ; rapport des écarts.

Règles de reprise (design D6) :
- `intitule` = `'Lot unique'`, `montantEstime`/`montantPropose` repris de l'opportunité, `motifPerte`/`concurrentGagnant`/`montantOffreConcurrent` repris.
- `resultat` : `GAGNEE`→`GAGNE`, `PERDUE`→`PERDU`, `ATTRIBUE_PROVISOIREMENT`→`ATTRIBUE_PROVISOIREMENT`, sinon `EN_COURS`.
- Dossier(s) existant(s) de l'opportunité : le plus ancien reçoit `lotId` ; s'il y en a plusieurs, les autres sont **listés dans le rapport sans modification** (décision Abel requise).
- Idempotent : une opportunité qui a déjà ≥ 1 lot est ignorée.

- [ ] **Step 1: Écrire le script**

```ts
// prisma/reprise-lots.ts
import 'dotenv/config'
import { Client } from 'pg'
import type { ResultatLot, StatutOpportunite } from '@prisma/client'
import { agregerStatutOpportunite } from '../lib/utils/lots'

const DRY_RUN = process.argv.includes('--dry-run')

function resultatDepuis(statut: StatutOpportunite): ResultatLot {
  if (statut === 'GAGNEE') return 'GAGNE'
  if (statut === 'PERDUE') return 'PERDU'
  if (statut === 'ATTRIBUE_PROVISOIREMENT') return 'ATTRIBUE_PROVISOIREMENT'
  return 'EN_COURS'
}

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  try {
    const { rows: opps } = await db.query(`
      SELECT o.id, o.statut, o.objet, o."montantEstime", o."montantPropose",
             o."motifPerte", o."concurrentGagnant", o."montantOffreConcurrent"
      FROM opportunites o
      WHERE NOT EXISTS (SELECT 1 FROM lots l WHERE l."opportuniteId" = o.id)`)
    console.log(`${opps.length} opportunité(s) sans lot — mode ${DRY_RUN ? 'DRY-RUN' : 'ÉCRITURE'}`)

    for (const o of opps) {
      const resultat = resultatDepuis(o.statut)
      const agrege = agregerStatutOpportunite([resultat])
      const ecart = agrege && ['ATTRIBUE_PROVISOIREMENT', 'GAGNEE', 'PERDUE'].includes(o.statut) && agrege !== o.statut
      const { rows: dossiers } = await db.query(
        `SELECT id, titre FROM dossiers_offre WHERE "opportuniteId" = $1 ORDER BY "createdAt" ASC`, [o.id])
      console.log(`- ${o.objet} [${o.statut}] → lot ${resultat}, ${dossiers.length} dossier(s)${ecart ? ' ⚠ ÉCART' : ''}`)
      if (dossiers.length > 1) console.log(`  ⚠ dossiers supplémentaires non rattachés : ${dossiers.slice(1).map((d) => d.titre).join(' | ')}`)
      if (DRY_RUN) continue

      await db.query('BEGIN')
      const { rows: [lot] } = await db.query(
        `INSERT INTO lots (id, "opportuniteId", numero, intitule, "montantEstime", "montantPropose", resultat,
                           "motifPerte", "concurrentGagnant", "montantOffreConcurrent", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, 1, 'Lot unique', $2, $3, $4::"ResultatLot", $5, $6, $7, now(), now())
         RETURNING id`,
        [o.id, o.montantEstime, o.montantPropose, resultat, o.motifPerte, o.concurrentGagnant, o.montantOffreConcurrent])
      if (dossiers[0]) {
        await db.query(`UPDATE dossiers_offre SET "lotId" = $1 WHERE id = $2`, [lot.id, dossiers[0].id])
      }
      await db.query('COMMIT')
    }
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    await db.end()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
```

Ajouter dans `package.json` → `scripts` : `"reprise:lots": "ts-node -P tsconfig.json prisma/reprise-lots.ts"`.

- [ ] **Step 2: Dry-run sur la base de test**

Run: `npm run reprise:lots -- --dry-run` (avec `.env.test`)
Expected: liste des opportunités, aucun changement en base (`SELECT count(*) FROM lots` = 0).

- [ ] **Step 3: Exécution sur la base de test puis relance (idempotence)**

Run: `npm run reprise:lots` puis `npm run reprise:lots -- --dry-run`
Expected: 1er run crée N lots ; 2e run affiche « 0 opportunité(s) sans lot ».

- [ ] **Step 4: Commit**

```bash
git add prisma/reprise-lots.ts package.json
git commit -m "feat(lots): script de reprise idempotent (lot unique par opportunité)"
```

- [ ] **Step 5 (prod — gate Tâche 0):** après confirmation de la sauvegarde **et** feu vert d'Abel : `prisma migrate deploy` (port 5432) sur la prod, `npm run reprise:lots -- --dry-run`, **montrer le rapport à Abel**, puis exécution réelle sur son accord. Vérifier : `count(lots)` égal au nombre d'opportunités annoncé par le dry-run, et chaque dossier existant avec `lotId` non nul.

---

### Task 4: Validations et Server Actions des lots

**Files:**
- Create: `lib/validations/lot.ts`, `lib/actions/lots.ts`
- Modify: `lib/audit/constants.ts` (ajouter `LOT` à `AUDIT_ENTITY`)

**Interfaces:**
- Consumes: `agregerStatutOpportunite`, `STATUTS_PILOTES_PAR_LOTS` (Task 2).
- Produces:
  - `createLot(data: unknown): Promise<ActionResult<{ id: string }>>`
  - `updateLot(id: string, data: unknown): Promise<ActionResult<{ id: string }>>`
  - `deleteLot(id: string): Promise<ActionResult<null>>`
  - `setResultatLot(data: unknown): Promise<ActionResult<{ statutOpportunite: StatutOpportunite }>>`
  - `lotSchema`, `resultatLotSchema` (Zod)

- [ ] **Step 1: Schémas Zod**

```ts
// lib/validations/lot.ts
import { z } from 'zod'
import { ResultatLot } from '@prisma/client'

const montant = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().nonnegative().max(999999999999999).nullable()
)

export const lotSchema = z.object({
  opportuniteId: z.string().min(1),
  numero: z.coerce.number().int().min(1).max(999),
  intitule: z.string().trim().min(1, "L'intitulé du lot est obligatoire").max(300),
  montantEstime: montant.optional(),
  montantPropose: montant.optional(),
})

export const resultatLotSchema = z
  .object({
    lotId: z.string().min(1),
    resultat: z.nativeEnum(ResultatLot),
    motifPerte: z.string().trim().max(5000).optional().nullable(),
    concurrentGagnant: z.string().trim().max(200).optional().nullable(),
    montantOffreConcurrent: montant.optional(),
  })
  .refine((d) => d.resultat !== 'PERDU' || !!d.motifPerte?.trim(), {
    message: 'Le motif de perte est obligatoire pour un lot perdu',
    path: ['motifPerte'],
  })

export const RESULTAT_LOT_LABELS: Record<ResultatLot, string> = {
  EN_COURS: 'En attente',
  ATTRIBUE_PROVISOIREMENT: 'Attribué provisoirement',
  GAGNE: 'Gagné',
  PERDU: 'Perdu',
  INFRUCTUEUX: 'Infructueux',
}
```

- [ ] **Step 2: Actions**

```ts
// lib/actions/lots.ts
'use server'

import { revalidatePath } from 'next/cache'
import type { StatutOpportunite } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { lotSchema, resultatLotSchema } from '@/lib/validations/lot'
import { agregerStatutOpportunite } from '@/lib/utils/lots'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import type { ActionResult } from '@/types'

const STATUTS_EDITION_LOTS: StatutOpportunite[] = ['EN_ANALYSE', 'GO', 'DOSSIER_EN_PREPARATION']
const STATUTS_SAISIE_RESULTAT: StatutOpportunite[] = [
  'EN_ATTENTE_ATTRIBUTION', 'ATTRIBUE_PROVISOIREMENT', 'GAGNEE', 'PERDUE',
]

async function sessionEcriture() {
  const session = await requireAuth()
  const user = session.user as { id?: string; email?: string; role?: string } | undefined
  if (!canWrite(user?.role)) return null
  return user
}

export async function createLot(data: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await sessionEcriture()
    if (!user) return { success: false, error: 'Permissions insuffisantes' }
    const parsed = lotSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }

    const opp = await prisma.opportunite.findUnique({ where: { id: parsed.data.opportuniteId }, select: { statut: true } })
    if (!opp) return { success: false, error: 'Opportunité introuvable.' }
    if (!STATUTS_EDITION_LOTS.includes(opp.statut)) {
      return { success: false, error: "Les lots ne sont plus modifiables après le dépôt de l'offre." }
    }
    const lot = await prisma.lot.create({ data: parsed.data })
    await logAction({ userId: user.id, userEmail: user.email, action: AUDIT_ACTION.CREATE, entityType: AUDIT_ENTITY.LOT, entityId: lot.id })
    revalidatePath(`/opportunites/${parsed.data.opportuniteId}`)
    return { success: true, data: { id: lot.id } }
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return { success: false, error: 'Ce numéro de lot existe déjà.' }
    console.error('createLot error:', error)
    return { success: false, error: 'Erreur lors de la création du lot.' }
  }
}

export async function updateLot(id: string, data: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await sessionEcriture()
    if (!user) return { success: false, error: 'Permissions insuffisantes' }
    const parsed = lotSchema.omit({ opportuniteId: true }).safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    const lot = await prisma.lot.findUnique({ where: { id }, select: { opportuniteId: true, opportunite: { select: { statut: true } } } })
    if (!lot) return { success: false, error: 'Lot introuvable.' }
    if (!STATUTS_EDITION_LOTS.includes(lot.opportunite.statut)) {
      return { success: false, error: "Les lots ne sont plus modifiables après le dépôt de l'offre." }
    }
    await prisma.lot.update({ where: { id }, data: parsed.data })
    await logAction({ userId: user.id, userEmail: user.email, action: AUDIT_ACTION.UPDATE, entityType: AUDIT_ENTITY.LOT, entityId: id })
    revalidatePath(`/opportunites/${lot.opportuniteId}`)
    return { success: true, data: { id } }
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return { success: false, error: 'Ce numéro de lot existe déjà.' }
    console.error('updateLot error:', error)
    return { success: false, error: 'Erreur lors de la modification du lot.' }
  }
}

export async function deleteLot(id: string): Promise<ActionResult<null>> {
  try {
    const user = await sessionEcriture()
    if (!user) return { success: false, error: 'Permissions insuffisantes' }
    const lot = await prisma.lot.findUnique({ where: { id }, select: { opportuniteId: true, opportunite: { select: { statut: true } } } })
    if (!lot) return { success: false, error: 'Lot introuvable.' }
    if (!STATUTS_EDITION_LOTS.includes(lot.opportunite.statut)) {
      return { success: false, error: "Les lots ne sont plus modifiables après le dépôt de l'offre." }
    }
    await prisma.lot.delete({ where: { id } }) // cascade : dossier du lot + ses pièces
    await logAction({ userId: user.id, userEmail: user.email, action: AUDIT_ACTION.DELETE, entityType: AUDIT_ENTITY.LOT, entityId: id })
    revalidatePath(`/opportunites/${lot.opportuniteId}`)
    return { success: true, data: null }
  } catch (error) {
    console.error('deleteLot error:', error)
    return { success: false, error: 'Erreur lors de la suppression du lot.' }
  }
}

/** Fixe le résultat d'un lot et recalcule le statut de l'opportunité dans la même transaction (design §5). */
export async function setResultatLot(
  data: unknown
): Promise<ActionResult<{ statutOpportunite: StatutOpportunite }>> {
  try {
    const user = await sessionEcriture()
    if (!user) return { success: false, error: 'Permissions insuffisantes' }
    const parsed = resultatLotSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    const { lotId, resultat, motifPerte, concurrentGagnant, montantOffreConcurrent } = parsed.data

    const res = await prisma.$transaction(async (tx) => {
      const lot = await tx.lot.findUnique({ where: { id: lotId }, select: { opportuniteId: true, opportunite: { select: { statut: true } } } })
      if (!lot) throw new Error('LOT_INTROUVABLE')
      if (!STATUTS_SAISIE_RESULTAT.includes(lot.opportunite.statut)) throw new Error('STATUT_INVALIDE')

      const perdu = resultat === 'PERDU'
      await tx.lot.update({
        where: { id: lotId },
        data: {
          resultat,
          motifPerte: perdu ? motifPerte ?? null : null,
          concurrentGagnant: perdu ? concurrentGagnant ?? null : null,
          montantOffreConcurrent: perdu ? montantOffreConcurrent ?? null : null,
        },
      })
      const lots = await tx.lot.findMany({ where: { opportuniteId: lot.opportuniteId }, select: { resultat: true } })
      const statut = agregerStatutOpportunite(lots.map((l) => l.resultat)) ?? lot.opportunite.statut
      if (statut !== lot.opportunite.statut) {
        await tx.opportunite.update({ where: { id: lot.opportuniteId }, data: { statut } })
      }
      return { opportuniteId: lot.opportuniteId, ancien: lot.opportunite.statut, statut }
    })

    await logAction({
      userId: user.id, userEmail: user.email, action: AUDIT_ACTION.UPDATE, entityType: AUDIT_ENTITY.LOT, entityId: lotId,
      metadata: { resultat, ancienStatutOpportunite: res.ancien, nouveauStatutOpportunite: res.statut },
    })
    revalidatePath(`/opportunites/${res.opportuniteId}`)
    revalidatePath('/opportunites')
    return { success: true, data: { statutOpportunite: res.statut } }
  } catch (error) {
    const msg = (error as Error).message
    if (msg === 'LOT_INTROUVABLE') return { success: false, error: 'Lot introuvable.' }
    if (msg === 'STATUT_INVALIDE') return { success: false, error: "Le résultat se saisit après le dépôt, en attente d'attribution." }
    console.error('setResultatLot error:', error)
    return { success: false, error: 'Erreur lors de la saisie du résultat.' }
  }
}
```

- [ ] **Step 3: Vérifier le typage** — Run: `npx tsc --noEmit` — Expected: 0 erreur.
- [ ] **Step 4: Commit**

```bash
git add lib/validations/lot.ts lib/actions/lots.ts lib/audit/constants.ts
git commit -m "feat(lots): actions CRUD et saisie du résultat avec agrégation transactionnelle"
```

---

### Task 5: Checklist communes/lot et déclenchement par lot

**Files:**
- Modify: `lib/templates/checklist-offre.ts`, `lib/actions/statuts-opportunite.ts:17-165`, `lib/utils/workflow-statuts-opportunite.ts`

**Interfaces:**
- Consumes: `STATUTS_PILOTES_PAR_LOTS` (Task 2), modèles Task 1.
- Produces: `TemplatePiece.portee: 'COMMUNE' | 'LOT'` ; `changerStatutOpportunite` crée un dossier par lot + les pièces communes, refuse les statuts pilotés par les lots.

- [ ] **Step 1: Portée des pièces** — ajouter `portee: 'COMMUNE' | 'LOT'` à `TemplatePiece` et à chaque entrée :
  - `LOT` : Lettre de soumission, Caution de soumission, Offre technique, Offre financière (BPU/DQE).
  - `COMMUNE` : Registre du commerce, Attestation fiscale, Attestation CNSS, Statuts de la société, Références techniques, Bilans financiers, Agrément ou autorisation d'exercice, Attestation assurance RC.
  - Répartition **validée par Abel le 2026-09-28** (caution de soumission = par lot).

- [ ] **Step 2: Refuser les statuts pilotés par les lots** — dans `changerStatutOpportunite`, après l'étape 2 :

```ts
    if (STATUTS_PILOTES_PAR_LOTS.includes(newStatut) && newStatut !== opportunite.statut) {
      const nbLots = await prisma.lot.count({ where: { opportuniteId } })
      if (nbLots > 0) {
        return { success: false, error: 'Après attribution, le statut se déduit des résultats saisis sur chaque lot.' }
      }
    }
```

(les opportunités sans lot — cas impossible après reprise — gardent l'ancien comportement.) Retirer du schéma et de `updateData` les champs `motifPerte`, `concurrentGagnant`, `montantOffreConcurrent` (déplacés sur les lots).

- [ ] **Step 3: Remplacer le bloc « 5. Auto-création DossierOffre »** par :

```ts
    if (newStatut === 'DOSSIER_EN_PREPARATION') {
      await prisma.$transaction(async (tx) => {
        let lots = await tx.lot.findMany({ where: { opportuniteId }, include: { dossier: true }, orderBy: { numero: 'asc' } })
        if (lots.length === 0) {
          const lot = await tx.lot.create({ data: { opportuniteId, numero: 1, intitule: 'Lot unique' } })
          lots = [{ ...lot, dossier: null }]
        }
        const piecesLot = CHECKLIST_STANDARD.filter((p) => p.portee === 'LOT')
        for (const lot of lots) {
          if (lot.dossier) continue
          await tx.dossierOffre.create({
            data: {
              titre: `Dossier — ${opportunite.objet} — Lot ${lot.numero}`,
              opportuniteId,
              lotId: lot.id,
              pieces: { create: piecesLot.map(({ nom, description, obligatoire, ordre }) => ({ nom, description, obligatoire, ordre, statut: 'ABSENT' as const })) },
            },
          })
        }
        const nbCommunes = await tx.pieceOffre.count({ where: { opportuniteId } })
        if (nbCommunes === 0) {
          await tx.pieceOffre.createMany({
            data: CHECKLIST_STANDARD.filter((p) => p.portee === 'COMMUNE').map(({ nom, description, obligatoire, ordre }) => ({
              opportuniteId, nom, description, obligatoire, ordre, statut: 'ABSENT' as const,
            })),
          })
        }
      })
    }
```

- [ ] **Step 4:** `npx tsc --noEmit` → 0 erreur.
- [ ] **Step 5: Commit**

```bash
git add lib/templates/checklist-offre.ts lib/actions/statuts-opportunite.ts
git commit -m "feat(lots): un dossier par lot et pièces communes au passage en préparation"
```

---

### Task 6: Dossier — statut dérivé, progression avec pièces communes, verrou après dépôt

**Files:**
- Modify: `lib/actions/dossiers-offre.ts` (helper l.36-45, `updatePieceStatut` l.250+, `createDossierOffre`, `updateDossierOffre`), `lib/validations/dossier-offre.ts` (retirer `statut`), `components/dossiers-offre/dossier-form.tsx:62,104-120` (retirer le sélecteur de statut), `components/dossiers-offre/piece-statut-button.tsx` (prop `disabled`)
- Create: `lib/actions/pieces-communes.ts`

**Interfaces:**
- Consumes: `calculerProgression`, `piecesModifiables`, `deriverEtatDossier` (Task 2).
- Produces:
  - `recalculerProgressionOpportunite(opportuniteId: string): Promise<void>` (dans `dossiers-offre.ts`, exporté) — met à jour `progression` de chaque dossier = pièces du lot + pièces communes.
  - `updatePieceCommuneStatut(id: string, statut: StatutPiece): Promise<ActionResult<null>>`

- [ ] **Step 1:** Remplacer `calcProgression` par l'import de `calculerProgression` et ajouter :

```ts
export async function recalculerProgressionOpportunite(opportuniteId: string): Promise<void> {
  const [communes, dossiers] = await Promise.all([
    prisma.pieceOffre.findMany({ where: { opportuniteId }, select: { statut: true } }),
    prisma.dossierOffre.findMany({ where: { opportuniteId }, select: { id: true, pieces: { select: { statut: true } } } }),
  ])
  await Promise.all(
    dossiers.map((d) =>
      prisma.dossierOffre.update({ where: { id: d.id }, data: { progression: calculerProgression([...d.pieces, ...communes]) } })
    )
  )
}
```

- [ ] **Step 2:** Dans `updatePieceStatut`, avant la mise à jour : charger `piece.dossier.opportunite.statut` ; si `!piecesModifiables(statut)` → `{ success: false, error: "Le dossier est déposé : les pièces ne sont plus modifiables." }`. Après la mise à jour, appeler `recalculerProgressionOpportunite(opportuniteId)`.
- [ ] **Step 3:** Créer `lib/actions/pieces-communes.ts` avec `updatePieceCommuneStatut` (même garde `requireAuth`/`canWrite`, même verrou via `piece.opportunite.statut`, puis `recalculerProgressionOpportunite`, `revalidatePath('/opportunites/' + id)`).
- [ ] **Step 4:** Retirer `statut` des schémas Zod de dossier, de `createDossierOffre`/`updateDossierOffre` et du formulaire. L'état affiché = `deriverEtatDossier(dossier.opportunite.statut)` (inclure `opportunite: { select: { statut: true } }` dans `getDossierOffre`).
- [ ] **Step 5:** `npx tsc --noEmit` → 0 erreur ; `PLAYWRIGHT_BASE_URL=https://none npx playwright test tests/unit --project=chromium` → PASS.
- [ ] **Step 6: Commit**

```bash
git add lib/actions/dossiers-offre.ts lib/actions/pieces-communes.ts lib/validations components/dossiers-offre
git commit -m "feat(dossiers): statut dérivé de l'opportunité, pièces communes et verrou après dépôt"
```

---

### Task 7: Fiche opportunité à onglets (Informations · Lots & dossiers · Pièces communes)

**Files:**
- Create: `components/opportunites/opportunite-tabs.tsx`, `components/opportunites/lots-section.tsx`, `components/opportunites/lot-form-dialog.tsx`, `components/opportunites/lot-resultat-dialog.tsx`, `components/opportunites/pieces-communes.tsx`
- Modify: `app/(dashboard)/opportunites/[id]/page.tsx`, `lib/actions/opportunites.ts:103` (`getOpportunite` inclut `lots: { orderBy: { numero: 'asc' }, include: { dossier: { include: { pieces: { orderBy: { ordre: 'asc' } } } } } }` et `piecesCommunes: { orderBy: { ordre: 'asc' } }`), `lib/utils/serialize.ts` (sérialiser les `Decimal` des lots)

**Interfaces:**
- Consumes: actions Task 4 et 6, `RESULTAT_LOT_LABELS`, `deriverEtatDossier`, `piecesModifiables`, composant existant `ChecklistView` (`components/dossiers-offre/checklist-view.tsx`).
- Produces: onglet actif piloté par `?onglet=infos|lots|pieces` (utilisé par les redirections Task 11).

- [ ] **Step 1: Onglets** (Radix Tabs de `components/ui/tabs`, contenu dans de vrais `TabsContent` — leçon PR #10) :

```tsx
// components/opportunites/opportunite-tabs.tsx
'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const ONGLETS = ['infos', 'lots', 'pieces'] as const
type Onglet = (typeof ONGLETS)[number]

export function OpportuniteTabs({
  infos, lots, pieces, nbLots,
}: { infos: React.ReactNode; lots: React.ReactNode; pieces: React.ReactNode; nbLots: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const courant = (ONGLETS as readonly string[]).includes(params.get('onglet') ?? '') ? (params.get('onglet') as Onglet) : 'infos'

  return (
    <Tabs
      value={courant}
      onValueChange={(v) => router.replace(`${pathname}?onglet=${v}`, { scroll: false })}
    >
      <TabsList>
        <TabsTrigger value="infos">Informations</TabsTrigger>
        <TabsTrigger value="lots">Lots &amp; dossiers ({nbLots})</TabsTrigger>
        <TabsTrigger value="pieces">Pièces communes</TabsTrigger>
      </TabsList>
      <TabsContent value="infos">{infos}</TabsContent>
      <TabsContent value="lots">{lots}</TabsContent>
      <TabsContent value="pieces">{pieces}</TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 2: Section lots** — `lots-section.tsx` (serveur) : `Table` shadcn avec colonnes Lot (n° + intitulé) · Montant proposé · Résultat (`Badge`, `RESULTAT_LOT_LABELS`) · Dossier (barre de progression + « x/y pièces » ; lien d'ancre `#lot-<numero>`) · Actions (`LotFormDialog` si statut ∈ EN_ANALYSE/GO/DOSSIER_EN_PREPARATION, `LotResultatDialog` si statut ∈ EN_ATTENTE_ATTRIBUTION/ATTRIBUE_PROVISOIREMENT/GAGNEE/PERDUE, rien si `!canWrite`). Sous le tableau, pour chaque lot ayant un dossier : `<section id={'lot-' + numero}>` avec `<ChecklistView pieces={dossier.pieces} canWrite={canWrite && piecesModifiables(statut)} />`. Pied de tableau : totaux montant estimé / proposé et « n lots gagnés / total ». Colonnes secondaires masquées `< xl` (même approche que PR #10).
- [ ] **Step 3: `LotResultatDialog`** (client) : `Dialog` + `Select` du résultat ; champs motif (obligatoire), concurrent, montant concurrent affichés **uniquement** si `PERDU` ; appel `setResultatLot`, `toast` succès avec le nouveau statut de l'opportunité, `router.refresh()`.
- [ ] **Step 4: `LotFormDialog`** (client) : création/modification (numéro, intitulé, montants) via `createLot`/`updateLot` ; bouton suppression avec `AlertDialog` de confirmation (`deleteLot`) — message : « Supprimer ce lot supprime aussi son dossier et ses pièces. »
- [ ] **Step 5: `PiecesCommunes`** : même rendu que `ChecklistView` mais branché sur `updatePieceCommuneStatut` ; état vide « Les pièces communes seront créées au passage en "Dossier en préparation". »
- [ ] **Step 6: Page** : envelopper le contenu actuel de la fiche dans `infos`, et passer `lots`/`pieces`. Retirer du bloc Informations l'affichage des champs de résultat de l'opportunité (maintenant par lot) ; afficher à la place les agrégats.
- [ ] **Step 7: Vérif visuelle** (`preview_start`, base de test) aux largeurs 1920 / 768 / 375 : aucun débordement horizontal (`document.documentElement.scrollWidth <= innerWidth`), navigation clavier dans les onglets, 0 erreur console.
- [ ] **Step 8: Commit**

```bash
git add components/opportunites app/(dashboard)/opportunites lib/actions/opportunites.ts lib/utils/serialize.ts
git commit -m "feat(opportunites): fiche à onglets avec lots, dossiers et pièces communes"
```

---

### Task 8: Liste et formulaire opportunités

**Files:**
- Modify: `lib/actions/opportunites.ts:38` (`getOpportunites` : `_count: { select: { lots: true } }` + `lots: { select: { resultat: true, dossier: { select: { progression: true } } } }`), `components/opportunites/opportunite-list.tsx`, `components/opportunites/opportunite-form.tsx`, `lib/validations/opportunite.ts`, `components/opportunites/statut-changer-button.tsx`

- [ ] **Step 1:** Liste : sous l'objet (ligne secondaire, comme référence/autorité), afficher « n lot(s) · dossier x % » (moyenne des progressions) quand `nbLots > 0`.
- [ ] **Step 2:** Formulaire : retirer `montantPropose` et les champs post-perte (déplacés sur les lots) du formulaire et de `lib/validations/opportunite.ts`.
- [ ] **Step 3:** `statut-changer-button.tsx` : ne plus proposer ATTRIBUE_PROVISOIREMENT/GAGNEE/PERDUE quand l'opportunité a des lots ; afficher à la place un lien « Saisir les résultats par lot » → `?onglet=lots`. Retirer les champs post-perte du dialogue.
- [ ] **Step 4:** `npx tsc --noEmit` + vérif visuelle liste 375/1920.
- [ ] **Step 5: Commit** — `feat(opportunites): liste avec lots et avancement, résultats retirés du formulaire`

---

### Task 9: Analytique, exports et emails lisent les lots

**Files:**
- Modify: `lib/actions/analytics.ts`, `lib/actions/analytics-exports.ts`, `lib/actions/exports.ts`, `lib/analytics/types.ts`, `components/analytique/OpportunitesSection.tsx`, `lib/email/opportunite-reporting-templates.ts`, `components/marches/marche-detail.tsx`, `components/marches/marche-form.tsx`, `lib/validations/marche.ts`

- [ ] **Step 1:** Pour chaque fichier, remplacer la lecture de `opportunite.montantPropose / motifPerte / concurrentGagnant / montantOffreConcurrent` par la lecture des lots : montant proposé = somme `lots.montantPropose` ; analyse des pertes = lots `PERDU` (une ligne par lot) ; taux de réussite = lots `GAGNE` / lots avec résultat final, **`INFRUCTUEUX` compté à part** (design Q3). Vérifier d'abord pour `marche-*` si le champ lu est celui de `Marche` (propre au marché, **ne pas toucher**) ou de l'opportunité liée.
- [ ] **Step 2:** Emails de reporting : **ne jamais déclencher l'envoi pour tester**. Rendre le template avec des données fictives dans un test unitaire `tests/unit/reporting-template-lots.spec.ts` qui vérifie que le HTML contient le montant agrégé des lots.
- [ ] **Step 3:** `npx tsc --noEmit`, `npm run build` → succès.
- [ ] **Step 4: Commit** — `refactor(analytique): résultats et montants lus depuis les lots`

---

### Task 10: Création du marché à partir des lots gagnés

**Files:**
- Modify: `lib/actions/opportunites.ts:286-360` (`createMarcheFromOpportunite`)

- [ ] **Step 1:** Conserver la condition `statut === 'GAGNEE'`. Charger `lots` où `resultat = 'GAGNE'` ; montant pré-rempli = somme de leurs `montantPropose` ; objet du marché = `${objet} — Lots ${numeros.join(', ')}` si plusieurs lots au total, sinon l'objet seul.
- [ ] **Step 2:** `npx tsc --noEmit` ; test manuel sur base de test : opportunité à 2 lots (1 gagné, 1 perdu) → marché avec le montant du seul lot gagné.
- [ ] **Step 3: Commit** — `feat(marches): marché unique regroupant les lots gagnés`

---

### Task 11: Menu et redirections des anciennes routes

**Files:**
- Modify: `components/layout/dashboard-shell.tsx:61,77`, `app/(dashboard)/dossiers-offre/page.tsx`, `app/(dashboard)/dossiers-offre/[id]/page.tsx`, `app/(dashboard)/dossiers-offre/[id]/edit/page.tsx`, `app/(dashboard)/dossiers-offre/nouveau/page.tsx`

- [ ] **Step 1:** Retirer l'entrée `/dossiers-offre` du menu et du titre (l.61, l.77).
- [ ] **Step 2:** `[id]/page.tsx` et `[id]/edit/page.tsx` :

```tsx
import { notFound, permanentRedirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/utils/permissions'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const d = await prisma.dossierOffre.findUnique({ where: { id }, select: { opportuniteId: true, lot: { select: { numero: true } } } })
  if (!d?.opportuniteId) notFound()
  permanentRedirect(`/opportunites/${d.opportuniteId}?onglet=lots${d.lot ? `#lot-${d.lot.numero}` : ''}`)
}
```

- [ ] **Step 3:** `page.tsx` et `nouveau/page.tsx` : `permanentRedirect('/opportunites')`. Supprimer les composants devenus orphelins de `components/dossiers-offre/` **uniquement** s'ils ne sont plus importés (`ChecklistView` et `PieceStatutButton` restent utilisés par Task 7).
- [ ] **Step 4:** Vérifier : `/dossiers-offre/<id>` d'un dossier de test → 308 vers l'onglet ; `rg "dossiers-offre" app components lib` ne renvoie plus que les redirections.
- [ ] **Step 5: Commit** — `feat(navigation): dossiers d'offre intégrés à la fiche opportunité, anciennes routes redirigées`

---

### Task 12: Tests E2E de bout en bout

**Files:**
- Create: `tests/v1/lots-dossiers.spec.ts`
- Modify: `tests/helpers/test-data.ts` (si un helper de création d'opportunité existe, le réutiliser)

- [ ] **Step 1: Écrire les scénarios** (base `.env.test`, login via `tests/helpers/auth.ts`) :
  1. Opportunité en GO avec 2 lots → passage en « Dossier en préparation » → onglet Lots montre 2 dossiers ; onglet Pièces communes non vide.
  2. Cocher une pièce commune → la progression des 2 dossiers augmente.
  3. Passage en OFFRE_SOUMISE → boutons de statut des pièces désactivés.
  4. EN_ATTENTE_ATTRIBUTION → lot 1 GAGNE, lot 2 PERDU (motif) → badge opportunité « Gagnée ».
  5. Lot 2 INFRUCTUEUX seul sur une autre opportunité → « Perdue ».
  6. `/dossiers-offre/<id>` redirige vers `/opportunites/<oppId>?onglet=lots`.
- [ ] **Step 2:** Démarrer le serveur dev à l'avance (`preview_start`) puis : `npx playwright test tests/v1/lots-dossiers.spec.ts --project=chromium` → 6/6 PASS.
- [ ] **Step 3:** Non-régression : `npx playwright test tests/v1 --project=chromium` → aucun nouvel échec par rapport à `main` avant le chantier.
- [ ] **Step 4: Commit** — `test(e2e): cycle opportunité → lots → dossiers → résultat`

---

### Task 13: Phase 3 — suppression des anciens champs (GATE, hors exécution automatique)

**Ne pas exécuter dans la même session que le déploiement des tâches 1-12.** Prérequis : tâches 1-12 déployées en prod, vérifiées au moins une semaine, un cycle de reporting email observé sans erreur, **nouvelle sauvegarde** confirmée par Abel.

- [ ] Migration : `DROP COLUMN` `opportunites.montantPropose`, `motifPerte`, `concurrentGagnant`, `montantOffreConcurrent` ; `dossiers_offre.statut` ; `dossiers_offre.opportuniteId` (redondant avec `lot.opportuniteId`) après avoir remplacé ses usages ; `DossierOffre.lotId` rendu obligatoire.
- [ ] Plan séparé à écrire à ce moment-là, sur l'état réel du code.

---

## Déploiement (après Task 12)

1. Push `main` après validation Abel (dépôt public : relire le diff pour secrets/chemins locaux).
2. Tâche 3 step 5 (migration + reprise prod) **avant** que le code déployé n'en dépende : ordre = migration additive → reprise → déploiement `vercel --prod` → vérif visuelle prod (lecture seule).
3. Trace : `docs/audit/PROGRESS.md`, mémoire projet, entrée Journal (brouillon validé par Abel).
