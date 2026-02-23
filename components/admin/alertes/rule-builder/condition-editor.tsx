'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import { EVENT_FIELDS } from '@/lib/alertes/types'
import type { RuleCondition, AlertEventType, FieldDef } from '@/lib/alertes/types'

interface Props {
  eventType: AlertEventType | ''
  operator: 'AND' | 'OR'
  conditions: RuleCondition[]
  onOperatorChange: (op: 'AND' | 'OR') => void
  onConditionsChange: (conditions: RuleCondition[]) => void
  onFieldFocus?: (field: string) => void
}

const OP_LABELS: Record<string, string> = {
  eq:  'égal à',
  neq: 'différent de',
  gt:  'supérieur à',
  gte: 'supérieur ou égal à',
  lt:  'inférieur à',
  lte: 'inférieur ou égal à',
  in:  'dans la liste',
  nin: 'pas dans la liste',
}

// ─── Composant valeur enum ────────────────────────────────────────────────────

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
              <label
                key={v}
                className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent cursor-pointer text-sm"
              >
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

// ─── Composant principal ──────────────────────────────────────────────────────

export function ConditionEditor({
  eventType,
  operator,
  conditions,
  onOperatorChange,
  onConditionsChange,
  onFieldFocus,
}: Props) {
  const fields = eventType ? (EVENT_FIELDS[eventType] ?? []) : []

  const addCondition = () => {
    onConditionsChange([
      ...conditions,
      { field: fields[0]?.field ?? '', op: 'eq', value: '' },
    ])
  }

  const removeCondition = (i: number) => {
    onConditionsChange(conditions.filter((_, idx) => idx !== i))
  }

  const updateCondition = (i: number, patch: Partial<RuleCondition>) => {
    onConditionsChange(
      conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c))
    )
  }

  if (!eventType) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Sélectionner un type d'événement pour configurer les conditions.
      </p>
    )
  }

  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Ce type d'événement se déclenche systématiquement (pas de condition supplémentaire).
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {conditions.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Opérateur :</span>
          <Select
            value={operator}
            onValueChange={(v) => onOperatorChange(v as 'AND' | 'OR')}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">ET (AND)</SelectItem>
              <SelectItem value="OR">OU (OR)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {conditions.map((cond, i) => {
        const fieldDef = fields.find(f => f.field === cond.field)
        return (
          <div key={i} className="flex items-center gap-2 rounded-lg border p-2 bg-gray-50">
            {/* Sélecteur de champ */}
            <Select
              value={cond.field}
              onValueChange={(v) => {
                updateCondition(i, { field: v, value: '' })
                onFieldFocus?.(v)
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Champ" />
              </SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.field} value={f.field}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sélecteur d'opérateur */}
            <Select
              value={cond.op}
              onValueChange={(v) => updateCondition(i, { op: v as RuleCondition['op'] })}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OP_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sélecteur de valeur — enum ou texte libre */}
            {fieldDef?.enumValues?.length ? (
              <EnumValueInput
                fieldDef={fieldDef}
                op={cond.op}
                value={cond.value}
                onChange={(v) => updateCondition(i, { value: v })}
              />
            ) : (
              <Input
                className="w-28"
                value={String(cond.value)}
                onChange={(e) => updateCondition(i, { value: e.target.value })}
                placeholder="Valeur"
              />
            )}

            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => removeCondition(i)}
              className="h-8 w-8 shrink-0"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )
      })}

      <Button
        variant="outline"
        size="sm"
        onClick={addCondition}
        type="button"
        className="mt-1"
      >
        <Plus className="h-4 w-4 mr-1" />
        Ajouter une condition
      </Button>
    </div>
  )
}
