# Alertes Refonte — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Faire évoluer le module Alertes vers une architecture event-driven avec Rule Builder CRUD, 3 canaux (Email/In-app/Webhook), idempotence et historique complet.

**Architecture:** 3 nouvelles tables (AlertEvent → AlertRule → AlertNotification). Un moteur synchrone (`publishEvent` → `processEvent`) remplace les appels directs à Nodemailer. Les règles sont configurables depuis l'UI admin sans refactor code.

**Tech Stack:** Next.js 15 Server Actions, Prisma 7, Nodemailer, shadcn/ui, Tailwind CSS, Playwright (E2E)

**Design doc:** `docs/plans/2026-02-23-alertes-refonte-design.md`

---

## Patterns critiques à respecter

```typescript
// Imports OBLIGATOIRES
import { prisma }    from "@/lib/db/prisma"
import { toast }     from "@/lib/utils/toast"         // PAS sonner directement
import { requireRole } from "@/lib/utils/permissions"
import type { ActionResult } from "@/types"

// Params async Next.js 15
const { id } = await params   // params: Promise<{ id: string }>

// Serialize les dates avant de passer à un Client Component
import { serializeX } from "@/lib/utils/serialize"
```

---

## PHASE 1 — Fondations DB + Types + Moteur

---

### Task 1 : Migration Prisma — 3 nouvelles tables

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1 : Ajouter les 3 modèles + relation User dans schema.prisma**

Ajouter à la fin du fichier `prisma/schema.prisma` (avant la dernière accolade si présente) :

```prisma
model AlertEvent {
  id           String    @id @default(cuid())
  type         String
  sourceModule String
  referenceId  String
  payload      Json
  processedAt  DateTime?
  createdAt    DateTime  @default(now())

  notifications AlertNotification[]

  @@map("alert_events")
}

model AlertRule {
  id              String   @id @default(cuid())
  name            String
  description     String?
  eventType       String
  conditions      Json
  channels        String[]
  targetRoles     String[]
  targetUserIds   String[]
  webhookUrl      String?
  priority        Int      @default(1)
  cooldownMinutes Int      @default(1440)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  notifications AlertNotification[]

  @@map("alert_rules")
}

model AlertNotification {
  id               String    @id @default(cuid())
  eventId          String
  ruleId           String
  channel          String
  recipientEmail   String?
  recipientUserId  String?
  status           String    @default("PENDING")
  deduplicationKey String    @unique
  sentAt           DateTime?
  readAt           DateTime?
  deliveryLog      String?
  createdAt        DateTime  @default(now())

  event AlertEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  rule  AlertRule  @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  user  User?      @relation(fields: [recipientUserId], references: [id], onDelete: SetNull)

  @@map("alert_notifications")
}
```

Ajouter la relation dans le modèle `User` existant (dans la section `// Relations`) :

```prisma
  alertNotifications AlertNotification[]
```

**Step 2 : Appliquer la migration via MCP Supabase**

Utiliser l'outil MCP `apply_migration` avec le project_id Supabase.
Nom de migration : `add_alert_event_rule_notification`

SQL à appliquer :
```sql
CREATE TABLE "alert_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "sourceModule" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "alert_rules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "eventType" TEXT NOT NULL,
  "conditions" JSONB NOT NULL,
  "channels" TEXT[] NOT NULL DEFAULT '{}',
  "targetRoles" TEXT[] NOT NULL DEFAULT '{}',
  "targetUserIds" TEXT[] NOT NULL DEFAULT '{}',
  "webhookUrl" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 1,
  "cooldownMinutes" INTEGER NOT NULL DEFAULT 1440,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "alert_notifications" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "recipientEmail" TEXT,
  "recipientUserId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "deduplicationKey" TEXT NOT NULL UNIQUE,
  "sentAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "deliveryLog" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("eventId") REFERENCES "alert_events"("id") ON DELETE CASCADE,
  FOREIGN KEY ("ruleId") REFERENCES "alert_rules"("id") ON DELETE CASCADE,
  FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "alert_notifications_recipientUserId_status_idx"
  ON "alert_notifications"("recipientUserId", "status");
CREATE INDEX "alert_events_type_processedAt_idx"
  ON "alert_events"("type", "processedAt");
CREATE INDEX "alert_rules_eventType_isActive_idx"
  ON "alert_rules"("eventType", "isActive");
```

**Step 3 : Générer le client Prisma**

```bash
cd "/c/Users/HP/Documents/claude projets/projet ERP marchés/ERP Marchés STAM Final"
npx prisma generate
```

Expected : `✔ Generated Prisma Client`

**Step 4 : Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(alertes): migration DB — AlertEvent, AlertRule, AlertNotification"
```

---

### Task 2 : Types TypeScript partagés

**Files:**
- Create: `lib/alertes/types.ts`

**Step 1 : Créer le fichier de types**

```typescript
// lib/alertes/types.ts

export const ALERT_EVENT_TYPES = {
  CAUTION_EXPIRING:       "CAUTION_EXPIRING",
  MARCHE_EXPIRING:        "MARCHE_EXPIRING",
  MARCHE_STATUS_CHANGED:  "MARCHE_STATUS_CHANGED",
  SAV_TICKET_CREATED:     "SAV_TICKET_CREATED",
  SAV_TICKET_ESCALATED:   "SAV_TICKET_ESCALATED",
  SAV_SLA_BREACH:         "SAV_SLA_BREACH",
  DOCUMENT_EXPIRING:      "DOCUMENT_EXPIRING",
} as const

export type AlertEventType = typeof ALERT_EVENT_TYPES[keyof typeof ALERT_EVENT_TYPES]

export const ALERT_CHANNELS = {
  EMAIL:   "EMAIL",
  IN_APP:  "IN_APP",
  WEBHOOK: "WEBHOOK",
} as const

export type AlertChannel = typeof ALERT_CHANNELS[keyof typeof ALERT_CHANNELS]

export const NOTIFICATION_STATUS = {
  PENDING: "PENDING",
  SENT:    "SENT",
  FAILED:  "FAILED",
  READ:    "READ",
} as const

export type NotificationStatus = typeof NOTIFICATION_STATUS[keyof typeof NOTIFICATION_STATUS]

export type ComparisonOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "nin"

export interface RuleCondition {
  field: string
  op: ComparisonOp
  value: string | number | string[]
}

export interface RuleConditions {
  operator: "AND" | "OR"
  conditions: RuleCondition[]
}

// Labels lisibles pour l'UI
export const EVENT_TYPE_LABELS: Record<AlertEventType, string> = {
  CAUTION_EXPIRING:      "Caution proche de l'échéance",
  MARCHE_EXPIRING:       "Marché en fin d'exécution",
  MARCHE_STATUS_CHANGED: "Changement de statut marché",
  SAV_TICKET_CREATED:    "Ticket SAV créé",
  SAV_TICKET_ESCALATED:  "Ticket SAV escaladé",
  SAV_SLA_BREACH:        "Dépassement SLA SAV",
  DOCUMENT_EXPIRING:     "Document expirant",
}

// Champs disponibles par type d'événement (pour le condition builder)
export const EVENT_FIELDS: Record<AlertEventType, Array<{ field: string; label: string; type: "number" | "string" }>> = {
  CAUTION_EXPIRING:      [
    { field: "joursRestants", label: "Jours restants", type: "number" },
    { field: "statut",        label: "Statut",         type: "string" },
    { field: "montant",       label: "Montant (XOF)",  type: "number" },
  ],
  MARCHE_EXPIRING:       [
    { field: "joursRestants", label: "Jours restants", type: "number" },
    { field: "statut",        label: "Statut",         type: "string" },
  ],
  MARCHE_STATUS_CHANGED: [
    { field: "ancienStatut",  label: "Ancien statut",  type: "string" },
    { field: "nouveauStatut", label: "Nouveau statut", type: "string" },
  ],
  SAV_TICKET_CREATED:    [],
  SAV_TICKET_ESCALATED:  [],
  SAV_SLA_BREACH:        [
    { field: "heuresDepassement", label: "Heures de dépassement", type: "number" },
  ],
  DOCUMENT_EXPIRING:     [
    { field: "joursRestants", label: "Jours restants", type: "number" },
  ],
}
```

**Step 2 : Commit**

```bash
git add lib/alertes/types.ts
git commit -m "feat(alertes): types partagés — AlertEventType, RuleConditions, channels"
```

---

### Task 3 : Rule Evaluator

**Files:**
- Create: `lib/alertes/engine/rule-evaluator.ts`

**Step 1 : Créer le moteur d'évaluation des conditions**

```typescript
// lib/alertes/engine/rule-evaluator.ts

import type { RuleConditions, RuleCondition } from "@/lib/alertes/types"

/**
 * Évalue si un payload satisfait les conditions d'une règle.
 * Retourne true si toutes les conditions (AND) ou au moins une (OR) sont vérifiées.
 */
export function evaluateConditions(
  conditions: RuleConditions,
  payload: Record<string, unknown>
): boolean {
  if (!conditions.conditions || conditions.conditions.length === 0) {
    return true // Pas de condition = toujours déclencher
  }

  const results = conditions.conditions.map((c) => evaluateSingle(c, payload))

  return conditions.operator === "AND"
    ? results.every(Boolean)
    : results.some(Boolean)
}

function evaluateSingle(
  condition: RuleCondition,
  payload: Record<string, unknown>
): boolean {
  const rawValue = payload[condition.field]
  const condValue = condition.value

  // Champ absent = condition non satisfaite
  if (rawValue === undefined || rawValue === null) return false

  try {
    switch (condition.op) {
      case "eq":  return String(rawValue) === String(condValue)
      case "neq": return String(rawValue) !== String(condValue)
      case "gt":  return Number(rawValue) > Number(condValue)
      case "gte": return Number(rawValue) >= Number(condValue)
      case "lt":  return Number(rawValue) < Number(condValue)
      case "lte": return Number(rawValue) <= Number(condValue)
      case "in":
        return Array.isArray(condValue)
          ? condValue.map(String).includes(String(rawValue))
          : false
      case "nin":
        return Array.isArray(condValue)
          ? !condValue.map(String).includes(String(rawValue))
          : true
      default:
        return false
    }
  } catch {
    return false
  }
}
```

**Step 2 : Commit**

```bash
git add lib/alertes/engine/rule-evaluator.ts
git commit -m "feat(alertes): rule-evaluator — évaluation conditions JSON vs payload"
```

---

### Task 4 : Recipient Resolver

**Files:**
- Create: `lib/alertes/engine/recipient-resolver.ts`

**Step 1 : Créer le résolveur de destinataires**

```typescript
// lib/alertes/engine/recipient-resolver.ts

import { prisma } from "@/lib/db/prisma"

export interface Recipient {
  userId: string
  email: string
  role: string
}

/**
 * Résout la liste des destinataires d'une règle
 * en fusionnant les rôles ciblés et les users individuels.
 */
export async function resolveRecipients(
  targetRoles: string[],
  targetUserIds: string[]
): Promise<Recipient[]> {
  const conditions = []

  if (targetRoles.length > 0) {
    conditions.push({ role: { in: targetRoles } })
  }
  if (targetUserIds.length > 0) {
    conditions.push({ id: { in: targetUserIds } })
  }

  if (conditions.length === 0) return []

  const users = await prisma.user.findMany({
    where: { OR: conditions },
    select: { id: true, email: true, role: true },
  })

  // Dédupliquer par email (au cas où un user est ciblé ET via son rôle)
  const seen = new Set<string>()
  return users.filter((u) => {
    if (seen.has(u.email)) return false
    seen.add(u.email)
    return true
  }).map((u) => ({ userId: u.id, email: u.email, role: u.role }))
}
```

**Step 2 : Commit**

```bash
git add lib/alertes/engine/recipient-resolver.ts
git commit -m "feat(alertes): recipient-resolver — résolution rôles + users vers destinataires"
```

---

### Task 5 : Canaux de notification

**Files:**
- Create: `lib/alertes/channels/email-channel.ts`
- Create: `lib/alertes/channels/inapp-channel.ts`
- Create: `lib/alertes/channels/webhook-channel.ts`

**Step 1 : email-channel.ts**

```typescript
// lib/alertes/channels/email-channel.ts

import { createEmailTransport } from "@/lib/config/email"

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Envoie un email via Nodemailer.
 * Retourne { success, log }.
 */
export async function sendEmailChannel(payload: EmailPayload): Promise<{ success: boolean; log: string }> {
  try {
    const transport = createEmailTransport()
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM ?? "ERP Marchés <noreply@stam.local>",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })
    return { success: true, log: `messageId:${info.messageId}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, log: `ERROR:${msg}` }
  }
}
```

**Step 2 : inapp-channel.ts**

```typescript
// lib/alertes/channels/inapp-channel.ts

/**
 * Canal in-app : l'enregistrement AlertNotification avec status=PENDING
 * est suffisant — le polling client le récupère.
 * Cette fonction ne fait rien de plus (le INSERT est fait dans process-event).
 */
export function markInAppReady(): { success: boolean; log: string } {
  return { success: true, log: "in-app:ready" }
}
```

**Step 3 : webhook-channel.ts**

```typescript
// lib/alertes/channels/webhook-channel.ts

/**
 * Envoie un payload JSON vers une URL webhook externe.
 * Timeout 5s, pas de retry (status FAILED loggué).
 */
export async function sendWebhookChannel(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; log: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    return {
      success: res.ok,
      log: `status:${res.status}`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, log: `ERROR:${msg}` }
  }
}
```

**Step 4 : Commit**

```bash
git add lib/alertes/channels/
git commit -m "feat(alertes): canaux email, in-app, webhook"
```

---

### Task 6 : Moteur central — publishEvent + processEvent

**Files:**
- Create: `lib/alertes/engine/publish-event.ts`
- Create: `lib/alertes/engine/process-event.ts`

**Step 1 : publish-event.ts — point d'entrée unique**

```typescript
// lib/alertes/engine/publish-event.ts

import { prisma } from "@/lib/db/prisma"
import type { AlertEventType } from "@/lib/alertes/types"
import { processEvent } from "./process-event"

/**
 * Publie un événement métier et déclenche immédiatement son traitement.
 * Point d'entrée unique pour tous les modules (SAV, Marchés, Cautions, Documents).
 */
export async function publishEvent(
  type: AlertEventType,
  sourceModule: string,
  referenceId: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const event = await prisma.alertEvent.create({
      data: { type, sourceModule, referenceId, payload },
    })
    // Traitement synchrone (Vercel Hobby : pas de queue async)
    await processEvent(event.id)
  } catch (err) {
    // Ne jamais faire planter l'action métier à cause d'une alerte
    console.error("[AlertEngine] publishEvent error:", err)
  }
}
```

**Step 2 : process-event.ts — orchestrateur**

```typescript
// lib/alertes/engine/process-event.ts

import { prisma } from "@/lib/db/prisma"
import { evaluateConditions } from "./rule-evaluator"
import { resolveRecipients } from "./recipient-resolver"
import { sendEmailChannel } from "@/lib/alertes/channels/email-channel"
import { markInAppReady } from "@/lib/alertes/channels/inapp-channel"
import { sendWebhookChannel } from "@/lib/alertes/channels/webhook-channel"
import { dailyAlertsEmailTemplate } from "@/lib/email/templates"
import type { RuleConditions } from "@/lib/alertes/types"

/**
 * Construit la clé de déduplication basée sur la fenêtre de cooldown.
 * Deux appels dans la même fenêtre → même clé → INSERT bloqué par @@unique.
 */
function buildDeduplicationKey(
  eventType: string,
  referenceId: string,
  ruleId: string,
  cooldownMinutes: number
): string {
  const windowMs = cooldownMinutes * 60 * 1000
  const windowIndex = Math.floor(Date.now() / windowMs)
  return `${eventType}_${referenceId}_${ruleId}_${windowIndex}`
}

export async function processEvent(eventId: string): Promise<void> {
  const event = await prisma.alertEvent.findUnique({
    where: { id: eventId },
  })
  if (!event) return

  const payload = event.payload as Record<string, unknown>

  // 1. Trouver les règles actives pour ce type d'événement
  const rules = await prisma.alertRule.findMany({
    where: { eventType: event.type, isActive: true },
    orderBy: { priority: "asc" },
  })

  for (const rule of rules) {
    // 2. Évaluer les conditions
    const conditions = rule.conditions as RuleConditions
    if (!evaluateConditions(conditions, payload)) continue

    // 3. Résoudre les destinataires
    const recipients = await resolveRecipients(rule.targetRoles, rule.targetUserIds)
    if (recipients.length === 0) continue

    for (const channel of rule.channels) {
      for (const recipient of recipients) {
        const dedupKey = buildDeduplicationKey(
          event.type,
          event.referenceId,
          rule.id,
          rule.cooldownMinutes
        ) + `_${channel}_${recipient.email}`

        // 4. Vérifier l'idempotence
        const existing = await prisma.alertNotification.findUnique({
          where: { deduplicationKey: dedupKey },
        })
        if (existing) continue

        // 5. Créer la notification en PENDING
        const notification = await prisma.alertNotification.create({
          data: {
            eventId: event.id,
            ruleId: rule.id,
            channel,
            recipientEmail: recipient.email,
            recipientUserId: recipient.userId,
            status: "PENDING",
            deduplicationKey: dedupKey,
          },
        })

        // 6. Dispatcher selon canal
        let result: { success: boolean; log: string }

        if (channel === "EMAIL") {
          // Générer un template email simple basé sur le payload
          const subject = `[ERP Marchés] ${rule.name}`
          const html = buildSimpleEmailHtml(rule.name, event.type, payload)
          result = await sendEmailChannel({ to: recipient.email, subject, html })
        } else if (channel === "IN_APP") {
          result = markInAppReady()
        } else if (channel === "WEBHOOK" && rule.webhookUrl) {
          result = await sendWebhookChannel(rule.webhookUrl, {
            eventType: event.type,
            referenceId: event.referenceId,
            payload,
            rule: { id: rule.id, name: rule.name },
          })
        } else {
          continue
        }

        // 7. Mettre à jour le statut
        await prisma.alertNotification.update({
          where: { id: notification.id },
          data: {
            status: result.success ? (channel === "IN_APP" ? "PENDING" : "SENT") : "FAILED",
            sentAt: result.success && channel !== "IN_APP" ? new Date() : undefined,
            deliveryLog: result.log,
          },
        })
      }
    }
  }

  // 8. Marquer l'événement comme traité
  await prisma.alertEvent.update({
    where: { id: eventId },
    data: { processedAt: new Date() },
  })
}

/** Template email générique basé sur le payload de l'événement */
function buildSimpleEmailHtml(
  ruleName: string,
  eventType: string,
  payload: Record<string, unknown>
): string {
  const rows = Object.entries(payload)
    .map(([k, v]) => `<tr><td style="padding:4px 8px;font-weight:bold">${k}</td><td style="padding:4px 8px">${v}</td></tr>`)
    .join("")

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1E3A5F;color:white;padding:24px">
        <h2 style="margin:0">🔔 ${ruleName}</h2>
        <p style="margin:8px 0 0;opacity:.8">${eventType}</p>
      </div>
      <div style="padding:24px;background:#f9f9f9">
        <table style="width:100%;border-collapse:collapse">
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="padding:16px;font-size:12px;color:#666;text-align:center">
        ERP Marchés STAM — notification automatique
      </div>
    </div>
  `
}
```

**Step 3 : Vérifier que le build ne casse pas**

```bash
cd "/c/Users/HP/Documents/claude projets/projet ERP marchés/ERP Marchés STAM Final"
npx tsc --noEmit
```

Expected : 0 erreurs

**Step 4 : Commit**

```bash
git add lib/alertes/engine/
git commit -m "feat(alertes): moteur central — publishEvent + processEvent + idempotence"
```

---

### Task 7 : Seed des règles par défaut

**Files:**
- Create: `prisma/seeds/alert-rules-seed.ts`
- Modify: `prisma/seed.ts` (ou créer s'il n'existe pas)

**Step 1 : Créer le fichier de seed des règles**

```typescript
// prisma/seeds/alert-rules-seed.ts

import { PrismaClient } from "@prisma/client"
import type { RuleConditions } from "@/lib/alertes/types"

export async function seedAlertRules(prisma: PrismaClient) {
  const rules: Array<{
    name: string
    description: string
    eventType: string
    conditions: RuleConditions
    channels: string[]
    targetRoles: string[]
    cooldownMinutes: number
  }> = [
    {
      name: "Caution critique (≤ 7 jours)",
      description: "Alerte quand une caution active expire dans 7 jours ou moins",
      eventType: "CAUTION_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [
          { field: "joursRestants", op: "lte", value: 7 },
          { field: "statut", op: "eq", value: "ACTIVE" },
        ],
      },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 1440,
    },
    {
      name: "Caution attention (8–30 jours)",
      description: "Alerte préventive pour les cautions expirant entre 8 et 30 jours",
      eventType: "CAUTION_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [
          { field: "joursRestants", op: "lte", value: 30 },
          { field: "joursRestants", op: "gt",  value: 7 },
          { field: "statut", op: "eq", value: "ACTIVE" },
        ],
      },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 1440,
    },
    {
      name: "Marché fin imminente (≤ 14 jours)",
      description: "Alerte urgente pour les marchés finissant dans 14 jours",
      eventType: "MARCHE_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [{ field: "joursRestants", op: "lte", value: 14 }],
      },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE", "EXPLOITATION"],
      cooldownMinutes: 1440,
    },
    {
      name: "Marché fin proche (15–60 jours)",
      description: "Alerte préventive pour les marchés finissant entre 15 et 60 jours",
      eventType: "MARCHE_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [
          { field: "joursRestants", op: "lte", value: 60 },
          { field: "joursRestants", op: "gt",  value: 14 },
        ],
      },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 1440,
    },
    {
      name: "Ticket SAV créé",
      description: "Notification in-app à chaque création de ticket SAV",
      eventType: "SAV_TICKET_CREATED",
      conditions: { operator: "AND", conditions: [] },
      channels: ["IN_APP"],
      targetRoles: ["ADMIN", "EXPLOITATION"],
      cooldownMinutes: 0,
    },
    {
      name: "Ticket SAV escaladé",
      description: "Alerte email + in-app quand un ticket SAV est escaladé",
      eventType: "SAV_TICKET_ESCALATED",
      conditions: { operator: "AND", conditions: [] },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE", "EXPLOITATION"],
      cooldownMinutes: 60,
    },
    {
      name: "SLA SAV dépassé",
      description: "Alerte email + in-app pour dépassement de SLA",
      eventType: "SAV_SLA_BREACH",
      conditions: { operator: "AND", conditions: [] },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 120,
    },
    {
      name: "Document expirant (≤ 30 jours)",
      description: "Alerte pour les documents dont la date d'expiration approche",
      eventType: "DOCUMENT_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [{ field: "joursRestants", op: "lte", value: 30 }],
      },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 1440,
    },
  ]

  for (const rule of rules) {
    await prisma.alertRule.upsert({
      where: { id: `default_${rule.eventType}_${rule.name.replace(/\s+/g, "_")}` },
      update: {},  // Ne pas écraser si déjà existant
      create: {
        id: `default_${rule.eventType}_${rule.name.replace(/\s+/g, "_")}`,
        ...rule,
      },
    })
  }
  console.log("✅ Règles d'alerte par défaut seedées")
}
```

**Step 2 : Exécuter le seed via MCP Supabase**

Utiliser `execute_sql` avec le project_id pour insérer les règles par défaut directement en SQL (évite les problèmes de connexion pooler avec `prisma db seed`).

```sql
-- Insérer les 8 règles par défaut si elles n'existent pas
INSERT INTO "alert_rules" ("id", "name", "description", "eventType", "conditions", "channels", "targetRoles", "targetUserIds", "priority", "cooldownMinutes", "isActive", "createdAt", "updatedAt")
VALUES
(
  'default_CAUTION_EXPIRING_Caution_critique_(≤_7_jours)',
  'Caution critique (≤ 7 jours)',
  'Alerte quand une caution active expire dans 7 jours ou moins',
  'CAUTION_EXPIRING',
  '{"operator":"AND","conditions":[{"field":"joursRestants","op":"lte","value":7},{"field":"statut","op":"eq","value":"ACTIVE"}]}',
  ARRAY['EMAIL','IN_APP'],
  ARRAY['ADMIN','AVANCE'],
  ARRAY[]::text[],
  1, 1440, true, NOW(), NOW()
)
ON CONFLICT ("id") DO NOTHING;
-- (répéter pour les 7 autres règles)
```

**Step 3 : Commit**

```bash
git add prisma/seeds/
git commit -m "feat(alertes): seed règles par défaut — 8 règles équivalentes à l'existant"
```

---

## PHASE 2 — Branchement sur les modules existants

---

### Task 8 : Brancher le cron sur publishEvent

**Files:**
- Create: `lib/alertes/engine/cron-processor.ts`
- Modify: `app/api/cron/daily-alerts/route.ts`

**Step 1 : Créer le processeur cron**

```typescript
// lib/alertes/engine/cron-processor.ts

import { prisma } from "@/lib/db/prisma"
import { publishEvent } from "./publish-event"
import { ALERT_EVENT_TYPES } from "@/lib/alertes/types"

/**
 * Scanne la DB et publie les événements d'échéance.
 * Remplace sendDailyAlertsEmail() — appelé par le cron quotidien.
 */
export async function runDailyAlertsCron(): Promise<{
  cautionsCount: number
  marchesCount: number
  documentsCount: number
}> {
  const today = new Date()
  const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  // 1. Cautions actives expirant dans 30 jours
  const cautions = await prisma.caution.findMany({
    where: {
      statut: "ACTIVE",
      dateEcheance: { gte: today, lte: in30Days },
    },
    include: { marche: { select: { numero: true, objet: true } } },
  })

  for (const c of cautions) {
    const joursRestants = Math.ceil((c.dateEcheance.getTime() - today.getTime()) / 86400000)
    await publishEvent(ALERT_EVENT_TYPES.CAUTION_EXPIRING, "cautions", c.id, {
      joursRestants,
      statut: c.statut,
      montant: c.montant,
      reference: c.reference,
      marcheNumero: c.marche?.numero ?? "",
    })
  }

  // 2. Marchés en exécution finissant dans 60 jours
  const marches = await prisma.marche.findMany({
    where: {
      statut: { in: ["EN_EXECUTION", "EXECUTE_ATTENTE_GARANTIES"] },
      dateFinPrevue: { gte: today, lte: in60Days },
    },
  })

  for (const m of marches) {
    if (!m.dateFinPrevue) continue
    const joursRestants = Math.ceil((m.dateFinPrevue.getTime() - today.getTime()) / 86400000)
    await publishEvent(ALERT_EVENT_TYPES.MARCHE_EXPIRING, "marches", m.id, {
      joursRestants,
      statut: m.statut,
      montant: m.montant,
      numero: m.numero,
      objet: m.objet,
    })
  }

  // 3. Documents avec date d'expiration dans 30 jours (si champ disponible)
  // Note : vérifier que le modèle Document a un champ dateExpiration
  let documentsCount = 0
  try {
    const documents = await (prisma as any).document.findMany({
      where: {
        dateExpiration: { gte: today, lte: in30Days },
      },
    })
    for (const d of documents) {
      const joursRestants = Math.ceil((d.dateExpiration.getTime() - today.getTime()) / 86400000)
      await publishEvent(ALERT_EVENT_TYPES.DOCUMENT_EXPIRING, "documents", d.id, {
        joursRestants,
        titre: d.titre,
        reference: d.reference,
      })
      documentsCount++
    }
  } catch {
    // Champ dateExpiration peut-être absent — pas bloquant
  }

  return {
    cautionsCount: cautions.length,
    marchesCount: marches.length,
    documentsCount,
  }
}
```

**Step 2 : Modifier le cron handler pour utiliser runDailyAlertsCron**

Dans `app/api/cron/daily-alerts/route.ts`, remplacer l'import et l'appel :

```typescript
// Remplacer :
import { sendDailyAlertsEmail } from "@/lib/actions/alertes"
// Par :
import { runDailyAlertsCron } from "@/lib/alertes/engine/cron-processor"

// Remplacer l'appel :
const result = await sendDailyAlertsEmail()
// Par :
const data = await runDailyAlertsCron()
const result = { success: true, data }
```

**Step 3 : Vérifier le build**

```bash
npx tsc --noEmit
```

**Step 4 : Commit**

```bash
git add lib/alertes/engine/cron-processor.ts app/api/cron/daily-alerts/route.ts
git commit -m "feat(alertes): cron branché sur publishEvent — cautions, marchés, documents"
```

---

### Task 9 : Brancher le module SAV sur publishEvent

**Files:**
- Modify: `lib/actions/sav/interventions.ts` (ou le fichier Server Action SAV existant)

**Step 1 : Trouver le fichier d'actions SAV**

```bash
find lib/actions -name "*.ts" | xargs grep -l "intervention\|sav" -i
```

**Step 2 : Ajouter publishEvent après createIntervention et updateStatut**

Dans la Server Action de création d'intervention, ajouter après l'INSERT :

```typescript
import { publishEvent } from "@/lib/alertes/engine/publish-event"
import { ALERT_EVENT_TYPES } from "@/lib/alertes/types"

// Après la création d'une intervention :
await publishEvent(ALERT_EVENT_TYPES.SAV_TICKET_CREATED, "sav", intervention.id, {
  vehiculeId: intervention.vehiculeId,
  immatriculation: vehicule.immatriculation,
  titre: intervention.titre,
  statut: intervention.statut,
})
```

Dans la Server Action de changement de statut, ajouter pour l'escalade :

```typescript
// Quand le statut passe à un statut critique (ex: EN_COURS avec priorité HAUTE)
if (nouveauStatut === "EN_COURS" && intervention.priorite === "HAUTE") {
  await publishEvent(ALERT_EVENT_TYPES.SAV_TICKET_ESCALATED, "sav", intervention.id, {
    vehiculeId: intervention.vehiculeId,
    titre: intervention.titre,
    ancienStatut,
    nouveauStatut,
  })
}
```

**Step 3 : Commit**

```bash
git add lib/actions/sav/
git commit -m "feat(alertes): SAV branché sur publishEvent — ticket créé + escalade"
```

---

### Task 10 : Brancher les changements de statut marché

**Files:**
- Modify: `lib/actions/marches.ts` (ou fichier équivalent)

**Step 1 : Trouver la Server Action updateMarche**

```bash
grep -r "updateMarche\|statut.*marche\|marche.*statut" lib/actions --include="*.ts" -l
```

**Step 2 : Ajouter publishEvent sur changement de statut**

Dans la fonction `updateMarche`, après le `prisma.marche.update`, ajouter :

```typescript
import { publishEvent } from "@/lib/alertes/engine/publish-event"
import { ALERT_EVENT_TYPES } from "@/lib/alertes/types"

// Si le statut a changé :
if (data.statut && data.statut !== marcheAvant.statut) {
  await publishEvent(ALERT_EVENT_TYPES.MARCHE_STATUS_CHANGED, "marches", marche.id, {
    ancienStatut: marcheAvant.statut,
    nouveauStatut: marche.statut,
    numero: marche.numero,
    objet: marche.objet,
  })
}
```

**Step 3 : Commit**

```bash
git add lib/actions/marches.ts
git commit -m "feat(alertes): marchés branchés sur publishEvent — changement de statut"
```

---

## PHASE 3 — API In-app + Cloche sidebar

---

### Task 11 : API Routes notifications

**Files:**
- Create: `app/api/notifications/route.ts`
- Create: `app/api/notifications/[id]/route.ts`

**Step 1 : GET /api/notifications — liste non lues**

```typescript
// app/api/notifications/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAuth } from "@/lib/utils/permissions"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const notifications = await prisma.alertNotification.findMany({
      where: {
        recipientUserId: userId,
        channel: "IN_APP",
        status: "PENDING",
      },
      include: {
        event: { select: { type: true, sourceModule: true, referenceId: true, payload: true } },
        rule:  { select: { name: true, priority: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ success: true, data: notifications })
  } catch {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }
}
```

**Step 2 : PATCH /api/notifications/[id] — marquer comme lu**

```typescript
// app/api/notifications/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAuth } from "@/lib/utils/permissions"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const notif = await prisma.alertNotification.findUnique({ where: { id } })
    if (!notif || notif.recipientUserId !== session.user.id) {
      return NextResponse.json({ error: "Non trouvé" }, { status: 404 })
    }

    await prisma.alertNotification.update({
      where: { id },
      data: { status: "READ", readAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
```

**Step 3 : Commit**

```bash
git add app/api/notifications/
git commit -m "feat(alertes): API GET/PATCH /api/notifications — in-app polling"
```

---

### Task 12 : Composants NotificationBell + NotificationPanel

**Files:**
- Create: `components/admin/alertes/notifications/notification-bell.tsx`
- Create: `components/admin/alertes/notifications/notification-panel.tsx`
- Modify: `components/layout/dashboard-shell.tsx`

**Step 1 : notification-bell.tsx**

```tsx
// components/admin/alertes/notifications/notification-bell.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationPanel } from "./notification-panel"

interface Notification {
  id: string
  createdAt: string
  event: { type: string; sourceModule: string; referenceId: string; payload: unknown }
  rule: { name: string; priority: number }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const json = await res.json()
        setNotifications(json.data ?? [])
      }
    } catch { /* silencieux */ }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleMarkRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" })
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const handleMarkAllRead = async () => {
    await Promise.all(notifications.map((n) => handleMarkRead(n.id)))
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </Button>

      {open && (
        <NotificationPanel
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
```

**Step 2 : notification-panel.tsx**

```tsx
// components/admin/alertes/notifications/notification-panel.tsx
"use client"

import { X, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"

interface Notification {
  id: string
  createdAt: string
  event: { type: string; sourceModule: string; payload: unknown }
  rule: { name: string; priority: number }
}

interface Props {
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onClose: () => void
}

export function NotificationPanel({ notifications, onMarkRead, onMarkAllRead, onClose }: Props) {
  return (
    <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border bg-white shadow-lg">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold text-sm">
          Notifications {notifications.length > 0 && `(${notifications.length})`}
        </span>
        <div className="flex gap-1">
          {notifications.length > 0 && (
            <Button variant="ghost" size="icon" onClick={onMarkAllRead} title="Tout marquer comme lu">
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-80">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Aucune notification
          </p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-3 border-b px-4 py-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => onMarkRead(n.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{n.rule.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => { e.stopPropagation(); onMarkRead(n.id) }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  )
}
```

**Step 3 : Intégrer NotificationBell dans le dashboard-shell**

Dans `components/layout/dashboard-shell.tsx`, ajouter dans la topbar (zone header) :

```tsx
import { NotificationBell } from "@/components/admin/alertes/notifications/notification-bell"

// Dans le JSX de la topbar, à côté du badge rôle :
<NotificationBell />
```

**Step 4 : Vérifier le build**

```bash
npx tsc --noEmit
```

**Step 5 : Commit**

```bash
git add components/admin/alertes/notifications/ components/layout/dashboard-shell.tsx
git commit -m "feat(alertes): cloche notification in-app — polling 30s + badge compteur"
```

---

## PHASE 4 — Rule Builder UI

---

### Task 13 : Server Actions CRUD règles

**Files:**
- Create: `lib/actions/alert-rules.ts`

**Step 1 : Créer les Server Actions**

```typescript
// lib/actions/alert-rules.ts
"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { requireRole } from "@/lib/utils/permissions"
import type { ActionResult } from "@/types"
import type { RuleConditions } from "@/lib/alertes/types"
import { z } from "zod"

const RuleSchema = z.object({
  name:            z.string().min(2).max(100),
  description:     z.string().optional(),
  eventType:       z.string().min(1),
  conditions:      z.object({
    operator: z.enum(["AND", "OR"]),
    conditions: z.array(z.object({
      field: z.string(),
      op:    z.enum(["eq","neq","gt","gte","lt","lte","in","nin"]),
      value: z.union([z.string(), z.number(), z.array(z.string())]),
    })),
  }),
  channels:        z.array(z.string()).min(1),
  targetRoles:     z.array(z.string()),
  targetUserIds:   z.array(z.string()),
  webhookUrl:      z.string().url().optional().or(z.literal("")),
  priority:        z.number().int().min(1).max(10).default(1),
  cooldownMinutes: z.number().int().min(60).default(1440),
  isActive:        z.boolean().default(true),
})

export async function getAlertRules() {
  await requireRole(["ADMIN", "AVANCE"])
  const rules = await prisma.alertRule.findMany({ orderBy: [{ priority: "asc" }, { createdAt: "asc" }] })
  return rules
}

export async function getAlertRule(id: string) {
  await requireRole(["ADMIN", "AVANCE"])
  return prisma.alertRule.findUnique({ where: { id } })
}

export async function createAlertRule(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ADMIN"])
    const data = RuleSchema.parse(input)
    const rule = await prisma.alertRule.create({ data: { ...data, webhookUrl: data.webhookUrl || null } })
    revalidatePath("/admin/alertes/rules")
    return { success: true, data: { id: rule.id } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" }
  }
}

export async function updateAlertRule(id: string, input: unknown): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"])
    const data = RuleSchema.parse(input)
    await prisma.alertRule.update({ where: { id }, data: { ...data, webhookUrl: data.webhookUrl || null } })
    revalidatePath("/admin/alertes/rules")
    revalidatePath(`/admin/alertes/rules/${id}/edit`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" }
  }
}

export async function toggleAlertRule(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"])
    await prisma.alertRule.update({ where: { id }, data: { isActive } })
    revalidatePath("/admin/alertes/rules")
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" }
  }
}

export async function deleteAlertRule(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"])
    await prisma.alertRule.delete({ where: { id } })
    revalidatePath("/admin/alertes/rules")
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" }
  }
}
```

**Step 2 : Commit**

```bash
git add lib/actions/alert-rules.ts
git commit -m "feat(alertes): Server Actions CRUD AlertRule avec validation Zod"
```

---

### Task 14 : Composants Rule Builder

**Files:**
- Create: `components/admin/alertes/rule-builder/condition-editor.tsx`
- Create: `components/admin/alertes/rule-builder/recipient-picker.tsx`
- Create: `components/admin/alertes/rule-builder/channel-selector.tsx`
- Create: `components/admin/alertes/rule-builder/rule-form.tsx`

**Step 1 : condition-editor.tsx**

```tsx
// components/admin/alertes/rule-builder/condition-editor.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { EVENT_FIELDS, ALERT_EVENT_TYPES } from "@/lib/alertes/types"
import type { RuleCondition, AlertEventType } from "@/lib/alertes/types"

interface Props {
  eventType: AlertEventType | ""
  operator: "AND" | "OR"
  conditions: RuleCondition[]
  onOperatorChange: (op: "AND" | "OR") => void
  onConditionsChange: (conditions: RuleCondition[]) => void
}

const OP_LABELS: Record<string, string> = {
  eq: "égal à", neq: "différent de", gt: "supérieur à", gte: "supérieur ou égal à",
  lt: "inférieur à", lte: "inférieur ou égal à", in: "dans la liste", nin: "pas dans la liste",
}

export function ConditionEditor({ eventType, operator, conditions, onOperatorChange, onConditionsChange }: Props) {
  const fields = eventType ? (EVENT_FIELDS[eventType] ?? []) : []

  const addCondition = () => {
    onConditionsChange([...conditions, { field: fields[0]?.field ?? "", op: "eq", value: "" }])
  }

  const removeCondition = (i: number) => {
    onConditionsChange(conditions.filter((_, idx) => idx !== i))
  }

  const updateCondition = (i: number, patch: Partial<RuleCondition>) => {
    onConditionsChange(conditions.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }

  if (!eventType || fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        {!eventType ? "Sélectionner un type d'événement pour configurer les conditions." : "Ce type d'événement ne supporte pas de conditions (déclenché systématiquement)."}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {conditions.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Opérateur :</span>
          <Select value={operator} onValueChange={(v) => onOperatorChange(v as "AND" | "OR")}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">ET (AND)</SelectItem>
              <SelectItem value="OR">OU (OR)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {conditions.map((cond, i) => (
        <div key={i} className="flex items-center gap-2 rounded border p-2">
          <Select value={cond.field} onValueChange={(v) => updateCondition(i, { field: v })}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Champ" />
            </SelectTrigger>
            <SelectContent>
              {fields.map((f) => (
                <SelectItem key={f.field} value={f.field}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cond.op} onValueChange={(v) => updateCondition(i, { op: v as RuleCondition["op"] })}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OP_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            className="w-28"
            value={String(cond.value)}
            onChange={(e) => updateCondition(i, { value: e.target.value })}
            placeholder="Valeur"
          />

          <Button variant="ghost" size="icon" onClick={() => removeCondition(i)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addCondition} type="button">
        <Plus className="h-4 w-4 mr-1" /> Ajouter une condition
      </Button>
    </div>
  )
}
```

**Step 2 : channel-selector.tsx**

```tsx
// components/admin/alertes/rule-builder/channel-selector.tsx
"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Bell, Webhook } from "lucide-react"

const CHANNELS = [
  { value: "EMAIL",   label: "Email",    icon: Mail,    description: "Envoi par Nodemailer aux destinataires" },
  { value: "IN_APP",  label: "In-app",   icon: Bell,    description: "Notification dans la cloche de l'interface" },
  { value: "WEBHOOK", label: "Webhook",  icon: Webhook, description: "POST JSON vers une URL externe" },
]

interface Props {
  channels: string[]
  webhookUrl: string
  onChannelsChange: (channels: string[]) => void
  onWebhookUrlChange: (url: string) => void
}

export function ChannelSelector({ channels, webhookUrl, onChannelsChange, onWebhookUrlChange }: Props) {
  const toggle = (value: string, checked: boolean) => {
    onChannelsChange(checked ? [...channels, value] : channels.filter((c) => c !== value))
  }

  return (
    <div className="space-y-3">
      {CHANNELS.map(({ value, label, icon: Icon, description }) => (
        <div key={value} className="space-y-2">
          <div className="flex items-center gap-3">
            <Checkbox
              id={`channel-${value}`}
              checked={channels.includes(value)}
              onCheckedChange={(c) => toggle(value, !!c)}
            />
            <Label htmlFor={`channel-${value}`} className="flex items-center gap-2 cursor-pointer">
              <Icon className="h-4 w-4" />
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">— {description}</span>
            </Label>
          </div>
          {value === "WEBHOOK" && channels.includes("WEBHOOK") && (
            <Input
              className="ml-7"
              placeholder="https://hooks.slack.com/..."
              value={webhookUrl}
              onChange={(e) => onWebhookUrlChange(e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
```

**Step 3 : recipient-picker.tsx**

```tsx
// components/admin/alertes/rule-builder/recipient-picker.tsx
"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const ROLES = [
  { value: "ADMIN",       label: "Administrateur" },
  { value: "AVANCE",      label: "Utilisateur avancé" },
  { value: "EXPLOITATION",label: "Exploitation" },
  { value: "VISITEUR",    label: "Visiteur" },
]

interface Props {
  targetRoles: string[]
  onRolesChange: (roles: string[]) => void
}

export function RecipientPicker({ targetRoles, onRolesChange }: Props) {
  const toggle = (value: string, checked: boolean) => {
    onRolesChange(checked ? [...targetRoles, value] : targetRoles.filter((r) => r !== value))
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {ROLES.map(({ value, label }) => (
        <div key={value} className="flex items-center gap-2">
          <Checkbox
            id={`role-${value}`}
            checked={targetRoles.includes(value)}
            onCheckedChange={(c) => toggle(value, !!c)}
          />
          <Label htmlFor={`role-${value}`} className="cursor-pointer">
            {label}
          </Label>
        </div>
      ))}
    </div>
  )
}
```

**Step 4 : rule-form.tsx — formulaire principal**

```tsx
// components/admin/alertes/rule-builder/rule-form.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ConditionEditor } from "./condition-editor"
import { ChannelSelector } from "./channel-selector"
import { RecipientPicker } from "./recipient-picker"
import { createAlertRule, updateAlertRule } from "@/lib/actions/alert-rules"
import { toast } from "@/lib/utils/toast"
import { EVENT_TYPE_LABELS, ALERT_EVENT_TYPES } from "@/lib/alertes/types"
import type { AlertRule } from "@prisma/client"
import type { RuleCondition, AlertEventType } from "@/lib/alertes/types"

interface Props {
  rule?: AlertRule  // présent en mode édition
}

export function RuleForm({ rule }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [name, setName]               = useState(rule?.name ?? "")
  const [description, setDescription] = useState(rule?.description ?? "")
  const [eventType, setEventType]     = useState<AlertEventType | "">((rule?.eventType as AlertEventType) ?? "")
  const [operator, setOperator]       = useState<"AND"|"OR">(() => {
    const c = rule?.conditions as any
    return c?.operator ?? "AND"
  })
  const [conditions, setConditions]   = useState<RuleCondition[]>(() => {
    const c = rule?.conditions as any
    return c?.conditions ?? []
  })
  const [channels, setChannels]       = useState<string[]>(rule?.channels ?? ["IN_APP"])
  const [webhookUrl, setWebhookUrl]   = useState(rule?.webhookUrl ?? "")
  const [targetRoles, setTargetRoles] = useState<string[]>(rule?.targetRoles ?? ["ADMIN"])
  const [priority, setPriority]       = useState(rule?.priority ?? 1)
  const [cooldown, setCooldown]       = useState(rule?.cooldownMinutes ?? 1440)
  const [isActive, setIsActive]       = useState(rule?.isActive ?? true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventType) { toast.error("Sélectionner un type d'événement"); return }
    if (channels.length === 0) { toast.error("Sélectionner au moins un canal"); return }
    if (targetRoles.length === 0) { toast.error("Sélectionner au moins un rôle"); return }

    setLoading(true)
    const payload = {
      name, description, eventType,
      conditions: { operator, conditions },
      channels, webhookUrl, targetRoles, targetUserIds: [],
      priority, cooldownMinutes: cooldown, isActive,
    }

    const result = rule
      ? await updateAlertRule(rule.id, payload)
      : await createAlertRule(payload)

    setLoading(false)
    if (result.success) {
      toast.success(rule ? "Règle mise à jour" : "Règle créée")
      router.push("/admin/alertes/rules")
    } else {
      toast.error(result.error ?? "Erreur")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Informations générales */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nom de la règle *</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 resize-none" rows={2} />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>Type d'événement *</Label>
            <Select value={eventType} onValueChange={(v) => { setEventType(v as AlertEventType); setConditions([]) }}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <Label htmlFor="priority">Priorité</Label>
            <Input id="priority" type="number" min={1} max={10} value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="mt-1" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Conditions */}
      <div>
        <h3 className="font-medium mb-3">Conditions de déclenchement</h3>
        <ConditionEditor
          eventType={eventType}
          operator={operator}
          conditions={conditions}
          onOperatorChange={setOperator}
          onConditionsChange={setConditions}
        />
      </div>

      <Separator />

      {/* Canaux */}
      <div>
        <h3 className="font-medium mb-3">Canaux de notification *</h3>
        <ChannelSelector
          channels={channels}
          webhookUrl={webhookUrl}
          onChannelsChange={setChannels}
          onWebhookUrlChange={setWebhookUrl}
        />
      </div>

      <Separator />

      {/* Destinataires */}
      <div>
        <h3 className="font-medium mb-3">Rôles destinataires *</h3>
        <RecipientPicker targetRoles={targetRoles} onRolesChange={setTargetRoles} />
      </div>

      <Separator />

      {/* Options avancées */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="cooldown">Cooldown (minutes) — fenêtre d'idempotence</Label>
          <Input id="cooldown" type="number" min={60} value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))} className="mt-1 w-40" />
          <p className="text-xs text-muted-foreground mt-1">Minimum 60 min. 1440 = 24h (recommandé).</p>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="active">Règle active</Label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement..." : rule ? "Mettre à jour" : "Créer la règle"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
```

**Step 5 : Commit**

```bash
git add components/admin/alertes/rule-builder/
git commit -m "feat(alertes): composants Rule Builder — ConditionEditor, ChannelSelector, RecipientPicker, RuleForm"
```

---

### Task 15 : Pages Rule Builder (liste + create + edit)

**Files:**
- Create: `app/(dashboard)/admin/alertes/rules/page.tsx`
- Create: `app/(dashboard)/admin/alertes/rules/new/page.tsx`
- Create: `app/(dashboard)/admin/alertes/rules/[id]/edit/page.tsx`

**Step 1 : Liste des règles — rules/page.tsx**

```tsx
// app/(dashboard)/admin/alertes/rules/page.tsx
import { requireRole } from "@/lib/utils/permissions"
import { getAlertRules } from "@/lib/actions/alert-rules"
import { RulesListClient } from "@/components/admin/alertes/rule-builder/rules-list-client"

export const dynamic = "force-dynamic"

export default async function AlertRulesPage() {
  await requireRole(["ADMIN", "AVANCE"])
  const rules = await getAlertRules()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Règles d'alerte</h1>
          <p className="text-muted-foreground mt-1">{rules.length} règle(s) configurée(s)</p>
        </div>
        <a href="/admin/alertes/rules/new">
          <button className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E3A5F]/90">
            Nouvelle règle
          </button>
        </a>
      </div>
      <RulesListClient rules={rules} />
    </div>
  )
}
```

Créer aussi `components/admin/alertes/rule-builder/rules-list-client.tsx` avec un tableau listant les règles (name, eventType, channels, isActive toggle, liens edit/delete).

**Step 2 : Page création — rules/new/page.tsx**

```tsx
// app/(dashboard)/admin/alertes/rules/new/page.tsx
import { requireRole } from "@/lib/utils/permissions"
import { RuleForm } from "@/components/admin/alertes/rule-builder/rule-form"

export default async function NewAlertRulePage() {
  await requireRole(["ADMIN"])
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nouvelle règle d'alerte</h1>
        <p className="text-muted-foreground mt-1">Configurer les conditions, canaux et destinataires</p>
      </div>
      <RuleForm />
    </div>
  )
}
```

**Step 3 : Page édition — rules/[id]/edit/page.tsx**

```tsx
// app/(dashboard)/admin/alertes/rules/[id]/edit/page.tsx
import { requireRole } from "@/lib/utils/permissions"
import { getAlertRule } from "@/lib/actions/alert-rules"
import { RuleForm } from "@/components/admin/alertes/rule-builder/rule-form"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function EditAlertRulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(["ADMIN"])
  const { id } = await params
  const rule = await getAlertRule(id)
  if (!rule) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Modifier la règle</h1>
        <p className="text-muted-foreground mt-1">{rule.name}</p>
      </div>
      <RuleForm rule={rule} />
    </div>
  )
}
```

**Step 4 : Commit**

```bash
git add app/(dashboard)/admin/alertes/rules/
git commit -m "feat(alertes): pages Rule Builder — liste, création, édition"
```

---

### Task 16 : Page Historique des notifications

**Files:**
- Create: `lib/actions/alert-history.ts`
- Create: `app/(dashboard)/admin/alertes/history/page.tsx`
- Create: `components/admin/alertes/history-table.tsx`

**Step 1 : Server Action historique**

```typescript
// lib/actions/alert-history.ts
"use server"

import { prisma } from "@/lib/db/prisma"
import { requireRole } from "@/lib/utils/permissions"

export async function getNotificationHistory(filters?: {
  status?: string
  channel?: string
  page?: number
}) {
  await requireRole(["ADMIN", "AVANCE"])
  const page  = filters?.page ?? 1
  const limit = 25
  const skip  = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (filters?.status)  where.status  = filters.status
  if (filters?.channel) where.channel = filters.channel

  const [notifications, total] = await Promise.all([
    prisma.alertNotification.findMany({
      where,
      include: {
        event: { select: { type: true, sourceModule: true, referenceId: true } },
        rule:  { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.alertNotification.count({ where }),
  ])

  return { notifications, total, page, limit }
}
```

**Step 2 : Page historique**

```tsx
// app/(dashboard)/admin/alertes/history/page.tsx
import { requireRole } from "@/lib/utils/permissions"
import { getNotificationHistory } from "@/lib/actions/alert-history"
import { HistoryTable } from "@/components/admin/alertes/history-table"

export const dynamic = "force-dynamic"

export default async function AlertHistoryPage() {
  await requireRole(["ADMIN", "AVANCE"])
  const { notifications, total } = await getNotificationHistory()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historique des notifications</h1>
        <p className="text-muted-foreground mt-1">{total} notification(s) au total</p>
      </div>
      <HistoryTable notifications={notifications} />
    </div>
  )
}
```

**Step 3 : Créer HistoryTable**

Composant tableau `components/admin/alertes/history-table.tsx` avec colonnes :
- Date (createdAt)
- Règle (rule.name)
- Type d'événement (event.type)
- Canal (badge EMAIL/IN_APP/WEBHOOK)
- Destinataire (recipientEmail)
- Statut (badge SENT/FAILED/READ/PENDING)
- Log (deliveryLog tronqué)

**Step 4 : Commit**

```bash
git add lib/actions/alert-history.ts app/(dashboard)/admin/alertes/history/ components/admin/alertes/history-table.tsx
git commit -m "feat(alertes): page historique notifications avec filtres statut/canal"
```

---

### Task 17 : Navigation — liens dans le menu alertes

**Files:**
- Modify: `app/(dashboard)/admin/alertes/page.tsx`

**Step 1 : Ajouter les liens vers Rules et History**

Dans la page principale `/admin/alertes/page.tsx`, ajouter deux liens Card en haut de page :

```tsx
// Ajouter avant les composants existants :
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <a href="/admin/alertes" className="...">📊 Dashboard alertes</a>
  <a href="/admin/alertes/rules" className="...">⚙️ Règles ({rulesCount})</a>
  <a href="/admin/alertes/history" className="...">📋 Historique</a>
</div>
```

**Step 2 : Activer le cron — créer vercel.json**

```json
// vercel.json (à la racine)
{
  "crons": [
    {
      "path": "/api/cron/daily-alerts",
      "schedule": "0 7 * * *"
    }
  ]
}
```

**Step 3 : Commit**

```bash
git add app/(dashboard)/admin/alertes/page.tsx vercel.json
git commit -m "feat(alertes): navigation règles/historique + cron vercel.json activé"
```

---

## PHASE 5 — Tests E2E Playwright

---

### Task 18 : Tests E2E Rule Builder + Notifications

**Files:**
- Create: `e2e/alertes-rules.spec.ts`

**Step 1 : Écrire les tests**

```typescript
// e2e/alertes-rules.spec.ts
import { test, expect } from "@playwright/test"

const BASE = process.env.BASE_URL ?? "http://localhost:3000"

test.describe("Module Alertes — Rule Builder", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('input[name="email"]',    "admin@erp-marches.local")
    await page.fill('input[name="password"]', "Admin123!")
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/dashboard`)
  })

  test("Liste des règles accessible", async ({ page }) => {
    await page.goto(`${BASE}/admin/alertes/rules`)
    await expect(page.getByText("Règles d'alerte")).toBeVisible()
    await expect(page.getByText("Caution critique")).toBeVisible() // règle par défaut
  })

  test("Créer une nouvelle règle", async ({ page }) => {
    await page.goto(`${BASE}/admin/alertes/rules/new`)
    await page.fill('input[id="name"]', "Test règle E2E")
    // Sélectionner le type d'événement
    await page.click('[data-testid="event-type-select"]')
    await page.click('[data-value="CAUTION_EXPIRING"]')
    // Sélectionner canal IN_APP
    await page.click('[id="channel-IN_APP"]')
    // Sélectionner rôle ADMIN
    await page.click('[id="role-ADMIN"]')
    // Soumettre
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(`${BASE}/admin/alertes/rules`)
    await expect(page.getByText("Test règle E2E")).toBeVisible()
  })

  test("Désactiver/activer une règle", async ({ page }) => {
    await page.goto(`${BASE}/admin/alertes/rules`)
    const toggle = page.locator('[data-testid="rule-toggle"]').first()
    await toggle.click()
    await expect(page.getByText("Règle désactivée")).toBeVisible()
  })

  test("Cloche notifications visible dans sidebar", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    await expect(page.locator('[data-testid="notification-bell"]')).toBeVisible()
  })

  test("Historique des notifications accessible", async ({ page }) => {
    await page.goto(`${BASE}/admin/alertes/history`)
    await expect(page.getByText("Historique des notifications")).toBeVisible()
  })
})
```

**Step 2 : Lancer les tests (dev local)**

```bash
cd "/c/Users/HP/Documents/claude projets/projet ERP marchés/ERP Marchés STAM Final"
npx playwright test e2e/alertes-rules.spec.ts --headed
```

Expected : 5 tests passent

**Step 3 : Commit**

```bash
git add e2e/alertes-rules.spec.ts
git commit -m "test(alertes): tests E2E Rule Builder + cloche notifications"
```

---

### Task 19 : Push et vérification production

**Step 1 : Vérifier le build complet**

```bash
npm run build
```

Expected : Build OK, 0 erreurs TypeScript

**Step 2 : Push**

```bash
git push origin main
```

**Step 3 : Vérifier le déploiement Vercel**

```bash
vercel --prod
```

**Step 4 : Mettre à jour le checkpoint mémoire**

Mettre à jour `memory/checkpoint-souviens-toi.md` :
- Module Alertes Refonte : ✅ TERMINÉ
- Prochaine étape : P9 Fiche Marché PDF

---

## Récapitulatif des commits

| # | Commit | Phase |
|---|--------|-------|
| 1 | `feat(alertes): migration DB — AlertEvent, AlertRule, AlertNotification` | P1 |
| 2 | `feat(alertes): types partagés` | P1 |
| 3 | `feat(alertes): rule-evaluator` | P1 |
| 4 | `feat(alertes): recipient-resolver` | P1 |
| 5 | `feat(alertes): canaux email, in-app, webhook` | P1 |
| 6 | `feat(alertes): moteur central — publishEvent + processEvent` | P1 |
| 7 | `feat(alertes): seed règles par défaut` | P1 |
| 8 | `feat(alertes): cron branché sur publishEvent` | P2 |
| 9 | `feat(alertes): SAV branché sur publishEvent` | P2 |
| 10 | `feat(alertes): marchés branchés sur publishEvent` | P2 |
| 11 | `feat(alertes): API GET/PATCH /api/notifications` | P3 |
| 12 | `feat(alertes): cloche notification in-app` | P3 |
| 13 | `feat(alertes): Server Actions CRUD AlertRule` | P4 |
| 14 | `feat(alertes): composants Rule Builder` | P4 |
| 15 | `feat(alertes): pages Rule Builder` | P4 |
| 16 | `feat(alertes): historique notifications` | P4 |
| 17 | `feat(alertes): navigation + vercel.json cron activé` | P4 |
| 18 | `test(alertes): tests E2E Rule Builder` | P5 |
| 19 | Push + deploy | P5 |
