# Reporting Email Synthèse Marchés — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Créer un module de reporting email autonome permettant d'envoyer des synthèses de marchés regroupés par statut, via des règles configurables (planification, destinataires, heure), sans toucher au système d'alertes existant.

**Architecture:** Nouvelle table `reporting_rules` en DB + cron horaire `/api/cron/reporting` + page admin `/admin/reporting` + template email dédié. Tous les fichiers sont isolés dans `lib/cron/` et `lib/email/reporting-templates.ts`. Les alertes existantes (`/api/cron/daily-alerts`) restent inchangées.

**Tech Stack:** Next.js 15 Server Actions · Prisma 7 · Zod · Nodemailer · shadcn/ui (Dialog, Checkbox, Badge, Table) · date-fns · Supabase MCP pour migrations

---

## Contexte & Patterns du projet

### Patterns critiques à respecter

```typescript
// Import Prisma client
import { prisma } from "@/lib/db/prisma"

// Permissions — lève une erreur si non autorisé
import { requireRole } from "@/lib/utils/permissions"

// Toast — TOUJOURS depuis le wrapper
import { toast } from "@/lib/utils/toast"

// Audit log
import { logAction } from "@/lib/audit/logAction"
import { AUDIT_ACTION, AUDIT_ENTITY } from "@/lib/audit/constants"

// Server Action return type
import type { ActionResult } from "@/types"

// Revalidation
import { revalidatePath } from "next/cache"

// Prisma Json? nullable → Prisma.DbNull (PAS null littéral)
import { Prisma } from "@prisma/client"

// Params Next.js 15
const { id } = await params // params: Promise<{ id: string }>
```

### Labels statuts existants (réutiliser — ne pas recréer)

```typescript
// lib/constants/marche.ts — déjà exporté
import { STATUT_LABELS } from "@/lib/constants/marche"
// STATUT_LABELS couvre les 13 StatutMarche
```

### Pattern cron sécurisé existant (copier depuis daily-alerts)

```typescript
import { timingSafeEqual } from "crypto"
const isVercelCron = request.headers.get("x-vercel-cron") === "1"
const authHeader = request.headers.get("authorization") ?? ""
const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
let authorized = false
try {
  authorized = timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedAuth))
} catch { authorized = false }
if (!authorized && !isVercelCron) { return 401 }
```

### Pattern email existant (réutiliser le transport)

```typescript
import { createEmailTransport } from "@/lib/config/email"
const transporter = createEmailTransport()
await transporter.sendMail({ from, to, subject, html, text })
```

### Migration DB — toujours via MCP Supabase (pas prisma migrate dev)

```
mcp__plugin_supabase_supabase__apply_migration({
  project_id: "awsvkjdziwzknnvkpuyq",
  name: "add_reporting_rules",
  query: "..."
})
```

---

## T1 — Schema Prisma + Migration DB

**Files:**
- Modify: `prisma/schema.prisma`
- Migration: via MCP Supabase

### Step 1: Ajouter le modèle dans le schéma Prisma

Ouvrir `prisma/schema.prisma`. Après le bloc `model AlertRule { ... }`, ajouter :

```prisma
// ============================================
// REPORTING — RÈGLES DE REPORTING EMAIL
// ============================================

model ReportingRule {
  id              String   @id @default(cuid())
  name            String
  description     String?
  statutGroups    String[]   // StatutMarche[] — statuts inclus dans cette règle
  recipientEmails String[]   // Emails destinataires
  scheduleConfig  Json?      // ReportingScheduleConfig | null (null = MANUAL)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("reporting_rules")
}
```

### Step 2: Appliquer la migration via MCP Supabase

```sql
CREATE TABLE "reporting_rules" (
  "id"              TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "statutGroups"    TEXT[] NOT NULL DEFAULT '{}',
  "recipientEmails" TEXT[] NOT NULL DEFAULT '{}',
  "scheduleConfig"  JSONB,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reporting_rules_pkey" PRIMARY KEY ("id")
);
```

### Step 3: Régénérer le client Prisma

```bash
npx prisma generate
```

Vérifier dans le terminal : `✔ Generated Prisma Client`

### Step 4: Vérifier TypeScript

```bash
npx tsc --noEmit 2>&1 | grep -v "tests/"
```

Attendu : 0 erreur dans `app/` et `lib/`

### Step 5: Commit

```bash
git add prisma/schema.prisma
git commit -m "feat(reporting): add ReportingRule model to Prisma schema"
```

---

## T2 — `lib/cron/getMarchesForReporting.ts`

**Files:**
- Create: `lib/cron/getMarchesForReporting.ts`

### Step 1: Créer le fichier

```typescript
/**
 * lib/cron/getMarchesForReporting.ts
 *
 * Récupère les marchés filtrés par groupe de statuts pour le reporting.
 * Lecture directe depuis la DB — aucune logique métier.
 */

import { prisma } from "@/lib/db/prisma"
import type { StatutMarche } from "@prisma/client"

export interface MarcheForReporting {
  id: string
  numero: string
  objet: string
  autoriteContractanteNom: string
  montant: number
  statut: StatutMarche
  // Dates clés — toutes optionnelles selon statut
  dateDepotPrevue:              Date | null
  dateDepotOffre:               Date | null
  dateAttributionProvisoire:    Date | null
  dateAttributionDefinitive:    Date | null
  dateOrdreService:             Date | null
  dateLivraisonPrevue:          Date | null
  dureeLivraisonPrevue:         number | null
  dateFinPrevue:                Date | null
  dateReceptionProvisoirePrevue: Date | null
  dateReceptionDefinitive:      Date | null
  dateClotureAdministrative:    Date | null
  dateResiliation:              Date | null
  dateAnnulation:               Date | null
  dateInfructueux:              Date | null
  delaiExecution:               number
}

/**
 * Retourne tous les marchés dont le statut est dans `statutGroups`.
 * Triés par statut puis par numéro.
 */
export async function getMarchesForReporting(
  statutGroups: string[]
): Promise<MarcheForReporting[]> {
  if (statutGroups.length === 0) return []

  const marches = await prisma.marche.findMany({
    where: {
      statut: { in: statutGroups as StatutMarche[] },
    },
    select: {
      id: true,
      numero: true,
      objet: true,
      autoriteContractanteNom: true,
      montant: true,
      statut: true,
      dateDepotPrevue: true,
      dateDepotOffre: true,
      dateAttributionProvisoire: true,
      dateAttributionDefinitive: true,
      dateOrdreService: true,
      dateLivraisonPrevue: true,
      dureeLivraisonPrevue: true,
      dateFinPrevue: true,
      dateReceptionProvisoirePrevue: true,
      dateReceptionDefinitive: true,
      dateClotureAdministrative: true,
      dateResiliation: true,
      dateAnnulation: true,
      dateInfructueux: true,
      delaiExecution: true,
    },
    orderBy: [{ statut: "asc" }, { numero: "asc" }],
  })

  return marches.map((m) => ({
    ...m,
    montant: Number(m.montant),
  }))
}

/**
 * Regroupe une liste de marchés par statut.
 * Retourne uniquement les statuts ayant au moins un marché.
 */
export function groupMarchesByStatut(
  marches: MarcheForReporting[]
): Map<StatutMarche, MarcheForReporting[]> {
  const map = new Map<StatutMarche, MarcheForReporting[]>()
  for (const m of marches) {
    const group = map.get(m.statut) ?? []
    group.push(m)
    map.set(m.statut, group)
  }
  return map
}
```

### Step 2: Vérifier TypeScript

```bash
npx tsc --noEmit 2>&1 | grep "getMarchesForReporting"
```

Attendu : aucune ligne (0 erreur)

### Step 3: Commit

```bash
git add lib/cron/getMarchesForReporting.ts
git commit -m "feat(reporting): add getMarchesForReporting query"
```

---

## T3 — `lib/cron/reporting-processor.ts`

**Files:**
- Create: `lib/cron/reporting-processor.ts`

### Step 1: Créer le fichier

```typescript
/**
 * lib/cron/reporting-processor.ts
 *
 * Orchestrateur du cron reporting horaire.
 * Pour chaque règle active, vérifie si elle doit s'exécuter à l'heure courante,
 * récupère les marchés, construit l'email et l'envoie.
 */

import { prisma } from "@/lib/db/prisma"
import { getMarchesForReporting, groupMarchesByStatut } from "./getMarchesForReporting"
import { buildReportingEmail } from "@/lib/email/reporting-templates"
import { createEmailTransport } from "@/lib/config/email"

// ============================================================
// TYPE
// ============================================================

export interface ReportingScheduleConfig {
  type: "DAILY" | "WEEKLY" | "MONTHLY" | "MANUAL"
  hour: number       // 0–23
  days?: number[]    // WEEKLY: 1=Lun…7=Dim | MONTHLY: 1–31
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Détermine si une règle de reporting doit s'exécuter maintenant.
 * @param config  - Configuration de planification (null = MANUAL → jamais auto)
 * @param hour    - Heure courante (0–23)
 * @param date    - Date courante
 */
export function shouldRunReportingRuleNow(
  config: ReportingScheduleConfig | null | undefined,
  hour: number,
  date: Date = new Date()
): boolean {
  if (!config || config.type === "MANUAL") return false

  // Vérifier l'heure en premier
  if (config.hour !== hour) return false

  switch (config.type) {
    case "DAILY":
      return true

    case "WEEKLY": {
      if (!config.days || config.days.length === 0) return true
      // config.days utilise 1=Lun…7=Dim
      // date.getDay() retourne 0=Dim, 1=Lun…6=Sam
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()
      return config.days.includes(dayOfWeek)
    }

    case "MONTHLY": {
      if (!config.days || config.days.length === 0) return true
      return config.days.includes(date.getDate())
    }

    default:
      return false
  }
}

// ============================================================
// MAIN
// ============================================================

/**
 * Exécute le processing reporting pour l'heure donnée.
 * Appelé par le cron horaire.
 */
export async function runReportingCron(currentHour: number): Promise<{
  processed: number
  sent: number
  skipped: number
}> {
  const now = new Date()

  // Charger toutes les règles actives
  const rules = await prisma.reportingRule.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  })

  let sent = 0
  let skipped = 0

  for (const rule of rules) {
    const config = rule.scheduleConfig as ReportingScheduleConfig | null

    // Vérifier si la règle doit s'exécuter maintenant
    if (!shouldRunReportingRuleNow(config, currentHour, now)) {
      skipped++
      continue
    }

    // Vérifier les destinataires
    const recipients = (rule.recipientEmails as string[]).filter(
      (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    )
    if (recipients.length === 0) {
      console.warn(`⚠️ Règle "${rule.name}" : aucun destinataire valide`)
      skipped++
      continue
    }

    // Récupérer les marchés
    const statutGroups = rule.statutGroups as string[]
    const marches = await getMarchesForReporting(statutGroups)
    if (marches.length === 0) {
      console.log(`ℹ️ Règle "${rule.name}" : aucun marché pour les statuts sélectionnés`)
      skipped++
      continue
    }

    // Construire et envoyer l'email
    const grouped = groupMarchesByStatut(marches)
    const { subject, html, text } = buildReportingEmail(rule.name, grouped, now)

    try {
      const transporter = createEmailTransport()
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? "noreply@erp-marches.local",
        to: recipients.join(", "),
        subject,
        html,
        text,
      })
      console.log(
        `✅ Reporting "${rule.name}" envoyé à ${recipients.length} destinataire(s) — ${marches.length} marchés`
      )
      sent++
    } catch (err) {
      console.error(`❌ Échec envoi reporting "${rule.name}":`, err)
    }
  }

  return { processed: rules.length, sent, skipped }
}
```

### Step 2: Vérifier TypeScript

```bash
npx tsc --noEmit 2>&1 | grep "reporting-processor"
```

Attendu : aucune ligne

### Step 3: Commit

```bash
git add lib/cron/reporting-processor.ts
git commit -m "feat(reporting): add reporting-processor with shouldRunReportingRuleNow"
```

---

## T4 — `lib/email/reporting-templates.ts`

**Files:**
- Create: `lib/email/reporting-templates.ts`

### Step 1: Créer le fichier

```typescript
/**
 * lib/email/reporting-templates.ts
 *
 * Template email "Synthèse Marchés" pour le module de reporting.
 * NE PAS modifier — template dédié, indépendant de lib/email/templates.ts
 */

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { formatMontant } from "@/lib/utils/format"
import { STATUT_LABELS } from "@/lib/constants/marche"
import type { StatutMarche } from "@prisma/client"
import type { MarcheForReporting } from "@/lib/cron/getMarchesForReporting"

// ============================================================
// CONSTANTES
// ============================================================

const EMAIL_WIDTH = 800
const EMAIL_PADDING_H = 56
const TABLE_WIDTH = EMAIL_WIDTH - EMAIL_PADDING_H // 744px

// Statuts pour lesquels on affiche les jours restants
const STATUTS_WITH_DAYS_LEFT: StatutMarche[] = [
  "OPPORTUNITE_IDENTIFIEE",
  "DOSSIER_EN_PREPARATION",
  "EN_ATTENTE_LIVRAISON_OS",
  "EN_EXECUTION",
  "EXECUTE_ATTENTE_GARANTIES",
]

// Statuts terminaux — fond neutre, pas d'indicateur d'urgence
const STATUTS_TERMINAUX: StatutMarche[] = [
  "CLOTURE",
  "RESILIE",
  "ANNULE",
  "INFRUCTUEUX",
]

// ============================================================
// MAPPING DATE PERTINENTE PAR STATUT
// ============================================================

function getDatePertinente(
  m: MarcheForReporting
): { date: Date | null; label: string } {
  switch (m.statut) {
    case "OPPORTUNITE_IDENTIFIEE":
    case "DOSSIER_EN_PREPARATION":
      return { date: m.dateDepotPrevue, label: "Dépôt prévu" }
    case "OFFRE_DEPOSEE":
      return { date: m.dateDepotOffre, label: "Dépôt offre" }
    case "EN_ATTENTE_ATTRIBUTION":
      return { date: m.dateAttributionProvisoire, label: "Attrib. prov." }
    case "ATTRIBUE_PROVISOIREMENT":
      return { date: m.dateAttributionDefinitive, label: "Attrib. déf." }
    case "ATTRIBUE_DEFINITIVEMENT":
      return { date: m.dateOrdreService, label: "Ordre de service" }
    case "EN_ATTENTE_LIVRAISON_OS": {
      // Utiliser dateLivraisonPrevue ou calculer depuis dateOrdreService + delaiExecution
      if (m.dateLivraisonPrevue) return { date: m.dateLivraisonPrevue, label: "Livraison prévue" }
      if (m.dateOrdreService) {
        const calc = new Date(m.dateOrdreService)
        calc.setDate(calc.getDate() + m.delaiExecution)
        return { date: calc, label: "Livraison calc." }
      }
      return { date: null, label: "Livraison prévue" }
    }
    case "EN_EXECUTION":
      return { date: m.dateFinPrevue, label: "Fin d'exéc." }
    case "EXECUTE_ATTENTE_GARANTIES":
      return { date: m.dateReceptionDefinitive ?? m.dateReceptionProvisoirePrevue, label: "Réception déf." }
    case "CLOTURE":
      return { date: m.dateClotureAdministrative, label: "Clôture" }
    case "RESILIE":
      return { date: m.dateResiliation, label: "Résiliation" }
    case "ANNULE":
      return { date: m.dateAnnulation, label: "Annulation" }
    case "INFRUCTUEUX":
      return { date: m.dateInfructueux, label: "Infructueux" }
    default:
      return { date: null, label: "Date" }
  }
}

// ============================================================
// HELPERS HTML
// ============================================================

function tdStyle(opts: {
  width: number
  align?: string
  bold?: boolean
  color?: string
  bg: string
  borderLeft?: string
}): string {
  const base = [
    `width: ${opts.width}px`,
    `max-width: ${opts.width}px`,
    `padding: 7px 8px`,
    `font-size: 11px`,
    `border-bottom: 1px solid #f0f0f0`,
    `overflow: hidden`,
    `text-overflow: ellipsis`,
    `white-space: nowrap`,
    `background-color: ${opts.bg}`,
    `color: ${opts.color ?? "#374151"}`,
    `text-align: ${opts.align ?? "left"}`,
  ]
  if (opts.bold) base.push("font-weight: 600")
  if (opts.borderLeft) base.push(`border-left: 4px solid ${opts.borderLeft}`)
  return base.join("; ")
}

// ============================================================
// SECTION PAR STATUT
// ============================================================

function buildStatutSection(
  statut: StatutMarche,
  marches: MarcheForReporting[],
  today: Date
): string {
  const isTerminal = STATUTS_TERMINAUX.includes(statut)
  const showDaysLeft = STATUTS_WITH_DAYS_LEFT.includes(statut)

  // Colonnes : N°(90) | Objet(200) | Autorité(160) | Montant(110) | Date(82) | J.rest(62=si applicable)
  const hasJoursCol = showDaysLeft
  const dateColWidth = 82
  const joursColWidth = hasJoursCol ? 62 : 0
  // Redistribuer les 62px sur Objet si pas de colonne J.rest
  const objetWidth = hasJoursCol ? 200 : 262

  const cols = [
    { label: "N° Marché",       width: 90,          align: "left" },
    { label: "Objet",           width: objetWidth,  align: "left" },
    { label: "Autorité contr.", width: 160,         align: "left" },
    { label: "Montant",         width: 110,         align: "right" },
    { label: getDatePertinente(marches[0]).label, width: dateColWidth, align: "center" },
    ...(hasJoursCol ? [{ label: "J. rest.", width: joursColWidth, align: "center" }] : []),
  ]

  const thStyle = (col: typeof cols[0]) =>
    `width: ${col.width}px; max-width: ${col.width}px; padding: 8px; text-align: ${col.align}; color: #ffffff; font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`

  const headers = cols.map((c) => `<th style="${thStyle(c)}">${c.label}</th>`).join("")

  const rows = marches
    .map((m) => {
      const { date } = getDatePertinente(m)
      const dateLabel = date ? format(date, "dd/MM/yyyy") : "—"

      let joursRestants: number | null = null
      if (showDaysLeft && date) {
        joursRestants = Math.ceil((date.getTime() - today.getTime()) / 86400000)
      }

      const isUrgent = !isTerminal && joursRestants !== null && joursRestants <= 15
      const rowBg = isTerminal
        ? "#f9fafb"
        : isUrgent
          ? "#fef2f2"
          : "#fff7ed"
      const borderLeft = isTerminal
        ? "#d1d5db"
        : isUrgent
          ? "#ef4444"
          : "#f97316"

      let joursLabel = ""
      if (hasJoursCol) {
        if (joursRestants === null) {
          joursLabel = "—"
        } else if (joursRestants <= 15) {
          joursLabel = `🔴 ${joursRestants}j`
        } else {
          joursLabel = `🟠 ${joursRestants}j`
        }
      }

      const joursColor = !isTerminal && joursRestants !== null && joursRestants <= 15
        ? "#dc2626"
        : "#ea580c"

      return `
        <tr>
          <td style="${tdStyle({ width: 90, bg: rowBg, borderLeft, bold: true, color: "#111827" })}">${m.numero}</td>
          <td style="${tdStyle({ width: objetWidth, bg: rowBg })}" title="${m.objet}">${m.objet}</td>
          <td style="${tdStyle({ width: 160, bg: rowBg })}">${m.autoriteContractanteNom}</td>
          <td style="${tdStyle({ width: 110, bg: rowBg, align: "right" })}">${formatMontant(m.montant)}</td>
          <td style="${tdStyle({ width: dateColWidth, bg: rowBg, align: "center" })}">${dateLabel}</td>
          ${hasJoursCol ? `<td style="${tdStyle({ width: joursColWidth, bg: rowBg, align: "center", bold: true, color: joursColor })}">${joursLabel}</td>` : ""}
        </tr>
      `
    })
    .join("")

  const labelStatut = STATUT_LABELS[statut] ?? statut

  return `
    <div style="margin-bottom: 28px;">
      <h2 style="margin: 0 0 4px 0; color: #111827; font-size: 15px; font-weight: 700; border-left: 4px solid #1E3A5F; padding-left: 10px;">
        ${labelStatut}
        <span style="font-size: 12px; font-weight: 400; color: #6b7280; margin-left: 8px;">${marches.length} marché${marches.length > 1 ? "s" : ""}</span>
      </h2>

      <table width="${TABLE_WIDTH}" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e5e7eb; table-layout: fixed; margin-top: 10px;">
        <thead>
          <tr style="background-color: #1E3A5F;">${headers}</tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}

// ============================================================
// TEMPLATE PRINCIPAL
// ============================================================

export function buildReportingEmail(
  ruleName: string,
  grouped: Map<StatutMarche, MarcheForReporting[]>,
  now: Date = new Date()
): { subject: string; html: string; text: string } {
  const totalMarches = Array.from(grouped.values()).reduce((s, a) => s + a.length, 0)

  // Ordre d'affichage : ordre logique du cycle de vie
  const ORDER: StatutMarche[] = [
    "OPPORTUNITE_IDENTIFIEE",
    "DOSSIER_EN_PREPARATION",
    "OFFRE_DEPOSEE",
    "EN_ATTENTE_ATTRIBUTION",
    "ATTRIBUE_PROVISOIREMENT",
    "ATTRIBUE_DEFINITIVEMENT",
    "EN_ATTENTE_LIVRAISON_OS",
    "EN_EXECUTION",
    "EXECUTE_ATTENTE_GARANTIES",
    "CLOTURE",
    "RESILIE",
    "ANNULE",
    "INFRUCTUEUX",
  ]

  const sections = ORDER
    .filter((s) => grouped.has(s))
    .map((s) => buildStatutSection(s, grouped.get(s)!, now))
    .join("")

  const dateLabel = format(now, "EEEE d MMMM yyyy", { locale: fr })
  const subject = `📊 Synthèse Marchés — ${ruleName} — ${format(now, "dd/MM/yyyy")}`

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="${EMAIL_WIDTH}" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #1E3A5F; padding: 28px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">
                📊 Synthèse Marchés — ${ruleName}
              </h1>
              <p style="margin: 8px 0 0 0; color: #C49A1A; font-size: 13px; font-weight: 500;">
                ${dateLabel}
              </p>
            </td>
          </tr>

          <!-- Contenu -->
          <tr>
            <td style="padding: 32px 28px;">
              ${sections}

              <!-- Résumé -->
              <div style="margin-top: 16px; padding: 14px 18px; background-color: #f9fafb; text-align: center; border: 1px solid #e5e7eb; border-radius: 4px;">
                <p style="margin: 0; color: #374151; font-size: 13px; font-weight: 600;">
                  📊 Total : ${totalMarches} marché${totalMarches > 1 ? "s" : ""} · ${grouped.size} statut${grouped.size > 1 ? "s" : ""}
                </p>
                <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 11px;">
                  Consultez l'application pour plus de détails
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 18px 28px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Cet email est généré automatiquement par ERP Marchés STAM
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  // Version texte brut
  const textLines: string[] = [
    `SYNTHÈSE MARCHÉS — ${ruleName.toUpperCase()}`,
    `${format(now, "dd/MM/yyyy")}`,
    `Total : ${totalMarches} marché(s)`,
    "",
  ]
  for (const [statut, marches] of grouped) {
    textLines.push(`== ${STATUT_LABELS[statut] ?? statut} (${marches.length}) ==`)
    for (const m of marches) {
      textLines.push(`  - ${m.numero} | ${m.objet} | ${formatMontant(m.montant)}`)
    }
    textLines.push("")
  }

  return { subject, html, text: textLines.join("\n") }
}
```

### Step 2: Vérifier TypeScript

```bash
npx tsc --noEmit 2>&1 | grep "reporting-templates"
```

Attendu : aucune ligne

### Step 3: Commit

```bash
git add lib/email/reporting-templates.ts
git commit -m "feat(reporting): add reporting email template with per-statut sections"
```

---

## T5 — `lib/actions/reporting-rules.ts`

**Files:**
- Create: `lib/actions/reporting-rules.ts`

### Step 1: Créer le fichier

```typescript
"use server"

/**
 * lib/actions/reporting-rules.ts
 * Server Actions CRUD pour les règles de reporting email.
 */

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import { requireRole } from "@/lib/utils/permissions"
import { logAction } from "@/lib/audit/logAction"
import { AUDIT_ACTION, AUDIT_ENTITY } from "@/lib/audit/constants"
import type { ActionResult } from "@/types"
import { z } from "zod"
import { getMarchesForReporting, groupMarchesByStatut } from "@/lib/cron/getMarchesForReporting"
import { buildReportingEmail } from "@/lib/email/reporting-templates"
import { createEmailTransport } from "@/lib/config/email"

// ============================================================
// SCHÉMA ZOD
// ============================================================

const ReportingScheduleConfigSchema = z
  .object({
    type: z.enum(["DAILY", "WEEKLY", "MONTHLY", "MANUAL"]),
    hour: z.number().int().min(0).max(23),
    days: z.array(z.number().int().min(1).max(31)).optional(),
  })
  .nullable()

const ReportingRuleSchema = z.object({
  name:            z.string().min(2).max(100),
  description:     z.string().optional(),
  statutGroups:    z.array(z.string()).min(1, "Sélectionnez au moins un statut"),
  recipientEmails: z.array(z.string().email()).min(1, "Sélectionnez au moins un destinataire"),
  scheduleConfig:  ReportingScheduleConfigSchema.optional().default(null),
  isActive:        z.boolean().default(true),
})

// ============================================================
// READ
// ============================================================

export async function getReportingRules() {
  await requireRole(["ADMIN"])
  return prisma.reportingRule.findMany({
    orderBy: { createdAt: "asc" },
  })
}

// ============================================================
// CREATE
// ============================================================

export async function createReportingRule(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(["ADMIN"])
    const data = ReportingRuleSchema.parse(input)

    const rule = await prisma.reportingRule.create({
      data: {
        ...data,
        scheduleConfig:
          data.scheduleConfig === null
            ? Prisma.DbNull
            : data.scheduleConfig,
      },
    })

    await logAction({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      action: AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.ALERTES,
      entityId: rule.id,
      metadata: { ruleName: rule.name, type: "reporting" },
    })

    revalidatePath("/admin/reporting")
    return { success: true, data: { id: rule.id } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? "Données invalides" }
    }
    console.error("createReportingRule:", error)
    return { success: false, error: "Erreur lors de la création" }
  }
}

// ============================================================
// UPDATE
// ============================================================

export async function updateReportingRule(
  id: string,
  input: unknown
): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(["ADMIN"])
    const data = ReportingRuleSchema.parse(input)

    await prisma.reportingRule.update({
      where: { id },
      data: {
        ...data,
        scheduleConfig:
          data.scheduleConfig === null
            ? Prisma.DbNull
            : data.scheduleConfig,
      },
    })

    await logAction({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      action: AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.ALERTES,
      entityId: id,
      metadata: { type: "reporting" },
    })

    revalidatePath("/admin/reporting")
    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? "Données invalides" }
    }
    console.error("updateReportingRule:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

// ============================================================
// DELETE
// ============================================================

export async function deleteReportingRule(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(["ADMIN"])
    await prisma.reportingRule.delete({ where: { id } })

    await logAction({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      action: AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.ALERTES,
      entityId: id,
      metadata: { type: "reporting" },
    })

    revalidatePath("/admin/reporting")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("deleteReportingRule:", error)
    return { success: false, error: "Erreur lors de la suppression" }
  }
}

// ============================================================
// TOGGLE ACTIVE
// ============================================================

export async function toggleReportingRule(
  id: string,
  isActive: boolean
): Promise<ActionResult<void>> {
  try {
    await requireRole(["ADMIN"])
    await prisma.reportingRule.update({
      where: { id },
      data: { isActive },
    })
    revalidatePath("/admin/reporting")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("toggleReportingRule:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

// ============================================================
// SEND NOW (envoi manuel)
// ============================================================

export async function sendReportingRuleNow(id: string): Promise<ActionResult<{ sent: number }>> {
  try {
    const session = await requireRole(["ADMIN"])

    const rule = await prisma.reportingRule.findUnique({ where: { id } })
    if (!rule) return { success: false, error: "Règle introuvable" }

    const recipients = (rule.recipientEmails as string[]).filter(
      (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    )
    if (recipients.length === 0) {
      return { success: false, error: "Aucun destinataire valide configuré" }
    }

    const marches = await getMarchesForReporting(rule.statutGroups as string[])
    if (marches.length === 0) {
      return { success: false, error: "Aucun marché trouvé pour les statuts sélectionnés" }
    }

    const grouped = groupMarchesByStatut(marches)
    const now = new Date()
    const { subject, html, text } = buildReportingEmail(rule.name, grouped, now)

    const transporter = createEmailTransport()
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "noreply@erp-marches.local",
      to: recipients.join(", "),
      subject,
      html,
      text,
    })

    await logAction({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      action: AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.ALERTES,
      entityId: id,
      metadata: { type: "reporting-manual-send", recipients: recipients.length, marches: marches.length },
    })

    return { success: true, data: { sent: recipients.length } }
  } catch (error) {
    console.error("sendReportingRuleNow:", error)
    return { success: false, error: "Erreur lors de l'envoi" }
  }
}
```

### Step 2: Vérifier TypeScript

```bash
npx tsc --noEmit 2>&1 | grep "reporting-rules"
```

Attendu : aucune ligne

### Step 3: Commit

```bash
git add lib/actions/reporting-rules.ts
git commit -m "feat(reporting): add CRUD server actions for reporting rules"
```

---

## T6 — Endpoint cron + vercel.json

**Files:**
- Create: `app/api/cron/reporting/route.ts`
- Modify: `vercel.json`

### Step 1: Créer la route cron

```typescript
/**
 * app/api/cron/reporting/route.ts
 *
 * Endpoint cron horaire pour le module de reporting email.
 * Déclenché automatiquement par Vercel toutes les heures.
 * Sécurisé par x-vercel-cron ou CRON_SECRET.
 */

import { timingSafeEqual } from "crypto"
import { runReportingCron } from "@/lib/cron/reporting-processor"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    if (!process.env.CRON_SECRET) {
      console.error("❌ CRON_SECRET non configuré")
      return NextResponse.json({ success: false, error: "Configuration manquante" }, { status: 500 })
    }

    const isVercelCron = request.headers.get("x-vercel-cron") === "1"
    const authHeader = request.headers.get("authorization") ?? ""
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    let authorized = false
    try {
      authorized = timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedAuth))
    } catch { authorized = false }

    if (!authorized && !isVercelCron) {
      console.warn("⚠️ Tentative d'accès non autorisée au cron reporting")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const currentHour = new Date().getHours()
    console.log(`📊 Démarrage cron reporting — heure courante : ${currentHour}h`)
    const startTime = Date.now()

    const result = await runReportingCron(currentHour)
    const duration = Date.now() - startTime

    console.log(`✅ Cron reporting terminé en ${duration}ms — ${result.sent} envoi(s), ${result.skipped} ignoré(s)`)

    return NextResponse.json({
      success: true,
      data: { ...result, hour: currentHour, duration: `${duration}ms`, timestamp: new Date().toISOString() },
    }, { status: 200 })
  } catch (error) {
    console.error("❌ Erreur critique cron reporting:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur interne",
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
```

### Step 2: Modifier vercel.json

Remplacer le contenu de `vercel.json` :

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/daily-alerts",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/reporting",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Step 3: Vérifier TypeScript

```bash
npx tsc --noEmit 2>&1 | grep "cron/reporting"
```

Attendu : aucune ligne

### Step 4: Commit

```bash
git add app/api/cron/reporting/route.ts vercel.json
git commit -m "feat(reporting): add hourly cron endpoint + vercel.json config"
```

---

## T7 — Page admin `/admin/reporting`

**Files:**
- Create: `app/(dashboard)/admin/reporting/page.tsx`
- Create: `app/(dashboard)/admin/reporting/ReportingRulesClient.tsx`

### Step 1: Créer `page.tsx` (RSC)

```typescript
// app/(dashboard)/admin/reporting/page.tsx

import { requireRole } from "@/lib/utils/permissions"
import { getReportingRules } from "@/lib/actions/reporting-rules"
import { ReportingRulesClient } from "./ReportingRulesClient"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ReportingPage() {
  const session = await requireRole(["ADMIN"]).catch(() => null)
  if (!session) redirect("/")

  const rules = await getReportingRules()

  // Sérialiser les dates pour le Client Component
  const serializedRules = rules.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  return <ReportingRulesClient initialRules={serializedRules} />
}
```

### Step 2: Créer `ReportingRulesClient.tsx`

Ce fichier est long — le voici complet :

```typescript
"use client"

/**
 * app/(dashboard)/admin/reporting/ReportingRulesClient.tsx
 * Interface de gestion des règles de reporting email.
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createReportingRule,
  updateReportingRule,
  deleteReportingRule,
  toggleReportingRule,
  sendReportingRuleNow,
} from "@/lib/actions/reporting-rules"
import type { ReportingScheduleConfig } from "@/lib/cron/reporting-processor"
import { STATUT_LABELS } from "@/lib/constants/marche"
import type { StatutMarche } from "@prisma/client"
import { toast } from "@/lib/utils/toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Send, Pencil, Trash2, Power } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"

// ============================================================
// TYPES
// ============================================================

interface SerializedReportingRule {
  id: string
  name: string
  description: string | null
  statutGroups: string[]
  recipientEmails: string[]
  scheduleConfig: ReportingScheduleConfig | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================
// CONSTANTES
// ============================================================

const ALL_STATUTS = Object.keys(STATUT_LABELS) as StatutMarche[]

const STATUT_GROUPS_UI = [
  {
    label: "Pré-commercial",
    statuts: ["OPPORTUNITE_IDENTIFIEE", "DOSSIER_EN_PREPARATION"] as StatutMarche[],
  },
  {
    label: "En attente",
    statuts: [
      "OFFRE_DEPOSEE",
      "EN_ATTENTE_ATTRIBUTION",
      "ATTRIBUE_PROVISOIREMENT",
      "ATTRIBUE_DEFINITIVEMENT",
    ] as StatutMarche[],
  },
  {
    label: "Exécution",
    statuts: [
      "EN_ATTENTE_LIVRAISON_OS",
      "EN_EXECUTION",
      "EXECUTE_ATTENTE_GARANTIES",
    ] as StatutMarche[],
  },
  {
    label: "Terminaux",
    statuts: ["CLOTURE", "RESILIE", "ANNULE", "INFRUCTUEUX"] as StatutMarche[],
  },
]

const SCHEDULE_TYPE_LABELS = {
  DAILY: "Quotidien",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
  MANUAL: "Manuel uniquement",
}

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const HOURS = Array.from({ length: 24 }, (_, i) => i)

// ============================================================
// HELPERS
// ============================================================

function formatSchedule(config: ReportingScheduleConfig | null): string {
  if (!config || config.type === "MANUAL") return "Manuel"
  const hourStr = `${config.hour}h00`
  switch (config.type) {
    case "DAILY": return `Quotidien à ${hourStr}`
    case "WEEKLY": {
      if (!config.days || config.days.length === 0) return `Hebdo à ${hourStr}`
      const days = config.days.map((d) => DAY_LABELS[d - 1]).join(", ")
      return `${days} à ${hourStr}`
    }
    case "MONTHLY": {
      if (!config.days || config.days.length === 0) return `Mensuel à ${hourStr}`
      return `Le ${config.days.join("/")} du mois à ${hourStr}`
    }
    default: return "Manuel"
  }
}

// ============================================================
// FORM STATE
// ============================================================

interface FormState {
  name: string
  description: string
  statutGroups: string[]
  recipientEmails: string[]
  scheduleType: "DAILY" | "WEEKLY" | "MONTHLY" | "MANUAL"
  hour: number
  days: number[]
  isActive: boolean
}

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    statutGroups: [],
    recipientEmails: [],
    scheduleType: "DAILY",
    hour: 8,
    days: [],
    isActive: true,
  }
}

function ruleToForm(rule: SerializedReportingRule): FormState {
  const config = rule.scheduleConfig
  return {
    name: rule.name,
    description: rule.description ?? "",
    statutGroups: rule.statutGroups,
    recipientEmails: rule.recipientEmails,
    scheduleType: config?.type ?? "MANUAL",
    hour: config?.hour ?? 8,
    days: config?.days ?? [],
    isActive: rule.isActive,
  }
}

function formToPayload(form: FormState) {
  const scheduleConfig: ReportingScheduleConfig | null =
    form.scheduleType === "MANUAL"
      ? null
      : {
          type: form.scheduleType,
          hour: form.hour,
          ...(form.scheduleType !== "DAILY" && form.days.length > 0
            ? { days: form.days }
            : {}),
        }
  return {
    name: form.name,
    description: form.description || undefined,
    statutGroups: form.statutGroups,
    recipientEmails: form.recipientEmails,
    scheduleConfig,
    isActive: form.isActive,
  }
}

// ============================================================
// SOUS-COMPOSANT : EmailTagInput
// ============================================================

function EmailTagInput({
  emails,
  onChange,
}: {
  emails: string[]
  onChange: (emails: string[]) => void
}) {
  const [input, setInput] = useState("")
  const [error, setError] = useState("")

  function addEmail() {
    const val = input.trim().toLowerCase()
    if (!val) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setError("Email invalide")
      return
    }
    if (emails.includes(val)) {
      setError("Email déjà ajouté")
      return
    }
    onChange([...emails, val])
    setInput("")
    setError("")
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => { setInput(e.target.value); setError("") }}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
          placeholder="email@exemple.com"
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addEmail}>
          Ajouter
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-1">
        {emails.map((email) => (
          <Badge
            key={email}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => onChange(emails.filter((e) => e !== email))}
          >
            {email} ×
          </Badge>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// SOUS-COMPOSANT : ScheduleConfig
// ============================================================

function ScheduleConfigSection({
  form,
  onChange,
}: {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}) {
  const toggleDay = (day: number) => {
    const next = form.days.includes(day)
      ? form.days.filter((d) => d !== day)
      : [...form.days, day].sort()
    onChange({ days: next })
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Type de planification</Label>
        <Select
          value={form.scheduleType}
          onValueChange={(v) => onChange({ scheduleType: v as FormState["scheduleType"], days: [] })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SCHEDULE_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.scheduleType !== "MANUAL" && (
        <div>
          <Label>Heure d&apos;envoi</Label>
          <Select
            value={String(form.hour)}
            onValueChange={(v) => onChange({ hour: Number(v) })}
          >
            <SelectTrigger className="mt-1 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>{h}h00</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {form.scheduleType === "WEEKLY" && (
        <div>
          <Label>Jours de la semaine</Label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {DAY_LABELS.map((label, i) => {
              const day = i + 1
              return (
                <Button
                  key={day}
                  type="button"
                  size="sm"
                  variant={form.days.includes(day) ? "default" : "outline"}
                  onClick={() => toggleDay(day)}
                  className="w-12"
                >
                  {label}
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {form.scheduleType === "MONTHLY" && (
        <div>
          <Label>Jour du mois (ex: 1, 15)</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={form.days[0] ?? ""}
            onChange={(e) => {
              const v = parseInt(e.target.value)
              onChange({ days: isNaN(v) ? [] : [Math.min(31, Math.max(1, v))] })
            }}
            className="mt-1 w-24"
          />
        </div>
      )}
    </div>
  )
}

// ============================================================
// SOUS-COMPOSANT : Dialog Formulaire
// ============================================================

function ReportingRuleDialog({
  open,
  onClose,
  rule,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  rule: SerializedReportingRule | null
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(rule ? ruleToForm(rule) : emptyForm())
  const [isPending, startTransition] = useTransition()

  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }))
  }

  function toggleStatut(statut: string) {
    const next = form.statutGroups.includes(statut)
      ? form.statutGroups.filter((s) => s !== statut)
      : [...form.statutGroups, statut]
    patch({ statutGroups: next })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = formToPayload(form)
    startTransition(async () => {
      const result = rule
        ? await updateReportingRule(rule.id, payload)
        : await createReportingRule(payload)

      if (result.success) {
        toast.success(rule ? "Règle mise à jour" : "Règle créée")
        onSaved()
        onClose()
      } else {
        toast.error(result.error ?? "Erreur")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Modifier la règle" : "Nouvelle règle de reporting"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nom */}
          <div>
            <Label htmlFor="name">Nom de la règle *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="ex: Suivi Exécution"
              required
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="desc">Description (optionnel)</Label>
            <Input
              id="desc"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Statuts */}
          <div>
            <Label className="mb-2 block">Statuts inclus *</Label>
            <div className="space-y-3">
              {STATUT_GROUPS_UI.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{group.label}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {group.statuts.map((statut) => (
                      <label key={statut} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={form.statutGroups.includes(statut)}
                          onCheckedChange={() => toggleStatut(statut)}
                        />
                        {STATUT_LABELS[statut]}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Destinataires */}
          <div>
            <Label className="mb-1 block">Destinataires *</Label>
            <EmailTagInput
              emails={form.recipientEmails}
              onChange={(emails) => patch({ recipientEmails: emails })}
            />
          </div>

          {/* Planification */}
          <div>
            <Label className="mb-2 block">Planification</Label>
            <ScheduleConfigSection form={form} onChange={patch} />
          </div>

          {/* Actif */}
          <div className="flex items-center gap-3">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => patch({ isActive: v })}
            />
            <Label>Règle active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement..." : rule ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export function ReportingRulesClient({
  initialRules,
}: {
  initialRules: SerializedReportingRule[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<SerializedReportingRule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SerializedReportingRule | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  function refresh() {
    startTransition(() => router.refresh())
  }

  function openCreate() {
    setEditingRule(null)
    setDialogOpen(true)
  }

  function openEdit(rule: SerializedReportingRule) {
    setEditingRule(rule)
    setDialogOpen(true)
  }

  async function handleDelete(rule: SerializedReportingRule) {
    const result = await deleteReportingRule(rule.id)
    if (result.success) {
      toast.success("Règle supprimée")
      refresh()
    } else {
      toast.error(result.error ?? "Erreur")
    }
    setDeleteTarget(null)
  }

  async function handleToggle(rule: SerializedReportingRule) {
    const result = await toggleReportingRule(rule.id, !rule.isActive)
    if (result.success) {
      toast.success(rule.isActive ? "Règle désactivée" : "Règle activée")
      refresh()
    } else {
      toast.error(result.error ?? "Erreur")
    }
  }

  async function handleSendNow(rule: SerializedReportingRule) {
    setSendingId(rule.id)
    const result = await sendReportingRuleNow(rule.id)
    setSendingId(null)
    if (result.success) {
      toast.success(`Email envoyé à ${result.data!.sent} destinataire(s)`)
    } else {
      toast.error(result.error ?? "Erreur lors de l'envoi")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting Email"
        description="Configurez vos règles d'envoi de synthèses marchés par statut"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle règle
          </Button>
        }
      />

      {initialRules.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Aucune règle de reporting</p>
          <p className="text-sm mt-1">Créez votre première règle pour commencer</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Créer une règle
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nom</th>
                <th className="px-4 py-3 text-left font-medium">Statuts</th>
                <th className="px-4 py-3 text-left font-medium">Planification</th>
                <th className="px-4 py-3 text-left font-medium">Destinataires</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{rule.name}</p>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground">{rule.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{rule.statutGroups.length} statut{rule.statutGroups.length > 1 ? "s" : ""}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatSchedule(rule.scheduleConfig as ReportingScheduleConfig | null)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {rule.recipientEmails.length} email{rule.recipientEmails.length > 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={rule.isActive ? "success" : "muted"}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendNow(rule)}
                        disabled={sendingId === rule.id}
                        title="Envoyer maintenant"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(rule)}
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggle(rule)}
                        title={rule.isActive ? "Désactiver" : "Activer"}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteTarget(rule)}
                        title="Supprimer"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog création/édition */}
      <ReportingRuleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        rule={editingRule}
        onSaved={refresh}
      />

      {/* Dialog confirmation suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la règle ?</AlertDialogTitle>
            <AlertDialogDescription>
              La règle &quot;{deleteTarget?.name}&quot; sera supprimée définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

### Step 3: Vérifier TypeScript

```bash
npx tsc --noEmit 2>&1 | grep -E "admin/reporting"
```

Attendu : aucune ligne

### Step 4: Commit

```bash
git add "app/(dashboard)/admin/reporting/"
git commit -m "feat(reporting): add /admin/reporting page with CRUD UI"
```

---

## T8 — Sidebar + pageTitles

**Files:**
- Modify: `components/layout/dashboard-shell.tsx`

### Step 1: Ajouter l'import de l'icône

Dans `dashboard-shell.tsx`, ajouter `BarChart2` à la ligne d'imports lucide-react :

```typescript
import {
  // ... existants ...
  BarChart2,
} from 'lucide-react'
```

### Step 2: Ajouter le lien dans `navItems`

Après `{ href: '/admin/audit-logs', ... }` dans le tableau `navItems` :

```typescript
{ href: '/admin/reporting', label: 'Reporting', icon: BarChart2, roles: ['ADMIN'] },
```

### Step 3: Ajouter dans `pageTitles`

```typescript
'/admin/reporting': 'Reporting Email',
```

### Step 4: Vérifier TypeScript

```bash
npx tsc --noEmit 2>&1 | grep "dashboard-shell"
```

Attendu : aucune ligne

### Step 5: Commit

```bash
git add components/layout/dashboard-shell.tsx
git commit -m "feat(reporting): add Reporting link in sidebar (ADMIN)"
```

---

## T9 — Build complet + push + déploiement

### Step 1: Build Next.js

```bash
npm run build 2>&1 | tail -20
```

Attendu : `✓ Compiled successfully` ou `Route (app) ... ○/● ...` sans erreur rouge.

### Step 2: Vérifier TypeScript strict

```bash
npx tsc --noEmit 2>&1 | grep -v "tests/" | grep -v "node_modules"
```

Attendu : 0 ligne

### Step 3: Push

```bash
git push origin main
```

### Step 4: Déployer sur Vercel

Option A (si CLI fonctionne) :
```bash
vercel --prod
```

Option B (si CLI échoue — "internal error") :
```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_38g8LtNCRD8PCg4PTFPeKrDS" \
  -H "Authorization: Bearer $(cat 'C:/Users/HP/AppData/Roaming/com.vercel.cli/Data/auth.json' | python -c 'import sys,json; print(json.load(sys.stdin)[\"token\"])')" \
  -H "Content-Type: application/json" \
  -d '{"name":"erp-marches-stam","gitSource":{"type":"github","ref":"main","repoId":1146383481},"target":"production"}'
```

Vérifier le statut avec :
```bash
curl -s "https://api.vercel.com/v13/deployments/<dpl_id>?teamId=team_38g8LtNCRD8PCg4PTFPeKrDS" \
  -H "Authorization: Bearer <token>" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('readyState','?'))"
```

Attendu : `READY`

### Step 5: Test manuel en production

1. Aller sur https://erp-marches-stam.vercel.app
2. Se connecter en ADMIN
3. Vérifier que "Reporting" apparaît dans la sidebar
4. Cliquer sur "Reporting" → page `/admin/reporting` s'affiche
5. Créer une règle : nom "Test", statuts [EN_EXECUTION], un email valide, planification MANUAL
6. Cliquer "Envoyer maintenant" → toast de succès, email reçu
7. Modifier la règle → dialog pré-rempli
8. Désactiver → badge "Inactive"
9. Supprimer → confirmation → supprimé

### Step 6: Tester le cron manuellement

```bash
curl -s "https://erp-marches-stam.vercel.app/api/cron/reporting" \
  -H "x-vercel-cron: 1"
```

Attendu :
```json
{"success":true,"data":{"processed":N,"sent":N,"skipped":N,"hour":H,...}}
```

---

## Résumé des commits

| Task | Commit | Description |
|---|---|---|
| T1 | feat(reporting): add ReportingRule model to Prisma schema |
| T2 | feat(reporting): add getMarchesForReporting query |
| T3 | feat(reporting): add reporting-processor with shouldRunReportingRuleNow |
| T4 | feat(reporting): add reporting email template with per-statut sections |
| T5 | feat(reporting): add CRUD server actions for reporting rules |
| T6 | feat(reporting): add hourly cron endpoint + vercel.json config |
| T7 | feat(reporting): add /admin/reporting page with CRUD UI |
| T8 | feat(reporting): add Reporting link in sidebar (ADMIN) |
| T9 | build + push + deploy |
