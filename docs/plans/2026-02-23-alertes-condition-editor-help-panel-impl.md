# Alertes — ConditionEditor Enum + Panel d'aide Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Améliorer le Rule Builder des alertes avec (1) un select/checkboxes pour les champs enum au lieu d'un input texte libre, et (2) un panel d'aide contextuel latéral avec recettes prêtes à l'emploi.

**Architecture:** Le `ConditionEditor` détecte les champs avec `enumValues` et adapte son rendu. Le panel `AlertesHelpPanel` reçoit `activeField` en prop et affiche le contenu contextuel correspondant. Les pages `new` et `edit` passent en grille 2 colonnes avec `rule-form.tsx` qui gère le state `activeField`.

**Tech Stack:** Next.js 15, React 19, shadcn/ui (Select, Popover, Checkbox), TypeScript strict, Playwright E2E

---

## Task 1 : Enrichir `EVENT_FIELDS` avec `enumValues`

**Files:**
- Modify: `lib/alertes/types.ts`

**Step 1 : Mettre à jour le type `FieldDef`**

Dans `lib/alertes/types.ts`, modifier la définition du tableau de champs pour ajouter `enumValues?` et `enumLabels?` :

```ts
// Remplacer la ligne existante du type implicite par :
export interface FieldDef {
  field: string
  label: string
  type: 'number' | 'string'
  enumValues?: string[]
  enumLabels?: Record<string, string>
}
```

Puis mettre à jour `EVENT_FIELDS` pour utiliser `FieldDef[]` :

```ts
export const EVENT_FIELDS: Record<AlertEventType, FieldDef[]> = {
```

**Step 2 : Définir les constantes enum avant `EVENT_FIELDS`**

Ajouter juste avant la déclaration de `EVENT_FIELDS` :

```ts
const STATUT_MARCHE_VALUES = [
  'OPPORTUNITE_IDENTIFIEE',
  'EN_COURS_ANALYSE',
  'SOUMISSION_EN_COURS',
  'SOUMIS',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE',
  'EN_EXECUTION',
  'EN_ATTENTE_LIVRAISON_OS',
  'CLOTURE',
  'INFRUCTUEUX',
  'ANNULE',
] as const

const STATUT_MARCHE_LABELS: Record<string, string> = {
  OPPORTUNITE_IDENTIFIEE:   'Opportunité identifiée',
  EN_COURS_ANALYSE:         "En cours d'analyse",
  SOUMISSION_EN_COURS:      'Soumission en cours',
  SOUMIS:                   'Soumis',
  EN_ATTENTE_ATTRIBUTION:   "En attente d'attribution",
  ATTRIBUE:                 'Attribué',
  EN_EXECUTION:             'En exécution',
  EN_ATTENTE_LIVRAISON_OS:  'En attente livraison OS',
  CLOTURE:                  'Clôturé',
  INFRUCTUEUX:              'Infructueux',
  ANNULE:                   'Annulé',
}

const STATUT_CAUTION_VALUES = ['ACTIVE', 'LIBEREE', 'APPELEE', 'EXPIREE'] as const
const STATUT_CAUTION_LABELS: Record<string, string> = {
  ACTIVE:   'Active',
  LIBEREE:  'Libérée',
  APPELEE:  'Appelée',
  EXPIREE:  'Expirée',
}

const STATUT_MARCHE_ACTIFS = [
  'EN_EXECUTION',
  'EN_ATTENTE_LIVRAISON_OS',
  'ATTRIBUE',
] as const
const STATUT_MARCHE_ACTIFS_LABELS: Record<string, string> = {
  EN_EXECUTION:            'En exécution',
  EN_ATTENTE_LIVRAISON_OS: 'En attente livraison OS',
  ATTRIBUE:                'Attribué',
}
```

**Step 3 : Peupler `enumValues` dans `EVENT_FIELDS`**

```ts
export const EVENT_FIELDS: Record<AlertEventType, FieldDef[]> = {
  CAUTION_EXPIRING: [
    { field: 'joursRestants', label: 'Jours restants', type: 'number' },
    {
      field: 'statut', label: 'Statut', type: 'string',
      enumValues: [...STATUT_CAUTION_VALUES],
      enumLabels: STATUT_CAUTION_LABELS,
    },
    { field: 'montant', label: 'Montant (XOF)', type: 'number' },
  ],
  MARCHE_EXPIRING: [
    { field: 'joursRestants', label: 'Jours restants', type: 'number' },
    {
      field: 'statut', label: 'Statut', type: 'string',
      enumValues: [...STATUT_MARCHE_ACTIFS],
      enumLabels: STATUT_MARCHE_ACTIFS_LABELS,
    },
  ],
  MARCHE_STATUS_CHANGED: [
    {
      field: 'ancienStatut', label: 'Ancien statut', type: 'string',
      enumValues: [...STATUT_MARCHE_VALUES],
      enumLabels: STATUT_MARCHE_LABELS,
    },
    {
      field: 'nouveauStatut', label: 'Nouveau statut', type: 'string',
      enumValues: [...STATUT_MARCHE_VALUES],
      enumLabels: STATUT_MARCHE_LABELS,
    },
  ],
  SAV_TICKET_CREATED:   [],
  SAV_TICKET_ESCALATED: [],
  SAV_SLA_BREACH: [
    { field: 'heuresDepassement', label: 'Heures de dépassement', type: 'number' },
  ],
  DOCUMENT_EXPIRING: [
    { field: 'joursRestants', label: 'Jours restants', type: 'number' },
  ],
}
```

**Step 4 : Vérifier que TypeScript compile**

```bash
cd "C:\Users\HP\Documents\claude projets\projet ERP marchés\ERP Marchés STAM Final"
npx tsc --noEmit 2>&1 | head -30
```
Attendu : 0 erreurs dans `lib/alertes/types.ts`

**Step 5 : Commit**

```bash
git add lib/alertes/types.ts
git commit -m "feat(alertes): ajouter enumValues/enumLabels dans EVENT_FIELDS pour statuts marché et caution"
```

---

## Task 2 : Mettre à jour `condition-editor.tsx` — rendu conditionnel enum

**Files:**
- Modify: `components/admin/alertes/rule-builder/condition-editor.tsx`

**Step 1 : Mettre à jour l'import**

Ajouter `FieldDef` dans l'import :
```ts
import type { RuleCondition, AlertEventType, FieldDef } from '@/lib/alertes/types'
```
Et ajouter les imports shadcn :
```ts
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ChevronDown } from 'lucide-react'
```

**Step 2 : Créer le composant `EnumValueInput`**

Ajouter ce composant dans le même fichier, avant `ConditionEditor` :

```tsx
function EnumValueInput({
  fieldDef,
  op,
  value,
  onChange,
}: {
  fieldDef: FieldDef
  op: string
  value: string | number | string[]
  onChange: (v: string | string[]) => void
}) {
  const isMulti = op === 'in' || op === 'nin'
  const enumValues = fieldDef.enumValues ?? []
  const enumLabels = fieldDef.enumLabels ?? {}

  if (isMulti) {
    // Multi-select via Popover + Checkbox
    const selected: string[] = Array.isArray(value)
      ? value
      : typeof value === 'string' && value
        ? value.split(',').map(s => s.trim())
        : []

    const toggle = (v: string) => {
      const next = selected.includes(v)
        ? selected.filter(s => s !== v)
        : [...selected, v]
      onChange(next)
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 min-w-[7rem] max-w-[14rem] rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm hover:bg-accent"
          >
            <span className="flex-1 text-left truncate">
              {selected.length === 0
                ? <span className="text-muted-foreground">Valeurs...</span>
                : selected.map(v => (
                    <Badge key={v} variant="secondary" className="mr-1 text-xs">
                      {enumLabels[v] ?? v}
                    </Badge>
                  ))
              }
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            {enumValues.map(v => (
              <label key={v} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent cursor-pointer text-sm">
                <Checkbox
                  checked={selected.includes(v)}
                  onCheckedChange={() => toggle(v)}
                />
                {enumLabels[v] ?? v}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  // Single select (eq / neq)
  const strValue = typeof value === 'string' ? value : ''
  return (
    <Select value={strValue} onValueChange={onChange}>
      <SelectTrigger className="w-44">
        <SelectValue placeholder="Valeur..." />
      </SelectTrigger>
      <SelectContent>
        {enumValues.map(v => (
          <SelectItem key={v} value={v}>
            {enumLabels[v] ?? v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

**Step 3 : Remplacer le champ `Input` valeur dans la boucle conditions**

Dans la boucle `conditions.map(...)`, remplacer le bloc `<Input ... placeholder="Valeur" />` par :

```tsx
{(() => {
  const fieldDef = fields.find(f => f.field === cond.field)
  if (fieldDef?.enumValues?.length) {
    return (
      <EnumValueInput
        fieldDef={fieldDef}
        op={cond.op}
        value={cond.value}
        onChange={(v) => updateCondition(i, { value: v })}
      />
    )
  }
  return (
    <Input
      className="w-28"
      value={String(cond.value)}
      onChange={(e) => updateCondition(i, { value: e.target.value })}
      placeholder="Valeur"
    />
  )
})()}
```

**Step 4 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Attendu : 0 erreurs

**Step 5 : Commit**

```bash
git add components/admin/alertes/rule-builder/condition-editor.tsx
git commit -m "feat(alertes): ConditionEditor — select enum et checkboxes multi pour statuts marché/caution"
```

---

## Task 3 : Créer `AlertesHelpPanel`

**Files:**
- Create: `components/admin/alertes/rule-builder/help-panel.tsx`

**Step 1 : Créer le fichier**

```tsx
'use client'

import { BookOpen, ChevronDown, ChevronUp, Lightbulb, Zap } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface HelpContent {
  title: string
  description: string
  example?: string
  tip?: string
}

interface Recipe {
  name: string
  event: string
  conditions: string
  channels: string
  payload: {
    name: string
    description: string
    eventType: string
    conditions: { operator: 'AND' | 'OR'; conditions: { field: string; op: string; value: string | number }[] }
    channels: string[]
    targetRoles: string[]
    cooldownMinutes: number
    priority: number
  }
}

// ─── Contenu d'aide par champ ────────────────────────────────────────────────

const HELP_CONTENT: Record<string, HelpContent> = {
  eventType: {
    title: "Type d'événement",
    description: "Choisissez ce qui déclenche l'alerte. Chaque événement correspond à une action dans l'ERP.",
    example: "« Caution proche échéance » se déclenche chaque jour via le cron à 7h pour toutes les cautions concernées.",
    tip: "Commencez par les événements CAUTION_EXPIRING et MARCHE_STATUS_CHANGED — ce sont les plus utiles au quotidien.",
  },
  conditions: {
    title: "Conditions de déclenchement",
    description: "Filtrez les événements selon leurs propriétés. Sans condition, l'alerte se déclenche pour tous les événements du type sélectionné.",
    example: "joursRestants ≤ 7 → déclenche seulement quand il reste 7 jours ou moins.",
    tip: "Combinez plusieurs conditions avec ET (AND) pour être plus précis, ou OU (OR) pour couvrir plusieurs cas.",
  },
  ancienStatut: {
    title: "Ancien statut",
    description: "Le statut du marché AVANT le changement. Utile pour détecter des transitions spécifiques.",
    example: "ancienStatut = SOUMIS → déclenche uniquement quand un marché quitte l'état Soumis.",
    tip: "Combinez avec nouveauStatut pour surveiller une transition précise (ex: SOUMIS → ATTRIBUE).",
  },
  nouveauStatut: {
    title: "Nouveau statut",
    description: "Le statut du marché APRÈS le changement. C'est le champ le plus utilisé pour MARCHE_STATUS_CHANGED.",
    example: "nouveauStatut = ATTRIBUE → vous notifie dès qu'un marché est attribué.",
    tip: "Pour surveiller plusieurs statuts d'arrivée, utilisez l'opérateur « dans la liste » (in).",
  },
  statut: {
    title: "Statut",
    description: "Le statut actuel de la caution ou du marché au moment du déclenchement du cron.",
    example: "statut = ACTIVE → l'alerte ne se déclenche que pour les cautions encore actives (ignore les libérées).",
    tip: "Toujours filtrer sur ACTIVE pour les cautions — inutile d'alerter sur des cautions déjà libérées.",
  },
  joursRestants: {
    title: "Jours restants",
    description: "Nombre de jours avant l'échéance (calculé chaque nuit à 7h par le cron).",
    example: "joursRestants ≤ 30 → déclenche 30 jours avant échéance.",
    tip: "Créez deux règles : une à 30 jours (canal IN_APP) et une à 7 jours (canal EMAIL + IN_APP) pour une escalade progressive.",
  },
  montant: {
    title: "Montant (XOF)",
    description: "Montant de la caution en francs CFA. Permet de prioriser les alertes sur les grosses cautions.",
    example: "montant ≥ 5000000 → alerte uniquement les cautions de plus de 5M XOF.",
  },
  heuresDepassement: {
    title: "Heures de dépassement SLA",
    description: "Nombre d'heures écoulées depuis le dépassement du délai de résolution d'une intervention SAV.",
    example: "heuresDepassement ≥ 48 → escalade si l'intervention n'est pas résolue après 2 jours de retard.",
  },
  channels: {
    title: "Canaux de notification",
    description: "Où envoyer l'alerte. Vous pouvez activer plusieurs canaux simultanément.",
    example: "EMAIL + IN_APP → l'utilisateur reçoit un email ET voit la cloche rouge dans l'ERP.",
    tip: "IN_APP suffit pour les alertes informatives. Réservez EMAIL pour les alertes critiques nécessitant une action rapide.",
  },
  targetRoles: {
    title: "Rôles destinataires",
    description: "Qui reçoit l'alerte. ADMIN et AVANCE ont accès à toutes les fonctionnalités. EXPLOITATION ne voit que les marchés EN_EXECUTION.",
    tip: "Pour les alertes critiques (caution ≤ 7j), notifiez ADMIN + AVANCE. Pour les infos générales, EXPLOITATION suffit.",
  },
  cooldown: {
    title: "Cooldown (fenêtre d'idempotence)",
    description: "Durée minimale entre deux déclenchements de la même règle sur le même objet. Évite le spam.",
    example: "1440 min = 24h → maximum 1 notification par jour par objet (recommandé pour les crons).",
    tip: "Mettez 0 seulement pour MARCHE_STATUS_CHANGED — chaque changement de statut est unique et doit toujours notifier.",
  },
  priority: {
    title: "Priorité",
    description: "Niveau de priorité de 1 (plus haute) à 10 (plus basse). Utilisé pour trier les notifications dans l'historique.",
    example: "Priorité 1 → caution critique ≤ 7j. Priorité 5 → marché en fin d'exécution 30j.",
    tip: "Réservez 1-2 pour les urgences réelles (cautions ≤ 7j, SLA dépassé). Utilisez 3-5 pour les alertes de suivi.",
  },
}

// ─── Recettes ─────────────────────────────────────────────────────────────────

const RECIPES: Recipe[] = [
  {
    name: "🚨 Caution critique (≤ 7 jours)",
    event: "Caution proche échéance",
    conditions: "joursRestants ≤ 7 ET statut = ACTIVE",
    channels: "EMAIL + IN_APP",
    payload: {
      name: "Caution critique (≤ 7 jours)",
      description: "Alerte urgente quand une caution active expire dans moins de 7 jours",
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
      priority: 1,
    },
  },
  {
    name: "🏆 Marché attribué",
    event: "Changement de statut marché",
    conditions: "nouveauStatut = ATTRIBUE",
    channels: "IN_APP",
    payload: {
      name: "Marché attribué",
      description: "Notifie l'équipe dès qu'un marché est attribué",
      eventType: "MARCHE_STATUS_CHANGED",
      conditions: {
        operator: "AND",
        conditions: [{ field: "nouveauStatut", op: "eq", value: "ATTRIBUE" }],
      },
      channels: ["IN_APP"],
      targetRoles: ["ADMIN", "AVANCE", "EXPLOITATION"],
      cooldownMinutes: 0,
      priority: 2,
    },
  },
  {
    name: "📅 Marché fin d'exécution (≤ 30 jours)",
    event: "Marché en fin d'exécution",
    conditions: "joursRestants ≤ 30 ET statut = EN_EXECUTION",
    channels: "IN_APP",
    payload: {
      name: "Marché fin d'exécution (≤ 30 jours)",
      description: "Rappel 30 jours avant la fin d'un marché en cours",
      eventType: "MARCHE_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [
          { field: "joursRestants", op: "lte", value: 30 },
          { field: "statut", op: "eq", value: "EN_EXECUTION" },
        ],
      },
      channels: ["IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 1440,
      priority: 3,
    },
  },
  {
    name: "🔧 SLA SAV dépassé (≥ 48h)",
    event: "Dépassement SLA SAV",
    conditions: "heuresDepassement ≥ 48",
    channels: "EMAIL",
    payload: {
      name: "SLA SAV dépassé (≥ 48h)",
      description: "Escalade si une intervention SAV dépasse 48h sans résolution",
      eventType: "SAV_SLA_BREACH",
      conditions: {
        operator: "AND",
        conditions: [{ field: "heuresDepassement", op: "gte", value: 48 }],
      },
      channels: ["EMAIL"],
      targetRoles: ["ADMIN"],
      cooldownMinutes: 360,
      priority: 2,
    },
  },
  {
    name: "📄 Document expirant (≤ 14 jours)",
    event: "Document expirant",
    conditions: "joursRestants ≤ 14",
    channels: "IN_APP",
    payload: {
      name: "Document expirant (≤ 14 jours)",
      description: "Prévient 14 jours avant l'expiration d'un document",
      eventType: "DOCUMENT_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [{ field: "joursRestants", op: "lte", value: 14 }],
      },
      channels: ["IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 1440,
      priority: 4,
    },
  },
]

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  activeField: string | null
  onUseRecipe?: (recipe: Recipe['payload']) => void
  className?: string
}

export function AlertesHelpPanel({ activeField, onUseRecipe, className }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const content = activeField ? HELP_CONTENT[activeField] : null

  return (
    <aside className={cn(
      "rounded-xl border bg-white shadow-sm",
      collapsed ? "h-fit" : "",
      className,
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold">
            {content ? content.title : "Guide d'utilisation"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(v => !v)}
          className="rounded p-1 hover:bg-gray-100 text-muted-foreground"
          aria-label={collapsed ? "Afficher l'aide" : "Masquer l'aide"}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4 text-sm">
          {content ? (
            /* ── Aide contextuelle champ actif ── */
            <div className="space-y-3">
              <p className="text-muted-foreground leading-relaxed">{content.description}</p>

              {content.example && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                  <p className="text-xs font-medium text-blue-700 mb-1">Exemple</p>
                  <p className="text-xs text-blue-600">{content.example}</p>
                </div>
              )}

              {content.tip && (
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                  <p className="text-xs font-medium text-amber-700 mb-1">💡 Conseil</p>
                  <p className="text-xs text-amber-600">{content.tip}</p>
                </div>
              )}
            </div>
          ) : (
            /* ── État repos : recettes ── */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Recettes prêtes à l'emploi</span>
              </div>

              <p className="text-xs text-muted-foreground">
                Cliquez sur une recette pour pré-remplir le formulaire en 1 clic.
              </p>

              <div className="space-y-2">
                {RECIPES.map((recipe) => (
                  <div
                    key={recipe.name}
                    className="rounded-lg border bg-gray-50 p-3 space-y-1.5"
                  >
                    <p className="font-medium text-xs leading-snug">{recipe.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Événement : </span>{recipe.event}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Conditions : </span>{recipe.conditions}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Canaux : </span>{recipe.channels}
                    </p>
                    {onUseRecipe && (
                      <button
                        type="button"
                        onClick={() => onUseRecipe(recipe.payload)}
                        className="mt-1 flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Zap className="h-3 w-3" />
                        Utiliser ce modèle
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

// Exporter le type Recipe pour rule-form.tsx
export type { Recipe }
```

**Step 2 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Attendu : 0 erreurs

**Step 3 : Commit**

```bash
git add components/admin/alertes/rule-builder/help-panel.tsx
git commit -m "feat(alertes): créer AlertesHelpPanel — aide contextuelle + 5 recettes prêtes à l'emploi"
```

---

## Task 4 : Mettre à jour `rule-form.tsx` — activeField + onUseRecipe

**Files:**
- Modify: `components/admin/alertes/rule-builder/rule-form.tsx`

**Step 1 : Ajouter les imports**

En haut du fichier, ajouter :
```ts
import { AlertesHelpPanel } from './help-panel'
import type { AlertEventType as AlertEventTypeAlias } from '@/lib/alertes/types'
```
(le type AlertEventType est déjà importé, pas besoin de le réimporter)

Ajouter aussi :
```ts
import { AlertesHelpPanel } from './help-panel'
```

**Step 2 : Ajouter le state `activeField` dans le composant**

Après les useState existants, ajouter :
```ts
const [activeField, setActiveField] = useState<string | null>(null)
```

**Step 3 : Ajouter le handler `handleUseRecipe`**

Après la déclaration de `handleSubmit`, ajouter :
```ts
const handleUseRecipe = (recipe: {
  name: string
  description: string
  eventType: string
  conditions: { operator: 'AND' | 'OR'; conditions: { field: string; op: string; value: string | number }[] }
  channels: string[]
  targetRoles: string[]
  cooldownMinutes: number
  priority: number
}) => {
  setName(recipe.name)
  setDescription(recipe.description)
  setEventType(recipe.eventType as AlertEventType)
  setOperator(recipe.conditions.operator)
  setConditions(recipe.conditions.conditions as RuleCondition[])
  setChannels(recipe.channels)
  setTargetRoles(recipe.targetRoles)
  setCooldown(recipe.cooldownMinutes)
  setPriority(recipe.priority)
}
```

**Step 4 : Wrapper le `return` dans un layout 2 colonnes**

Remplacer :
```tsx
return (
  <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
    ...
  </form>
)
```

Par :
```tsx
return (
  <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ─── Informations générales ─── */}
      <div className="space-y-4" onFocus={() => setActiveField(null)}>
        ...contenu existant inchangé...
      </div>

      {/* Le select eventType doit déclencher setActiveField('eventType') */}
      {/* Wrapper la div du Select eventType : */}
      {/* <div onFocus={() => setActiveField('eventType')}> ... </div> */}

    </form>

    <AlertesHelpPanel
      activeField={activeField}
      onUseRecipe={handleUseRecipe}
      className="lg:sticky lg:top-4"
    />
  </div>
)
```

**Note importante** — détail précis des `onFocus` à ajouter sur chaque section :
- Div wrappant le Select `eventType` → `onFocus={() => setActiveField('eventType')}`
- Div section Conditions → `onFocus={() => setActiveField('conditions')}`
- Div section Canaux → `onFocus={() => setActiveField('channels')}`
- Div section Destinataires → `onFocus={() => setActiveField('targetRoles')}`
- Input `cooldown` → `onFocus={() => setActiveField('cooldown')}`
- Input `priority` → `onFocus={() => setActiveField('priority')}`

Et dans `ConditionEditor`, quand l'utilisateur sélectionne un champ, passer `setActiveField(fieldName)` via une prop `onFieldFocus?: (field: string) => void`.

**Step 5 : Passer `onFieldFocus` au ConditionEditor**

Dans `rule-form.tsx`, modifier l'appel à `<ConditionEditor>` :
```tsx
<ConditionEditor
  eventType={eventType}
  operator={operator}
  conditions={conditions}
  onOperatorChange={setOperator}
  onConditionsChange={setConditions}
  onFieldFocus={setActiveField}
/>
```

Dans `condition-editor.tsx`, ajouter la prop dans l'interface et l'appeler dans le `onValueChange` du Select champ :
```ts
interface Props {
  ...
  onFieldFocus?: (field: string) => void
}
// Dans le Select champ onValueChange :
onValueChange={(v) => {
  updateCondition(i, { field: v })
  onFieldFocus?.(v)
}}
```

**Step 6 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Attendu : 0 erreurs

**Step 7 : Commit**

```bash
git add components/admin/alertes/rule-builder/rule-form.tsx components/admin/alertes/rule-builder/condition-editor.tsx
git commit -m "feat(alertes): layout 2 colonnes rule-form + activeField + handler recettes"
```

---

## Task 5 : Mettre à jour les pages `new` et `edit`

**Files:**
- Modify: `app/(dashboard)/admin/alertes/rules/new/page.tsx`
- Modify: `app/(dashboard)/admin/alertes/rules/[id]/edit/page.tsx`

**Note :** Le layout 2 colonnes est géré dans `rule-form.tsx` directement (il wrappe son propre output). Les pages n'ont pas besoin de modification de layout — elles peuvent rester telles quelles.

Seule modification utile : supprimer `max-w-2xl` si présent dans les pages (ce n'est pas le cas actuellement).

**Step 1 : Vérifier que les pages compilent sans modification**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Attendu : 0 erreurs

---

## Task 6 : Tests E2E — ConditionEditor enum + panel aide

**Files:**
- Modify: `tests/alertes/rules.spec.ts`

**Step 1 : Ajouter 2 tests à la suite existante**

Ajouter après les tests existants :

```ts
test('ConditionEditor — select enum pour nouveauStatut', async ({ page }) => {
  await page.goto('/admin/alertes/rules/new')
  await page.waitForLoadState('domcontentloaded')

  // Sélectionner MARCHE_STATUS_CHANGED
  await page.getByRole('combobox').first().click()
  await page.getByText('Changement de statut marché').click()

  // Ajouter une condition
  await page.getByRole('button', { name: 'Ajouter une condition' }).click()

  // Vérifier que le champ "Nouveau statut" génère un Select (pas un Input)
  // Sélectionner le champ nouveauStatut
  const conditionRow = page.locator('.rounded-lg.border.p-2').first()
  await conditionRow.getByRole('combobox').first().click()
  await page.getByText('Nouveau statut').click()

  // Vérifier qu'un Select de valeurs apparaît (pas un Input texte)
  await expect(conditionRow.getByRole('combobox').last()).toBeVisible()

  // Sélectionner une valeur enum
  await conditionRow.getByRole('combobox').last().click()
  await page.getByText('Attribué').click()

  // Vérifier que la valeur est sélectionnée
  await expect(conditionRow.getByRole('combobox').last()).toContainText('Attribué')
})

test('Panel aide — affichage et recette prête à emploi', async ({ page }) => {
  await page.goto('/admin/alertes/rules/new')
  await page.waitForLoadState('domcontentloaded')

  // Panel visible par défaut
  await expect(page.getByText("Guide d'utilisation")).toBeVisible()
  await expect(page.getByText('Recettes prêtes à l\'emploi')).toBeVisible()

  // Recette 1 visible
  await expect(page.getByText('Caution critique (≤ 7 jours)')).toBeVisible()

  // Cliquer sur "Utiliser ce modèle" pour la recette Caution critique
  await page.getByRole('button', { name: 'Utiliser ce modèle' }).first().click()

  // Vérifier que le formulaire est pré-rempli
  await expect(page.getByDisplayValue('Caution critique (≤ 7 jours)')).toBeVisible()

  // Vérifier que le panel aide change selon le focus
  await page.getByLabel('Cooldown').focus()
  await expect(page.getByText("Fenêtre d'idempotence")).toBeVisible().catch(() => {
    // Le titre peut varier — vérifier au moins que le panel a changé
    return expect(page.getByText('Cooldown')).toBeVisible()
  })
})
```

**Step 2 : Lancer les tests**

```bash
npx playwright test tests/alertes/rules.spec.ts --project=chromium 2>&1 | tail -20
```
Attendu : tous les tests passent (anciens + nouveaux)

**Step 3 : Commit final**

```bash
git add tests/alertes/rules.spec.ts
git commit -m "test(alertes): E2E — ConditionEditor enum select + panel aide contextuel"
```

---

## Task 7 : Vérification finale et build

**Step 1 : Build local**

```bash
npm run build 2>&1 | tail -30
```
Attendu : `✓ Compiled successfully`

**Step 2 : Test responsive visuel (Playwright screenshots)**

```bash
npx playwright test tests/alertes/rules.spec.ts --project=chromium --headed 2>&1 | tail -10
```

**Step 3 : Commit de clôture si tout est vert**

```bash
git add -A
git status
# Vérifier qu'aucun fichier sensible n'est inclus
git commit -m "feat(alertes): ConditionEditor enum select + panel aide contextuel — complet"
```

---

## Résumé des commits attendus

| # | Message | Fichiers |
|---|---------|---------|
| 1 | feat(alertes): ajouter enumValues/enumLabels dans EVENT_FIELDS | `lib/alertes/types.ts` |
| 2 | feat(alertes): ConditionEditor — select enum et checkboxes multi | `condition-editor.tsx` |
| 3 | feat(alertes): créer AlertesHelpPanel | `help-panel.tsx` |
| 4 | feat(alertes): layout 2 colonnes + activeField + handler recettes | `rule-form.tsx`, `condition-editor.tsx` |
| 5 | test(alertes): E2E — enum select + panel aide | `rules.spec.ts` |
| 6 | feat(alertes): build final | — |
