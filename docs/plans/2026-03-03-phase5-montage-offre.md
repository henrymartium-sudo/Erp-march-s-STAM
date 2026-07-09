# Phase 5 — Montage de l'Offre Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Créer le module de montage des dossiers d'offre avec checklist interactive de pièces, barre de progression et template de pièces standard.

**Architecture:** Deux modèles liés : `DossierOffre` (conteneur) → `PieceOffre` (checklist item). Pattern de référence : `MarcheFacturesSection` pour les sections embarquées dans marche-detail. Checklist interactive via Server Action `updatePieceStatut` + `revalidatePath` (pas de client state complexe). Sidebar + section dans marche-detail.tsx.

**Tech Stack:** Next.js 15 App Router, Prisma 7, Zod, shadcn/ui (Progress, Checkbox, Badge, Card), lucide-react (FolderCheck, CheckCircle2, Circle, Clock)

**Worktree:** `.worktrees/v1-professionnaliser` (branche `feature/v1-professionnaliser`)

**Supabase Project ID:** `awsvkjdziwzknnvkpuyq`

---

## Task 1: Schema Prisma + Migration Supabase

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1 : Lis le fichier schema.prisma entier**

Chemin: `C:\Users\HP\Documents\claude projets\projet ERP marchés\ERP Marchés STAM Final\.worktrees\v1-professionnaliser\prisma\schema.prisma`

**Step 2 : Ajoute à la fin du fichier (après le bloc Opportunités)**

```prisma
// ============================================
// MONTAGE DE L'OFFRE
// ============================================

enum StatutPiece {
  ABSENT
  INCOMPLET
  COMPLET
  VALIDE
}

model DossierOffre {
  id            String       @id @default(cuid())
  titre         String
  opportuniteId String?
  marcheId      String?
  dateDepot     DateTime?
  statut        String       @default("EN_COURS") // EN_COURS | SOUMIS | ARCHIVE
  progression   Int          @default(0)          // 0-100, calculé et mis à jour à chaque modif pièce
  notes         String?      @db.Text
  pieces        PieceOffre[]
  opportunite   Opportunite? @relation(fields: [opportuniteId], references: [id], onDelete: SetNull)
  marche        Marche?      @relation(fields: [marcheId], references: [id], onDelete: SetNull)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([opportuniteId])
  @@index([marcheId])
  @@map("dossiers_offre")
}

model PieceOffre {
  id          String       @id @default(cuid())
  dossierId   String
  dossier     DossierOffre @relation(fields: [dossierId], references: [id], onDelete: Cascade)
  nom         String
  description String?
  statut      StatutPiece  @default(ABSENT)
  obligatoire Boolean      @default(true)
  ordre       Int          @default(0)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([dossierId])
  @@map("pieces_offre")
}
```

**Step 3 : Ajoute les back-references**

Dans le model `Marche`, après `opportunites  Opportunite[]` :
```prisma
  dossiers             DossierOffre[]
```

Dans le model `Opportunite`, après les relations existantes (avant la ligne `@@index`) :
```prisma
  dossiers             DossierOffre[]
```

**Step 4 : Régénère le client Prisma**

```bash
cd "C:\Users\HP\Documents\claude projets\projet ERP marchés\ERP Marchés STAM Final\.worktrees\v1-professionnaliser" && npx prisma generate
```

Expected: `✔ Generated Prisma Client`

**Step 5 : Applique la migration via MCP Supabase**

Utiliser l'outil MCP `mcp__plugin_supabase_supabase__apply_migration` avec:
- `project_id`: `awsvkjdziwzknnvkpuyq`
- `name`: `add_dossiers_offre`
- `query`:

```sql
CREATE TYPE "StatutPiece" AS ENUM ('ABSENT', 'INCOMPLET', 'COMPLET', 'VALIDE');

CREATE TABLE "dossiers_offre" (
  "id"            TEXT NOT NULL,
  "titre"         TEXT NOT NULL,
  "opportuniteId" TEXT,
  "marcheId"      TEXT,
  "dateDepot"     TIMESTAMP(3),
  "statut"        TEXT NOT NULL DEFAULT 'EN_COURS',
  "progression"   INTEGER NOT NULL DEFAULT 0,
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dossiers_offre_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pieces_offre" (
  "id"          TEXT NOT NULL,
  "dossierId"   TEXT NOT NULL,
  "nom"         TEXT NOT NULL,
  "description" TEXT,
  "statut"      "StatutPiece" NOT NULL DEFAULT 'ABSENT',
  "obligatoire" BOOLEAN NOT NULL DEFAULT true,
  "ordre"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pieces_offre_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dossiers_offre_opportuniteId_idx" ON "dossiers_offre"("opportuniteId");
CREATE INDEX "dossiers_offre_marcheId_idx"      ON "dossiers_offre"("marcheId");
CREATE INDEX "pieces_offre_dossierId_idx"       ON "pieces_offre"("dossierId");

ALTER TABLE "dossiers_offre"
  ADD CONSTRAINT "dossiers_offre_opportuniteId_fkey"
  FOREIGN KEY ("opportuniteId") REFERENCES "opportunites"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dossiers_offre"
  ADD CONSTRAINT "dossiers_offre_marcheId_fkey"
  FOREIGN KEY ("marcheId") REFERENCES "marches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pieces_offre"
  ADD CONSTRAINT "pieces_offre_dossierId_fkey"
  FOREIGN KEY ("dossierId") REFERENCES "dossiers_offre"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## Task 2: Template checklist + Validations Zod + Constante audit

**Files:**
- Create: `lib/templates/checklist-offre.ts`
- Create: `lib/validations/dossier-offre.ts`
- Modify: `lib/audit/constants.ts`

### 2a — `lib/templates/checklist-offre.ts`

```typescript
// Template de pièces standard pour un dossier d'offre marché public (fourniture véhicules)

export interface TemplatePiece {
  nom: string
  description: string
  obligatoire: boolean
  ordre: number
}

export const CHECKLIST_STANDARD: TemplatePiece[] = [
  {
    nom: 'Lettre de soumission',
    description: 'Lettre de soumission signée et cachetée par le soumissionnaire',
    obligatoire: true,
    ordre: 1,
  },
  {
    nom: 'Caution de soumission',
    description: 'Caution bancaire de soumission du montant exigé par le DAO',
    obligatoire: true,
    ordre: 2,
  },
  {
    nom: 'Registre du commerce',
    description: 'Extrait du registre du commerce et du crédit mobilier (RCCM) en cours de validité',
    obligatoire: true,
    ordre: 3,
  },
  {
    nom: 'Attestation fiscale',
    description: "Attestation de situation fiscale régulière délivrée par l'administration fiscale",
    obligatoire: true,
    ordre: 4,
  },
  {
    nom: 'Attestation CNSS',
    description: 'Attestation de situation régulière vis-à-vis de la CNSS',
    obligatoire: true,
    ordre: 5,
  },
  {
    nom: 'Statuts de la société',
    description: 'Copie des statuts de la société certifiée conforme',
    obligatoire: true,
    ordre: 6,
  },
  {
    nom: 'Références techniques',
    description: "Liste des marchés similaires exécutés avec attestation de bonne fin d'exécution",
    obligatoire: true,
    ordre: 7,
  },
  {
    nom: 'Bilans financiers',
    description: 'Bilans financiers certifiés des 3 dernières années',
    obligatoire: true,
    ordre: 8,
  },
  {
    nom: 'Offre technique',
    description: 'Mémoire technique, planning, méthodologie et organisation',
    obligatoire: true,
    ordre: 9,
  },
  {
    nom: 'Offre financière (BPU/DQE)',
    description: 'Bordereau de prix unitaires et décompte quantitatif et estimatif',
    obligatoire: true,
    ordre: 10,
  },
  {
    nom: "Agrément ou autorisation d'exercice",
    description: "Agrément ou autorisation professionnelle délivrée par l'autorité compétente",
    obligatoire: false,
    ordre: 11,
  },
  {
    nom: 'Attestation assurance RC',
    description: 'Attestation assurance responsabilité civile professionnelle en cours de validité',
    obligatoire: false,
    ordre: 12,
  },
]
```

### 2b — `lib/validations/dossier-offre.ts`

```typescript
import { z } from 'zod'

// ============================================================================
// ENUMS
// ============================================================================

export const statutPieceEnum = z.enum(['ABSENT', 'INCOMPLET', 'COMPLET', 'VALIDE'])
export type StatutPieceInput = z.infer<typeof statutPieceEnum>

export const statutDossierEnum = z.enum(['EN_COURS', 'SOUMIS', 'ARCHIVE'])
export type StatutDossierInput = z.infer<typeof statutDossierEnum>

// ============================================================================
// LABELS ET COULEURS
// ============================================================================

export const STATUT_PIECE_LABELS: Record<string, string> = {
  ABSENT:    'Absent',
  INCOMPLET: 'Incomplet',
  COMPLET:   'Complet',
  VALIDE:    'Validé',
}

export const STATUT_PIECE_COLORS: Record<string, string> = {
  ABSENT:    'danger',
  INCOMPLET: 'warning',
  COMPLET:   'info',
  VALIDE:    'success',
}

export const STATUT_DOSSIER_LABELS: Record<string, string> = {
  EN_COURS: 'En cours',
  SOUMIS:   'Soumis',
  ARCHIVE:  'Archivé',
}

export const STATUT_DOSSIER_COLORS: Record<string, string> = {
  EN_COURS: 'warning',
  SOUMIS:   'success',
  ARCHIVE:  'muted',
}

// ============================================================================
// HELPER
// ============================================================================

const preprocessDate = (val: unknown) => {
  if (!val || val === '') return undefined
  if (val instanceof Date) return val
  if (typeof val === 'string') return new Date(val)
  return val
}

// ============================================================================
// SCHÉMAS DOSSIER
// ============================================================================

export const formDossierOffreSchema = z.object({
  titre:         z.string().min(1, 'Le titre est requis').max(300),
  opportuniteId: z.string().optional().nullable(),
  marcheId:      z.string().optional().nullable(),
  dateDepot:     z.date().optional().nullable(),
  statut:        statutDossierEnum,
  notes:         z.string().optional().nullable(),
})

export type FormDossierOffreInput = z.infer<typeof formDossierOffreSchema>

export const createDossierOffreSchema = z.object({
  titre: z
    .string()
    .min(1, 'Le titre est requis')
    .max(300, 'Le titre ne peut pas dépasser 300 caractères'),

  opportuniteId: z.string().optional().nullable(),
  marcheId:      z.string().optional().nullable(),
  dateDepot:     z.preprocess(preprocessDate, z.date().optional().nullable()),
  statut:        statutDossierEnum.default('EN_COURS'),
  notes:         z.string().optional().nullable(),
  useTemplate:   z.boolean().default(true),   // créer les pièces depuis le template standard
})

export const updateDossierOffreSchema = createDossierOffreSchema
  .omit({ useTemplate: true })
  .partial()
  .extend({ id: z.string().cuid() })

export type CreateDossierOffreInput = z.infer<typeof createDossierOffreSchema>
export type UpdateDossierOffreInput = z.infer<typeof updateDossierOffreSchema>

// ============================================================================
// SCHÉMA PIECE
// ============================================================================

export const updatePieceStatutSchema = z.object({
  id:     z.string().cuid(),
  statut: statutPieceEnum,
})

export type UpdatePieceStatutInput = z.infer<typeof updatePieceStatutSchema>
```

### 2c — Modifier `lib/audit/constants.ts`

Dans `AUDIT_ENTITY`, ajouter après `OPPORTUNITE`:
```typescript
DOSSIER_OFFRE: 'DOSSIER_OFFRE',
```

Dans `ENTITY_LABELS`, ajouter après `OPPORTUNITE`:
```typescript
DOSSIER_OFFRE: 'Dossier d\'offre',
```

---

## Task 3: Server Actions

**Files:**
- Create: `lib/actions/dossiers-offre.ts`

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import {
  createDossierOffreSchema,
  updateDossierOffreSchema,
  updatePieceStatutSchema,
} from '@/lib/validations/dossier-offre'
import { CHECKLIST_STANDARD } from '@/lib/templates/checklist-offre'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'
import type { ActionResult } from '@/types'
import type { PaginatedResponse } from '@/types/pagination'
import type { DossierOffre, PieceOffre } from '@prisma/client'

// ============================================================================
// TYPES
// ============================================================================

export type DossierOffreWithPieces = DossierOffre & {
  pieces: PieceOffre[]
}

export interface GetDossiersOptions {
  marcheId?: string
  opportuniteId?: string
  page?: number
  limit?: number
}

// ============================================================================
// HELPERS
// ============================================================================

function calcProgression(pieces: PieceOffre[]): number {
  if (pieces.length === 0) return 0
  const done = pieces.filter(
    (p) => p.statut === 'COMPLET' || p.statut === 'VALIDE'
  ).length
  return Math.round((done / pieces.length) * 100)
}

// ============================================================================
// READ
// ============================================================================

export async function getDossiersOffre(
  options: GetDossiersOptions = {}
): Promise<ActionResult<PaginatedResponse<DossierOffreWithPieces>>> {
  try {
    await requireAuth()

    const { marcheId, opportuniteId, page, limit } = options
    const { skip, take } = getPrismaSkipTake({ page, limit })

    const where = {
      ...(marcheId      && { marcheId }),
      ...(opportuniteId && { opportuniteId }),
    }

    const [dossiers, total] = await Promise.all([
      prisma.dossierOffre.findMany({
        where,
        include: { pieces: { orderBy: { ordre: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.dossierOffre.count({ where }),
    ])

    return {
      success: true,
      data: { data: dossiers, pagination: calculatePagination(total, page, limit) },
    }
  } catch (error) {
    console.error('Erreur getDossiersOffre:', error)
    return { success: false, error: 'Impossible de charger les dossiers' }
  }
}

export async function getDossierOffre(
  id: string
): Promise<ActionResult<DossierOffreWithPieces>> {
  try {
    await requireAuth()

    const dossier = await prisma.dossierOffre.findUnique({
      where: { id },
      include: { pieces: { orderBy: { ordre: 'asc' } } },
    })

    if (!dossier) {
      return { success: false, error: 'Dossier introuvable' }
    }

    return { success: true, data: dossier }
  } catch (error) {
    console.error('Erreur getDossierOffre:', error)
    return { success: false, error: 'Impossible de charger le dossier' }
  }
}

// ============================================================================
// CREATE
// ============================================================================

export async function createDossierOffre(
  data: unknown
): Promise<ActionResult<DossierOffre>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const parsed = createDossierOffreSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }

    const { useTemplate, ...dossierData } = parsed.data

    const dossier = await prisma.dossierOffre.create({
      data: {
        ...dossierData,
        progression: 0,
        ...(useTemplate && {
          pieces: {
            create: CHECKLIST_STANDARD.map((p) => ({
              nom:         p.nom,
              description: p.description,
              obligatoire: p.obligatoire,
              ordre:       p.ordre,
              statut:      'ABSENT' as const,
            })),
          },
        }),
      },
    })

    await logAction({
      action: AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.DOSSIER_OFFRE,
      entityId: dossier.id,
      metadata: { titre: dossier.titre },
    })

    revalidatePath('/dossiers-offre')
    return { success: true, data: dossier }
  } catch (error) {
    console.error('Erreur createDossierOffre:', error)
    return { success: false, error: 'Impossible de créer le dossier' }
  }
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateDossierOffre(
  id: string,
  data: unknown
): Promise<ActionResult<DossierOffre>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const parsed = updateDossierOffreSchema.safeParse({ ...data as object, id })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }

    const { id: _id, ...updateData } = parsed.data

    const dossier = await prisma.dossierOffre.update({
      where: { id },
      data: updateData,
    })

    await logAction({
      action: AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.DOSSIER_OFFRE,
      entityId: id,
      metadata: { titre: dossier.titre },
    })

    revalidatePath('/dossiers-offre')
    revalidatePath(`/dossiers-offre/${id}`)
    return { success: true, data: dossier }
  } catch (error) {
    console.error('Erreur updateDossierOffre:', error)
    return { success: false, error: 'Impossible de mettre à jour le dossier' }
  }
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteDossierOffre(
  id: string
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    await prisma.dossierOffre.delete({ where: { id } })

    await logAction({
      action: AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.DOSSIER_OFFRE,
      entityId: id,
    })

    revalidatePath('/dossiers-offre')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('Erreur deleteDossierOffre:', error)
    return { success: false, error: 'Impossible de supprimer le dossier' }
  }
}

// ============================================================================
// UPDATE PIECE STATUT
// ============================================================================

export async function updatePieceStatut(
  id: string,
  statut: 'ABSENT' | 'INCOMPLET' | 'COMPLET' | 'VALIDE'
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth()
    const role = (session.user as { role?: string } | undefined)?.role
    if (!canWrite(role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const parsed = updatePieceStatutSchema.safeParse({ id, statut })
    if (!parsed.success) {
      return { success: false, error: 'Données invalides' }
    }

    // Mettre à jour le statut de la pièce
    const piece = await prisma.pieceOffre.update({
      where: { id },
      data: { statut },
    })

    // Recalculer la progression du dossier
    const allPieces = await prisma.pieceOffre.findMany({
      where: { dossierId: piece.dossierId },
    })
    const progression = calcProgression(allPieces)

    await prisma.dossierOffre.update({
      where: { id: piece.dossierId },
      data: { progression },
    })

    revalidatePath(`/dossiers-offre/${piece.dossierId}`)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('Erreur updatePieceStatut:', error)
    return { success: false, error: 'Impossible de mettre à jour la pièce' }
  }
}
```

---

## Task 4: Composants UI

**Files:**
- Create: `components/dossiers-offre/dossier-delete-button.tsx`
- Create: `components/dossiers-offre/dossier-list.tsx`
- Create: `components/dossiers-offre/dossier-form.tsx`
- Create: `components/dossiers-offre/piece-statut-button.tsx`
- Create: `components/dossiers-offre/checklist-view.tsx`

### 4a — `components/dossiers-offre/dossier-delete-button.tsx`

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
import { deleteDossierOffre } from '@/lib/actions/dossiers-offre'

interface DossierDeleteButtonProps {
  id: string
  titre: string
}

export function DossierDeleteButton({ id, titre }: DossierDeleteButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const result = await deleteDossierOffre(id)
    setLoading(false)
    if (result.success) {
      toast.success('Dossier supprimé')
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
          <AlertDialogTitle>Supprimer le dossier</AlertDialogTitle>
          <AlertDialogDescription>
            Vous allez supprimer &quot;{titre}&quot; et toutes ses pièces. Cette action est irréversible.
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

### 4b — `components/dossiers-offre/dossier-list.tsx`

```typescript
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DossierDeleteButton } from './dossier-delete-button'
import {
  STATUT_DOSSIER_LABELS,
  STATUT_DOSSIER_COLORS,
} from '@/lib/validations/dossier-offre'
import type { DossierOffreWithPieces } from '@/lib/actions/dossiers-offre'

interface DossierListProps {
  dossiers: DossierOffreWithPieces[]
  canWrite: boolean
}

function formatDate(val: Date | null | undefined): string {
  if (!val) return '—'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(val))
}

export function DossierList({ dossiers, canWrite }: DossierListProps) {
  if (dossiers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun dossier d&apos;offre enregistré.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Progression</TableHead>
            <TableHead>Pièces</TableHead>
            <TableHead>Date dépôt</TableHead>
            {canWrite && <TableHead className="w-[100px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {dossiers.map((d) => {
            const nbDone = d.pieces.filter(
              (p) => p.statut === 'COMPLET' || p.statut === 'VALIDE'
            ).length
            return (
              <TableRow key={d.id}>
                <TableCell className="font-medium max-w-[250px]">
                  <Link href={`/dossiers-offre/${d.id}`} className="hover:underline truncate block">
                    {d.titre}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUT_DOSSIER_COLORS[d.statut] as 'success' | 'warning' | 'danger' | 'info' | 'muted'}>
                    {STATUT_DOSSIER_LABELS[d.statut] ?? d.statut}
                  </Badge>
                </TableCell>
                <TableCell className="w-[120px]">
                  <div className="space-y-1">
                    <Progress value={d.progression} className="h-2" />
                    <span className="text-xs text-muted-foreground">{d.progression}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  {d.pieces.length > 0 ? `${nbDone}/${d.pieces.length}` : '—'}
                </TableCell>
                <TableCell>{formatDate(d.dateDepot)}</TableCell>
                {canWrite && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dossiers-offre/${d.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DossierDeleteButton id={d.id} titre={d.titre} />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
```

### 4c — `components/dossiers-offre/dossier-form.tsx`

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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
  formDossierOffreSchema,
  FormDossierOffreInput,
  STATUT_DOSSIER_LABELS,
} from '@/lib/validations/dossier-offre'
import { createDossierOffre, updateDossierOffre } from '@/lib/actions/dossiers-offre'
import type { DossierOffre } from '@prisma/client'

interface DossierFormProps {
  dossier?: DossierOffre
  defaultMarcheId?: string
  defaultOpportuniteId?: string
}

const STATUTS = ['EN_COURS', 'SOUMIS', 'ARCHIVE'] as const

export function DossierForm({ dossier, defaultMarcheId, defaultOpportuniteId }: DossierFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [useTemplate, setUseTemplate] = useState(true)
  const isEditing = !!dossier

  const form = useForm<FormDossierOffreInput>({
    resolver: zodResolver(formDossierOffreSchema),
    defaultValues: {
      titre:         dossier?.titre ?? '',
      opportuniteId: dossier?.opportuniteId ?? defaultOpportuniteId ?? '',
      marcheId:      dossier?.marcheId ?? defaultMarcheId ?? '',
      dateDepot:     dossier?.dateDepot ? new Date(dossier.dateDepot) : undefined,
      statut:        (dossier?.statut as 'EN_COURS' | 'SOUMIS' | 'ARCHIVE') ?? 'EN_COURS',
      notes:         dossier?.notes ?? '',
    },
  })

  async function onSubmit(values: FormDossierOffreInput) {
    setLoading(true)
    const result = isEditing
      ? await updateDossierOffre(dossier.id, values)
      : await createDossierOffre({ ...values, useTemplate })
    setLoading(false)

    if (result.success) {
      toast.success(isEditing ? 'Dossier mis à jour' : 'Dossier créé')
      router.push(isEditing ? `/dossiers-offre/${dossier.id}` : '/dossiers-offre')
    } else {
      toast.error(result.error ?? 'Erreur lors de la sauvegarde')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Titre */}
        <FormField
          control={form.control}
          name="titre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titre du dossier *</FormLabel>
              <FormControl>
                <Input placeholder="Dossier offre DAO N°2026-001 — Véhicules utilitaires" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Statut + Date dépôt */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {STATUT_DOSSIER_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateDepot"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de dépôt prévue</FormLabel>
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
                  placeholder="Observations, contacts, exigences particulières..."
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Option template (création uniquement) */}
        {!isEditing && (
          <div className="flex items-start space-x-3 rounded-md border p-4 bg-muted/30">
            <Checkbox
              id="useTemplate"
              checked={useTemplate}
              onCheckedChange={(v) => setUseTemplate(!!v)}
            />
            <div className="space-y-1 leading-none">
              <label htmlFor="useTemplate" className="text-sm font-medium cursor-pointer">
                Utiliser le template de checklist standard
              </label>
              <p className="text-xs text-muted-foreground">
                Pré-remplit le dossier avec les 12 pièces habituelles d&apos;un dossier d&apos;offre marché public (lettre de soumission, caution, registre de commerce, etc.)
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer le dossier'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(isEditing ? `/dossiers-offre/${dossier.id}` : '/dossiers-offre')}
          >
            Annuler
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

### 4d — `components/dossiers-offre/piece-statut-button.tsx`

Ce composant est un bouton client qui met à jour le statut d'une pièce via Server Action.

```typescript
'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/lib/utils/toast'
import { updatePieceStatut } from '@/lib/actions/dossiers-offre'
import { STATUT_PIECE_LABELS } from '@/lib/validations/dossier-offre'
import type { StatutPiece } from '@prisma/client'

interface PieceStatutButtonProps {
  pieceId: string
  statut: StatutPiece
  canWrite: boolean
}

const STATUTS: StatutPiece[] = ['ABSENT', 'INCOMPLET', 'COMPLET', 'VALIDE']

const STATUT_STYLE: Record<string, string> = {
  ABSENT:    'text-destructive',
  INCOMPLET: 'text-amber-600',
  COMPLET:   'text-blue-600',
  VALIDE:    'text-green-600',
}

export function PieceStatutButton({ pieceId, statut, canWrite }: PieceStatutButtonProps) {
  const [current, setCurrent] = useState<StatutPiece>(statut)
  const [loading, setLoading] = useState(false)

  async function handleChange(value: string) {
    const newStatut = value as StatutPiece
    setLoading(true)
    const result = await updatePieceStatut(pieceId, newStatut)
    setLoading(false)
    if (result.success) {
      setCurrent(newStatut)
    } else {
      toast.error(result.error ?? 'Erreur de mise à jour')
    }
  }

  if (!canWrite) {
    return (
      <span className={`text-xs font-medium ${STATUT_STYLE[current]}`}>
        {STATUT_PIECE_LABELS[current]}
      </span>
    )
  }

  return (
    <Select value={current} onValueChange={handleChange} disabled={loading}>
      <SelectTrigger className={`h-7 w-[110px] text-xs border-0 bg-transparent p-0 ${STATUT_STYLE[current]}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUTS.map((s) => (
          <SelectItem key={s} value={s} className={`text-xs ${STATUT_STYLE[s]}`}>
            {STATUT_PIECE_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

### 4e — `components/dossiers-offre/checklist-view.tsx`

Ce composant affiche la checklist complète avec barre de progression.

```typescript
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieceStatutButton } from './piece-statut-button'
import { CheckCircle2, AlertCircle, Clock, Circle } from 'lucide-react'
import type { PieceOffre } from '@prisma/client'

interface ChecklistViewProps {
  pieces: PieceOffre[]
  progression: number
  canWrite: boolean
}

const ICONE: Record<string, React.ComponentType<{ className?: string }>> = {
  ABSENT:    Circle,
  INCOMPLET: Clock,
  COMPLET:   CheckCircle2,
  VALIDE:    CheckCircle2,
}

const ICONE_COLOR: Record<string, string> = {
  ABSENT:    'text-destructive',
  INCOMPLET: 'text-amber-500',
  COMPLET:   'text-blue-500',
  VALIDE:    'text-green-500',
}

export function ChecklistView({ pieces, progression, canWrite }: ChecklistViewProps) {
  const nbDone   = pieces.filter((p) => p.statut === 'COMPLET' || p.statut === 'VALIDE').length
  const nbAbsent = pieces.filter((p) => p.statut === 'ABSENT').length
  const obligNonDone = pieces.filter(
    (p) => p.obligatoire && p.statut !== 'COMPLET' && p.statut !== 'VALIDE'
  ).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Pièces du dossier</CardTitle>
          <div className="flex items-center gap-2">
            {obligNonDone > 0 && (
              <Badge variant="danger" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                {obligNonDone} obligatoire{obligNonDone > 1 ? 's' : ''} manquante{obligNonDone > 1 ? 's' : ''}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {nbDone}/{pieces.length}
            </span>
          </div>
        </div>
        <div className="space-y-1 pt-2">
          <Progress value={progression} className="h-2" />
          <p className="text-xs text-muted-foreground">{progression}% complété</p>
        </div>
      </CardHeader>
      <CardContent>
        {pieces.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune pièce dans ce dossier.
          </p>
        ) : (
          <div className="space-y-1">
            {pieces.map((piece) => {
              const Icone = ICONE[piece.statut] ?? Circle
              return (
                <div
                  key={piece.id}
                  className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icone className={`h-4 w-4 flex-shrink-0 ${ICONE_COLOR[piece.statut]}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {piece.nom}
                        {piece.obligatoire && (
                          <span className="text-destructive ml-1 text-xs">*</span>
                        )}
                      </p>
                      {piece.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {piece.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <PieceStatutButton
                      pieceId={piece.id}
                      statut={piece.statut}
                      canWrite={canWrite}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          <span className="text-destructive">*</span> Pièce obligatoire
        </p>
      </CardContent>
    </Card>
  )
}
```

**Note:** Pour utiliser `Progress` de shadcn/ui, vérifier qu'il est installé :
```bash
cd "C:\Users\HP\Documents\claude projets\projet ERP marchés\ERP Marchés STAM Final\.worktrees\v1-professionnaliser" && npx shadcn@latest add progress --yes 2>&1 | tail -5
```

---

## Task 5: Pages liste + nouvelle

**Files:**
- Create: `app/(dashboard)/dossiers-offre/page.tsx`
- Create: `app/(dashboard)/dossiers-offre/nouvelle/page.tsx`

### 5a — `app/(dashboard)/dossiers-offre/page.tsx`

```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { DossierList } from '@/components/dossiers-offre/dossier-list'
import { DataPagination } from '@/components/ui/data-pagination'
import { getDossiersOffre } from '@/lib/actions/dossiers-offre'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { shouldShowPagination } from '@/lib/utils/pagination'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface DossiersPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function DossiersOffrePage({ searchParams }: DossiersPageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)

  const params = await searchParams
  const currentPage = Number(params.page) || 1

  const result = await getDossiersOffre({ page: currentPage })

  if (!result.success) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dossiers d'offre" description="Montage des dossiers de soumission" />
        <p className="text-destructive">{result.error}</p>
      </div>
    )
  }

  const { data: dossiers, pagination } = result.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dossiers d'offre"
        description="Gestion et suivi des dossiers de soumission"
        count={pagination.totalItems}
        action={
          userCanWrite && (
            <Button asChild>
              <Link href="/dossiers-offre/nouveau">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau dossier
              </Link>
            </Button>
          )
        }
      />

      <DossierList dossiers={dossiers} canWrite={userCanWrite} />

      {shouldShowPagination(pagination.totalItems) && (
        <DataPagination pagination={pagination} />
      )}
    </div>
  )
}
```

### 5b — `app/(dashboard)/dossiers-offre/nouveau/page.tsx`

```typescript
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { DossierForm } from '@/components/dossiers-offre/dossier-form'
import { requireAuth, canWrite } from '@/lib/utils/permissions'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ marcheId?: string; opportuniteId?: string }>
}

export default async function NouveauDossierPage({ searchParams }: PageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  if (!canWrite(role)) {
    redirect('/dossiers-offre')
  }

  const params = await searchParams

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dossiers d'offre", href: '/dossiers-offre' },
          { label: 'Nouveau dossier' },
        ]}
      />
      <PageHeader
        title="Nouveau dossier d'offre"
        description="Créer un dossier de montage d'offre avec checklist de pièces"
      />
      <div className="max-w-2xl">
        <DossierForm
          defaultMarcheId={params.marcheId}
          defaultOpportuniteId={params.opportuniteId}
        />
      </div>
    </div>
  )
}
```

---

## Task 6: Pages détail + édition

**Files:**
- Create: `app/(dashboard)/dossiers-offre/[id]/page.tsx`
- Create: `app/(dashboard)/dossiers-offre/[id]/edit/page.tsx`

### 6a — `app/(dashboard)/dossiers-offre/[id]/page.tsx`

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChecklistView } from '@/components/dossiers-offre/checklist-view'
import { DossierDeleteButton } from '@/components/dossiers-offre/dossier-delete-button'
import { getDossierOffre } from '@/lib/actions/dossiers-offre'
import { requireAuth, canWrite } from '@/lib/utils/permissions'
import { STATUT_DOSSIER_LABELS, STATUT_DOSSIER_COLORS } from '@/lib/validations/dossier-offre'
import { Pencil } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDate(val: Date | null | undefined): string {
  if (!val) return '—'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(val))
}

export default async function DossierDetailPage({ params }: PageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  const userCanWrite = canWrite(role)

  const { id } = await params
  const result = await getDossierOffre(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const dossier = result.data

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dossiers d'offre", href: '/dossiers-offre' },
          { label: dossier.titre },
        ]}
      />
      <PageHeader
        title={dossier.titre}
        description={`${dossier.pieces.length} pièces — ${dossier.progression}% complété`}
        action={
          userCanWrite && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href={`/dossiers-offre/${id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Link>
              </Button>
              <DossierDeleteButton id={dossier.id} titre={dossier.titre} />
            </div>
          )
        }
      />

      {/* Info rapide */}
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Statut</p>
            <Badge variant={STATUT_DOSSIER_COLORS[dossier.statut] as 'success' | 'warning' | 'danger' | 'info' | 'muted'} className="mt-1">
              {STATUT_DOSSIER_LABELS[dossier.statut] ?? dossier.statut}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date de dépôt prévue</p>
            <p className="text-sm font-medium mt-1">{formatDate(dossier.dateDepot)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pièces complètes</p>
            <p className="text-sm font-medium mt-1">
              {dossier.pieces.filter((p) => p.statut === 'COMPLET' || p.statut === 'VALIDE').length}
              /{dossier.pieces.length}
            </p>
          </div>
        </CardContent>
        {dossier.notes && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{dossier.notes}</p>
          </CardContent>
        )}
      </Card>

      {/* Checklist interactive */}
      <ChecklistView
        pieces={dossier.pieces}
        progression={dossier.progression}
        canWrite={userCanWrite}
      />
    </div>
  )
}
```

### 6b — `app/(dashboard)/dossiers-offre/[id]/edit/page.tsx`

```typescript
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { BreadcrumbNav } from '@/components/shared/breadcrumb-nav'
import { DossierForm } from '@/components/dossiers-offre/dossier-form'
import { getDossierOffre } from '@/lib/actions/dossiers-offre'
import { requireAuth, canWrite } from '@/lib/utils/permissions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditDossierPage({ params }: PageProps) {
  const session = await requireAuth()
  const role = (session.user as { role?: string } | undefined)?.role
  if (!canWrite(role)) {
    redirect('/dossiers-offre')
  }

  const { id } = await params
  const result = await getDossierOffre(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const dossier = result.data

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dossiers d'offre", href: '/dossiers-offre' },
          { label: dossier.titre, href: `/dossiers-offre/${id}` },
          { label: 'Modifier' },
        ]}
      />
      <PageHeader
        title="Modifier le dossier"
        description={dossier.titre}
      />
      <div className="max-w-2xl">
        <DossierForm dossier={dossier} />
      </div>
    </div>
  )
}
```

---

## Task 7: Section dans marche-detail + Sidebar

**Files:**
- Create: `components/marches/marche-dossiers-section.tsx`
- Modify: `components/marches/marche-detail.tsx`
- Modify: `components/layout/dashboard-shell.tsx`

### 7a — `components/marches/marche-dossiers-section.tsx`

Pattern identique à `MarcheFacturesSection` (Client Component, useEffect + getAction).

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, FolderCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { getDossiersOffre } from '@/lib/actions/dossiers-offre'
import {
  STATUT_DOSSIER_LABELS,
  STATUT_DOSSIER_COLORS,
} from '@/lib/validations/dossier-offre'
import type { DossierOffreWithPieces } from '@/lib/actions/dossiers-offre'

interface MarcheDossiersSectionProps {
  marcheId: string
  canWrite: boolean
}

export function MarcheDossiersSection({ marcheId, canWrite }: MarcheDossiersSectionProps) {
  const [dossiers, setDossiers] = useState<DossierOffreWithPieces[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDossiersOffre({ marcheId, limit: 10 }).then((result) => {
      if (result.success) setDossiers(result.data.data)
      setLoading(false)
    })
  }, [marcheId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderCheck className="h-4 w-4" /> Dossiers d&apos;offre
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderCheck className="h-4 w-4 text-muted-foreground" />
          Dossiers d&apos;offre
          {dossiers.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {dossiers.length}
            </Badge>
          )}
        </CardTitle>
        {canWrite && (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/dossiers-offre/nouveau?marcheId=${marcheId}`}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Ajouter
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {dossiers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun dossier d&apos;offre pour ce marché
          </p>
        ) : (
          dossiers.map((d) => (
            <Link
              key={d.id}
              href={`/dossiers-offre/${d.id}`}
              className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{d.titre}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={d.progression} className="h-1.5 w-24" />
                  <span className="text-xs text-muted-foreground">{d.progression}%</span>
                </div>
              </div>
              <Badge
                variant={STATUT_DOSSIER_COLORS[d.statut] as 'success' | 'warning' | 'danger' | 'info' | 'muted'}
                className="text-xs ml-2 flex-shrink-0"
              >
                {STATUT_DOSSIER_LABELS[d.statut] ?? d.statut}
              </Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
```

### 7b — Modifier `components/marches/marche-detail.tsx`

Lis d'abord le fichier complet. Ensuite :

1. Ajoute l'import :
```typescript
import { MarcheDossiersSection } from './marche-dossiers-section'
```

2. Dans le JSX, ajoute `<MarcheDossiersSection>` juste **avant** `<MarcheFacturesSection>` (ou après, selon l'ordre logique — place-le après `<MarcheHistoriqueStatuts>` et avant `<MarcheFacturesSection>`):
```tsx
<MarcheDossiersSection marcheId={marche.id} canWrite={canWrite} />
```

### 7c — Modifier `components/layout/dashboard-shell.tsx`

1. Ajoute `FolderCheck` aux imports lucide-react.

2. Dans `navItems`, après `/opportunites` :
```typescript
{ href: '/dossiers-offre', label: "Dossiers d'offre", icon: FolderCheck },
```

3. Dans `pageTitles`, après `/opportunites` :
```typescript
'/dossiers-offre': "Dossiers d'offre",
```

---

## Task 8: Build + Commit

**Step 1 : Vérification TypeScript**

```bash
cd "C:\Users\HP\Documents\claude projets\projet ERP marchés\ERP Marchés STAM Final\.worktrees\v1-professionnaliser" && npx tsc --noEmit 2>&1 | grep -v "tests/" | head -40
```

Expected: 0 erreur dans `app/`, `lib/`, `components/`.

Si erreur : corriger et relancer.

**Step 2 : Commit**

```bash
cd "C:\Users\HP\Documents\claude projets\projet ERP marchés\ERP Marchés STAM Final\.worktrees\v1-professionnaliser"

git add \
  prisma/schema.prisma \
  lib/templates/checklist-offre.ts \
  lib/validations/dossier-offre.ts \
  lib/actions/dossiers-offre.ts \
  lib/audit/constants.ts \
  "components/dossiers-offre/dossier-delete-button.tsx" \
  "components/dossiers-offre/dossier-list.tsx" \
  "components/dossiers-offre/dossier-form.tsx" \
  "components/dossiers-offre/piece-statut-button.tsx" \
  "components/dossiers-offre/checklist-view.tsx" \
  "components/marches/marche-dossiers-section.tsx" \
  "components/marches/marche-detail.tsx" \
  "app/(dashboard)/dossiers-offre/page.tsx" \
  "app/(dashboard)/dossiers-offre/nouveau/page.tsx" \
  "app/(dashboard)/dossiers-offre/[id]/page.tsx" \
  "app/(dashboard)/dossiers-offre/[id]/edit/page.tsx" \
  components/layout/dashboard-shell.tsx

git commit -m "feat(v1): Phase 5 — Module Montage de l'Offre (checklist interactive)"
```

---

## Récapitulatif fichiers

| Action | Fichier |
|--------|---------|
| Modifié | `prisma/schema.prisma` |
| Créé | `lib/templates/checklist-offre.ts` |
| Créé | `lib/validations/dossier-offre.ts` |
| Créé | `lib/actions/dossiers-offre.ts` |
| Modifié | `lib/audit/constants.ts` |
| Créé | `components/dossiers-offre/dossier-delete-button.tsx` |
| Créé | `components/dossiers-offre/dossier-list.tsx` |
| Créé | `components/dossiers-offre/dossier-form.tsx` |
| Créé | `components/dossiers-offre/piece-statut-button.tsx` |
| Créé | `components/dossiers-offre/checklist-view.tsx` |
| Créé | `components/marches/marche-dossiers-section.tsx` |
| Modifié | `components/marches/marche-detail.tsx` |
| Créé | `app/(dashboard)/dossiers-offre/page.tsx` |
| Créé | `app/(dashboard)/dossiers-offre/nouveau/page.tsx` |
| Créé | `app/(dashboard)/dossiers-offre/[id]/page.tsx` |
| Créé | `app/(dashboard)/dossiers-offre/[id]/edit/page.tsx` |
| Modifié | `components/layout/dashboard-shell.tsx` |
