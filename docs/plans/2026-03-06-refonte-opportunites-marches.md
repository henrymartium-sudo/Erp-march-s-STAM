# Refonte Opportunités / Marchés — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Séparer clairement les responsabilités des modules Opportunités (cycle pré-attribution complet) et Marchés (post-attribution uniquement), avec lien bidirectionnel entre les deux.

**Architecture:** Stratégie "Grandfather Clause" — aucune modification des données existantes, enum `StatutMarche` conservé intégralement, `StatutOpportunite` étendu avec 4 nouveaux statuts et migration douce des données. Lien bidirectionnel via nouveau champ `opportuniteId` sur `Marche`.

**Tech Stack:** Next.js 15 App Router · Prisma 7 · PostgreSQL (Supabase) · shadcn/ui · Zod · React Hook Form · Playwright (E2E)

**Design doc:** `docs/plans/2026-03-06-refonte-opportunites-marches-design.md`

---

## Task 1 : Migration base de données

**Files:**
- Modify: `prisma/schema.prisma`
- Migration via MCP Supabase `apply_migration`

### Étape 1 — Appliquer la migration SQL via MCP Supabase

Utiliser l'outil MCP `apply_migration` avec le nom `refonte_opportunites_marches` et le SQL suivant :

```sql
-- 1. Ajouter les nouvelles valeurs à l'enum StatutOpportunite
ALTER TYPE "StatutOpportunite" ADD VALUE IF NOT EXISTS 'DOSSIER_EN_PREPARATION';
ALTER TYPE "StatutOpportunite" ADD VALUE IF NOT EXISTS 'OFFRE_SOUMISE';
ALTER TYPE "StatutOpportunite" ADD VALUE IF NOT EXISTS 'EN_ATTENTE_ATTRIBUTION';
ALTER TYPE "StatutOpportunite" ADD VALUE IF NOT EXISTS 'ATTRIBUE_PROVISOIREMENT';

-- 2. Migrer les données existantes
-- IDENTIFIEE → EN_ANALYSE (les 11 opportunités concernées)
UPDATE opportunites SET statut = 'EN_ANALYSE' WHERE statut = 'IDENTIFIEE';
-- SOUMISE → OFFRE_SOUMISE
UPDATE opportunites SET statut = 'OFFRE_SOUMISE' WHERE statut = 'SOUMISE';

-- 3. Nouveaux champs sur opportunites
ALTER TABLE opportunites
  ADD COLUMN IF NOT EXISTS "motifPerte" TEXT,
  ADD COLUMN IF NOT EXISTS "concurrentGagnant" TEXT,
  ADD COLUMN IF NOT EXISTS "montantOffreConcurrent" DECIMAL(15,2);

-- 4. Nouveau champ opportuniteId sur marches (lien bidirectionnel)
ALTER TABLE marches
  ADD COLUMN IF NOT EXISTS "opportuniteId" TEXT;

ALTER TABLE marches
  ADD CONSTRAINT IF NOT EXISTS "marches_opportuniteId_fkey"
  FOREIGN KEY ("opportuniteId") REFERENCES opportunites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "marches_opportuniteId_idx" ON marches("opportuniteId");
```

### Étape 2 — Mettre à jour `prisma/schema.prisma`

Remplacer l'enum `StatutOpportunite` :

```prisma
enum StatutOpportunite {
  EN_ANALYSE
  GO
  NO_GO
  DOSSIER_EN_PREPARATION
  OFFRE_SOUMISE
  EN_ATTENTE_ATTRIBUTION
  ATTRIBUE_PROVISOIREMENT
  GAGNEE
  PERDUE
}
```

Ajouter les champs à `model Opportunite` (après `notes`) :

```prisma
  motifPerte             String?   @db.Text
  concurrentGagnant      String?
  montantOffreConcurrent Decimal?  @db.Decimal(15, 2)
```

Ajouter le champ à `model Marche` (après `dossiers`) :

```prisma
  opportuniteId  String?
  opportunite    Opportunite? @relation("MarcheOpportunite", fields: [opportuniteId], references: [id], onDelete: SetNull)
```

Ajouter la relation inverse sur `model Opportunite` (en bas des relations, après `dossiers`) :

```prisma
  marches        Marche[]     @relation("MarcheOpportunite")
```

> **Note :** La relation existante `opportunites Opportunite[]` sur `Marche` (côté liste depuis opportunite.marcheId) reste inchangée. La nouvelle relation `MarcheOpportunite` est un lien nommé distinct.

### Étape 3 — Régénérer le client Prisma

```bash
cd "C:/Users/HP/Documents/claude projets/projet ERP marchés/ERP Marchés STAM Final"
npx prisma generate
```

Vérifier : pas d'erreur TypeScript dans le terminal.

### Étape 4 — Commit

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): étendre StatutOpportunite + champs motifPerte + lien bidirectionnel opportuniteId"
```

---

## Task 2 : workflow-statuts-opportunite.ts

**Files:**
- Create: `lib/utils/workflow-statuts-opportunite.ts`

### Étape 1 — Créer le fichier

```typescript
import { StatutOpportunite } from '@prisma/client'

/**
 * Transitions autorisées pour chaque statut d'opportunité.
 * Statuts terminaux : tableau vide (aucune transition possible).
 */
const TRANSITIONS_OPPORTUNITE: Record<StatutOpportunite, StatutOpportunite[]> = {
  EN_ANALYSE:              ['GO', 'NO_GO'],
  GO:                      ['DOSSIER_EN_PREPARATION', 'NO_GO'],
  NO_GO:                   [],
  DOSSIER_EN_PREPARATION:  ['OFFRE_SOUMISE'],
  OFFRE_SOUMISE:           ['EN_ATTENTE_ATTRIBUTION'],
  EN_ATTENTE_ATTRIBUTION:  ['ATTRIBUE_PROVISOIREMENT', 'PERDUE'],
  ATTRIBUE_PROVISOIREMENT: ['GAGNEE', 'PERDUE'],
  GAGNEE:                  [],
  PERDUE:                  [],
}

export function isTransitionValidOpportunite(
  from: StatutOpportunite,
  to: StatutOpportunite
): boolean {
  if (from === to) return true
  return TRANSITIONS_OPPORTUNITE[from].includes(to)
}

export function getAvailableStatutsOpportunite(
  from: StatutOpportunite
): StatutOpportunite[] {
  return [from, ...TRANSITIONS_OPPORTUNITE[from]]
}

export function isTerminalOpportunite(statut: StatutOpportunite): boolean {
  return TRANSITIONS_OPPORTUNITE[statut].length === 0
}

/**
 * Statuts nécessitant un commentaire obligatoire lors de la transition.
 */
export const COMMENTAIRE_OBLIGATOIRE_OPPORTUNITE: StatutOpportunite[] = [
  'NO_GO',
  'PERDUE',
]

/**
 * Chemin principal (hors terminaux latéraux).
 */
export const CHEMIN_PRINCIPAL_OPPORTUNITE: StatutOpportunite[] = [
  'EN_ANALYSE',
  'GO',
  'DOSSIER_EN_PREPARATION',
  'OFFRE_SOUMISE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
  'GAGNEE',
]

/**
 * Statuts terminaux.
 */
export const TERMINAUX_OPPORTUNITE: StatutOpportunite[] = [
  'NO_GO',
  'PERDUE',
  'GAGNEE',
]
```

### Étape 2 — Vérifier qu'il compile

```bash
npx tsc --noEmit
```

Attendu : aucune erreur liée à ce fichier.

### Étape 3 — Commit

```bash
git add lib/utils/workflow-statuts-opportunite.ts
git commit -m "feat(workflow): transitions statuts opportunités"
```

---

## Task 3 : Mise à jour workflow-statuts.ts

**Files:**
- Modify: `lib/utils/workflow-statuts.ts`

### Étape 1 — Modifier CHEMIN_PRINCIPAL

Le chemin principal du module Marchés commence désormais à `ATTRIBUE_DEFINITIVEMENT`. Remplacer la constante `CHEMIN_PRINCIPAL` :

```typescript
export const CHEMIN_PRINCIPAL: StatutMarche[] = [
  'ATTRIBUE_DEFINITIVEMENT',
  'EN_ATTENTE_LIVRAISON_OS',
  'EN_EXECUTION',
  'EXECUTE_ATTENTE_GARANTIES',
  'CLOTURE',
]
```

> **Note :** Les TRANSITIONS restent inchangées — les statuts legacy (`OPPORTUNITE_IDENTIFIEE`, etc.) gardent leurs transitions pour les marchés existants. Seul l'affichage dans le stepper change.

### Étape 2 — Vérifier qu'il compile

```bash
npx tsc --noEmit
```

### Étape 3 — Commit

```bash
git add lib/utils/workflow-statuts.ts
git commit -m "fix(workflow): CHEMIN_PRINCIPAL marchés démarre à ATTRIBUE_DEFINITIVEMENT"
```

---

## Task 4 : Mise à jour lib/validations/opportunite.ts

**Files:**
- Modify: `lib/validations/opportunite.ts`

### Étape 1 — Remplacer le contenu complet

```typescript
import { z } from 'zod'

// ============================================================================
// ENUM
// ============================================================================

export const statutOpportuniteEnum = z.enum([
  'EN_ANALYSE',
  'GO',
  'NO_GO',
  'DOSSIER_EN_PREPARATION',
  'OFFRE_SOUMISE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
  'GAGNEE',
  'PERDUE',
])

export type StatutOpportuniteInput = z.infer<typeof statutOpportuniteEnum>

// ============================================================================
// LABELS ET COULEURS
// ============================================================================

export const STATUT_OPPORTUNITE_LABELS: Record<string, string> = {
  EN_ANALYSE:              'En analyse',
  GO:                      'GO',
  NO_GO:                   'No Go',
  DOSSIER_EN_PREPARATION:  'Dossier en préparation',
  OFFRE_SOUMISE:           'Offre soumise',
  EN_ATTENTE_ATTRIBUTION:  'En attente d\'attribution',
  ATTRIBUE_PROVISOIREMENT: 'Attribué provisoirement',
  GAGNEE:                  'Gagnée',
  PERDUE:                  'Perdue',
}

export const STATUT_OPPORTUNITE_COLORS: Record<string, string> = {
  EN_ANALYSE:              'info',
  GO:                      'success',
  NO_GO:                   'danger',
  DOSSIER_EN_PREPARATION:  'warning',
  OFFRE_SOUMISE:           'warning',
  EN_ATTENTE_ATTRIBUTION:  'warning',
  ATTRIBUE_PROVISOIREMENT: 'warning',
  GAGNEE:                  'success',
  PERDUE:                  'muted',
}

// ============================================================================
// HELPER DATE PREPROCESS
// ============================================================================

const preprocessDate = (val: unknown) => {
  if (!val || val === '') return undefined
  if (val instanceof Date) return val
  if (typeof val === 'string') return new Date(val)
  return val
}

// ============================================================================
// SCHÉMAS
// ============================================================================

export const formOpportuniteSchema = z.object({
  reference:             z.string().max(100).optional().nullable(),
  objet:                 z.string().min(1, "L'objet est requis").max(500),
  autoriteContractante:  z.string().min(1, "L'autorité contractante est requise").max(200),
  montantEstime:         z.number().positive('Le montant estimé doit être positif').max(999999999999999).optional().nullable(),
  datePublication:       z.date().optional().nullable(),
  dateLimite:            z.date().optional().nullable(),
  statut:                statutOpportuniteEnum,
  probabiliteGain:       z.number().int().min(0).max(100).optional().nullable(),
  notes:                 z.string().optional().nullable(),
  marcheId:              z.string().optional().nullable(),
  // Champs PERDUE
  motifPerte:            z.string().optional().nullable(),
  concurrentGagnant:     z.string().max(200).optional().nullable(),
  montantOffreConcurrent: z.number().positive().max(999999999999999).optional().nullable(),
})

export type FormOpportuniteInput = z.infer<typeof formOpportuniteSchema>

export const createOpportuniteSchema = z.object({
  reference: z.string().max(100).optional().nullable(),

  objet: z
    .string()
    .min(1, "L'objet est requis")
    .max(500, "L'objet ne peut pas dépasser 500 caractères"),

  autoriteContractante: z
    .string()
    .min(1, "L'autorité contractante est requise")
    .max(200, "Le nom ne peut pas dépasser 200 caractères"),

  montantEstime: z
    .number()
    .positive('Le montant estimé doit être positif')
    .max(999999999999999, 'Montant trop élevé')
    .optional()
    .nullable(),

  datePublication: z.preprocess(preprocessDate, z.date().optional().nullable()),
  dateLimite:      z.preprocess(preprocessDate, z.date().optional().nullable()),

  statut: statutOpportuniteEnum.default('EN_ANALYSE'),

  probabiliteGain: z
    .number()
    .int()
    .min(0, 'La probabilité doit être entre 0 et 100')
    .max(100, 'La probabilité doit être entre 0 et 100')
    .optional()
    .nullable(),

  notes:   z.string().optional().nullable(),
  marcheId: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().optional().nullable()
  ),

  motifPerte:             z.string().optional().nullable(),
  concurrentGagnant:      z.string().max(200).optional().nullable(),
  montantOffreConcurrent: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().positive().max(999999999999999).optional().nullable()
  ),
})

export const updateOpportuniteSchema = createOpportuniteSchema.partial().extend({
  id: z.string().cuid(),
})

export type CreateOpportuniteInput = z.infer<typeof createOpportuniteSchema>
export type UpdateOpportuniteInput = z.infer<typeof updateOpportuniteSchema>
```

### Étape 2 — Vérifier TypeScript

```bash
npx tsc --noEmit
```

Corriger toute erreur de type avant de continuer.

### Étape 3 — Commit

```bash
git add lib/validations/opportunite.ts
git commit -m "feat(validations): nouveaux statuts opportunité + champs PERDUE"
```

---

## Task 5 : Server Action changerStatutOpportunite

**Files:**
- Create: `lib/actions/statuts-opportunite.ts`

### Étape 1 — Créer le fichier

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { StatutOpportunite } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import {
  isTransitionValidOpportunite,
  COMMENTAIRE_OBLIGATOIRE_OPPORTUNITE,
} from '@/lib/utils/workflow-statuts-opportunite'
import { STATUT_OPPORTUNITE_LABELS } from '@/lib/validations/opportunite'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import type { ActionResult } from '@/types'

const changerStatutOpportuniteSchema = z.object({
  opportuniteId:         z.string().min(1),
  newStatut:             z.nativeEnum(StatutOpportunite),
  commentaire:           z.string().optional(),
  // Champs optionnels si newStatut === 'PERDUE'
  motifPerte:            z.string().optional().nullable(),
  concurrentGagnant:     z.string().max(200).optional().nullable(),
  montantOffreConcurrent: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().positive().max(999999999999999).optional().nullable()
  ),
})

export async function changerStatutOpportunite(
  data: unknown
): Promise<ActionResult<{ statut: StatutOpportunite }>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const parsed = changerStatutOpportuniteSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }

    const {
      opportuniteId,
      newStatut,
      commentaire,
      motifPerte,
      concurrentGagnant,
      montantOffreConcurrent,
    } = parsed.data

    // 1. Récupérer le statut actuel
    const opportunite = await prisma.opportunite.findUnique({
      where: { id: opportuniteId },
      select: { statut: true, objet: true },
    })

    if (!opportunite) {
      return { success: false, error: 'Opportunité introuvable.' }
    }

    // 2. Vérifier la transition
    if (!isTransitionValidOpportunite(opportunite.statut, newStatut)) {
      return {
        success: false,
        error: `Transition interdite : "${STATUT_OPPORTUNITE_LABELS[opportunite.statut]}" → "${STATUT_OPPORTUNITE_LABELS[newStatut]}".`,
      }
    }

    // 3. Commentaire obligatoire pour NO_GO et PERDUE
    if (
      COMMENTAIRE_OBLIGATOIRE_OPPORTUNITE.includes(newStatut) &&
      !commentaire?.trim()
    ) {
      return {
        success: false,
        error: 'Un commentaire est obligatoire pour cette transition.',
      }
    }

    // 4. Mise à jour
    const updateData: Record<string, unknown> = { statut: newStatut }
    if (newStatut === 'PERDUE') {
      updateData.motifPerte = motifPerte ?? null
      updateData.concurrentGagnant = concurrentGagnant ?? null
      updateData.montantOffreConcurrent = montantOffreConcurrent ?? null
    }

    await prisma.opportunite.update({
      where: { id: opportuniteId },
      data: updateData,
    })

    // 5. Audit log
    await logAction({
      action: AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.OPPORTUNITE,
      entityId: opportuniteId,
      metadata: {
        ancienStatut: opportunite.statut,
        nouveauStatut: newStatut,
        commentaire: commentaire?.trim() || null,
      },
    })

    revalidatePath(`/opportunites/${opportuniteId}`)
    revalidatePath('/opportunites')

    return { success: true, data: { statut: newStatut } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Données invalides.' }
    }
    console.error('changerStatutOpportunite error:', error)
    return { success: false, error: 'Erreur lors du changement de statut.' }
  }
}
```

### Étape 2 — Vérifier TypeScript

```bash
npx tsc --noEmit
```

### Étape 3 — Commit

```bash
git add lib/actions/statuts-opportunite.ts
git commit -m "feat(sa): changerStatutOpportunite avec audit log + champs PERDUE"
```

---

## Task 6 : Server Action createMarcheFromOpportunite

**Files:**
- Modify: `lib/actions/opportunites.ts`

### Étape 1 — Ajouter les imports nécessaires

En haut du fichier `lib/actions/opportunites.ts`, ajouter aux imports existants :

```typescript
import type { StatutMarche } from '@prisma/client'
```

### Étape 2 — Ajouter la fonction en bas du fichier

```typescript
// ============================================================================
// CRÉER UN MARCHÉ DEPUIS UNE OPPORTUNITÉ GAGNÉE
// ============================================================================

export async function createMarcheFromOpportunite(
  opportuniteId: string
): Promise<ActionResult<{ marcheId: string }>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const userId = (session.user as { id?: string } | undefined)?.id
    if (!userId) return { success: false, error: 'Utilisateur introuvable' }

    // 1. Vérifier que l'opportunité est bien GAGNEE
    const opportunite = await prisma.opportunite.findUnique({
      where: { id: opportuniteId },
      select: {
        id: true,
        statut: true,
        objet: true,
        autoriteContractante: true,
        montantEstime: true,
        reference: true,
      },
    })

    if (!opportunite) {
      return { success: false, error: 'Opportunité introuvable.' }
    }

    if (opportunite.statut !== 'GAGNEE') {
      return {
        success: false,
        error: 'Seule une opportunité en statut GAGNÉE peut générer un marché.',
      }
    }

    // 2. Générer un numéro de marché temporaire unique
    const count = await prisma.marche.count()
    const numeroTemp = `MARCHE-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

    // 3. Créer le marché en transaction
    const marche = await prisma.$transaction(async (tx) => {
      const newMarche = await tx.marche.create({
        data: {
          numero:                  numeroTemp,
          objet:                   opportunite.objet,
          type:                    'FOURNITURES',
          montant:                 opportunite.montantEstime ?? 0,
          dateNotification:        new Date(),
          delaiExecution:          0,
          statut:                  'ATTRIBUE_DEFINITIVEMENT' as StatutMarche,
          autoriteContractanteNom: opportunite.autoriteContractante,
          userId,
          opportuniteId,
        },
      })

      // Lier l'opportunité au marché (sens inverse)
      await tx.opportunite.update({
        where: { id: opportuniteId },
        data: { marcheId: newMarche.id },
      })

      return newMarche
    })

    await logAction({
      action: AUDIT_ACTION.CREATE,
      entityType: 'MARCHE',
      entityId: marche.id,
      metadata: {
        source: 'opportunite',
        opportuniteId,
        objet: marche.objet,
      },
    })

    revalidatePath(`/opportunites/${opportuniteId}`)
    revalidatePath('/marches')

    return { success: true, data: { marcheId: marche.id } }
  } catch (error) {
    console.error('createMarcheFromOpportunite error:', error)
    return { success: false, error: 'Erreur lors de la création du marché.' }
  }
}
```

### Étape 3 — Vérifier TypeScript

```bash
npx tsc --noEmit
```

### Étape 4 — Commit

```bash
git add lib/actions/opportunites.ts
git commit -m "feat(sa): createMarcheFromOpportunite — crée marché depuis opportunité GAGNÉE"
```

---

## Task 7 : Composant StatutChangerButton pour Opportunités

**Files:**
- Create: `components/opportunites/statut-changer-button.tsx`

Ce composant est modélisé sur `components/marches/statut-changer-button.tsx` avec deux différences : affichage des champs PERDUE conditionnellement, et pas de stepper visuel (à ajouter en V2 si besoin).

### Étape 1 — Créer le fichier

```typescript
'use client'

import { useState, useTransition } from 'react'
import { StatutOpportunite } from '@prisma/client'
import { ArrowLeftRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  getAvailableStatutsOpportunite,
  COMMENTAIRE_OBLIGATOIRE_OPPORTUNITE,
} from '@/lib/utils/workflow-statuts-opportunite'
import {
  STATUT_OPPORTUNITE_LABELS,
  STATUT_OPPORTUNITE_COLORS,
} from '@/lib/validations/opportunite'
import { changerStatutOpportunite } from '@/lib/actions/statuts-opportunite'
import { toast } from '@/lib/utils/toast'

interface StatutChangerOpportuniteButtonProps {
  opportuniteId: string
  currentStatut: StatutOpportunite
  onStatutChanged?: (newStatut: StatutOpportunite) => void
}

export function StatutChangerOpportuniteButton({
  opportuniteId,
  currentStatut,
  onStatutChanged,
}: StatutChangerOpportuniteButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedStatut, setSelectedStatut] = useState<StatutOpportunite | ''>('')
  const [commentaire, setCommentaire] = useState('')
  const [motifPerte, setMotifPerte] = useState('')
  const [concurrentGagnant, setConcurrentGagnant] = useState('')
  const [montantConcurrent, setMontantConcurrent] = useState('')
  const [isPending, startTransition] = useTransition()

  const availableStatuts = getAvailableStatutsOpportunite(currentStatut).filter(
    (s) => s !== currentStatut
  )

  const needsComment =
    selectedStatut !== '' &&
    COMMENTAIRE_OBLIGATOIRE_OPPORTUNITE.includes(selectedStatut as StatutOpportunite)

  const isPerdue = selectedStatut === 'PERDUE'

  function handleClose() {
    setOpen(false)
    setSelectedStatut('')
    setCommentaire('')
    setMotifPerte('')
    setConcurrentGagnant('')
    setMontantConcurrent('')
  }

  function handleSubmit() {
    if (!selectedStatut) return

    if (needsComment && !commentaire.trim()) {
      toast.error('Un commentaire est obligatoire pour cette transition.')
      return
    }

    startTransition(async () => {
      const result = await changerStatutOpportunite({
        opportuniteId,
        newStatut: selectedStatut,
        commentaire: commentaire.trim() || undefined,
        motifPerte: isPerdue ? motifPerte.trim() || null : null,
        concurrentGagnant: isPerdue ? concurrentGagnant.trim() || null : null,
        montantOffreConcurrent: isPerdue && montantConcurrent
          ? parseFloat(montantConcurrent)
          : null,
      })

      if (result.success) {
        toast.success(`Statut changé : ${STATUT_OPPORTUNITE_LABELS[result.data.statut]}`)
        handleClose()
        onStatutChanged?.(result.data.statut)
      } else {
        toast.error(result.error ?? 'Erreur lors du changement de statut.')
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={availableStatuts.length === 0}
      >
        <ArrowLeftRight className="h-4 w-4 mr-1.5" />
        Statut
      </Button>

      <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Changer le statut</SheetTitle>
            <SheetDescription>
              Sélectionnez le nouveau statut de l&apos;opportunité.
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-5">
            {/* Statut actuel */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Statut actuel</p>
              <Badge variant={STATUT_OPPORTUNITE_COLORS[currentStatut] as 'success' | 'warning' | 'danger' | 'info' | 'muted'}>
                {STATUT_OPPORTUNITE_LABELS[currentStatut]}
              </Badge>
            </div>

            {/* Select nouveau statut */}
            <div className="space-y-1.5">
              <Label htmlFor="new-statut">Nouveau statut *</Label>
              <Select
                value={selectedStatut}
                onValueChange={(v) => setSelectedStatut(v as StatutOpportunite)}
              >
                <SelectTrigger id="new-statut">
                  <SelectValue placeholder="Choisir un statut..." />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuts.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUT_OPPORTUNITE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Commentaire */}
            {selectedStatut && (
              <div className="space-y-1.5">
                <Label htmlFor="commentaire">
                  {needsComment ? 'Commentaire *' : 'Commentaire (optionnel)'}
                </Label>
                <Textarea
                  id="commentaire"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder={
                    needsComment
                      ? 'Expliquez la raison de ce changement...'
                      : 'Note sur ce changement (facultatif)'
                  }
                  rows={3}
                />
              </div>
            )}

            {/* Champs spécifiques PERDUE */}
            {isPerdue && (
              <div className="space-y-3 border rounded-md p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Informations sur la perte (optionnel)
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="motif-perte">Motif de la perte</Label>
                  <Textarea
                    id="motif-perte"
                    value={motifPerte}
                    onChange={(e) => setMotifPerte(e.target.value)}
                    placeholder="Prix trop élevé, délai non respecté..."
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="concurrent">Concurrent retenu</Label>
                  <Input
                    id="concurrent"
                    value={concurrentGagnant}
                    onChange={(e) => setConcurrentGagnant(e.target.value)}
                    placeholder="Nom de l'entreprise gagnante"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="montant-concurrent">Montant de l&apos;offre concurrente (XOF)</Label>
                  <Input
                    id="montant-concurrent"
                    type="number"
                    value={montantConcurrent}
                    onChange={(e) => setMontantConcurrent(e.target.value)}
                    placeholder="45000000"
                  />
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isPending}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedStatut || isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Confirmer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
```

### Étape 2 — Vérifier TypeScript

```bash
npx tsc --noEmit
```

### Étape 3 — Commit

```bash
git add components/opportunites/statut-changer-button.tsx
git commit -m "feat(ui): StatutChangerOpportuniteButton avec champs PERDUE conditionnels"
```

---

## Task 8 : Mise à jour OpportuniteForm

**Files:**
- Modify: `components/opportunites/opportunite-form.tsx`

### Étape 1 — Modifications à apporter

**a) Remplacer le tableau STATUTS** (ligne ~44) :

```typescript
const STATUTS: StatutOpportuniteInput[] = [
  'EN_ANALYSE',
  'GO',
  'NO_GO',
  'DOSSIER_EN_PREPARATION',
  'OFFRE_SOUMISE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
  'GAGNEE',
  'PERDUE',
]
```

**b) Modifier la valeur par défaut du statut** dans `defaultValues` :

```typescript
statut: opportunite?.statut ?? 'EN_ANALYSE',
```

**c) Ajouter les nouveaux champs dans `defaultValues`** (après `marcheId`) :

```typescript
motifPerte:             (opportunite as unknown as { motifPerte?: string | null })?.motifPerte ?? '',
concurrentGagnant:      (opportunite as unknown as { concurrentGagnant?: string | null })?.concurrentGagnant ?? '',
montantOffreConcurrent: (opportunite as unknown as { montantOffreConcurrent?: number | null })?.montantOffreConcurrent ?? undefined,
```

**d) Ajouter les imports** (en haut, après l'import de `FormOpportuniteInput`) :

```typescript
import type { StatutOpportuniteInput } from '@/lib/validations/opportunite'
```

**e) Ajouter les champs PERDUE dans le JSX** — après le champ Notes et avant le bloc Actions :

```tsx
{/* Champs PERDUE — affichés uniquement si statut = PERDUE */}
{form.watch('statut') === 'PERDUE' && (
  <div className="border rounded-md p-4 space-y-4 bg-muted/30">
    <p className="text-sm font-medium text-muted-foreground">
      Informations sur la perte (optionnel)
    </p>
    <FormField
      control={form.control}
      name="motifPerte"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Motif de la perte</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Prix trop élevé, délai non respecté..."
              rows={2}
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="concurrentGagnant"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Concurrent retenu</FormLabel>
            <FormControl>
              <Input
                placeholder="Nom de l'entreprise gagnante"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="montantOffreConcurrent"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Montant offre concurrente (XOF)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="45000000"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  </div>
)}
```

### Étape 2 — Vérifier TypeScript

```bash
npx tsc --noEmit
```

### Étape 3 — Commit

```bash
git add components/opportunites/opportunite-form.tsx
git commit -m "feat(ui): OpportuniteForm — nouveaux statuts + champs PERDUE conditionnels"
```

---

## Task 9 : Mise à jour page détail Opportunité

**Files:**
- Modify: `app/(dashboard)/opportunites/[id]/page.tsx`

Cette page est un **Server Component**. Elle doit :
1. Afficher le bouton `StatutChangerOpportuniteButton` (composant client — wrappé dans un client component)
2. Afficher le bouton "Créer le marché" si statut = GAGNEE et pas de marché lié
3. Afficher les infos PERDUE si statut = PERDUE
4. Afficher le lien marché existant (déjà présent, à garder)

### Étape 1 — Créer un composant wrapper client

Créer `components/opportunites/opportunite-detail-actions.tsx` :

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatutOpportunite } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { StatutChangerOpportuniteButton } from './statut-changer-button'
import { createMarcheFromOpportunite } from '@/lib/actions/opportunites'
import { toast } from '@/lib/utils/toast'

interface OpportuniteDetailActionsProps {
  opportuniteId: string
  currentStatut: StatutOpportunite
  hasMarcheLinked: boolean
  canWrite: boolean
}

export function OpportuniteDetailActions({
  opportuniteId,
  currentStatut,
  hasMarcheLinked,
  canWrite,
}: OpportuniteDetailActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [statut, setStatut] = useState<StatutOpportunite>(currentStatut)

  async function handleCreateMarche() {
    setLoading(true)
    const result = await createMarcheFromOpportunite(opportuniteId)
    setLoading(false)

    if (result.success) {
      toast.success('Marché créé avec succès')
      router.push(`/marches/${result.data.marcheId}`)
    } else {
      toast.error(result.error ?? 'Erreur lors de la création du marché')
    }
  }

  if (!canWrite) return null

  return (
    <div className="flex items-center gap-2">
      <StatutChangerOpportuniteButton
        opportuniteId={opportuniteId}
        currentStatut={statut}
        onStatutChanged={setStatut}
      />
      {statut === 'GAGNEE' && !hasMarcheLinked && (
        <Button onClick={handleCreateMarche} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1.5" />
          )}
          Créer le marché
        </Button>
      )}
    </div>
  )
}
```

### Étape 2 — Modifier `app/(dashboard)/opportunites/[id]/page.tsx`

**a)** Ajouter les imports :

```typescript
import { OpportuniteDetailActions } from '@/components/opportunites/opportunite-detail-actions'
```

**b)** Remplacer le bloc `action` dans `<PageHeader>` :

```tsx
action={
  userCanWrite && (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline">
        <Link href={`/opportunites/${id}/edit`}>
          <Pencil className="h-4 w-4 mr-2" />
          Modifier
        </Link>
      </Button>
      <OpportuniteDetailActions
        opportuniteId={opp.id}
        currentStatut={opp.statut}
        hasMarcheLinked={!!opp.marche}
        canWrite={userCanWrite}
      />
      <OpportuniteDeleteButton id={opp.id} objet={opp.objet} />
    </div>
  )
}
```

**c)** Ajouter une Card "Informations sur la perte" après les notes, conditionnelle :

```tsx
{opp.statut === 'PERDUE' && (
  (opp as unknown as { motifPerte?: string | null; concurrentGagnant?: string | null; montantOffreConcurrent?: unknown }).motifPerte ||
  (opp as unknown as { concurrentGagnant?: string | null }).concurrentGagnant
) && (
  <Card>
    <CardHeader>
      <CardTitle>Informations sur la perte</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {(opp as unknown as { motifPerte?: string | null }).motifPerte && (
        <div>
          <span className="text-sm text-muted-foreground block mb-1">Motif</span>
          <p className="text-sm whitespace-pre-wrap">
            {(opp as unknown as { motifPerte: string }).motifPerte}
          </p>
        </div>
      )}
      {(opp as unknown as { concurrentGagnant?: string | null }).concurrentGagnant && (
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Concurrent retenu</span>
          <span className="text-sm font-medium">
            {(opp as unknown as { concurrentGagnant: string }).concurrentGagnant}
          </span>
        </div>
      )}
      {(opp as unknown as { montantOffreConcurrent?: unknown }).montantOffreConcurrent != null && (
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Montant offre concurrente</span>
          <span className="text-sm font-medium">
            {formatMontant((opp as unknown as { montantOffreConcurrent: unknown }).montantOffreConcurrent)}
          </span>
        </div>
      )}
    </CardContent>
  </Card>
)}
```

> **Note :** Les `as unknown as` sont nécessaires car le type Prisma généré ne connaît pas encore les nouveaux champs tant que `prisma generate` n'a pas été relancé après la migration. Si prisma generate a déjà été fait en Task 1, ces casts peuvent être retirés.

### Étape 3 — Mettre à jour `getOpportunite` pour inclure les nouveaux champs

Dans `lib/actions/opportunites.ts`, la fonction `getOpportunite` fait `findUnique` sans `select` donc elle retourne déjà tous les champs. Vérifier que `OpportuniteWithMarche` inclut les nouveaux champs — si Prisma generate a été fait, c'est automatique.

Mettre également à jour `getOpportunites` pour inclure les champs dans `OpportuniteWithMarche` si nécessaire.

### Étape 4 — Vérifier TypeScript + build

```bash
npx tsc --noEmit
```

### Étape 5 — Commit

```bash
git add app/"(dashboard)"/opportunites/"[id]"/page.tsx components/opportunites/opportunite-detail-actions.tsx
git commit -m "feat(ui): page détail opportunité — StatutChanger + bouton créer marché + infos PERDUE"
```

---

## Task 10 : Formulaire Marché — statut de départ

**Files:**
- Modify: `components/marches/marche-form.tsx`

### Étape 1 — Localiser le champ statut

Chercher dans `marche-form.tsx` le Select ou Input gérant `statut`. Le modifier pour que :
- À la **création**, le statut soit fixé à `ATTRIBUE_DEFINITIVEMENT` (non affiché en Select, ou affiché en lecture seule)
- À l'**édition**, le Select affiche uniquement les statuts post-attribution (filtrer OPPORTUNITE_IDENTIFIEE, DOSSIER_EN_PREPARATION, OFFRE_DEPOSEE, EN_ATTENTE_ATTRIBUTION, ATTRIBUE_PROVISOIREMENT)

Ajouter en haut du fichier (ou trouver l'endroit approprié) :

```typescript
// Statuts créables pour un nouveau marché
const STATUTS_POST_ATTRIBUTION: StatutMarche[] = [
  'ATTRIBUE_DEFINITIVEMENT',
  'EN_ATTENTE_LIVRAISON_OS',
  'EN_EXECUTION',
  'EXECUTE_ATTENTE_GARANTIES',
  'CLOTURE',
  'RESILIE',
  'ANNULE',
]

// Statuts legacy (non créables mais affichables en édition)
const STATUTS_LEGACY: StatutMarche[] = [
  'OPPORTUNITE_IDENTIFIEE',
  'DOSSIER_EN_PREPARATION',
  'OFFRE_DEPOSEE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
]
```

Dans `defaultValues`, remplacer `'OPPORTUNITE_IDENTIFIEE'` par `'ATTRIBUE_DEFINITIVEMENT'` comme valeur par défaut du statut à la création.

Dans le Select du statut, utiliser `isEditing ? allStatuts : STATUTS_POST_ATTRIBUTION` pour filtrer les options.

### Étape 2 — Vérifier TypeScript

```bash
npx tsc --noEmit
```

### Étape 3 — Commit

```bash
git add components/marches/marche-form.tsx
git commit -m "feat(ui): marche-form — statut départ ATTRIBUE_DEFINITIVEMENT + filtre statuts legacy"
```

---

## Task 11 : Page détail Marché — lien opportunité + badge legacy

**Files:**
- Modify: `components/marches/marche-detail.tsx`

### Étape 1 — Mettre à jour la query de données

Dans `lib/actions/marches.ts`, mettre à jour le `include` de `getMarche` pour inclure l'opportunité liée :

```typescript
opportunite: {
  select: { id: true, reference: true, objet: true },
},
```

### Étape 2 — Ajouter le badge legacy

Dans `marche-detail.tsx`, après le badge de statut, ajouter conditionnellement :

```typescript
const STATUTS_PRE_ATTRIBUTION: StatutMarche[] = [
  'OPPORTUNITE_IDENTIFIEE',
  'DOSSIER_EN_PREPARATION',
  'OFFRE_DEPOSEE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
]
```

Puis dans le JSX, après le badge statut :

```tsx
{STATUTS_PRE_ATTRIBUTION.includes(marche.statut) && (
  <Badge variant="muted" className="text-xs">
    Dossier pré-attribution
  </Badge>
)}
```

### Étape 3 — Afficher le lien opportunité d'origine

Dans la section "Informations générales" ou dans une nouvelle Card, ajouter :

```tsx
{marche.opportunite && (
  <div className="flex justify-between">
    <span className="text-sm text-muted-foreground">Opportunité d&apos;origine</span>
    <Link
      href={`/opportunites/${marche.opportunite.id}`}
      className="text-sm font-medium text-primary hover:underline"
    >
      {marche.opportunite.reference
        ? `${marche.opportunite.reference} — `
        : ''}
      {marche.opportunite.objet}
    </Link>
  </div>
)}
```

### Étape 4 — Vérifier TypeScript

```bash
npx tsc --noEmit
```

### Étape 5 — Commit

```bash
git add components/marches/marche-detail.tsx lib/actions/marches.ts
git commit -m "feat(ui): marche-detail — badge legacy pré-attribution + lien opportunité d'origine"
```

---

## Task 12 : Bouton "Convertir en Opportunité" (marchés legacy)

**Files:**
- Create: `components/marches/convertir-en-opportunite-button.tsx`
- Create: `lib/actions/convertir-marche-en-opportunite.ts`

### Étape 1 — Créer la Server Action

```typescript
// lib/actions/convertir-marche-en-opportunite.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import { StatutMarche } from '@prisma/client'
import type { ActionResult } from '@/types'

const STATUTS_PRE_ATTRIBUTION: StatutMarche[] = [
  'OPPORTUNITE_IDENTIFIEE',
  'DOSSIER_EN_PREPARATION',
  'OFFRE_DEPOSEE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
]

export async function convertirMarcheEnOpportunite(
  marcheId: string
): Promise<ActionResult<{ opportuniteId: string }>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const userId = (session.user as { id?: string } | undefined)?.id
    if (!userId) return { success: false, error: 'Utilisateur introuvable' }

    const marche = await prisma.marche.findUnique({
      where: { id: marcheId },
      select: {
        id: true,
        statut: true,
        objet: true,
        autoriteContractanteNom: true,
        montant: true,
        opportuniteId: true,
      },
    })

    if (!marche) {
      return { success: false, error: 'Marché introuvable.' }
    }

    if (!STATUTS_PRE_ATTRIBUTION.includes(marche.statut)) {
      return {
        success: false,
        error: 'Seuls les marchés en statut pré-attribution peuvent être convertis.',
      }
    }

    if (marche.opportuniteId) {
      return {
        success: false,
        error: 'Ce marché est déjà lié à une opportunité.',
      }
    }

    // Créer l'opportunité pré-remplie en EN_ANALYSE
    const opportunite = await prisma.$transaction(async (tx) => {
      const opp = await tx.opportunite.create({
        data: {
          objet:                marche.objet,
          autoriteContractante: marche.autoriteContractanteNom,
          montantEstime:        marche.montant,
          statut:               'EN_ANALYSE',
          userId,
          marcheId:             marche.id,
        },
      })

      // Lier le marché à l'opportunité
      await tx.marche.update({
        where: { id: marcheId },
        data: { opportuniteId: opp.id },
      })

      return opp
    })

    await logAction({
      action: AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.OPPORTUNITE,
      entityId: opportunite.id,
      metadata: { source: 'conversion_marche', marcheId },
    })

    revalidatePath(`/marches/${marcheId}`)
    revalidatePath('/opportunites')

    return { success: true, data: { opportuniteId: opportunite.id } }
  } catch (error) {
    console.error('convertirMarcheEnOpportunite error:', error)
    return { success: false, error: 'Erreur lors de la conversion.' }
  }
}
```

### Étape 2 — Créer le composant bouton

```typescript
// components/marches/convertir-en-opportunite-button.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ArrowRight } from 'lucide-react'
import { convertirMarcheEnOpportunite } from '@/lib/actions/convertir-marche-en-opportunite'
import { toast } from '@/lib/utils/toast'

interface Props {
  marcheId: string
}

export function ConvertirEnOpportuniteButton({ marcheId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleConvert() {
    setLoading(true)
    const result = await convertirMarcheEnOpportunite(marcheId)
    setLoading(false)

    if (result.success) {
      toast.success('Opportunité créée et liée à ce marché')
      router.push(`/opportunites/${result.data.opportuniteId}`)
    } else {
      toast.error(result.error ?? 'Erreur lors de la conversion')
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowRight className="h-4 w-4 mr-1.5" />
          Convertir en opportunité
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convertir en opportunité ?</AlertDialogTitle>
          <AlertDialogDescription>
            Une opportunité en statut &quot;En analyse&quot; sera créée et liée à ce marché.
            Le marché et toutes ses données (cautions, documents, véhicules) restent intacts.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleConvert} disabled={loading}>
            {loading ? 'Conversion...' : 'Confirmer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Étape 3 — Intégrer dans `marche-detail.tsx`

Dans `marche-detail.tsx`, ajouter l'import et afficher le bouton conditionnellement (si le marché est en statut pré-attribution et n'a pas d'opportunité liée) dans la zone d'actions.

### Étape 4 — Vérifier TypeScript

```bash
npx tsc --noEmit
```

### Étape 5 — Commit

```bash
git add lib/actions/convertir-marche-en-opportunite.ts components/marches/convertir-en-opportunite-button.tsx components/marches/marche-detail.tsx
git commit -m "feat(ui): bouton Convertir en Opportunité pour marchés legacy pré-attribution"
```

---

## Task 13 : Tests E2E Playwright

**Files:**
- Create: `tests/v1/refonte-opportunites-marches.spec.ts`

### Prérequis

```bash
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app \
  npx playwright test tests/v1/refonte-opportunites-marches.spec.ts \
  --project=chromium --reporter=line
```

### Étape 1 — Créer le fichier de tests

```typescript
import { test, expect, BrowserContext } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const ADMIN_EMAIL = 'admin@erp-marches.local'
const ADMIN_PASSWORD = 'Admin123!'

let adminCookies: { name: string; value: string; domain: string; path: string }[] = []

test.describe.serial('Refonte Opportunités / Marchés', () => {
  test.setTimeout(90000)

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/login`)
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL)
    await page.getByLabel(/mot de passe/i).fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: /connexion/i }).click()
    await page.waitForURL(`${BASE_URL}/`)

    adminCookies = (await ctx.cookies()).map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
    }))
    await ctx.close()
  })

  async function newCtx(browser: Parameters<typeof test.beforeAll>[0] extends (args: { browser: infer B }) => void ? B : never): Promise<BrowserContext> {
    const ctx = await browser.newContext()
    await ctx.addCookies(adminCookies.map((c) => ({ ...c, domain: new URL(BASE_URL).hostname })))
    return ctx
  }

  // T-A : La liste des opportunités se charge sans erreur
  test('T-A: liste opportunités accessible', async ({ browser }) => {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/opportunites`)
    await expect(page.locator('main')).toBeVisible()
    // Pas de statut IDENTIFIEE dans les filtres
    const filterOptions = page.getByRole('option')
    await expect(filterOptions.filter({ hasText: 'Identifiée' })).toHaveCount(0)

    await ctx.close()
  })

  // T-B : Création d'une opportunité démarre en EN_ANALYSE
  test('T-B: création opportunité — statut EN_ANALYSE par défaut', async ({ browser }) => {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/opportunites/nouvelle`)
    // Le Select statut doit montrer "En analyse" par défaut
    const statutSelect = page.getByRole('combobox')
    await expect(statutSelect).toContainText('En analyse')

    // Remplir le formulaire et créer
    await page.getByLabel(/objet/i).fill('[E2E-REFONTE] Test opportunité EN_ANALYSE')
    await page.getByLabel(/autorité contractante/i).fill('Ministère Test')
    await page.getByRole('button', { name: /créer/i }).click()

    // Doit rediriger vers la liste
    await page.waitForURL(`${BASE_URL}/opportunites`)
    await expect(page.getByText('[E2E-REFONTE] Test opportunité EN_ANALYSE')).toBeVisible()

    await ctx.close()
  })

  // T-C : Changement de statut disponible sur une opportunité
  test('T-C: bouton changer statut présent sur page détail', async ({ browser }) => {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/opportunites`)

    // Trouver l'opportunité créée en T-B
    const oppLink = page.locator('a').filter({ hasText: '[E2E-REFONTE] Test opportunité EN_ANALYSE' }).first()
    const href = await oppLink.getAttribute('href')
    await page.goto(`${BASE_URL}${href}`)

    // Le bouton "Statut" doit être visible
    await expect(page.getByRole('button', { name: /statut/i })).toBeVisible()

    await ctx.close()
  })

  // T-D : Transition EN_ANALYSE → GO fonctionne
  test('T-D: transition EN_ANALYSE → GO', async ({ browser }) => {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/opportunites`)
    const oppLink = page.locator('a').filter({ hasText: '[E2E-REFONTE] Test opportunité EN_ANALYSE' }).first()
    const href = await oppLink.getAttribute('href')
    await page.goto(`${BASE_URL}${href}`)

    await page.getByRole('button', { name: /statut/i }).click()
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'GO', exact: true }).click()
    await page.getByRole('button', { name: /confirmer/i }).click()

    // Le badge statut doit afficher GO
    await expect(page.locator('main').getByText('GO').first()).toBeVisible()

    await ctx.close()
  })

  // T-E : Transition vers PERDUE — champs optionnels affichés
  test('T-E: transition vers PERDUE — champs PERDUE visibles', async ({ browser }) => {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/opportunites`)
    const oppLink = page.locator('a').filter({ hasText: '[E2E-REFONTE] Test opportunité EN_ANALYSE' }).first()
    const href = await oppLink.getAttribute('href')
    await page.goto(`${BASE_URL}${href}`)

    // L'opportunité est en GO, elle peut passer en NO_GO ou DOSSIER_EN_PREPARATION
    // On vérifie que PERDUE n'est pas accessible depuis GO (pas de transition directe)
    await page.getByRole('button', { name: /statut/i }).click()
    const options = await page.getByRole('option').allInnerTexts()
    expect(options).not.toContain('Perdue') // GO → pas de transition directe vers PERDUE

    await page.keyboard.press('Escape')
    await ctx.close()
  })

  // T-F : Création marché — statut de départ ATTRIBUE_DEFINITIVEMENT
  test('T-F: nouveau marché — statut ATTRIBUE_DEFINITIVEMENT par défaut', async ({ browser }) => {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/marches/nouveau`)
    // Le Select statut doit afficher "Attribué définitivement" ou être absent/fixe
    // (selon l'implémentation — vérifier que OPPORTUNITE_IDENTIFIEE n'est pas là)
    const statutTrigger = page.getByRole('combobox').first()
    const statutText = await statutTrigger.innerText()
    expect(statutText).not.toContain('Opportunité identifiée')
    expect(statutText).not.toContain('Dossier en préparation')

    await ctx.close()
  })

  // T-G : Nettoyage — supprimer l'opportunité créée en T-B
  test('T-G: nettoyage — suppression opportunité E2E', async ({ browser }) => {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/opportunites`)
    const oppLink = page.locator('a').filter({ hasText: '[E2E-REFONTE] Test opportunité EN_ANALYSE' }).first()
    const href = await oppLink.getAttribute('href')
    await page.goto(`${BASE_URL}${href}`)

    // Cliquer sur Supprimer
    await page.getByRole('button', { name: /supprimer/i }).click()
    await page.getByRole('button', { name: /confirmer/i }).click()
    await page.waitForURL(`${BASE_URL}/opportunites`)

    await ctx.close()
  })
})
```

### Étape 2 — Déployer en production avant les tests

```bash
git push origin main
# Attendre le déploiement Vercel (~2-3 min), puis :
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app \
  npx playwright test tests/v1/refonte-opportunites-marches.spec.ts \
  --project=chromium --reporter=line
```

Attendu : **7/7 PASS** (T-E peut être SKIP si l'opportunité de test n'atteint pas PERDUE dans le scénario)

### Étape 3 — Commit

```bash
git add tests/v1/refonte-opportunites-marches.spec.ts
git commit -m "test(refonte): 7 tests E2E opportunités/marchés — flux complet"
```

---

## Récapitulatif des commits

| Task | Commit message |
|------|----------------|
| T1 | `feat(schema): étendre StatutOpportunite + champs motifPerte + lien bidirectionnel opportuniteId` |
| T2 | `feat(workflow): transitions statuts opportunités` |
| T3 | `fix(workflow): CHEMIN_PRINCIPAL marchés démarre à ATTRIBUE_DEFINITIVEMENT` |
| T4 | `feat(validations): nouveaux statuts opportunité + champs PERDUE` |
| T5 | `feat(sa): changerStatutOpportunite avec audit log + champs PERDUE` |
| T6 | `feat(sa): createMarcheFromOpportunite — crée marché depuis opportunité GAGNÉE` |
| T7 | `feat(ui): StatutChangerOpportuniteButton avec champs PERDUE conditionnels` |
| T8 | `feat(ui): OpportuniteForm — nouveaux statuts + champs PERDUE conditionnels` |
| T9 | `feat(ui): page détail opportunité — StatutChanger + bouton créer marché + infos PERDUE` |
| T10 | `feat(ui): marche-form — statut départ ATTRIBUE_DEFINITIVEMENT + filtre statuts legacy` |
| T11 | `feat(ui): marche-detail — badge legacy pré-attribution + lien opportunité d'origine` |
| T12 | `feat(ui): bouton Convertir en Opportunité pour marchés legacy pré-attribution` |
| T13 | `test(refonte): 7 tests E2E opportunités/marchés — flux complet` |

---

## Checklist de validation finale

- [ ] `npx tsc --noEmit` — 0 erreur
- [ ] Build local : `npm run build` — 0 erreur
- [ ] Page `/opportunites/nouvelle` : statut de départ = "En analyse"
- [ ] Bouton "Statut" visible sur page détail d'une opportunité
- [ ] Transitions respectent le workflow (pas de retour arrière)
- [ ] Sheet PERDUE : 3 champs optionnels visibles uniquement si statut sélectionné = PERDUE
- [ ] Page `/marches/nouveau` : pas de statuts pré-attribution dans le Select
- [ ] Marchés legacy : badge "Dossier pré-attribution" visible
- [ ] Tests E2E : 7/7 PASS en production
