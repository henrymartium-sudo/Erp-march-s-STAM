# Module SAV Véhicules 360° — Plan d'Implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformer le module Véhicules en hub opérationnel avec un module SAV complet (interventions, workflow statuts, métriques, vue globale).

**Architecture:** Extension non destructive du schéma Prisma existant (3 champs ajoutés sur `Vehicule`, nouveau modèle `Intervention`). Logique métier pure dans `lib/sav/`. UI intégrée dans la page détail véhicule existante + nouvelle page `/vehicules/sav` pour la vue globale.

**Tech Stack:** Next.js 15 App Router · Server Actions · Prisma 7 · shadcn/ui · Zod · TypeScript strict · Supabase (migrations via MCP `apply_migration`)

---

## Conventions critiques à respecter

```
Toast:   import { toast } from "@/lib/utils/toast"       // PAS sonner directement
Prisma:  import { prisma } from "@/lib/db/prisma"
Serialize: lib/utils/serialize.ts (PAS types/serialized.ts)
Types sérialisés: types/serialized.ts
Params async: const { id } = await params
Migration: MCP apply_migration (PAS prisma migrate dev — pooler Supabase lent)
```

---

## Task 1 — Extension schéma Prisma + migration Supabase

**Files:**
- Modify: `prisma/schema.prisma`

### Étape 1 : Modifier `prisma/schema.prisma`

Ajouter les 3 nouveaux champs dans le modèle `Vehicule` **après** le champ `statut` (ligne ~262) :

```prisma
  // SAV — champs garantie et statut opérationnel
  dateFinGarantie     DateTime?
  kilometrageGarantie Int?
  statutSAV           StatutSAV @default(EN_SERVICE)

  // SAV — interventions
  interventions       Intervention[]
```

Ajouter après l'enum `StatutVehicule` :

```prisma
enum StatutSAV {
  EN_SERVICE    // Opérationnel
  IMMOBILISE    // Immobilisé pour intervention SAV
  HORS_SERVICE  // Retiré du parc définitivement
}
```

Ajouter le nouveau modèle `Intervention` **avant** le modèle `AlerteDestinataire` :

```prisma
// ============================================
// SAV — INTERVENTIONS
// ============================================

model Intervention {
  id                     String             @id @default(cuid())
  vehiculeId             String
  type                   TypeIntervention
  statut                 StatutIntervention @default(SIGNALE)
  sousGarantie           Boolean            @default(true)
  signaleAt              DateTime           @default(now())
  immobiliseAt           DateTime?
  resolveAt              DateTime?
  cout                   Decimal?           @db.Decimal(10, 2)
  description            String?            @db.Text
  commentaireContractuel String?            @db.Text
  createdAt              DateTime           @default(now())
  updatedAt              DateTime           @updatedAt

  vehicule Vehicule @relation(fields: [vehiculeId], references: [id], onDelete: Cascade)

  @@map("interventions")
  @@index([vehiculeId])
  @@index([statut])
  @@index([type])
}

enum TypeIntervention {
  PANNE
  ENTRETIEN
  RAPPEL
}

enum StatutIntervention {
  SIGNALE
  DIAGNOSTIC
  EN_COURS
  RESOLU
  CLOS
}
```

### Étape 2 : Appliquer la migration via MCP Supabase

Utiliser l'outil MCP `apply_migration` avec le nom `add_sav_module` et la requête SQL :

```sql
-- Enum StatutSAV
CREATE TYPE "StatutSAV" AS ENUM ('EN_SERVICE', 'IMMOBILISE', 'HORS_SERVICE');

-- Enum TypeIntervention
CREATE TYPE "TypeIntervention" AS ENUM ('PANNE', 'ENTRETIEN', 'RAPPEL');

-- Enum StatutIntervention
CREATE TYPE "StatutIntervention" AS ENUM ('SIGNALE', 'DIAGNOSTIC', 'EN_COURS', 'RESOLU', 'CLOS');

-- Extension table vehicules (non destructif)
ALTER TABLE "vehicules"
  ADD COLUMN IF NOT EXISTS "dateFinGarantie" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "kilometrageGarantie" INTEGER,
  ADD COLUMN IF NOT EXISTS "statutSAV" "StatutSAV" NOT NULL DEFAULT 'EN_SERVICE';

-- Nouvelle table interventions
CREATE TABLE IF NOT EXISTS "interventions" (
  "id"                     TEXT NOT NULL,
  "vehiculeId"             TEXT NOT NULL,
  "type"                   "TypeIntervention" NOT NULL,
  "statut"                 "StatutIntervention" NOT NULL DEFAULT 'SIGNALE',
  "sousGarantie"           BOOLEAN NOT NULL DEFAULT true,
  "signaleAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "immobiliseAt"           TIMESTAMP(3),
  "resolveAt"              TIMESTAMP(3),
  "cout"                   DECIMAL(10,2),
  "description"            TEXT,
  "commentaireContractuel" TEXT,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interventions_pkey" PRIMARY KEY ("id")
);

-- Foreign key
ALTER TABLE "interventions"
  ADD CONSTRAINT "interventions_vehiculeId_fkey"
  FOREIGN KEY ("vehiculeId") REFERENCES "vehicules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index
CREATE INDEX IF NOT EXISTS "interventions_vehiculeId_idx" ON "interventions"("vehiculeId");
CREATE INDEX IF NOT EXISTS "interventions_statut_idx" ON "interventions"("statut");
CREATE INDEX IF NOT EXISTS "interventions_type_idx" ON "interventions"("type");
```

### Étape 3 : Régénérer le client Prisma

```bash
npx prisma generate
```

Vérifier : pas d'erreur de génération.

### Étape 4 : Commit

```bash
git add prisma/schema.prisma
git commit -m "feat(sav): extension schema prisma + migration SAV"
```

---

## Task 2 — Types sérialisés + fonctions de sérialisation

**Files:**
- Modify: `types/serialized.ts`
- Modify: `lib/utils/serialize.ts`

### Étape 1 : Mettre à jour `types/serialized.ts`

Ajouter l'import des nouveaux enums en haut du fichier :

```typescript
import type { TypeCaution, StatutCaution, TypeMarche, StatutMarche, StatutVehicule, StatutSAV, TypeIntervention, StatutIntervention } from '@prisma/client'
```

Ajouter l'interface `SerializedIntervention` après `SerializedVehicule` :

```typescript
// ============================================================================
// INTERVENTION SÉRIALISÉE
// ============================================================================

export interface SerializedIntervention {
  id: string
  vehiculeId: string
  type: TypeIntervention
  statut: StatutIntervention
  sousGarantie: boolean
  signaleAt: string           // Date -> ISO string
  immobiliseAt: string | null // Date -> ISO string
  resolveAt: string | null    // Date -> ISO string
  cout: number | null         // Decimal -> number
  description: string | null
  commentaireContractuel: string | null
  createdAt: string           // Date -> ISO string
  updatedAt: string           // Date -> ISO string
  vehicule?: {
    id: string
    immatriculation: string
    marque: string
    modele: string
  }
}
```

Étendre `SerializedVehicule` avec les champs SAV (ajouter après `statut`) :

```typescript
  // SAV
  dateFinGarantie: string | null     // Date -> ISO string
  kilometrageGarantie: number | null
  statutSAV: StatutSAV
  interventions?: SerializedIntervention[]
```

### Étape 2 : Mettre à jour `lib/utils/serialize.ts`

Ajouter `SerializedIntervention` dans l'import :

```typescript
import type { SerializedMarche, SerializedCaution, SerializedVehicule, SerializedIntervention } from '@/types/serialized'
```

Dans `serializeVehicule`, ajouter la sérialisation des nouveaux champs après `dateReceptionDefinitive` :

```typescript
    dateFinGarantie: vehicule.dateFinGarantie instanceof Date
      ? vehicule.dateFinGarantie.toISOString()
      : vehicule.dateFinGarantie
        ? String(vehicule.dateFinGarantie)
        : null,
    kilometrageGarantie: vehicule.kilometrageGarantie ?? null,
    // interventions sérialisées si présentes
    interventions: vehicule.interventions
      ? vehicule.interventions.map((i: any) => serializeIntervention(i))
      : undefined,
```

Ajouter la fonction `serializeIntervention` à la fin du fichier :

```typescript
/**
 * Sérialise une intervention Prisma en objet plain pour le passage aux Client Components.
 */
export function serializeIntervention(intervention: any): SerializedIntervention {
  return {
    ...intervention,
    cout: intervention.cout != null
      ? (typeof intervention.cout === 'number' ? intervention.cout : Number(intervention.cout))
      : null,
    signaleAt: intervention.signaleAt instanceof Date
      ? intervention.signaleAt.toISOString()
      : String(intervention.signaleAt),
    immobiliseAt: intervention.immobiliseAt instanceof Date
      ? intervention.immobiliseAt.toISOString()
      : intervention.immobiliseAt ? String(intervention.immobiliseAt) : null,
    resolveAt: intervention.resolveAt instanceof Date
      ? intervention.resolveAt.toISOString()
      : intervention.resolveAt ? String(intervention.resolveAt) : null,
    createdAt: intervention.createdAt instanceof Date
      ? intervention.createdAt.toISOString()
      : String(intervention.createdAt),
    updatedAt: intervention.updatedAt instanceof Date
      ? intervention.updatedAt.toISOString()
      : String(intervention.updatedAt),
  }
}
```

### Étape 3 : Commit

```bash
git add types/serialized.ts lib/utils/serialize.ts
git commit -m "feat(sav): types serialisés + sérialisation Intervention"
```

---

## Task 3 — Constantes SAV (labels + couleurs)

**Files:**
- Modify: `lib/constants/vehicule.ts`
- Create: `lib/constants/intervention.ts`

### Étape 1 : Ajouter dans `lib/constants/vehicule.ts`

Ajouter les imports nécessaires en haut :

```typescript
import { StatutVehicule, StatutSAV } from "@prisma/client";
```

Ajouter après les constantes existantes :

```typescript
/**
 * Libellés des statuts SAV
 */
export const STATUT_SAV_LABELS: Record<StatutSAV, string> = {
  EN_SERVICE: "En service",
  IMMOBILISE: "Immobilisé",
  HORS_SERVICE: "Hors service",
};

/**
 * Couleurs des statuts SAV
 */
export const STATUT_SAV_COLORS: Record<StatutSAV, "success" | "warning" | "destructive"> = {
  EN_SERVICE: "success",
  IMMOBILISE: "warning",
  HORS_SERVICE: "destructive",
};
```

### Étape 2 : Créer `lib/constants/intervention.ts`

```typescript
import { TypeIntervention, StatutIntervention } from "@prisma/client";

export const TYPE_INTERVENTION_LABELS: Record<TypeIntervention, string> = {
  PANNE: "Panne",
  ENTRETIEN: "Entretien",
  RAPPEL: "Rappel constructeur",
};

export const STATUT_INTERVENTION_LABELS: Record<StatutIntervention, string> = {
  SIGNALE: "Signalé",
  DIAGNOSTIC: "En diagnostic",
  EN_COURS: "En cours",
  RESOLU: "Résolu",
  CLOS: "Clos",
};

export const STATUT_INTERVENTION_COLORS: Record<
  StatutIntervention,
  "secondary" | "warning" | "default" | "success" | "muted"
> = {
  SIGNALE: "secondary",
  DIAGNOSTIC: "warning",
  EN_COURS: "default",
  RESOLU: "success",
  CLOS: "muted",
};
```

### Étape 3 : Commit

```bash
git add lib/constants/vehicule.ts lib/constants/intervention.ts
git commit -m "feat(sav): constantes labels/couleurs SAV + interventions"
```

---

## Task 4 — Permission `canWriteSAV`

**Files:**
- Modify: `lib/utils/permissions.ts`

### Étape 1 : Ajouter la fonction

Ajouter après `isExploitation()` :

```typescript
/**
 * Détermine si un rôle peut créer/modifier des interventions SAV.
 * ADMIN, AVANCE et EXPLOITATION peuvent écrire dans le SAV.
 */
export function canWriteSAV(role?: string | null): boolean {
  return role === 'ADMIN' || role === 'AVANCE' || role === 'EXPLOITATION'
}

/**
 * Détermine si un rôle peut ajouter un commentaire contractuel sur une intervention.
 * Réservé à ADMIN et AVANCE.
 */
export function canWriteCommentaireContractuel(role?: string | null): boolean {
  return role === 'ADMIN' || role === 'AVANCE'
}
```

### Étape 2 : Commit

```bash
git add lib/utils/permissions.ts
git commit -m "feat(sav): permissions canWriteSAV + canWriteCommentaireContractuel"
```

---

## Task 5 — Workflow SAV (`lib/sav/workflow.ts`)

**Files:**
- Create: `lib/sav/workflow.ts`

### Étape 1 : Créer le dossier et le fichier

```bash
mkdir -p lib/sav
```

Créer `lib/sav/workflow.ts` :

```typescript
import type { StatutIntervention } from '@prisma/client'

// ============================================================================
// TRANSITIONS AUTORISÉES
// ============================================================================

const TRANSITIONS: Record<StatutIntervention, StatutIntervention[]> = {
  SIGNALE: ['DIAGNOSTIC', 'CLOS'],       // Peut passer direct en CLOS si résolu immédiatement
  DIAGNOSTIC: ['EN_COURS', 'RESOLU'],
  EN_COURS: ['RESOLU'],
  RESOLU: ['CLOS'],
  CLOS: [],                              // Terminal
}

/**
 * Vérifie si une transition de statut d'intervention est autorisée.
 */
export function isTransitionInterventionValid(
  from: StatutIntervention,
  to: StatutIntervention
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Retourne la liste des statuts accessibles depuis un statut donné.
 */
export function getAvailableStatutsIntervention(
  from: StatutIntervention
): StatutIntervention[] {
  return TRANSITIONS[from] ?? []
}

/**
 * Retourne true si le statut est terminal (aucune transition possible).
 */
export function isStatutInterventionTerminal(statut: StatutIntervention): boolean {
  return TRANSITIONS[statut].length === 0
}

// ============================================================================
// CALCULS MÉTIER
// ============================================================================

/**
 * Calcule la durée d'immobilisation en jours.
 * Retourne null si l'immobilisation n'est pas renseignée ou si le véhicule n'est pas encore sorti.
 */
export function calculerDureeImmobilisation(
  immobiliseAt: Date | string | null,
  resolveAt: Date | string | null
): number | null {
  if (!immobiliseAt) return null
  const debut = new Date(immobiliseAt)
  const fin = resolveAt ? new Date(resolveAt) : new Date()
  const diffMs = fin.getTime() - debut.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

/**
 * Détermine si une intervention est couverte par la garantie.
 * Basé sur la dateFinGarantie du véhicule comparée à la date du signalement.
 *
 * @param dateFinGarantie - Date de fin de garantie du véhicule (null = pas de garantie renseignée)
 * @param dateReference - Date de référence (généralement la date de signalement de l'intervention)
 */
export function estSousGarantie(
  dateFinGarantie: Date | string | null,
  dateReference: Date | string
): boolean {
  if (!dateFinGarantie) return false
  return new Date(dateFinGarantie) > new Date(dateReference)
}
```

### Étape 2 : Commit

```bash
git add lib/sav/workflow.ts
git commit -m "feat(sav): logique métier workflow interventions"
```

---

## Task 6 — Métriques SAV (`lib/sav/metrics.ts`)

**Files:**
- Create: `lib/sav/metrics.ts`

### Étape 1 : Créer `lib/sav/metrics.ts`

```typescript
import { prisma } from '@/lib/db/prisma'
import { calculerDureeImmobilisation } from './workflow'

// ============================================================================
// MÉTRIQUES PAR VÉHICULE
// ============================================================================

/**
 * Calcule le taux de disponibilité d'un véhicule (en %).
 * Formule : (1 - jours_immobilisé / jours_depuis_livraison) × 100
 * Retourne 100 si le véhicule n'a jamais été immobilisé ou n'a pas de date de livraison.
 */
export async function calculerTauxDisponibilite(vehiculeId: string): Promise<number> {
  const vehicule = await prisma.vehicule.findUnique({
    where: { id: vehiculeId },
    select: {
      dateLivraison: true,
      interventions: {
        select: { immobiliseAt: true, resolveAt: true },
        where: { immobiliseAt: { not: null } },
      },
    },
  })

  if (!vehicule || !vehicule.dateLivraison) return 100

  const joursTotal = calculerDureeImmobilisation(vehicule.dateLivraison, new Date()) ?? 0
  if (joursTotal === 0) return 100

  const joursImmobilise = vehicule.interventions.reduce((acc, i) => {
    return acc + (calculerDureeImmobilisation(i.immobiliseAt, i.resolveAt) ?? 0)
  }, 0)

  const taux = (1 - Math.min(joursImmobilise, joursTotal) / joursTotal) * 100
  return Math.round(taux * 10) / 10  // Arrondi à 1 décimale
}

/**
 * Calcule le temps moyen d'immobilisation en jours pour un véhicule.
 * Retourne null s'il n'y a aucune immobilisation résolue.
 */
export async function calculerTempsMoyenImmobilisation(vehiculeId: string): Promise<number | null> {
  const interventions = await prisma.intervention.findMany({
    where: {
      vehiculeId,
      immobiliseAt: { not: null },
      resolveAt: { not: null },
    },
    select: { immobiliseAt: true, resolveAt: true },
  })

  if (interventions.length === 0) return null

  const durees = interventions
    .map((i) => calculerDureeImmobilisation(i.immobiliseAt, i.resolveAt))
    .filter((d): d is number => d !== null)

  if (durees.length === 0) return null

  return Math.round(durees.reduce((a, b) => a + b, 0) / durees.length)
}

/**
 * Compte le nombre d'incidents couverts par la garantie pour un véhicule.
 */
export async function compterIncidentsGarantie(vehiculeId: string): Promise<number> {
  return prisma.intervention.count({
    where: { vehiculeId, sousGarantie: true },
  })
}

// ============================================================================
// MÉTRIQUES GLOBALES (pour la page SAV)
// ============================================================================

export interface MetriquesSAVGlobales {
  totalInterventions: number
  enCours: number          // SIGNALE + DIAGNOSTIC + EN_COURS
  resolues: number         // RESOLU + CLOS
  sousGarantie: number
  vehiculesImmobilises: number
}

export async function getMetriquesSAVGlobales(): Promise<MetriquesSAVGlobales> {
  const [total, enCours, resolues, sousGarantie, vehiculesImmobilises] = await Promise.all([
    prisma.intervention.count(),
    prisma.intervention.count({
      where: { statut: { in: ['SIGNALE', 'DIAGNOSTIC', 'EN_COURS'] } },
    }),
    prisma.intervention.count({
      where: { statut: { in: ['RESOLU', 'CLOS'] } },
    }),
    prisma.intervention.count({ where: { sousGarantie: true } }),
    prisma.vehicule.count({ where: { statutSAV: 'IMMOBILISE' } }),
  ])

  return { totalInterventions: total, enCours, resolues, sousGarantie, vehiculesImmobilises }
}
```

### Étape 2 : Commit

```bash
git add lib/sav/metrics.ts
git commit -m "feat(sav): métriques taux disponibilité + temps immobilisation"
```

---

## Task 7 — Validations Zod interventions

**Files:**
- Create: `lib/validations/intervention.ts`
- Modify: `lib/validations/vehicule.ts`

### Étape 1 : Créer `lib/validations/intervention.ts`

```typescript
import { z } from 'zod'
import { TypeIntervention, StatutIntervention } from '@prisma/client'

export const createInterventionSchema = z.object({
  vehiculeId: z.string().min(1, "L'ID du véhicule est obligatoire"),
  type: z.nativeEnum(TypeIntervention),
  sousGarantie: z.boolean().default(true),
  signaleAt: z.date().optional(),
  immobiliseAt: z.date().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  cout: z.number().min(0).optional().nullable(),
})

export const updateInterventionStatutSchema = z.object({
  id: z.string().min(1),
  statut: z.nativeEnum(StatutIntervention),
  immobiliseAt: z.date().optional().nullable(),
  resolveAt: z.date().optional().nullable(),
})

export const updateCommentaireContractuelSchema = z.object({
  id: z.string().min(1),
  commentaireContractuel: z.string().max(2000).nullable(),
})

export const filterInterventionsSchema = z.object({
  vehiculeId: z.string().optional(),
  type: z.nativeEnum(TypeIntervention).optional(),
  statut: z.nativeEnum(StatutIntervention).optional(),
  sousGarantie: z.boolean().optional(),
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().positive().max(100).default(50).optional(),
})

export type CreateInterventionInput = z.infer<typeof createInterventionSchema>
export type UpdateInterventionStatutInput = z.infer<typeof updateInterventionStatutSchema>
export type UpdateCommentaireContractuelInput = z.infer<typeof updateCommentaireContractuelSchema>
export type FilterInterventionsInput = z.infer<typeof filterInterventionsSchema>
```

### Étape 2 : Étendre `lib/validations/vehicule.ts`

Ajouter l'import des nouveaux enums en haut :

```typescript
import { z } from "zod";
import { StatutVehicule, StatutSAV } from "@prisma/client";
```

Dans `createVehiculeSchema`, ajouter après `statut` :

```typescript
  // SAV
  dateFinGarantie: z.date().optional().nullable(),
  kilometrageGarantie: z
    .number()
    .int()
    .min(0, "Le kilométrage doit être positif")
    .max(9999999)
    .optional()
    .nullable(),
  statutSAV: z.nativeEnum(StatutSAV).default(StatutSAV.EN_SERVICE).optional(),
```

### Étape 3 : Commit

```bash
git add lib/validations/intervention.ts lib/validations/vehicule.ts
git commit -m "feat(sav): schémas Zod interventions + extension vehicule"
```

---

## Task 8 — Server Actions interventions

**Files:**
- Create: `lib/actions/interventions.ts`

### Étape 1 : Créer `lib/actions/interventions.ts`

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import {
  createInterventionSchema,
  updateInterventionStatutSchema,
  updateCommentaireContractuelSchema,
  filterInterventionsSchema,
  type FilterInterventionsInput,
} from '@/lib/validations/intervention'
import {
  requireAuth,
  requireDelete,
  canWriteSAV,
  canWriteCommentaireContractuel,
} from '@/lib/utils/permissions'
import { isTransitionInterventionValid, estSousGarantie } from '@/lib/sav/workflow'
import type { ActionResult } from '@/types'
import type { Intervention } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'
import type { PaginatedResponse } from '@/types/pagination'

// ============================================================================
// Types
// ============================================================================

export interface InterventionWithVehicule extends Intervention {
  vehicule: {
    id: string
    immatriculation: string
    marque: string
    modele: string
  }
}

// ============================================================================
// CREATE
// ============================================================================

export async function createIntervention(data: unknown): Promise<ActionResult<Intervention>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string }).role
    if (!canWriteSAV(role)) {
      return { success: false, error: "Vous n'avez pas les permissions pour créer une intervention" }
    }

    const validated = createInterventionSchema.parse(data)

    // Détection automatique garantie
    const vehicule = await prisma.vehicule.findUnique({
      where: { id: validated.vehiculeId },
      select: { dateFinGarantie: true },
    })

    const sousGarantie = vehicule?.dateFinGarantie
      ? estSousGarantie(vehicule.dateFinGarantie, validated.signaleAt ?? new Date())
      : validated.sousGarantie

    const intervention = await prisma.intervention.create({
      data: {
        ...validated,
        sousGarantie,
        cout: validated.cout != null ? new Prisma.Decimal(validated.cout) : null,
      },
    })

    revalidatePath('/vehicules')
    revalidatePath(`/vehicules/${validated.vehiculeId}`)
    revalidatePath('/vehicules/sav')

    return { success: true, data: intervention }
  } catch (error) {
    if (error instanceof ZodError) {
      const msgs = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
      return { success: false, error: `Erreur de validation : ${msgs.join(', ')}` }
    }
    console.error('Erreur création intervention:', error)
    return { success: false, error: "Une erreur inattendue est survenue lors de la création de l'intervention" }
  }
}

// ============================================================================
// UPDATE STATUT
// ============================================================================

export async function updateInterventionStatut(data: unknown): Promise<ActionResult<Intervention>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string }).role
    if (!canWriteSAV(role)) {
      return { success: false, error: "Vous n'avez pas les permissions pour modifier cette intervention" }
    }

    const validated = updateInterventionStatutSchema.parse(data)

    // Récupérer le statut actuel
    const current = await prisma.intervention.findUnique({
      where: { id: validated.id },
      select: { statut: true, vehiculeId: true },
    })

    if (!current) return { success: false, error: 'Intervention introuvable' }

    // Vérifier la transition
    if (!isTransitionInterventionValid(current.statut, validated.statut)) {
      return {
        success: false,
        error: `Transition invalide : ${current.statut} → ${validated.statut}`,
      }
    }

    const intervention = await prisma.intervention.update({
      where: { id: validated.id },
      data: {
        statut: validated.statut,
        immobiliseAt: validated.immobiliseAt ?? undefined,
        resolveAt: validated.resolveAt ?? undefined,
      },
    })

    // Mettre à jour statutSAV du véhicule selon le nouveau statut
    if (validated.statut === 'EN_COURS') {
      await prisma.vehicule.update({
        where: { id: current.vehiculeId },
        data: { statutSAV: 'IMMOBILISE' },
      })
    } else if (validated.statut === 'RESOLU' || validated.statut === 'CLOS') {
      // Vérifier si d'autres interventions EN_COURS existent sur ce véhicule
      const autresEnCours = await prisma.intervention.count({
        where: {
          vehiculeId: current.vehiculeId,
          statut: { in: ['EN_COURS', 'SIGNALE', 'DIAGNOSTIC'] },
          id: { not: validated.id },
        },
      })
      if (autresEnCours === 0) {
        await prisma.vehicule.update({
          where: { id: current.vehiculeId },
          data: { statutSAV: 'EN_SERVICE' },
        })
      }
    }

    revalidatePath(`/vehicules/${current.vehiculeId}`)
    revalidatePath('/vehicules/sav')

    return { success: true, data: intervention }
  } catch (error) {
    if (error instanceof ZodError) {
      const msgs = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
      return { success: false, error: `Erreur de validation : ${msgs.join(', ')}` }
    }
    console.error('Erreur update statut intervention:', error)
    return { success: false, error: "Une erreur inattendue est survenue lors de la mise à jour du statut" }
  }
}

// ============================================================================
// UPDATE COMMENTAIRE CONTRACTUEL (ADMIN/AVANCE seulement)
// ============================================================================

export async function updateCommentaireContractuel(data: unknown): Promise<ActionResult<Intervention>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string }).role
    if (!canWriteCommentaireContractuel(role)) {
      return { success: false, error: "Seuls les rôles ADMIN et AVANCE peuvent ajouter un commentaire contractuel" }
    }

    const validated = updateCommentaireContractuelSchema.parse(data)

    const intervention = await prisma.intervention.update({
      where: { id: validated.id },
      data: { commentaireContractuel: validated.commentaireContractuel },
    })

    revalidatePath('/vehicules/sav')

    return { success: true, data: intervention }
  } catch (error) {
    console.error('Erreur update commentaire:', error)
    return { success: false, error: "Une erreur inattendue est survenue" }
  }
}

// ============================================================================
// DELETE (ADMIN/AVANCE seulement)
// ============================================================================

export async function deleteIntervention(id: string): Promise<ActionResult> {
  try {
    await requireDelete()

    const intervention = await prisma.intervention.findUnique({
      where: { id },
      select: { vehiculeId: true },
    })

    if (!intervention) return { success: false, error: 'Intervention introuvable' }

    await prisma.intervention.delete({ where: { id } })

    revalidatePath(`/vehicules/${intervention.vehiculeId}`)
    revalidatePath('/vehicules/sav')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Erreur suppression intervention:', error)
    return { success: false, error: "Erreur lors de la suppression de l'intervention" }
  }
}

// ============================================================================
// READ — Par véhicule
// ============================================================================

export async function getInterventionsByVehiculeId(
  vehiculeId: string
): Promise<Intervention[]> {
  try {
    await requireAuth()
    return prisma.intervention.findMany({
      where: { vehiculeId },
      orderBy: { signaleAt: 'desc' },
    })
  } catch (error) {
    console.error('Erreur lecture interventions:', error)
    return []
  }
}

// ============================================================================
// READ — Liste globale paginée
// ============================================================================

export async function getInterventionsGlobales(
  filters: FilterInterventionsInput = {}
): Promise<ActionResult<PaginatedResponse<InterventionWithVehicule>>> {
  try {
    await requireAuth()

    const validated = filterInterventionsSchema.parse(filters)
    const { vehiculeId, type, statut, sousGarantie, page, limit } = validated
    const { skip, take } = getPrismaSkipTake({ page, limit })

    const where: Prisma.InterventionWhereInput = {
      ...(vehiculeId && { vehiculeId }),
      ...(type && { type }),
      ...(statut && { statut }),
      ...(sousGarantie !== undefined && { sousGarantie }),
    }

    const [interventions, total] = await Promise.all([
      prisma.intervention.findMany({
        where,
        include: {
          vehicule: {
            select: { id: true, immatriculation: true, marque: true, modele: true },
          },
        },
        orderBy: { signaleAt: 'desc' },
        skip,
        take,
      }),
      prisma.intervention.count({ where }),
    ])

    const pagination = calculatePagination(total, page, limit)

    return {
      success: true,
      data: { data: interventions as InterventionWithVehicule[], pagination },
    }
  } catch (error) {
    console.error('Erreur lecture interventions globales:', error)
    return { success: false, error: 'Erreur lors de la récupération des interventions' }
  }
}
```

### Étape 2 : Commit

```bash
git add lib/actions/interventions.ts
git commit -m "feat(sav): server actions CRUD interventions + workflow statut"
```

---

## Task 9 — Badge statut intervention

**Files:**
- Create: `components/interventions/statut-intervention-badge.tsx`

### Étape 1 : Créer le composant

```tsx
import { Badge } from '@/components/ui/badge'
import { STATUT_INTERVENTION_LABELS, STATUT_INTERVENTION_COLORS } from '@/lib/constants/intervention'
import type { StatutIntervention } from '@prisma/client'
import { cn } from '@/lib/utils'

interface StatutInterventionBadgeProps {
  statut: StatutIntervention
  size?: 'sm' | 'md' | 'lg'
}

export function StatutInterventionBadge({ statut, size = 'md' }: StatutInterventionBadgeProps) {
  const label = STATUT_INTERVENTION_LABELS[statut]
  const colorVariant = STATUT_INTERVENTION_COLORS[statut]

  return (
    <Badge
      variant={colorVariant as any}
      className={cn({
        'text-xs px-2 py-0.5': size === 'sm',
        'text-sm px-3 py-1': size === 'md',
        'text-base px-4 py-1.5': size === 'lg',
      })}
    >
      {label}
    </Badge>
  )
}
```

### Étape 2 : Commit

```bash
git add components/interventions/statut-intervention-badge.tsx
git commit -m "feat(sav): badge statut intervention"
```

---

## Task 10 — Dialog de création d'intervention

**Files:**
- Create: `components/interventions/create-intervention-dialog.tsx`

### Étape 1 : Créer le composant

```tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TypeIntervention } from '@prisma/client'
import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/lib/utils/toast'
import { createIntervention } from '@/lib/actions/interventions'
import { TYPE_INTERVENTION_LABELS } from '@/lib/constants/intervention'

const schema = z.object({
  type: z.nativeEnum(TypeIntervention),
  sousGarantie: z.boolean().default(true),
  description: z.string().max(2000).optional(),
})

type FormValues = z.infer<typeof schema>

interface CreateInterventionDialogProps {
  vehiculeId: string
  vehiculeImmat: string
}

export function CreateInterventionDialog({ vehiculeId, vehiculeImmat }: CreateInterventionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: TypeIntervention.PANNE, sousGarantie: true },
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const result = await createIntervention({ ...values, vehiculeId })
      if (result.success) {
        toast.success('Intervention créée avec succès')
        setOpen(false)
        form.reset()
      } else {
        toast.error(result.error ?? 'Erreur lors de la création')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Signaler une intervention
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle intervention — {vehiculeImmat}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type d'intervention</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TYPE_INTERVENTION_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sous garantie */}
            <FormField
              control={form.control}
              name="sousGarantie"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>Sous garantie</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrire le problème ou l'intervention..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Création...' : 'Créer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

### Étape 2 : Commit

```bash
git add components/interventions/create-intervention-dialog.tsx
git commit -m "feat(sav): dialog création intervention"
```

---

## Task 11 — Tableau des interventions d'un véhicule

**Files:**
- Create: `components/interventions/interventions-table.tsx`

### Étape 1 : Créer le composant

```tsx
'use client'

import { useState, useTransition } from 'react'
import type { Intervention, StatutIntervention } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Trash2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { StatutInterventionBadge } from './statut-intervention-badge'
import {
  TYPE_INTERVENTION_LABELS,
  STATUT_INTERVENTION_LABELS,
} from '@/lib/constants/intervention'
import { updateInterventionStatut, deleteIntervention } from '@/lib/actions/interventions'
import { getAvailableStatutsIntervention } from '@/lib/sav/workflow'
import { toast } from '@/lib/utils/toast'
import { formatDateLong } from '@/lib/utils/format'

interface InterventionsTableProps {
  interventions: Intervention[]
  canWrite: boolean
  canDelete: boolean
}

export function InterventionsTable({ interventions, canWrite, canDelete }: InterventionsTableProps) {
  const [isPending, startTransition] = useTransition()

  if (interventions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic text-center py-6">
        Aucune intervention enregistrée
      </p>
    )
  }

  function handleChangeStatut(id: string, statut: StatutIntervention) {
    startTransition(async () => {
      const result = await updateInterventionStatut({ id, statut })
      if (result.success) {
        toast.success('Statut mis à jour')
      } else {
        toast.error(result.error ?? 'Erreur lors de la mise à jour')
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette intervention ?')) return
    startTransition(async () => {
      const result = await deleteIntervention(id)
      if (result.success) {
        toast.success('Intervention supprimée')
      } else {
        toast.error(result.error ?? 'Erreur lors de la suppression')
      }
    })
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Garantie</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          {canWrite && <TableHead className="w-[100px]">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {interventions.map((intervention) => {
          const disponibles = getAvailableStatutsIntervention(intervention.statut)
          return (
            <TableRow key={intervention.id}>
              <TableCell className="font-medium">
                {TYPE_INTERVENTION_LABELS[intervention.type]}
              </TableCell>
              <TableCell>
                {canWrite && disponibles.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-auto p-0" disabled={isPending}>
                        <StatutInterventionBadge statut={intervention.statut} size="sm" />
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {disponibles.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => handleChangeStatut(intervention.id, s)}
                        >
                          → {STATUT_INTERVENTION_LABELS[s]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <StatutInterventionBadge statut={intervention.statut} size="sm" />
                )}
              </TableCell>
              <TableCell>
                <Badge variant={intervention.sousGarantie ? 'success' : 'secondary'} className="text-xs">
                  {intervention.sousGarantie ? 'Garantie' : 'Hors garantie'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateLong(intervention.signaleAt.toISOString())}
              </TableCell>
              <TableCell className="text-sm max-w-[200px] truncate">
                {intervention.description || '—'}
              </TableCell>
              {canWrite && (
                <TableCell>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(intervention.id)}
                      disabled={isPending}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
```

### Étape 2 : Commit

```bash
git add components/interventions/interventions-table.tsx
git commit -m "feat(sav): tableau interventions avec changement statut inline"
```

---

## Task 12 — Intégration SAV dans VehiculeDetail

**Files:**
- Modify: `components/vehicules/vehicule-detail.tsx`
- Modify: `app/(dashboard)/vehicules/[id]/page.tsx`
- Modify: `lib/actions/vehicules.ts`

### Étape 1 : Mettre à jour `lib/actions/vehicules.ts`

Dans `getVehiculeById`, inclure les interventions :

```typescript
// Dans l'appel prisma.vehicule.findUnique, ajouter dans include :
interventions: {
  orderBy: { signaleAt: 'desc' },
},
```

Et dans l'objet retourné, ajouter :
```typescript
interventions: vehicule.interventions,
```

### Étape 2 : Mettre à jour `app/(dashboard)/vehicules/[id]/page.tsx`

Ajouter l'import de `canWriteSAV` et passer les props supplémentaires :

```typescript
import { canWrite, canWriteSAV, canWriteCommentaireContractuel } from '@/lib/utils/permissions'
// ...
const userCanWriteSAV = canWriteSAV(role)
const userCanWriteCommentaire = canWriteCommentaireContractuel(role)
// ...
<VehiculeDetail
  vehicule={serializedVehicule}
  canWrite={userCanWrite}
  canWriteSAV={userCanWriteSAV}
  canWriteCommentaire={userCanWriteCommentaire}
/>
```

### Étape 3 : Modifier `components/vehicules/vehicule-detail.tsx`

Ajouter les imports en haut :

```typescript
import { Wrench } from 'lucide-react'
import { InterventionsTable } from '@/components/interventions/interventions-table'
import { CreateInterventionDialog } from '@/components/interventions/create-intervention-dialog'
import { STATUT_SAV_LABELS, STATUT_SAV_COLORS } from '@/lib/constants/vehicule'
import { Badge } from '@/components/ui/badge'
import { formatDateLong } from '@/lib/utils/format'
import type { SerializedIntervention } from '@/types/serialized'
import type { Intervention } from '@prisma/client'
```

Étendre l'interface `VehiculeDetailProps` :

```typescript
interface VehiculeDetailProps {
  vehicule: SerializedVehicule
  canWrite?: boolean
  canWriteSAV?: boolean
  canWriteCommentaire?: boolean
}
```

Ajouter la section SAV dans le JSX, après la carte "Dates et livraison" et avant "Réserves" :

```tsx
{/* Section SAV */}
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="flex items-center gap-2">
        <Wrench className="h-5 w-5" />
        SAV — Interventions
      </CardTitle>
      <div className="flex items-center gap-2">
        <Badge variant={STATUT_SAV_COLORS[vehicule.statutSAV] as any} className="text-xs">
          {STATUT_SAV_LABELS[vehicule.statutSAV]}
        </Badge>
        {canWriteSAV && (
          <CreateInterventionDialog
            vehiculeId={vehicule.id}
            vehiculeImmat={vehicule.immatriculation}
          />
        )}
      </div>
    </div>
  </CardHeader>
  <CardContent>
    {vehicule.dateFinGarantie && (
      <p className="text-sm text-muted-foreground mb-4">
        Garantie jusqu'au : <span className="font-medium text-foreground">{formatDateLong(vehicule.dateFinGarantie)}</span>
        {vehicule.kilometrageGarantie && (
          <span> · {vehicule.kilometrageGarantie.toLocaleString('fr-FR')} km</span>
        )}
      </p>
    )}
    <InterventionsTable
      interventions={(vehicule.interventions ?? []) as unknown as Intervention[]}
      canWrite={canWriteSAV ?? false}
      canDelete={canWrite ?? false}
    />
  </CardContent>
</Card>
```

### Étape 4 : Commit

```bash
git add components/vehicules/vehicule-detail.tsx app/(dashboard)/vehicules/[id]/page.tsx lib/actions/vehicules.ts
git commit -m "feat(sav): intégration section SAV dans page détail véhicule"
```

---

## Task 13 — Extension formulaire véhicule (champs garantie)

**Files:**
- Modify: `components/vehicules/vehicule-form.tsx`

### Étape 1 : Ajouter les champs dans `vehicule-form.tsx`

Lire le fichier entier d'abord. Ajouter les 2 champs après les champs de livraison existants (après `reservesReception`).

Le pattern à suivre pour `dateFinGarantie` (Calendar, comme `dateLivraison`) :

```tsx
{/* Date fin de garantie */}
<FormField
  control={form.control}
  name="dateFinGarantie"
  render={({ field }) => (
    <FormItem className="flex flex-col">
      <FormLabel>Date de fin de garantie</FormLabel>
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
            >
              {field.value ? format(field.value, 'dd/MM/yyyy', { locale: fr }) : "Sélectionner"}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={field.value || undefined}
            onSelect={field.onChange}
            locale={fr}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  )}
/>

{/* Kilométrage garantie */}
<FormField
  control={form.control}
  name="kilometrageGarantie"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Kilométrage garantie (km)</FormLabel>
      <FormControl>
        <Input
          type="number"
          placeholder="Ex: 100000"
          {...field}
          value={field.value ?? ''}
          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Étape 2 : Commit

```bash
git add components/vehicules/vehicule-form.tsx
git commit -m "feat(sav): champs garantie dans formulaire véhicule"
```

---

## Task 14 — Page globale SAV `/vehicules/sav`

**Files:**
- Create: `app/(dashboard)/vehicules/sav/page.tsx`
- Create: `app/(dashboard)/vehicules/sav/loading.tsx`

### Étape 1 : Créer `app/(dashboard)/vehicules/sav/loading.tsx`

```tsx
import { ListSkeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return <ListSkeleton count={8} />
}
```

### Étape 2 : Créer `app/(dashboard)/vehicules/sav/page.tsx`

```tsx
import { auth } from '@/lib/auth/auth.config'
import { redirect } from 'next/navigation'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getInterventionsGlobales } from '@/lib/actions/interventions'
import { getMetriquesSAVGlobales } from '@/lib/sav/metrics'
import { StatutInterventionBadge } from '@/components/interventions/statut-intervention-badge'
import { TYPE_INTERVENTION_LABELS } from '@/lib/constants/intervention'
import { formatDateLong } from '@/lib/utils/format'
import Link from 'next/link'
import { Wrench, AlertTriangle, CheckCircle, Shield, TruckIcon } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SAVPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [interventionsResult, metriques] = await Promise.all([
    getInterventionsGlobales({ limit: 50 }),
    getMetriquesSAVGlobales(),
  ])

  const interventions = interventionsResult.success ? interventionsResult.data.data : []

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        showHome
        items={[
          { label: 'Véhicules', href: '/vehicules' },
          { label: 'SAV — Vue globale' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SAV — Vue globale</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivi des interventions sur l'ensemble du parc
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{metriques.totalInterventions}</p>
                <p className="text-xs text-muted-foreground">Total interventions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{metriques.enCours}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{metriques.sousGarantie}</p>
                <p className="text-xs text-muted-foreground">Sous garantie</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TruckIcon className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{metriques.vehiculesImmobilises}</p>
                <p className="text-xs text-muted-foreground">Véhicules immobilisés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste interventions */}
      <Card>
        <CardHeader>
          <CardTitle>Dernières interventions</CardTitle>
        </CardHeader>
        <CardContent>
          {interventions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">
              Aucune intervention enregistrée
            </p>
          ) : (
            <div className="space-y-3">
              {interventions.map((intervention) => (
                <div
                  key={intervention.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatutInterventionBadge statut={intervention.statut} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {TYPE_INTERVENTION_LABELS[intervention.type]}
                        {intervention.sousGarantie && (
                          <Badge variant="default" className="ml-2 text-xs">Garantie</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(intervention as any).vehicule?.immatriculation} —{' '}
                        {(intervention as any).vehicule?.marque} {(intervention as any).vehicule?.modele}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {formatDateLong(intervention.signaleAt.toISOString())}
                    </span>
                    <Link
                      href={`/vehicules/${intervention.vehiculeId}`}
                      className="text-xs text-stam-accent hover:underline"
                    >
                      Voir →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### Étape 3 : Ajouter le lien SAV dans la navigation (sidebar)

Dans `components/layout/dashboard-shell.tsx`, vérifier si les véhicules ont un sous-menu ou ajouter un lien `/vehicules/sav` dans la section véhicules.

### Étape 4 : Commit

```bash
git add app/(dashboard)/vehicules/sav/
git commit -m "feat(sav): page globale SAV avec KPIs + liste interventions"
```

---

## Task 15 — Vérification build TypeScript

### Étape 1 : Lancer le build

```bash
npx tsc --noEmit
```

**Attendu** : Zéro erreur TypeScript.

Si des erreurs apparaissent :
- Erreurs sur `SerializedVehicule.statutSAV` → vérifier que `types/serialized.ts` est bien mis à jour
- Erreurs sur `Intervention` non trouvé → vérifier `npx prisma generate` bien exécuté
- Erreurs sur `canWriteSAV` non exporté → vérifier `lib/utils/permissions.ts`

### Étape 2 : Vérification Next.js build

```bash
npm run build
```

**Attendu** : Build réussi sans erreurs.

### Étape 3 : Commit final

```bash
git add .
git commit -m "feat(sav): module SAV véhicules 360° — TERMINÉ"
```

---

## Récapitulatif des fichiers

| Fichier | Action |
|---------|--------|
| `prisma/schema.prisma` | Modifié — +3 champs Vehicule + modèle Intervention + enums |
| `types/serialized.ts` | Modifié — +SerializedIntervention + extension SerializedVehicule |
| `lib/utils/serialize.ts` | Modifié — +serializeIntervention + dateFinGarantie/statutSAV |
| `lib/constants/vehicule.ts` | Modifié — +STATUT_SAV_LABELS/COLORS |
| `lib/constants/intervention.ts` | Créé |
| `lib/utils/permissions.ts` | Modifié — +canWriteSAV/canWriteCommentaireContractuel |
| `lib/sav/workflow.ts` | Créé |
| `lib/sav/metrics.ts` | Créé |
| `lib/validations/intervention.ts` | Créé |
| `lib/validations/vehicule.ts` | Modifié — +champs SAV |
| `lib/actions/interventions.ts` | Créé |
| `lib/actions/vehicules.ts` | Modifié — include interventions |
| `components/interventions/statut-intervention-badge.tsx` | Créé |
| `components/interventions/create-intervention-dialog.tsx` | Créé |
| `components/interventions/interventions-table.tsx` | Créé |
| `components/vehicules/vehicule-detail.tsx` | Modifié — section SAV |
| `components/vehicules/vehicule-form.tsx` | Modifié — champs garantie |
| `app/(dashboard)/vehicules/sav/page.tsx` | Créé |
| `app/(dashboard)/vehicules/sav/loading.tsx` | Créé |
