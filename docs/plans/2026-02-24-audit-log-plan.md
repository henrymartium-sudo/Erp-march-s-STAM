# Audit Log Module — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Créer un module Journal des Logs traçant toutes les actions critiques (CRUD marchés/cautions/véhicules/SAV/docs/alertes, exports, auth), visible uniquement par ADMIN, sans aucun impact sur les fonctionnalités existantes.

**Architecture:** Approche logAction() fire-and-forget — fonction async avec try/catch silencieux injectée manuellement dans chaque Server Action après l'opération Prisma, avant revalidatePath(). Table `audit_logs` en PostgreSQL via Prisma. UI React paginée avec filtres avancés et drawer détail.

**Tech Stack:** Next.js 15 Server Actions, Prisma 7, shadcn/ui (Table, Sheet, Badge, Select), next/headers (IP/UA), Supabase MCP (migration).

---

## Task 1 — Schéma Prisma + Migration DB

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Ajouter le modèle AuditLog et la relation User**

Dans `prisma/schema.prisma`, ajouter la relation dans le modèle `User` (après `identifiers`) :

```prisma
  auditLogs            AuditLog[]
```

Puis ajouter le modèle en fin de fichier (après le bloc alertes) :

```prisma
// ============================================
// AUDIT LOG
// ============================================

model AuditLog {
  id          String   @id @default(cuid())
  userId      String?
  userEmail   String?
  action      String
  entityType  String
  entityId    String?
  metadata    Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([createdAt])
  @@index([userId])
  @@index([entityType])
  @@index([action])
  @@map("audit_logs")
}
```

**Step 2: Régénérer le client Prisma**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

**Step 3: Appliquer la migration via Supabase MCP**

Utiliser l'outil MCP `mcp__plugin_supabase_supabase__apply_migration` avec :
- `name`: `add_audit_logs_table`
- `query`:

```sql
CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "userEmail" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

Expected: migration appliquée avec succès

**Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(audit): add AuditLog model to Prisma schema"
```

---

## Task 2 — Service logAction() + constantes

**Files:**
- Create: `lib/audit/constants.ts`
- Create: `lib/audit/logAction.ts`

**Step 1: Créer lib/audit/constants.ts**

```typescript
export const AUDIT_ACTION = {
  CREATE:          'CREATE',
  UPDATE:          'UPDATE',
  DELETE:          'DELETE',
  LOGIN:           'LOGIN',
  LOGIN_FAILED:    'LOGIN_FAILED',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  EXPORT:          'EXPORT',
} as const

export type AuditAction = typeof AUDIT_ACTION[keyof typeof AUDIT_ACTION]

export const AUDIT_ENTITY = {
  MARCHE:       'MARCHE',
  CAUTION:      'CAUTION',
  VEHICULE:     'VEHICULE',
  DOCUMENT:     'DOCUMENT',
  INTERVENTION: 'INTERVENTION',
  ALERT_RULE:   'ALERT_RULE',
  AUTH:         'AUTH',
  EXPORT:       'EXPORT',
} as const

export type AuditEntity = typeof AUDIT_ENTITY[keyof typeof AUDIT_ENTITY]

export const ENTITY_LABELS: Record<string, string> = {
  MARCHE:       'Marché',
  CAUTION:      'Caution',
  VEHICULE:     'Véhicule',
  DOCUMENT:     'Document',
  INTERVENTION: 'Intervention SAV',
  ALERT_RULE:   'Règle d\'alerte',
  AUTH:         'Authentification',
  EXPORT:       'Export',
}

export const ACTION_LABELS: Record<string, string> = {
  CREATE:          'Création',
  UPDATE:          'Modification',
  DELETE:          'Suppression',
  LOGIN:           'Connexion',
  LOGIN_FAILED:    'Connexion échouée',
  CHANGE_PASSWORD: 'Changement MDP',
  EXPORT:          'Export',
}
```

**Step 2: Créer lib/audit/logAction.ts**

```typescript
import { headers } from 'next/headers'
import { prisma } from '@/lib/db/prisma'

interface LogActionParams {
  userId?:    string | null
  userEmail?: string | null
  action:     string
  entityType: string
  entityId?:  string | null
  metadata?:  Record<string, unknown>
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    const headersList = await headers()
    const ipAddress =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      headersList.get('x-real-ip') ??
      null
    const userAgent = headersList.get('user-agent') ?? null

    await prisma.auditLog.create({
      data: {
        userId:     params.userId    ?? null,
        userEmail:  params.userEmail ?? null,
        action:     params.action,
        entityType: params.entityType,
        entityId:   params.entityId  ?? null,
        metadata:   params.metadata  ?? undefined,
        ipAddress,
        userAgent,
      },
    })
  } catch {
    // Silencieux — ne jamais interrompre le flux métier
  }
}
```

**Step 3: Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "tests/"
```

Expected: 0 erreur dans lib/

**Step 4: Commit**

```bash
git add lib/audit/constants.ts lib/audit/logAction.ts
git commit -m "feat(audit): add logAction service and constants"
```

---

## Task 3 — Instrumentation Marchés

**Files:**
- Modify: `lib/actions/marches.ts`

**Step 1: Ajouter les imports en haut du fichier**

Après les imports existants, ajouter :

```typescript
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
```

**Step 2: Instrumenter createMarche**

Après `revalidatePath('/marches')` (ligne ~60), avant `return { success: true, data: marche }` :

```typescript
    // Audit log
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.MARCHE,
      entityId:   marche.id,
      metadata:   { numero: marche.numero, objet: marche.objet, montant: marche.montant?.toString() },
    })
```

**Step 3: Instrumenter updateMarche**

Récupérer la session en début de fonction (remplacer `await requireMarcheWrite()` par `const session = await requireMarcheWrite()`).

Après `revalidatePath('/marches/${id}')`, avant le bloc `if (ancienStatut...)`, ajouter :

```typescript
    // Audit log
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.MARCHE,
      entityId:   marche.id,
      metadata:   { numero: marche.numero, statut: marche.statut },
    })
```

**Step 4: Instrumenter deleteMarche**

Trouver la fonction `deleteMarche`. Récupérer la session : `const session = await requireDelete()`. Après le `prisma.marche.delete(...)`, ajouter :

```typescript
    // Audit log
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.MARCHE,
      entityId:   id,
    })
```

**Step 5: Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep "marches.ts"
```

Expected: aucune erreur

**Step 6: Commit**

```bash
git add lib/actions/marches.ts
git commit -m "feat(audit): instrument marches SA (create/update/delete)"
```

---

## Task 4 — Instrumentation Cautions

**Files:**
- Modify: `lib/actions/cautions.ts`

**Step 1: Ajouter les imports**

```typescript
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
```

**Step 2: Instrumenter createCaution**

Dans `createCaution`, récupérer la session (`const session = await requireMarcheWrite()`). Après le `prisma.caution.create()`, avant `return` :

```typescript
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.CAUTION,
      entityId:   caution.id,
      metadata:   { reference: caution.reference, type: caution.type, montant: caution.montant?.toString() },
    })
```

**Step 3: Instrumenter updateCaution**

Récupérer la session. Après `prisma.caution.update()` :

```typescript
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.CAUTION,
      entityId:   caution.id,
      metadata:   { reference: caution.reference, statut: caution.statut },
    })
```

**Step 4: Instrumenter deleteCaution**

Récupérer la session (`const session = await requireDelete()`). Après `prisma.caution.delete()` :

```typescript
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.CAUTION,
      entityId:   id,
    })
```

**Step 5: Commit**

```bash
git add lib/actions/cautions.ts
git commit -m "feat(audit): instrument cautions SA (create/update/delete)"
```

---

## Task 5 — Instrumentation Véhicules

**Files:**
- Modify: `lib/actions/vehicules.ts`

**Step 1: Ajouter les imports**

```typescript
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
```

**Step 2: Instrumenter createVehicule**

`const session = await requireMarcheWrite()`. Après `prisma.vehicule.create()` :

```typescript
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.VEHICULE,
      entityId:   vehicule.id,
      metadata:   { immatriculation: vehicule.immatriculation, marque: vehicule.marque, modele: vehicule.modele },
    })
```

**Step 3: Instrumenter updateVehicule**

Après `prisma.vehicule.update()` :

```typescript
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.VEHICULE,
      entityId:   vehicule.id,
      metadata:   { immatriculation: vehicule.immatriculation, statut: vehicule.statut },
    })
```

**Step 4: Instrumenter deleteVehicule**

`const session = await requireDelete()`. Après `prisma.vehicule.delete()` :

```typescript
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.VEHICULE,
      entityId:   id,
    })
```

**Step 5: Commit**

```bash
git add lib/actions/vehicules.ts
git commit -m "feat(audit): instrument vehicules SA (create/update/delete)"
```

---

## Task 6 — Instrumentation SAV Interventions

**Files:**
- Modify: `lib/actions/interventions.ts`

**Step 1: Ajouter les imports**

```typescript
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
```

**Step 2: Instrumenter createIntervention**

La session est déjà dans `session`. Après `prisma.intervention.create()` :

```typescript
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.INTERVENTION,
      entityId:   intervention.id,
      metadata:   { vehiculeId: intervention.vehiculeId, type: intervention.type },
    })
```

**Step 3: Instrumenter updateInterventionStatut**

Trouver `updateInterventionStatut`. La session est dans `session`. Après `prisma.intervention.update()` :

```typescript
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.INTERVENTION,
      entityId:   updated.id,
      metadata:   { ancienStatut: validated.ancienStatut, nouveauStatut: updated.statut },
    })
```

**Step 4: Commit**

```bash
git add lib/actions/interventions.ts
git commit -m "feat(audit): instrument interventions SA (create/updateStatut)"
```

---

## Task 7 — Instrumentation Documents

**Files:**
- Modify: `lib/actions/documents.ts`

**Step 1: Ajouter les imports**

```typescript
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
```

**Step 2: Instrumenter uploadDocument**

La session est dans `session` (résultat de `requireMarcheWrite()`). Après `prisma.document.create()`, avant `return` :

```typescript
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.DOCUMENT,
      entityId:   document.id,
      metadata:   { nom: document.nom, type: document.type, taille: document.taille },
    })
```

**Step 3: Instrumenter deleteDocument**

Trouver `deleteDocument`. `const session = await requireDelete()`. Après `prisma.document.update({ data: { deleted: true } })` :

```typescript
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.DOCUMENT,
      entityId:   id,
    })
```

**Step 4: Commit**

```bash
git add lib/actions/documents.ts
git commit -m "feat(audit): instrument documents SA (upload/delete)"
```

---

## Task 8 — Instrumentation Alertes (Rules)

**Files:**
- Modify: `lib/actions/alert-rules.ts`

**Step 1: Ajouter les imports**

```typescript
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
```

**Step 2: Instrumenter createAlertRule**

La session est récupérée par `requireRole(['ADMIN'])` mais n'est pas stockée. Modifier :

```typescript
    const session = await requireRole(['ADMIN'])
```

Après `prisma.alertRule.create()` :

```typescript
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.ALERT_RULE,
      entityId:   rule.id,
      metadata:   { name: rule.name, eventType: rule.eventType },
    })
```

**Step 3: Instrumenter updateAlertRule**

Même pattern. `const session = await requireRole(['ADMIN'])`. Après `prisma.alertRule.update()` :

```typescript
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.ALERT_RULE,
      entityId:   rule.id,
      metadata:   { name: rule.name, isActive: rule.isActive },
    })
```

**Step 4: Instrumenter deleteAlertRule**

`const session = await requireRole(['ADMIN'])`. Après `prisma.alertRule.delete()` :

```typescript
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.ALERT_RULE,
      entityId:   id,
    })
```

**Step 5: Commit**

```bash
git add lib/actions/alert-rules.ts
git commit -m "feat(audit): instrument alert-rules SA (create/update/delete)"
```

---

## Task 9 — Instrumentation Exports

**Files:**
- Modify: `lib/actions/exports.ts`

**Step 1: Ajouter les imports**

```typescript
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
```

**Step 2: Instrumenter chaque fonction export**

Pour chaque fonction (`exportMarches`, `exportCautions`, `exportVehicules`, et les variantes PDF) :

1. Stocker la session : `const session = await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])`
2. Après génération du buffer réussi, avant `return { success: true }` :

```typescript
    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata:   { format: 'EXCEL', module: 'MARCHE', filters },
      // Remplacer 'MARCHE' par le module concerné, 'EXCEL' ou 'PDF' selon la fonction
    })
```

Adapter `format` (`'EXCEL'` ou `'PDF'`) et `module` (`'MARCHE'`, `'CAUTION'`, `'VEHICULE'`, `'DOCUMENT'`) pour chaque fonction.

**Step 3: Commit**

```bash
git add lib/actions/exports.ts
git commit -m "feat(audit): instrument exports SA (Excel/PDF x4 modules)"
```

---

## Task 10 — Instrumentation Auth

**Files:**
- Modify: `lib/auth/auth.config.ts`
- Modify: `lib/actions/auth/change-password.ts`

**Step 1: Instrumenter auth.config.ts — login réussi**

Ajouter l'import en haut (après les imports existants) :

```typescript
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
```

Dans la fonction `authorize`, après le check `isValidPassword` qui retourne `null` (login échoué), ajouter le log login_failed :

```typescript
          if (!isValidPassword) {
            console.log('Invalid password for user:', email)
            // Audit log — login échoué
            await logAction({
              userEmail:  email,
              action:     AUDIT_ACTION.LOGIN_FAILED,
              entityType: AUDIT_ENTITY.AUTH,
              metadata:   { reason: 'invalid_password' },
            })
            return null
          }
```

Et après la construction du return (login réussi), avant `return { id, email, name, role }` :

```typescript
          // Audit log — login réussi
          await logAction({
            userId:     user.id,
            userEmail:  user.email,
            action:     AUDIT_ACTION.LOGIN,
            entityType: AUDIT_ENTITY.AUTH,
          })
```

Faire de même pour le cas `user not found` :

```typescript
          if (!user) {
            console.log('User not found:', email)
            await logAction({
              userEmail:  email,
              action:     AUDIT_ACTION.LOGIN_FAILED,
              entityType: AUDIT_ENTITY.AUTH,
              metadata:   { reason: 'user_not_found' },
            })
            return null
          }
```

**Step 2: Instrumenter change-password.ts**

Après `prisma.user.update({ data: { password: hashedPassword } })`, avant `return { success: true }` :

```typescript
  await logAction({
    userId:     session.user.id,
    userEmail:  session.user.email,
    action:     AUDIT_ACTION.CHANGE_PASSWORD,
    entityType: AUDIT_ENTITY.AUTH,
  })
```

Ajouter les imports en haut du fichier.

**Step 3: Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -E "(auth.config|change-password)"
```

Expected: aucune erreur

**Step 4: Commit**

```bash
git add lib/auth/auth.config.ts lib/actions/auth/change-password.ts
git commit -m "feat(audit): instrument auth (login/login_failed/change_password)"
```

---

## Task 11 — Server Actions de lecture audit-logs

**Files:**
- Create: `lib/actions/audit-logs.ts`

**Step 1: Créer lib/actions/audit-logs.ts**

```typescript
'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/utils/permissions'
import type { PaginatedResponse } from '@/types/pagination'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'

export interface AuditLogRow {
  id:         string
  userId:     string | null
  userEmail:  string | null
  userName:   string | null
  action:     string
  entityType: string
  entityId:   string | null
  ipAddress:  string | null
  userAgent:  string | null
  createdAt:  string
}

export interface AuditLogDetail extends AuditLogRow {
  metadata: Record<string, unknown> | null
}

export interface AuditLogFilters {
  userId?:     string
  action?:     string
  entityType?: string
  startDate?:  string
  endDate?:    string
  search?:     string
  page?:       number
  limit?:      number
}

export async function getAuditLogs(
  filters: AuditLogFilters = {}
): Promise<PaginatedResponse<AuditLogRow>> {
  await requireAdmin()

  const page  = filters.page  ?? 1
  const limit = filters.limit ?? 50

  const where: any = {}

  if (filters.userId)     where.userId     = filters.userId
  if (filters.action)     where.action     = filters.action
  if (filters.entityType) where.entityType = filters.entityType

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
    if (filters.endDate)   where.createdAt.lte = new Date(filters.endDate + 'T23:59:59.999Z')
  }

  if (filters.search) {
    where.OR = [
      { userEmail:  { contains: filters.search, mode: 'insensitive' } },
      { entityId:   { contains: filters.search, mode: 'insensitive' } },
      { action:     { contains: filters.search, mode: 'insensitive' } },
      { entityType: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      ...getPrismaSkipTake({ page, limit }),
    }),
  ])

  const data: AuditLogRow[] = logs.map(l => ({
    id:         l.id,
    userId:     l.userId,
    userEmail:  l.userEmail,
    userName:   l.user?.name ?? null,
    action:     l.action,
    entityType: l.entityType,
    entityId:   l.entityId,
    ipAddress:  l.ipAddress,
    userAgent:  l.userAgent,
    createdAt:  l.createdAt.toISOString(),
  }))

  return { data, pagination: calculatePagination(total, page, limit) }
}

export async function getAuditLogById(id: string): Promise<AuditLogDetail | null> {
  await requireAdmin()

  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  })

  if (!log) return null

  return {
    id:         log.id,
    userId:     log.userId,
    userEmail:  log.userEmail,
    userName:   log.user?.name ?? null,
    action:     log.action,
    entityType: log.entityType,
    entityId:   log.entityId,
    metadata:   log.metadata as Record<string, unknown> | null,
    ipAddress:  log.ipAddress,
    userAgent:  log.userAgent,
    createdAt:  log.createdAt.toISOString(),
  }
}

export async function exportAuditLogsCsv(filters: AuditLogFilters = {}): Promise<string> {
  await requireAdmin()

  const where: any = {}
  if (filters.userId)     where.userId     = filters.userId
  if (filters.action)     where.action     = filters.action
  if (filters.entityType) where.entityType = filters.entityType
  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
    if (filters.endDate)   where.createdAt.lte = new Date(filters.endDate + 'T23:59:59.999Z')
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  })

  const header = 'Date,Utilisateur,Email,Action,Module,Référence,IP'
  const rows = logs.map(l => [
    new Date(l.createdAt).toLocaleString('fr-FR'),
    l.user?.name ?? '— système —',
    l.userEmail ?? '',
    l.action,
    l.entityType,
    l.entityId ?? '',
    l.ipAddress ?? '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

  return [header, ...rows].join('\n')
}
```

**Step 2: Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep "audit-logs.ts"
```

Expected: aucune erreur

**Step 3: Commit**

```bash
git add lib/actions/audit-logs.ts
git commit -m "feat(audit): add getAuditLogs/getAuditLogById/exportCsv SA"
```

---

## Task 12 — Page RSC /admin/audit-logs

**Files:**
- Create: `app/(dashboard)/admin/audit-logs/page.tsx`

**Step 1: Créer la page RSC**

```typescript
import { requireAdmin } from '@/lib/utils/permissions'
import { getAuditLogs } from '@/lib/actions/audit-logs'
import { PageHeader } from '@/components/shared/page-header'
import { AuditLogsClient } from './AuditLogsClient'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{
    page?:       string
    action?:     string
    entityType?: string
    userId?:     string
    startDate?:  string
    endDate?:    string
    search?:     string
  }>
}

export default async function AuditLogsPage({ searchParams }: Props) {
  await requireAdmin()

  const params = await searchParams
  const page   = parseInt(params.page ?? '1', 10)

  const result = await getAuditLogs({
    page,
    limit:      50,
    action:     params.action     || undefined,
    entityType: params.entityType || undefined,
    userId:     params.userId     || undefined,
    startDate:  params.startDate  || undefined,
    endDate:    params.endDate    || undefined,
    search:     params.search     || undefined,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal des logs"
        description="Traçabilité des actions effectuées dans l'application"
        count={result.pagination.total}
      />
      <AuditLogsClient
        logs={result.data}
        pagination={result.pagination}
        filters={params}
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/"(dashboard)"/admin/audit-logs/page.tsx
git commit -m "feat(audit): add /admin/audit-logs RSC page"
```

---

## Task 13 — AuditLogsClient (tableau + filtres + drawer)

**Files:**
- Create: `app/(dashboard)/admin/audit-logs/AuditLogsClient.tsx`

**Step 1: Créer AuditLogsClient.tsx**

```typescript
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataPagination } from '@/components/shared/DataPagination'
import { getAuditLogById, exportAuditLogsCsv } from '@/lib/actions/audit-logs'
import { AUDIT_ACTION, AUDIT_ENTITY, ACTION_LABELS, ENTITY_LABELS } from '@/lib/audit/constants'
import type { AuditLogRow, AuditLogDetail, AuditLogFilters } from '@/lib/actions/audit-logs'
import type { PaginationInfo } from '@/types/pagination'
import { toast } from '@/lib/utils/toast'
import { Download } from 'lucide-react'

interface Props {
  logs:       AuditLogRow[]
  pagination: PaginationInfo
  filters:    Partial<AuditLogFilters & { page?: string }>
}

const ACTION_BADGE_CLASSES: Record<string, string> = {
  CREATE:          'bg-green-100 text-green-800 border-green-200',
  UPDATE:          'bg-blue-100 text-blue-800 border-blue-200',
  DELETE:          'bg-red-100 text-red-800 border-red-200',
  LOGIN:           'bg-gray-100 text-gray-700 border-gray-200',
  LOGIN_FAILED:    'bg-orange-100 text-orange-800 border-orange-200',
  CHANGE_PASSWORD: 'bg-purple-100 text-purple-800 border-purple-200',
  EXPORT:          'bg-yellow-100 text-yellow-800 border-yellow-200',
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ACTION_BADGE_CLASSES[action] ?? 'bg-gray-100 text-gray-700'}`}>
      {ACTION_LABELS[action] ?? action}
    </span>
  )
}

export function AuditLogsClient({ logs, pagination, filters }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const [search,     setSearch]     = useState(filters.search     ?? '')
  const [action,     setAction]     = useState(filters.action     ?? '')
  const [entityType, setEntityType] = useState(filters.entityType ?? '')
  const [startDate,  setStartDate]  = useState(filters.startDate  ?? '')
  const [endDate,    setEndDate]    = useState(filters.endDate    ?? '')

  const [selectedLog, setSelectedLog] = useState<AuditLogDetail | null>(null)
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [loadingId,   setLoadingId]   = useState<string | null>(null)
  const [exporting,   setExporting]   = useState(false)

  function buildParams(overrides: Record<string, string> = {}): string {
    const p = new URLSearchParams()
    if (search)     p.set('search', search)
    if (action)     p.set('action', action)
    if (entityType) p.set('entityType', entityType)
    if (startDate)  p.set('startDate', startDate)
    if (endDate)    p.set('endDate', endDate)
    Object.entries(overrides).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    return p.toString()
  }

  function applyFilters() {
    startTransition(() => {
      router.push(`${pathname}?${buildParams({ page: '1' })}`)
    })
  }

  function resetFilters() {
    setSearch(''); setAction(''); setEntityType(''); setStartDate(''); setEndDate('')
    router.push(pathname)
  }

  async function openDetail(id: string) {
    setLoadingId(id)
    const detail = await getAuditLogById(id)
    setLoadingId(null)
    if (detail) {
      setSelectedLog(detail)
      setDrawerOpen(true)
    }
  }

  async function handleExportCsv() {
    setExporting(true)
    try {
      const csv = await exportAuditLogsCsv({
        action: action || undefined,
        entityType: entityType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined,
      })
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Export CSV téléchargé')
    } catch {
      toast.error('Erreur lors de l\'export CSV')
    } finally {
      setExporting(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-2 items-end">
        <Input
          placeholder="Rechercher…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyFilters()}
          className="w-48"
        />

        <Select value={action || 'ALL'} onValueChange={v => setAction(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes les actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityType || 'ALL'} onValueChange={v => setEntityType(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les modules</SelectItem>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="w-36"
          title="Du"
        />
        <Input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="w-36"
          title="Au"
        />

        <Button onClick={applyFilters} size="sm">Filtrer</Button>
        <Button onClick={resetFilters} size="sm" variant="outline">Réinitialiser</Button>

        <Button onClick={handleExportCsv} size="sm" variant="outline" disabled={exporting} className="ml-auto">
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Export…' : 'CSV'}
        </Button>
      </div>

      {/* ── Tableau ── */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date / Heure</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Aucun log trouvé
                </TableCell>
              </TableRow>
            ) : logs.map(log => (
              <TableRow
                key={log.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => openDetail(log.id)}
              >
                <TableCell className="font-mono text-xs whitespace-nowrap">
                  {loadingId === log.id ? '…' : formatDate(log.createdAt)}
                </TableCell>
                <TableCell className="text-sm">
                  {log.userEmail ?? <span className="text-muted-foreground italic">— système —</span>}
                </TableCell>
                <TableCell>
                  <ActionBadge action={log.action} />
                </TableCell>
                <TableCell className="text-sm">
                  {ENTITY_LABELS[log.entityType] ?? log.entityType}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                  {log.entityId ?? '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground" title={log.ipAddress ?? ''}>
                  {log.ipAddress ? log.ipAddress.substring(0, 15) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      <DataPagination
        pagination={pagination}
        onPageChange={page => {
          router.push(`${pathname}?${buildParams({ page: String(page) })}`)
        }}
      />

      {/* ── Drawer détail ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Détail du log</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-4 space-y-4 text-sm">
              <Field label="Date"        value={formatDate(selectedLog.createdAt)} />
              <Field label="Action"      value={<ActionBadge action={selectedLog.action} />} />
              <Field label="Module"      value={ENTITY_LABELS[selectedLog.entityType] ?? selectedLog.entityType} />
              <Field label="Référence"   value={selectedLog.entityId ?? '—'} mono />
              <Field label="Utilisateur" value={selectedLog.userName ?? '—'} />
              <Field label="Email"       value={selectedLog.userEmail ?? '—'} />
              <Field label="IP"          value={selectedLog.ipAddress ?? '—'} mono />
              <Field label="User-Agent"  value={selectedLog.userAgent ?? '—'} />
              {selectedLog.metadata && (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Métadonnées</p>
                  <pre className="bg-muted rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-0.5">{label}</p>
      <p className={mono ? 'font-mono text-xs' : 'text-sm'}>{value}</p>
    </div>
  )
}
```

**Step 2: Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep "AuditLogsClient"
```

Expected: aucune erreur

**Step 3: Commit**

```bash
git add "app/(dashboard)/admin/audit-logs/AuditLogsClient.tsx"
git commit -m "feat(audit): add AuditLogsClient with table, filters, drawer"
```

---

## Task 14 — Sidebar link + pageTitles

**Files:**
- Modify: `components/layout/dashboard-shell.tsx`

**Step 1: Ajouter l'import icône ClipboardList**

Dans la liste des imports lucide-react, ajouter `ClipboardList`.

**Step 2: Ajouter le lien dans navItems**

Dans le tableau `navItems`, après l'entrée `'/admin/utilisateurs'`, ajouter :

```typescript
  { href: '/admin/audit-logs', label: 'Journal des logs', icon: ClipboardList, roles: ['ADMIN'] },
```

**Step 3: Ajouter dans pageTitles**

```typescript
  '/admin/audit-logs': 'Journal des logs',
```

**Step 4: Commit**

```bash
git add components/layout/dashboard-shell.tsx
git commit -m "feat(audit): add sidebar link for /admin/audit-logs (ADMIN only)"
```

---

## Task 15 — Build de validation + déploiement

**Step 1: Build Next.js local**

```bash
npx next build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` ou `Route (app) ...` sans erreur

**Step 2: Git push**

```bash
git push origin main
```

**Step 3: Déploiement Vercel**

```bash
vercel --prod
```

Expected: `✅ Production: https://erp-marches-stam.vercel.app`

**Step 4: Vérification rapide en prod**

- Connecté en ADMIN → vérifier que le lien "Journal des logs" apparaît dans la sidebar
- Aller sur `/admin/audit-logs` → page s'affiche
- Effectuer une action (ex: modifier un marché) → vérifier qu'un log apparaît

---

## Task 16 — Tests E2E

**Files:**
- Create: `tests/audit/audit-logs.spec.ts`

**Step 1: Créer le fichier de tests**

```typescript
import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth'

test.describe('Journal des Logs — Accès ADMIN', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test('T1 — lien sidebar visible pour ADMIN', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Journal des logs' })).toBeVisible()
  })

  test('T2 — page /admin/audit-logs accessible et titre affiché', async ({ page }) => {
    await page.goto('/admin/audit-logs')
    await expect(page.getByRole('heading', { name: 'Journal des logs', exact: true })).toBeVisible()
  })

  test('T3 — tableau affiché avec au moins une ligne', async ({ page }) => {
    await page.goto('/admin/audit-logs')
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })
  })

  test('T4 — filtres action et module fonctionnels', async ({ page }) => {
    await page.goto('/admin/audit-logs')
    // Sélectionner filtre action = LOGIN
    await page.locator('[role="combobox"]').first().click()
    await page.getByRole('option', { name: 'Connexion' }).click()
    await page.getByRole('button', { name: 'Filtrer' }).click()
    await page.waitForURL(/action=LOGIN/)
    await expect(page).toHaveURL(/action=LOGIN/)
  })

  test('T5 — clic sur une ligne ouvre le drawer', async ({ page }) => {
    await page.goto('/admin/audit-logs')
    await page.locator('tbody tr').first().click()
    await expect(page.getByRole('heading', { name: 'Détail du log' })).toBeVisible({ timeout: 8000 })
  })

  test('T6 — bouton réinitialiser efface les filtres', async ({ page }) => {
    await page.goto('/admin/audit-logs?action=LOGIN')
    await page.getByRole('button', { name: 'Réinitialiser' }).click()
    await expect(page).toHaveURL('/admin/audit-logs')
  })

  test('T7 — export CSV déclenche un téléchargement', async ({ page }) => {
    await page.goto('/admin/audit-logs')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'CSV' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/audit-logs.*\.csv/)
  })
})

test.describe('Journal des Logs — Accès refusé non-ADMIN', () => {
  test('T8 — VISITEUR ne voit pas le lien sidebar', async ({ page }) => {
    await loginAs(page, 'visiteur')
    await expect(page.getByRole('link', { name: 'Journal des logs' })).not.toBeVisible()
  })

  test('T9 — EXPLOITATION redirigé depuis /admin/audit-logs', async ({ page }) => {
    await loginAs(page, 'exploitation')
    await page.goto('/admin/audit-logs')
    await expect(page).not.toHaveURL('/admin/audit-logs')
  })
})
```

**Step 2: Lancer les tests en prod**

```bash
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app \
  npx playwright test tests/audit/audit-logs.spec.ts --project=chromium --workers=1
```

Expected: 9/9 PASS (ou au moins T1–T6, T8–T9 ; T7 peut varier selon config Playwright download)

**Step 3: Commit**

```bash
git add tests/audit/audit-logs.spec.ts
git commit -m "test(audit): add E2E tests for /admin/audit-logs (access + filters + drawer + csv)"
```

---

## Récapitulatif des fichiers

| Fichier | Action |
|---------|--------|
| `prisma/schema.prisma` | Modifier — AuditLog + relation User |
| `lib/audit/constants.ts` | Créer |
| `lib/audit/logAction.ts` | Créer |
| `lib/actions/marches.ts` | Modifier — 3 points injection |
| `lib/actions/cautions.ts` | Modifier — 3 points injection |
| `lib/actions/vehicules.ts` | Modifier — 3 points injection |
| `lib/actions/interventions.ts` | Modifier — 2 points injection |
| `lib/actions/documents.ts` | Modifier — 2 points injection |
| `lib/actions/alert-rules.ts` | Modifier — 3 points injection |
| `lib/actions/exports.ts` | Modifier — 4+ points injection |
| `lib/auth/auth.config.ts` | Modifier — login/login_failed |
| `lib/actions/auth/change-password.ts` | Modifier — change_password |
| `lib/actions/audit-logs.ts` | Créer |
| `app/(dashboard)/admin/audit-logs/page.tsx` | Créer |
| `app/(dashboard)/admin/audit-logs/AuditLogsClient.tsx` | Créer |
| `components/layout/dashboard-shell.tsx` | Modifier — sidebar link |
| `tests/audit/audit-logs.spec.ts` | Créer |

**Total : 16 tâches · ~18 commits · 18 points d'instrumentation**
