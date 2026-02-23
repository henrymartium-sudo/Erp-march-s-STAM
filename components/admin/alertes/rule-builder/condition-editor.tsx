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
import { Plus, Trash2 } from 'lucide-react'
import { EVENT_FIELDS } from '@/lib/alertes/types'
import type { RuleCondition, AlertEventType } from '@/lib/alertes/types'

interface Props {
  eventType: AlertEventType | ''
  operator: 'AND' | 'OR'
  conditions: RuleCondition[]
  onOperatorChange: (op: 'AND' | 'OR') => void
  onConditionsChange: (conditions: RuleCondition[]) => void
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

export function ConditionEditor({
  eventType,
  operator,
  conditions,
  onOperatorChange,
  onConditionsChange,
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

      {conditions.map((cond, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border p-2 bg-gray-50">
          <Select
            value={cond.field}
            onValueChange={(v) => updateCondition(i, { field: v })}
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

          <Input
            className="w-28"
            value={String(cond.value)}
            onChange={(e) => updateCondition(i, { value: e.target.value })}
            placeholder="Valeur"
          />

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
      ))}

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
