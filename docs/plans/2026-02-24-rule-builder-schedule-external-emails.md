# Rule Builder — Planification Flexible & Emails Externes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Étendre le Rule Builder pour permettre la planification flexible des règles (jours spécifiques, intervalle, mensuel) et l'envoi à des destinataires hors-base (emails externes).

**Architecture:** Deux nouveaux champs nullable/array sur `AlertRule` (`scheduleConfig Json?`, `externalEmails String[]`), un utilitaire pur `shouldRunRuleToday`, et des composants UI isolés insérés dans `RuleForm` sans modifier les sections existantes.

**Tech Stack:** Next.js 15 Server Actions, Prisma 7 + Supabase MCP apply_migration, shadcn/ui, Zod, TypeScript strict.

---

## Analyse du code existant

### Fichiers impactés

| Fichier | Nature de la modification |
|---------|--------------------------|
| `prisma/schema.prisma` | +2 champs sur `AlertRule` |
| `lib/alertes/types.ts` | +types `ScheduleConfig`, `ScheduleType` |
| `lib/alertes/engine/schedule-checker.ts` | **nouveau** — fonction pure `shouldRunRuleToday` |
| `lib/alertes/engine/process-event.ts` | +filtre schedule, +merge emails externes |
| `lib/alertes/engine/cron-processor.ts` | +scan `EN_ATTENTE_LIVRAISON_OS` |
| `lib/actions/alert-rules.ts` | +champs Zod + Prisma create/update |
| `components/admin/alertes/rule-builder/frequency-selector.tsx` | **nouveau** |
| `components/admin/alertes/rule-builder/external-emails-input.tsx` | **nouveau** |
| `components/admin/alertes/rule-builder/rule-form.tsx` | +2 sections (schedule + emails externes) |

### Flux actuel (inchangé)

```
Cron 7h → runDailyAlertsCron() → publishEvent() → processEvent()
                                                       ↓
                                              find active rules (eventType)
                                                       ↓
                                              evaluateConditions()
                                                       ↓
                                              resolveRecipients()
                                                       ↓
                                              send EMAIL / IN_APP / WEBHOOK
```

### Flux après modifications

```
processEvent()
   ↓ (NOUVEAU) shouldRunRuleToday(rule.scheduleConfig) → skip si false
   ↓
   evaluateConditions()
   ↓
   resolveRecipients() → recipients internes
   ↓ (NOUVEAU) + merge rule.externalEmails → dédupliquer → all recipients
   ↓
   send...
```

---

## Task 1 — Schema Prisma + Migration Supabase

**Files:**
- Modify: `prisma/schema.prisma` (model AlertRule ~L387–407)
- Migration: via MCP `mcp__plugin_supabase_supabase__apply_migration`

**Step 1 — Modifier schema.prisma**

Dans le model `AlertRule`, ajouter après `cooldownMinutes`:

```prisma
model AlertRule {
  id              String   @id @default(cuid())
  name            String
  description     String?
  eventType       String
  conditions      Json
  channels        String[]
  targetRoles     String[]
  targetUserIds   String[]
  externalEmails  String[] @default([])   // ← NOUVEAU
  webhookUrl      String?
  priority        Int      @default(1)
  cooldownMinutes Int      @default(1440)
  scheduleConfig  Json?                   // ← NOUVEAU (null = tous les jours)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  notifications AlertNotification[]

  @@index([eventType, isActive])
  @@map("alert_rules")
}
```

**Step 2 — Appliquer la migration via MCP Supabase**

Utiliser `mcp__plugin_supabase_supabase__apply_migration` avec :
- `name`: `add_schedule_config_external_emails_to_alert_rules`
- `query`:
```sql
ALTER TABLE "alert_rules"
  ADD COLUMN IF NOT EXISTS "externalEmails" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "scheduleConfig" JSONB;
```

⚠️ **Important** : `externalEmails` doit avoir un default `'{}'` (array vide) pour que les règles existantes fonctionnent sans modification. `scheduleConfig` est nullable → pas de default nécessaire → les règles existantes ont `null` = comportement actuel.

**Step 3 — Regénérer le client Prisma**

```bash
npx prisma generate
```

Vérifier que `AlertRule` dans `@prisma/client` contient bien `externalEmails: string[]` et `scheduleConfig: Prisma.JsonValue | null`.

**Step 4 — Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(alertes): add scheduleConfig + externalEmails to AlertRule schema"
```

---

## Task 2 — Types ScheduleConfig dans lib/alertes/types.ts

**Files:**
- Modify: `lib/alertes/types.ts`

**Step 1 — Ajouter les types** à la fin du fichier (après `EVENT_FIELDS`):

```typescript
// ── Types pour la planification flexible des règles ──────────────────────

export type ScheduleType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'INTERVAL'

export interface ScheduleConfig {
  /** Type de planification */
  type: ScheduleType
  /**
   * WEEKLY : jours de la semaine actifs
   * 0 = dimanche, 1 = lundi, 2 = mardi, ..., 6 = samedi
   * Exemple lundi+vendredi : [1, 5]
   */
  daysOfWeek?: number[]
  /**
   * MONTHLY : jour du mois (1–31)
   */
  dayOfMonth?: number
  /**
   * INTERVAL : tous les N jours (à partir du 2024-01-01 comme référence)
   */
  intervalDays?: number
}

/** Labels pour l'UI du FrequencySelector */
export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  DAILY:    'Tous les jours',
  WEEKLY:   'Jours spécifiques de la semaine',
  MONTHLY:  'Une fois par mois',
  INTERVAL: 'Intervalle personnalisé',
}

export const DAY_LABELS: Record<number, string> = {
  0: 'Dim',
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
}
```

**Step 2 — Vérifier la compilation**

```bash
npx tsc --noEmit
```

Résultat attendu : 0 erreur.

**Step 3 — Commit**

```bash
git add lib/alertes/types.ts
git commit -m "feat(alertes): add ScheduleConfig types and DAY_LABELS"
```

---

## Task 3 — Utilitaire shouldRunRuleToday

**Files:**
- Create: `lib/alertes/engine/schedule-checker.ts`

**Step 1 — Créer le fichier**

```typescript
// lib/alertes/engine/schedule-checker.ts
import type { ScheduleConfig } from "@/lib/alertes/types"

/** Date de référence fixe pour le calcul des intervalles */
const INTERVAL_REFERENCE = new Date("2024-01-01").getTime()

/**
 * Détermine si une règle doit s'exécuter aujourd'hui selon sa planification.
 *
 * @param config - Configuration de planification (null = toujours exécuter)
 * @param date   - Date à vérifier (défaut : maintenant)
 * @returns true si la règle doit s'exécuter, false sinon
 *
 * Compatibilité : config === null → true (comportement actuel préservé)
 */
export function shouldRunRuleToday(
  config: ScheduleConfig | null | undefined,
  date: Date = new Date()
): boolean {
  if (!config) return true

  switch (config.type) {
    case "DAILY":
      return true

    case "WEEKLY": {
      if (!config.daysOfWeek || config.daysOfWeek.length === 0) return true
      return config.daysOfWeek.includes(date.getDay())
    }

    case "MONTHLY": {
      if (!config.dayOfMonth) return true
      return date.getDate() === config.dayOfMonth
    }

    case "INTERVAL": {
      const intervalDays = config.intervalDays ?? 1
      if (intervalDays <= 1) return true
      const daysSinceRef = Math.floor(
        (date.getTime() - INTERVAL_REFERENCE) / (24 * 60 * 60 * 1000)
      )
      return daysSinceRef % intervalDays === 0
    }

    default:
      return true
  }
}
```

**Step 2 — Vérifier avec tsc**

```bash
npx tsc --noEmit
```

Résultat attendu : 0 erreur.

**Step 3 — Commit**

```bash
git add lib/alertes/engine/schedule-checker.ts
git commit -m "feat(alertes): add shouldRunRuleToday pure utility"
```

---

## Task 4 — Modifier process-event.ts (schedule + emails externes)

**Files:**
- Modify: `lib/alertes/engine/process-event.ts`

**Step 1 — Ajouter les imports**

Au début du fichier, après les imports existants :

```typescript
import { shouldRunRuleToday } from "./schedule-checker"
import type { ScheduleConfig } from "@/lib/alertes/types"
```

**Step 2 — Étendre l'interface Recipient dans recipient-resolver.ts**

Dans `lib/alertes/engine/recipient-resolver.ts`, rendre `userId` optionnel :

```typescript
export interface Recipient {
  userId?: string  // optionnel — absent pour les emails externes
  email: string
  role: string
}
```

**Step 3 — Modifier la boucle for (const rule of rules)**

Dans `processEvent`, remplacer :

```typescript
  for (const rule of rules) {
    // 2. Évaluer les conditions
    const conditions = rule.conditions as unknown as RuleConditions
    if (!evaluateConditions(conditions, payload)) continue

    // 3. Résoudre les destinataires
    const recipients = await resolveRecipients(rule.targetRoles, rule.targetUserIds)
    if (recipients.length === 0) continue
```

Par :

```typescript
  for (const rule of rules) {
    // 2. Vérifier la planification de la règle
    const scheduleConfig = rule.scheduleConfig as ScheduleConfig | null
    if (!shouldRunRuleToday(scheduleConfig)) continue

    // 3. Évaluer les conditions
    const conditions = rule.conditions as unknown as RuleConditions
    if (!evaluateConditions(conditions, payload)) continue

    // 4. Résoudre les destinataires internes (rôles + userIds)
    const internalRecipients = await resolveRecipients(rule.targetRoles, rule.targetUserIds)

    // 4b. Fusionner avec les emails externes (hors-base)
    const externalEmails: string[] = (rule.externalEmails ?? []).filter(
      (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    )
    const externalRecipients: Recipient[] = externalEmails.map((email) => ({
      email,
      role: "EXTERNAL",
    }))

    // Dédupliquer par email (un email externe peut aussi être un user interne)
    const seenEmails = new Set(internalRecipients.map((r) => r.email))
    const uniqueExternal = externalRecipients.filter((r) => !seenEmails.has(r.email))
    const recipients: Recipient[] = [...internalRecipients, ...uniqueExternal]

    if (recipients.length === 0) continue
```

⚠️ **Important** : les numéros des commentaires suivants dans la fonction deviennent 5, 6, 7, 8 (au lieu de 4, 5, 6, 7). Les mettre à jour dans le code pour garder la lisibilité.

**Step 4 — Vérifier tsc**

```bash
npx tsc --noEmit
```

Résultat attendu : 0 erreur.

**Step 5 — Commit**

```bash
git add lib/alertes/engine/process-event.ts lib/alertes/engine/recipient-resolver.ts
git commit -m "feat(alertes): apply scheduleConfig check + merge external emails in processEvent"
```

---

## Task 5 — Étendre le cron pour scanner EN_ATTENTE_LIVRAISON_OS

**Files:**
- Modify: `lib/alertes/engine/cron-processor.ts`

**Contexte** : le cron scanne les marchés `EN_EXECUTION | EXECUTE_ATTENTE_GARANTIES` proches de leur `dateFinPrevue`. Les marchés `EN_ATTENTE_LIVRAISON_OS` doivent aussi être scannés pour permettre des rappels (ex : lun/ven avec la nouvelle planification).

**Step 1 — Modifier la requête Prisma dans `runDailyAlertsCron`**

Remplacer :

```typescript
  const marches = await prisma.marche.findMany({
    where: {
      statut: { in: ["EN_EXECUTION", "EXECUTE_ATTENTE_GARANTIES"] },
      dateFinPrevue: { gte: today, lte: in60Days },
    },
  })
```

Par :

```typescript
  // Marchés proches de leur fin d'exécution (ou en attente OS sans date fin)
  const marches = await prisma.marche.findMany({
    where: {
      statut: { in: ["EN_EXECUTION", "EXECUTE_ATTENTE_GARANTIES", "EN_ATTENTE_LIVRAISON_OS"] },
      OR: [
        { dateFinPrevue: { gte: today, lte: in60Days } },
        // EN_ATTENTE_LIVRAISON_OS sans dateFinPrevue → signalé tous les jours (filtré par scheduleConfig)
        { statut: "EN_ATTENTE_LIVRAISON_OS", dateFinPrevue: null },
      ],
    },
  })
```

**Step 2 — Adapter la boucle de publication**

Remplacer :

```typescript
  for (const m of marches) {
    if (!m.dateFinPrevue) continue
    const joursRestants = Math.ceil((m.dateFinPrevue.getTime() - today.getTime()) / 86400000)
    await publishEvent(ALERT_EVENT_TYPES.MARCHE_EXPIRING, "marches", m.id, {
      joursRestants,
      statut: m.statut,
      montant: Number(m.montant),
      numero: m.numero,
      objet: m.objet,
    })
  }
```

Par :

```typescript
  for (const m of marches) {
    const joursRestants = m.dateFinPrevue
      ? Math.ceil((m.dateFinPrevue.getTime() - today.getTime()) / 86400000)
      : -1 // -1 = pas de date fin (EN_ATTENTE_LIVRAISON_OS sans deadline)
    await publishEvent(ALERT_EVENT_TYPES.MARCHE_EXPIRING, "marches", m.id, {
      joursRestants,
      statut: m.statut,
      montant: Number(m.montant),
      numero: m.numero,
      objet: m.objet,
    })
  }
```

**Step 3 — tsc + commit**

```bash
npx tsc --noEmit
git add lib/alertes/engine/cron-processor.ts
git commit -m "feat(alertes): scan EN_ATTENTE_LIVRAISON_OS in daily cron"
```

---

## Task 6 — Modifier alert-rules.ts (Zod + Prisma)

**Files:**
- Modify: `lib/actions/alert-rules.ts`

**Step 1 — Ajouter le schéma Zod pour scheduleConfig**

Après les imports existants, ajouter :

```typescript
const ScheduleConfigSchema = z.object({
  type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'INTERVAL']),
  daysOfWeek:   z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth:   z.number().int().min(1).max(31).optional(),
  intervalDays: z.number().int().min(2).max(365).optional(),
}).nullable()
```

**Step 2 — Étendre RuleSchema**

Ajouter dans `RuleSchema` :

```typescript
const RuleSchema = z.object({
  // ...champs existants...
  scheduleConfig:  ScheduleConfigSchema.optional().default(null),
  externalEmails:  z.array(z.string().email()).default([]),
})
```

**Step 3 — Passer les champs dans create/update**

Dans `createAlertRule` et `updateAlertRule`, les lignes :

```typescript
await prisma.alertRule.create({
  data: { ...data, webhookUrl: data.webhookUrl || null },
})
```

Deviennent :

```typescript
await prisma.alertRule.create({
  data: {
    ...data,
    webhookUrl:     data.webhookUrl || null,
    scheduleConfig: data.scheduleConfig ?? null,
    externalEmails: data.externalEmails ?? [],
  },
})
```

(Idem pour `update`.)

**Step 4 — tsc + commit**

```bash
npx tsc --noEmit
git add lib/actions/alert-rules.ts
git commit -m "feat(alertes): add scheduleConfig + externalEmails to RuleSchema and Prisma mutations"
```

---

## Task 7 — Composant FrequencySelector

**Files:**
- Create: `components/admin/alertes/rule-builder/frequency-selector.tsx`

**Step 1 — Créer le composant**

```tsx
'use client'

import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ScheduleConfig, ScheduleType } from '@/lib/alertes/types'
import { SCHEDULE_TYPE_LABELS, DAY_LABELS } from '@/lib/alertes/types'

interface Props {
  value: ScheduleConfig | null
  onChange: (v: ScheduleConfig | null) => void
}

export function FrequencySelector({ value, onChange }: Props) {
  const type = value?.type ?? 'DAILY'

  const handleTypeChange = (t: string) => {
    if (t === 'DAILY') {
      onChange(null) // DAILY = null = comportement par défaut
      return
    }
    onChange({ type: t as ScheduleType })
  }

  const toggleDay = (day: number) => {
    const current = value?.daysOfWeek ?? []
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b)
    onChange({ ...value!, type: 'WEEKLY', daysOfWeek: next })
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Fréquence d'exécution</Label>
        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(SCHEDULE_TYPE_LABELS) as [ScheduleType, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sélecteur jours de la semaine */}
      {type === 'WEEKLY' && (
        <div>
          <Label className="text-sm">Jours actifs</Label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {([1, 2, 3, 4, 5, 6, 0] as const).map((day) => {
              const active = (value?.daysOfWeek ?? []).includes(day)
              return (
                <Button
                  key={day}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  className={cn('w-12', active && 'bg-[--stam-primary] text-white')}
                  onClick={() => toggleDay(day)}
                >
                  {DAY_LABELS[day]}
                </Button>
              )
            })}
          </div>
          {(value?.daysOfWeek ?? []).length === 0 && (
            <p className="text-xs text-destructive mt-1">Sélectionner au moins un jour</p>
          )}
        </div>
      )}

      {/* Jour du mois */}
      {type === 'MONTHLY' && (
        <div>
          <Label htmlFor="dayOfMonth" className="text-sm">Jour du mois</Label>
          <Input
            id="dayOfMonth"
            type="number"
            min={1}
            max={31}
            value={value?.dayOfMonth ?? 1}
            onChange={(e) => onChange({ type: 'MONTHLY', dayOfMonth: Number(e.target.value) })}
            className="mt-1 w-24"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Si le mois n'a pas ce jour, la règle ne s'exécute pas ce mois.
          </p>
        </div>
      )}

      {/* Intervalle */}
      {type === 'INTERVAL' && (
        <div>
          <Label htmlFor="intervalDays" className="text-sm">Tous les N jours</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              id="intervalDays"
              type="number"
              min={2}
              max={365}
              value={value?.intervalDays ?? 7}
              onChange={(e) => onChange({ type: 'INTERVAL', intervalDays: Number(e.target.value) })}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">jours</span>
          </div>
        </div>
      )}

      {type !== 'DAILY' && (
        <p className="text-xs text-muted-foreground">
          Applicable aux événements déclenchés par le cron quotidien.
        </p>
      )}
    </div>
  )
}
```

**Step 2 — tsc + commit**

```bash
npx tsc --noEmit
git add components/admin/alertes/rule-builder/frequency-selector.tsx
git commit -m "feat(alertes): add FrequencySelector component"
```

---

## Task 8 — Composant ExternalEmailsInput

**Files:**
- Create: `components/admin/alertes/rule-builder/external-emails-input.tsx`

**Step 1 — Créer le composant**

```tsx
'use client'

import { useState, KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'

interface Props {
  value: string[]
  onChange: (emails: string[]) => void
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ExternalEmailsInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  const addEmail = () => {
    const email = draft.trim().toLowerCase()
    if (!email) return
    if (!EMAIL_REGEX.test(email)) {
      setError('Adresse email invalide')
      return
    }
    if (value.includes(email)) {
      setError('Email déjà ajouté')
      return
    }
    onChange([...value, email])
    setDraft('')
    setError('')
  }

  const removeEmail = (email: string) => {
    onChange(value.filter((e) => e !== email))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addEmail()
    }
  }

  return (
    <div className="space-y-2">
      <Label>Emails externes (hors base utilisateurs)</Label>
      <p className="text-xs text-muted-foreground">
        Destinataires non enregistrés dans l'application. Appuyez sur Entrée ou virgule pour ajouter.
      </p>

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setError('') }}
          onKeyDown={handleKeyDown}
          placeholder="exemple@domaine.com"
          className="flex-1"
          type="email"
        />
        <Button type="button" variant="outline" onClick={addEmail}>
          Ajouter
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {value.map((email) => (
            <Badge
              key={email}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {email}
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
                aria-label={`Supprimer ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2 — tsc + commit**

```bash
npx tsc --noEmit
git add components/admin/alertes/rule-builder/external-emails-input.tsx
git commit -m "feat(alertes): add ExternalEmailsInput tag component"
```

---

## Task 9 — Modifier rule-form.tsx

**Files:**
- Modify: `components/admin/alertes/rule-builder/rule-form.tsx`

**Step 1 — Ajouter les imports**

```tsx
import { FrequencySelector } from './frequency-selector'
import { ExternalEmailsInput } from './external-emails-input'
import type { ScheduleConfig } from '@/lib/alertes/types'
```

**Step 2 — Ajouter les états**

Après `const [isActive, setIsActive]` :

```tsx
const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig | null>(() => {
  return (rule?.scheduleConfig as ScheduleConfig | null) ?? null
})
const [externalEmails, setExternalEmails] = useState<string[]>(
  (rule as any)?.externalEmails ?? []
)
```

**Step 3 — Ajouter dans le payload handleSubmit**

Dans `const payload = { ... }`, ajouter :

```tsx
scheduleConfig,
externalEmails,
```

**Step 4 — Insérer les 2 nouvelles sections dans le JSX**

Après la section `Destinataires` (après `<RecipientPicker .../>`), avant `<Separator />` suivant :

```tsx
<Separator />

{/* Emails externes */}
<div onFocus={() => setActiveField(null)}>
  <h3 className="font-medium mb-3">Emails externes</h3>
  <ExternalEmailsInput
    value={externalEmails}
    onChange={setExternalEmails}
  />
</div>

<Separator />

{/* Planification */}
<div onFocus={() => setActiveField(null)}>
  <h3 className="font-medium mb-3">Planification</h3>
  <FrequencySelector
    value={scheduleConfig}
    onChange={setScheduleConfig}
  />
</div>
```

**Step 5 — tsc + commit**

```bash
npx tsc --noEmit
git add components/admin/alertes/rule-builder/rule-form.tsx
git commit -m "feat(alertes): integrate FrequencySelector + ExternalEmailsInput in RuleForm"
```

---

## Task 10 — Build final + vérification

**Step 1 — Build complet**

```bash
npm run build
```

Résultat attendu : `✓ Compiled successfully`, exit 0, **0 erreurs TypeScript**.

**Step 2 — Vérifier compatibilité règles existantes**

Les 8 règles en production ont `scheduleConfig = null` et `externalEmails = []`. Via le dashboard admin alertes (/admin/alertes/rules), vérifier que les règles existantes s'affichent normalement.

**Step 3 — Test manuel Rule Builder**

1. Aller sur `/admin/alertes/rules/new`
2. Créer une règle avec :
   - Fréquence : "Jours spécifiques" → Lun + Ven
   - Emails externes : `atsu@stam.tg`, `Honoreatsu@gmail.com`
   - Event : "Marché en fin d'exécution"
   - Canal : EMAIL + IN_APP
3. Sauvegarder → vérifier qu'elle apparaît dans la liste
4. Éditer → vérifier que les valeurs sont bien pré-remplies

**Step 4 — Commit final**

```bash
git push origin main
```

---

## Validations fonctionnelles

| # | Test | Attendu |
|---|------|---------|
| 1 | Règle existante (scheduleConfig null) | S'exécute tous les jours comme avant |
| 2 | Règle WEEKLY [1,5] un mercredi | shouldRunRuleToday → false → skip |
| 3 | Règle WEEKLY [1,5] un lundi | shouldRunRuleToday → true → exécutée |
| 4 | Règle avec externalEmails | Email envoyé à l'adresse externe |
| 5 | Email externe == email user interne | Dédupliqué → 1 seul email envoyé |
| 6 | Email externe format invalide | Filtré silencieusement (regex dans process-event) |
| 7 | Marché EN_ATTENTE_LIVRAISON_OS | Publié par le cron et évalué par les règles |
| 8 | Build Next.js | 0 erreur TypeScript |

---

## Risques résiduels

| Risque | Mitigation |
|--------|-----------|
| INTERVAL avec intervalDays petit (2-3) → beaucoup de déclenchements | Min=2 dans Zod + Input UI |
| ExternalEmails en clair dans la DB | Pas de donnée sensible — juste des emails |
| MONTHLY dayOfMonth=31 → mois courts | La règle ne s'exécute pas ce mois-là (documenté dans l'UI) |
| Emails externes reçoivent les notifs sans auth → pas de liens IN_APP | Canal IN_APP filtrable côté règle — accepté |

---

## Exemple de règle JSON résultante

```json
{
  "id": "clxyz...",
  "name": "Rappel lun/ven — marchés en attente OS",
  "eventType": "MARCHE_EXPIRING",
  "conditions": {
    "operator": "AND",
    "conditions": [
      { "field": "statut", "op": "eq", "value": "EN_ATTENTE_LIVRAISON_OS" }
    ]
  },
  "channels": ["EMAIL", "IN_APP"],
  "targetRoles": ["ADMIN"],
  "targetUserIds": [],
  "externalEmails": ["atsu@stam.tg", "honoreatsu@gmail.com"],
  "scheduleConfig": {
    "type": "WEEKLY",
    "daysOfWeek": [1, 5]
  },
  "cooldownMinutes": 1440,
  "isActive": true
}
```
