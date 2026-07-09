# Phase 4 — Module Opportunités Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Créer le module de veille et gestion des opportunités de marchés publics (pipeline IDENTIFIEE → GAGNEE/PERDUE), avec conversion en marché et widget dashboard.

**Architecture:** Même pattern que Phase 3 (Facturation) — enum Prisma + model + migration MCP Supabase + Zod validations + Server Actions + pages RSC + composants Client. Widget dashboard s'ajoute à `app/(dashboard)/page.tsx`. Lien sidebar dans `dashboard-shell.tsx`.

**Tech Stack:** Next.js 15 App Router, Prisma 7, Zod, shadcn/ui, lucide-react, NextAuth v5

**Worktree:** `.worktrees/v1-professionnaliser` (branche `feature/v1-professionnaliser`)

**Supabase Project ID:** `awsvkjdziwzknnvkpuyq`

---

## Task 1: Schema Prisma + Migration Supabase

**Files:**
- Modify: `prisma/schema.prisma` — ajouter enum `StatutOpportunite` + model `Opportunite` + relations

**Step 1: Ajouter l'enum et le model à la fin du schema**

Dans `prisma/schema.prisma`, ajouter une section après `// FILTRES AVANCÉS SAUVEGARDÉS` (actuellement à la fin du fichier, après le model `SavedFilter`) :

```prisma
// ============================================
// OPPORTUNITÉS (VEILLE MARCHÉS)
// ============================================

enum StatutOpportunite {
  IDENTIFIEE
  EN_ANALYSE
  GO
  NO_GO
  SOUMISE
  GAGNEE
  PERDUE
}

model Opportunite {
  id                   String            @id @default(cuid())
  reference            String?
  objet                String
  autoriteContractante String
  montantEstime        Decimal?          @db.Decimal(15, 2)
  datePublication      DateTime?
  dateLimite           DateTime?
  statut               StatutOpportunite @default(IDENTIFIEE)
  probabiliteGain      Int?              // 0-100
  notes                String?           @db.Text
  marcheId             String?
  marche               Marche?           @relation(fields: [marcheId], references: [id], onDelete: SetNull)
  userId               String
  user                 User              @relation(fields: [userId], references: [id])
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt

  @@index([statut])
  @@index([dateLimite])
  @@index([userId])
  @@map("opportunites")
}
```

**Step 2: Ajouter les relations back-reference**

Dans le model `User` (vers la ligne 13), ajouter dans les relations :
```prisma
  opportunites         Opportunite[]
```

Dans le model `Marche` (vers la ligne 119), ajouter dans les relations :
```prisma
  opportunites         Opportunite[]
```

**Step 3: Régénérer le client Prisma**

```bash
cd ".worktrees/v1-professionnaliser"
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

**Step 4: Appliquer la migration en production via MCP Supabase**

Utiliser l'outil MCP `apply_migration` avec:
- `project_id`: `awsvkjdziwzknnvkpuyq`
- `name`: `add_opportunites`
- `query`:

```sql
CREATE TYPE "StatutOpportunite" AS ENUM (
  'IDENTIFIEE', 'EN_ANALYSE', 'GO', 'NO_GO', 'SOUMISE', 'GAGNEE', 'PERDUE'
);

CREATE TABLE "opportunites" (
  "id"                   TEXT NOT NULL,
  "reference"            TEXT,
  "objet"                TEXT NOT NULL,
  "autoriteContractante" TEXT NOT NULL,
  "montantEstime"        DECIMAL(15,2),
  "datePublication"      TIMESTAMP(3),
  "dateLimite"           TIMESTAMP(3),
  "statut"               "StatutOpportunite" NOT NULL DEFAULT 'IDENTIFIEE',
  "probabiliteGain"      INTEGER,
  "notes"                TEXT,
  "marcheId"             TEXT,
  "userId"               TEXT NOT NULL,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "opportunites_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "opportunites_statut_idx"     ON "opportunites"("statut");
CREATE INDEX "opportunites_dateLimite_idx" ON "opportunites"("dateLimite");
CREATE INDEX "opportunites_userId_idx"     ON "opportunites"("userId");
CREATE INDEX "opportunites_marcheId_idx"   ON "opportunites"("marcheId");

ALTER TABLE "opportunites"
  ADD CONSTRAINT "opportunites_marcheId_fkey"
  FOREIGN KEY ("marcheId") REFERENCES "marches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "opportunites"
  ADD CONSTRAINT "opportunites_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

Expected: migration appliquée sans erreur.

---

## Task 2: Validations Zod + constantes

**Files:**
- Create: `lib/validations/opportunite.ts`
- Modify: `lib/audit/constants.ts` — ajouter `OPPORTUNITE`

**Step 1: Créer `lib/validations/opportunite.ts`**

```typescript
import { z } from 'zod'

// ============================================================================
// ENUM
// ============================================================================

export const statutOpportuniteEnum = z.enum([
  'IDENTIFIEE',
  'EN_ANALYSE',
  'GO',
  'NO_GO',
  'SOUMISE',
  'GAGNEE',
  'PERDUE',
])

export type StatutOpportuniteInput = z.infer<typeof statutOpportuniteEnum>

// ============================================================================
// LABELS ET COULEURS
// ============================================================================

export const STATUT_OPPORTUNITE_LABELS: Record<string, string> = {
  IDENTIFIEE:  'Identifiée',
  EN_ANALYSE:  'En analyse',
  GO:          'GO',
  NO_GO:       'No Go',
  SOUMISE:     'Soumise',
  GAGNEE:      'Gagnée',
  PERDUE:      'Perdue',
}

export const STATUT_OPPORTUNITE_COLORS: Record<string, string> = {
  IDENTIFIEE:  'muted',
  EN_ANALYSE:  'info',
  GO:          'success',
  NO_GO:       'danger',
  SOUMISE:     'warning',
  GAGNEE:      'success',
  PERDUE:      'muted',
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

// Pour react-hook-form (dates en tant que Date | null)
export const formOpportuniteSchema = z.object({
  reference:            z.string().max(100).optional().nullable(),
  objet:                z.string().min(1, "L'objet est requis").max(500),
  autoriteContractante: z.string().min(1, "L'autorité contractante est requise").max(200),
  montantEstime:        z.number().positive('Le montant estimé doit être positif').max(999999999999999).optional().nullable(),
  datePublication:      z.date().optional().nullable(),
  dateLimite:           z.date().optional().nullable(),
  statut:               statutOpportuniteEnum,
  probabiliteGain:      z.number().int().min(0).max(100).optional().nullable(),
  notes:                z.string().optional().nullable(),
  marcheId:             z.string().optional().nullable(),
})

export type FormOpportuniteInput = z.infer<typeof formOpportuniteSchema>

// Pour le serveur (avec preprocess pour conversion string→Date)
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

  statut: statutOpportuniteEnum.default('IDENTIFIEE'),

  probabiliteGain: z
    .number()
    .int()
    .min(0, 'La probabilité doit être entre 0 et 100')
    .max(100, 'La probabilité doit être entre 0 et 100')
    .optional()
    .nullable(),

  notes:    z.string().optional().nullable(),
  marcheId: z.string().optional().nullable(),
})

export const updateOpportuniteSchema = createOpportuniteSchema.partial().extend({
  id: z.string().cuid(),
})

// ============================================================================
// TYPES INFÉRÉS
// ============================================================================

export type CreateOpportuniteInput = z.infer<typeof createOpportuniteSchema>
export type UpdateOpportuniteInput = z.infer<typeof updateOpportuniteSchema>
```

**Step 2: Modifier `lib/audit/constants.ts`**

Ajouter `OPPORTUNITE: 'OPPORTUNITE'` dans `AUDIT_ENTITY` et `ENTITY_LABELS` :

```typescript
export const AUDIT_ENTITY = {
  // ... existants ...
  OPPORTUNITE:  'OPPORTUNITE',
} as const

export const ENTITY_LABELS: Record<string, string> = {
  // ... existants ...
  OPPORTUNITE:  'Opportunité',
}
```

---

## Task 3: Server Actions

**Files:**
- Create: `lib/actions/opportunites.ts`

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { createOpportuniteSchema, updateOpportuniteSchema } from '@/lib/validations/opportunite'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'
import type { ActionResult } from '@/types'
import type { PaginatedResponse } from '@/types/pagination'
import type { Opportunite, Marche, StatutOpportunite } from '@prisma/client'

// ============================================================================
// TYPES
// ============================================================================

export type OpportuniteWithMarche = Opportunite & {
  marche: Pick<Marche, 'id' | 'numero' | 'objet'> | null
}

export interface GetOpportunitesOptions {
  statut?: StatutOpportunite
  page?: number
  limit?: number
}

// ============================================================================
// READ
// ============================================================================

export async function getOpportunites(
  options: GetOpportunitesOptions = {}
): Promise<ActionResult<PaginatedResponse<OpportuniteWithMarche>>> {
  try {
    await requireAuth()

    const { statut, page, limit } = options
    const { skip, take } = getPrismaSkipTake({ page, limit })

    const where = {
      ...(statut && { statut }),
    }

    const [opportunites, total] = await Promise.all([
      prisma.opportunite.findMany({
        where,
        include: {
          marche: {
            select: { id: true, numero: true, objet: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.opportunite.count({ where }),
    ])

    return {
      success: true,
      data: { data: opportunites, pagination: calculatePagination(total, page, limit) },
    }
  } catch (error) {
    console.error('Erreur getOpportunites:', error)
    return { success: false, error: 'Impossible de charger les opportunités' }
  }
}

export async function getOpportunite(
  id: string
): Promise<ActionResult<OpportuniteWithMarche>> {
  try {
    await requireAuth()

    const opportunite = await prisma.opportunite.findUnique({
      where: { id },
      include: {
        marche: {
          select: { id: true, numero: true, objet: true },
        },
      },
    })

    if (!opportunite) {
      return { success: false, error: 'Opportunité introuvable' }
    }

    return { success: true, data: opportunite }
  } catch (error) {
    console.error('Erreur getOpportunite:', error)
    return { success: false, error: "Impossible de charger l'opportunité" }
  }
}

export async function getOpportunitesStats(): Promise<
  ActionResult<{ total: number; parStatut: Record<string, number> }>
> {
  try {
    await requireAuth()

    const grouped = await prisma.opportunite.groupBy({
      by: ['statut'],
      _count: { _all: true },
    })

    const parStatut: Record<string, number> = {}
    for (const g of grouped) {
      parStatut[g.statut] = g._count._all
    }

    const total = grouped.reduce((sum, g) => sum + g._count._all, 0)

    return { success: true, data: { total, parStatut } }
  } catch (error) {
    console.error('Erreur getOpportunitesStats:', error)
    return { success: false, error: 'Impossible de charger les statistiques' }
  }
}

// ============================================================================
// CREATE
// ============================================================================

export async function createOpportunite(
  data: unknown
): Promise<ActionResult<Opportunite>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const parsed = createOpportuniteSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }

    const userId = (session.user as { id?: string } | undefined)?.id
    if (!userId) return { success: false, error: 'Utilisateur introuvable' }

    const opportunite = await prisma.opportunite.create({
      data: {
        ...parsed.data,
        userId,
      },
    })

    await logAction({
      action: AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.OPPORTUNITE,
      entityId: opportunite.id,
      metadata: { objet: opportunite.objet },
    })

    revalidatePath('/opportunites')
    return { success: true, data: opportunite }
  } catch (error) {
    console.error('Erreur createOpportunite:', error)
    return { success: false, error: "Impossible de créer l'opportunité" }
  }
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateOpportunite(
  id: string,
  data: unknown
): Promise<ActionResult<Opportunite>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const parsed = updateOpportuniteSchema.safeParse({ ...data as object, id })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }

    const { id: _id, ...updateData } = parsed.data

    const opportunite = await prisma.opportunite.update({
      where: { id },
      data: updateData,
    })

    await logAction({
      action: AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.OPPORTUNITE,
      entityId: id,
      metadata: { objet: opportunite.objet },
    })

    revalidatePath('/opportunites')
    revalidatePath(`/opportunites/${id}`)
    return { success: true, data: opportunite }
  } catch (error) {
    console.error('Erreur updateOpportunite:', error)
    return { success: false, error: "Impossible de mettre à jour l'opportunité" }
  }
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteOpportunite(
  id: string
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    await prisma.opportunite.delete({ where: { id } })

    await logAction({
      action: AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.OPPORTUNITE,
      entityId: id,
    })

    revalidatePath('/opportunites')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('Erreur deleteOpportunite:', error)
    return { success: false, error: "Impossible de supprimer l'opportunité" }
  }
}
```

---

## Task 4: Composants UI

**Files:**
- Create: `components/opportunites/opportunite-list.tsx`
- Create: `components/opportunites/opportunite-delete-button.tsx`
- Create: `components/opportunites/opportunite-form.tsx`

### 4a — `components/opportunites/opportunite-delete-button.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
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
import { toast } from '@/lib/utils/toast'
import { deleteOpportunite } from '@/lib/actions/opportunites'

interface OpportuniteDeleteButtonProps {
  id: string
  objet: string
}

export function OpportuniteDeleteButton({ id, objet }: OpportuniteDeleteButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const result = await deleteOpportunite(id)
    setLoading(false)
    if (result.success) {
      toast.success('Opportunité supprimée')
    } else {
      toast.error(result.error ?? 'Erreur lors de la suppression')
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer l&apos;opportunité</AlertDialogTitle>
          <AlertDialogDescription>
            Vous allez supprimer &quot;{objet}&quot;. Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Suppression...' : 'Supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### 4b — `components/opportunites/opportunite-list.tsx`

```typescript
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OpportuniteDeleteButton } from './opportunite-delete-button'
import {
  STATUT_OPPORTUNITE_LABELS,
  STATUT_OPPORTUNITE_COLORS,
} from '@/lib/validations/opportunite'
import type { OpportuniteWithMarche } from '@/lib/actions/opportunites'

interface OpportuniteListProps {
  opportunites: OpportuniteWithMarche[]
  canWrite: boolean
}

function formatMontant(val: unknown): string {
  if (val === null || val === undefined) return '—'
  const n = typeof val === 'object' && val !== null
    ? parseFloat((val as { toString(): string }).toString())
    : Number(val)
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
}

function formatDate(val: Date | null | undefined): string {
  if (!val) return '—'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(val))
}

export function OpportuniteList({ opportunites, canWrite }: OpportuniteListProps) {
  if (opportunites.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune opportunité enregistrée.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Objet</TableHead>
            <TableHead>Autorité contractante</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date limite</TableHead>
            <TableHead>Montant estimé</TableHead>
            <TableHead>Probabilité</TableHead>
            <TableHead>Marché lié</TableHead>
            {canWrite && <TableHead className="w-[100px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunites.map((opp) => (
            <TableRow key={opp.id}>
              <TableCell className="font-medium max-w-[200px]">
                <Link href={`/opportunites/${opp.id}`} className="hover:underline truncate block">
                  {opp.objet}
                </Link>
                {opp.reference && (
                  <span className="text-xs text-muted-foreground">{opp.reference}</span>
                )}
              </TableCell>
              <TableCell>{opp.autoriteContractante}</TableCell>
              <TableCell>
                <Badge variant={STATUT_OPPORTUNITE_COLORS[opp.statut] as 'success' | 'warning' | 'danger' | 'info' | 'muted'}>
                  {STATUT_OPPORTUNITE_LABELS[opp.statut]}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(opp.dateLimite)}</TableCell>
              <TableCell>{formatMontant(opp.montantEstime)}</TableCell>
              <TableCell>
                {opp.probabiliteGain != null ? `${opp.probabiliteGain}%` : '—'}
              </TableCell>
              <TableCell>
                {opp.marche ? (
                  <Link href={`/marches/${opp.marche.id}`} className="text-sm hover:underline text-primary">
                    {opp.marche.numero}
                  </Link>
                ) : '—'}
              </TableCell>
              {canWrite && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/opportunites/${opp.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <OpportuniteDeleteButton id={opp.id} objet={opp.objet} />
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

### 4c — `components/opportunites/opportunite-form.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/utils/toast'
import {
  formOpportuniteSchema,
  FormOpportuniteInput,
  STATUT_OPPORTUNITE_LABELS,
} from '@/lib/validations/opportunite'
import { createOpportunite, updateOpportunite } from '@/lib/actions/opportunites'
import type { Opportunite } from '@prisma/client'

interface OpportuniteFormProps {
  opportunite?: Opportunite
}

const STATUTS = [
  'IDENTIFIEE', 'EN_ANALYSE', 'GO', 'NO_GO', 'SOUMISE', 'GAGNEE', 'PERDUE',
] as const

export function OpportuniteForm({ opportunite }: OpportuniteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEditing = !!opportunite

  const form = useForm<FormOpportuniteInput>({
    resolver: zodResolver(formOpportuniteSchema),
    defaultValues: {
      reference:            opportunite?.reference ?? '',
      objet:                opportunite?.objet ?? '',
      autoriteContractante: opportunite?.autoriteContractante ?? '',
      montantEstime:        opportunite?.montantEstime
                              ? parseFloat(opportunite.montantEstime.toString())
                              : undefined,
      datePublication:      opportunite?.datePublication
                              ? new Date(opportunite.datePublication)
                              : undefined,
      dateLimite:           opportunite?.dateLimite
                              ? new Date(opportunite.dateLimite)
                              : undefined,
      statut:               opportunite?.statut ?? 'IDENTIFIEE',
      probabiliteGain:      opportunite?.probabiliteGain ?? undefined,
      notes:                opportunite?.notes ?? '',
      marcheId:             opportunite?.marcheId ?? '',
    },
  })

  async function onSubmit(values: FormOpportuniteInput) {
    setLoading(true)
    const result = isEditing
      ? await updateOpportunite(opportunite.id, values)
      : await createOpportunite(values)
    setLoading(false)

    if (result.success) {
      toast.success(isEditing ? 'Opportunité mise à jour' : 'Opportunité créée')
      router.push('/opportunites')
    } else {
      toast.error(result.error ?? 'Erreur lors de la sauvegarde')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Ligne 1 : Objet + Référence */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="objet"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Objet *</FormLabel>
                <FormControl>
                  <Input placeholder="Fourniture de véhicules utilitaires..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Référence</FormLabel>
                <FormControl>
                  <Input placeholder="DAO-2026-001" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Ligne 2 : Autorité contractante + Statut */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="autoriteContractante"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Autorité contractante *</FormLabel>
                <FormControl>
                  <Input placeholder="Ministère des Transports" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="statut"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Statut *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUT_OPPORTUNITE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Ligne 3 : Montant estimé + Probabilité */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="montantEstime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant estimé (XOF)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="50000000"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="probabiliteGain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Probabilité de gain (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="70"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Ligne 4 : Date publication + Date limite */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="datePublication"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de publication</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                      >
                        {field.value ? format(field.value, 'PPP', { locale: fr }) : 'Choisir une date'}
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
          <FormField
            control={form.control}
            name="dateLimite"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date limite de dépôt</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                      >
                        {field.value ? format(field.value, 'PPP', { locale: fr }) : 'Choisir une date'}
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
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observations, contacts, contexte..."
                  rows={4}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer l\'opportunité'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/opportunites')}>
            Annuler
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

---

## Task 5: Pages — Liste et Nouvelle

**Files:**
- Create: `app/(dashboard)/opportunites/page.tsx`
- Create: `app/(dashboard)/opportunites/nouvelle/page.tsx`

### 5a — `app/(dashboard)/opportunites/page.tsx`

```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { OpportuniteList } from '@/components/opportunites/opportunite-list'
import { DataPagination } from '@/components/ui/data-pagination'
import { getOpportunites } from '@/lib/actions/opportunites'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { shouldShowPagination } from '@/lib/utils/pagination'
import { Plus } from 'lucide-react'
import type { StatutOpportunite } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface OpportunitesPageProps {
  searchParams: Promise<{
    statut?: string
    page?: string
  }>
}

export default async function OpportunitesPage({ searchParams }: OpportunitesPageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)

  const params = await searchParams
  const currentPage = Number(params.page) || 1

  const result = await getOpportunites({
    statut: params.statut as StatutOpportunite | undefined,
    page: currentPage,
  })

  if (!result.success) {
    return (
      <div className="space-y-6">
        <PageHeader title="Opportunités" description="Pipeline de veille marchés" />
        <p className="text-destructive">{result.error}</p>
      </div>
    )
  }

  const { data: opportunites, pagination } = result.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunités"
        description="Pipeline de veille et suivi des appels d'offres"
        count={pagination.totalItems}
        action={
          userCanWrite && (
            <Button asChild>
              <Link href="/opportunites/nouvelle">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle opportunité
              </Link>
            </Button>
          )
        }
      />

      <OpportuniteList opportunites={opportunites} canWrite={userCanWrite} />

      {shouldShowPagination(pagination.totalItems) && (
        <DataPagination pagination={pagination} />
      )}
    </div>
  )
}
```

### 5b — `app/(dashboard)/opportunites/nouvelle/page.tsx`

```typescript
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { OpportuniteForm } from '@/components/opportunites/opportunite-form'
import { requireAuth, canWrite } from '@/lib/utils/permissions'

export const dynamic = 'force-dynamic'

export default async function NouvelleOpportunitePage() {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  if (!canWrite(role)) {
    redirect('/opportunites')
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: 'Opportunités', href: '/opportunites' },
          { label: 'Nouvelle opportunité' },
        ]}
      />
      <PageHeader
        title="Nouvelle opportunité"
        description="Enregistrer une nouvelle opportunité de marché public"
      />
      <div className="max-w-3xl">
        <OpportuniteForm />
      </div>
    </div>
  )
}
```

---

## Task 6: Pages — Détail et Édition

**Files:**
- Create: `app/(dashboard)/opportunites/[id]/page.tsx`
- Create: `app/(dashboard)/opportunites/[id]/edit/page.tsx`

### 6a — `app/(dashboard)/opportunites/[id]/page.tsx`

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OpportuniteDeleteButton } from '@/components/opportunites/opportunite-delete-button'
import { getOpportunite } from '@/lib/actions/opportunites'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import {
  STATUT_OPPORTUNITE_LABELS,
  STATUT_OPPORTUNITE_COLORS,
} from '@/lib/validations/opportunite'
import { Pencil } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

function formatMontant(val: unknown): string {
  if (val === null || val === undefined) return '—'
  const n = parseFloat((val as { toString(): string }).toString())
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
}

function formatDate(val: Date | null | undefined): string {
  if (!val) return '—'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(val))
}

export default async function OpportuniteDetailPage({ params }: PageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)

  const { id } = await params
  const result = await getOpportunite(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const opp = result.data

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: 'Opportunités', href: '/opportunites' },
          { label: opp.objet },
        ]}
      />
      <PageHeader
        title={opp.objet}
        description={opp.autoriteContractante}
        action={
          userCanWrite && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href={`/opportunites/${id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Link>
              </Button>
              <OpportuniteDeleteButton id={opp.id} objet={opp.objet} />
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Statut</span>
              <Badge variant={STATUT_OPPORTUNITE_COLORS[opp.statut] as 'success' | 'warning' | 'danger' | 'info' | 'muted'}>
                {STATUT_OPPORTUNITE_LABELS[opp.statut]}
              </Badge>
            </div>
            {opp.reference && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Référence</span>
                <span className="text-sm font-medium">{opp.reference}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Montant estimé</span>
              <span className="text-sm font-medium">{formatMontant(opp.montantEstime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Probabilité de gain</span>
              <span className="text-sm font-medium">
                {opp.probabiliteGain != null ? `${opp.probabiliteGain}%` : '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dates clés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date de publication</span>
              <span className="text-sm">{formatDate(opp.datePublication)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date limite de dépôt</span>
              <span className="text-sm">{formatDate(opp.dateLimite)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Marché lié</span>
              <span className="text-sm">
                {opp.marche ? (
                  <Link href={`/marches/${opp.marche.id}`} className="text-primary hover:underline">
                    {opp.marche.numero}
                  </Link>
                ) : '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {opp.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{opp.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

### 6b — `app/(dashboard)/opportunites/[id]/edit/page.tsx`

```typescript
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { OpportuniteForm } from '@/components/opportunites/opportunite-form'
import { getOpportunite } from '@/lib/actions/opportunites'
import { requireAuth, canWrite } from '@/lib/utils/permissions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditOpportunitePage({ params }: PageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  if (!canWrite(role)) {
    redirect('/opportunites')
  }

  const { id } = await params
  const result = await getOpportunite(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const opp = result.data

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: 'Opportunités', href: '/opportunites' },
          { label: opp.objet, href: `/opportunites/${id}` },
          { label: 'Modifier' },
        ]}
      />
      <PageHeader
        title="Modifier l'opportunité"
        description={opp.objet}
      />
      <div className="max-w-3xl">
        <OpportuniteForm opportunite={opp} />
      </div>
    </div>
  )
}
```

---

## Task 7: Widget Dashboard

**Files:**
- Create: `components/dashboard/opportunites-widget.tsx`
- Modify: `app/(dashboard)/page.tsx` — importer et afficher le widget

### 7a — `components/dashboard/opportunites-widget.tsx`

```typescript
'use client'

import Link from 'next/link'
import { Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  STATUT_OPPORTUNITE_LABELS,
  STATUT_OPPORTUNITE_COLORS,
} from '@/lib/validations/opportunite'

interface OpportunitesWidgetProps {
  total: number
  parStatut: Record<string, number>
}

const STATUTS_ACTIFS = ['IDENTIFIEE', 'EN_ANALYSE', 'GO', 'SOUMISE'] as const

export function OpportunitesWidget({ total, parStatut }: OpportunitesWidgetProps) {
  const actives = STATUTS_ACTIFS.reduce((sum, s) => sum + (parStatut[s] ?? 0), 0)
  const gagnees = parStatut['GAGNEE'] ?? 0
  const perdues = parStatut['PERDUE'] ?? 0
  const noGo = parStatut['NO_GO'] ?? 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Pipeline Opportunités
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/opportunites">Voir tout</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{total}</div>
        <p className="text-xs text-muted-foreground mb-4">{actives} actives</p>

        <div className="grid grid-cols-2 gap-2">
          {STATUTS_ACTIFS.map((s) => (
            parStatut[s] ? (
              <div key={s} className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1">
                <Badge variant={STATUT_OPPORTUNITE_COLORS[s] as 'success' | 'warning' | 'danger' | 'info' | 'muted'} className="text-xs">
                  {STATUT_OPPORTUNITE_LABELS[s]}
                </Badge>
                <span className="text-sm font-semibold">{parStatut[s]}</span>
              </div>
            ) : null
          ))}
        </div>

        {(gagnees > 0 || perdues > 0 || noGo > 0) && (
          <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-muted-foreground">
            {gagnees > 0 && <span className="text-green-600 font-medium">✓ {gagnees} gagnée{gagnees > 1 ? 's' : ''}</span>}
            {perdues > 0 && <span>{perdues} perdue{perdues > 1 ? 's' : ''}</span>}
            {noGo > 0 && <span>{noGo} no go</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### 7b — Modifier `app/(dashboard)/page.tsx`

Ajouter l'import de `getOpportunitesStats` et `OpportunitesWidget`, puis l'inclure dans le rendu.

**Dans les imports**, ajouter :
```typescript
import { getOpportunitesStats } from '@/lib/actions/opportunites'
import { OpportunitesWidget } from '@/components/dashboard/opportunites-widget'
```

**Dans le `Promise.all`**, ajouter :
```typescript
getOpportunitesStats(),
```
(en 7ème position, après `caEffectif`)

**Extraire le résultat** :
```typescript
const opportunitesStatsResult = /* résultat du Promise.all[6] */
const opportunitesStats = opportunitesStatsResult.success
  ? opportunitesStatsResult.data
  : { total: 0, parStatut: {} }
```

**Dans le JSX**, ajouter le widget après `<QuickActions />` et avant `<StatusCharts>` :
```tsx
{/* Pipeline Opportunités */}
<OpportunitesWidget total={opportunitesStats.total} parStatut={opportunitesStats.parStatut} />
```

---

## Task 8: Sidebar + pageTitles

**Files:**
- Modify: `components/layout/dashboard-shell.tsx`

**Step 1: Ajouter l'import de l'icône Target**

Dans la liste des imports lucide-react (vers ligne 7-24), ajouter `Target`.

**Step 2: Ajouter le lien dans `navItems`**

Après la ligne `{ href: '/factures', label: 'Facturation', icon: Receipt }`, ajouter :
```typescript
{ href: '/opportunites', label: 'Opportunités', icon: Target },
```

**Step 3: Ajouter dans `pageTitles`**

Après `'/factures': 'Facturation'`, ajouter :
```typescript
'/opportunites': 'Opportunités',
```

---

## Task 9: Build + Commit

**Step 1: Vérification TypeScript**

```bash
cd ".worktrees/v1-professionnaliser"
npx tsc --noEmit 2>&1 | grep -v "tests/" | head -30
```

Expected: 0 erreur dans `app/` et `lib/` (les erreurs dans `tests/` sont pré-existantes et ignorées).

Si erreur : corriger le fichier incriminé, puis relancer.

**Step 2: Commit**

```bash
cd ".worktrees/v1-professionnaliser"
git add prisma/schema.prisma \
  lib/validations/opportunite.ts \
  lib/actions/opportunites.ts \
  lib/audit/constants.ts \
  "components/opportunites/opportunite-list.tsx" \
  "components/opportunites/opportunite-delete-button.tsx" \
  "components/opportunites/opportunite-form.tsx" \
  "components/dashboard/opportunites-widget.tsx" \
  "app/(dashboard)/opportunites/page.tsx" \
  "app/(dashboard)/opportunites/nouvelle/page.tsx" \
  "app/(dashboard)/opportunites/[id]/page.tsx" \
  "app/(dashboard)/opportunites/[id]/edit/page.tsx" \
  "app/(dashboard)/page.tsx" \
  components/layout/dashboard-shell.tsx

git commit -m "feat(v1): Phase 4 — Module Opportunités (pipeline veille marchés)"
```

Expected: commit créé avec succès.

---

## Récapitulatif fichiers

| Action | Fichier |
|--------|---------|
| Modifié | `prisma/schema.prisma` |
| Créé | `lib/validations/opportunite.ts` |
| Créé | `lib/actions/opportunites.ts` |
| Modifié | `lib/audit/constants.ts` |
| Créé | `components/opportunites/opportunite-list.tsx` |
| Créé | `components/opportunites/opportunite-delete-button.tsx` |
| Créé | `components/opportunites/opportunite-form.tsx` |
| Créé | `components/dashboard/opportunites-widget.tsx` |
| Créé | `app/(dashboard)/opportunites/page.tsx` |
| Créé | `app/(dashboard)/opportunites/nouvelle/page.tsx` |
| Créé | `app/(dashboard)/opportunites/[id]/page.tsx` |
| Créé | `app/(dashboard)/opportunites/[id]/edit/page.tsx` |
| Modifié | `app/(dashboard)/page.tsx` |
| Modifié | `components/layout/dashboard-shell.tsx` |
