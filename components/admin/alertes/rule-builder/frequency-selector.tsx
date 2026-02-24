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
        <Label>Fréquence d&apos;exécution</Label>
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
            Si le mois n&apos;a pas ce jour, la règle ne s&apos;exécute pas ce mois.
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
