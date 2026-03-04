// components/analytique/PeriodSelector.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Periode } from '@/lib/analytics/types'

interface PeriodSelectorProps {
  value: Periode
  onChange: (periode: Periode) => void
  disabled?: boolean
}

const PRESETS = [
  {
    label: '30 jours',
    getValue: () => ({
      dateDebut: startOfDay(subDays(new Date(), 30)),
      dateFin: endOfDay(new Date()),
    }),
  },
  {
    label: '90 jours',
    getValue: () => ({
      dateDebut: startOfDay(subDays(new Date(), 90)),
      dateFin: endOfDay(new Date()),
    }),
  },
  {
    label: '6 mois',
    getValue: () => ({
      dateDebut: startOfDay(subMonths(new Date(), 6)),
      dateFin: endOfDay(new Date()),
    }),
  },
  {
    label: '1 an',
    getValue: () => ({
      dateDebut: startOfDay(subYears(new Date(), 1)),
      dateFin: endOfDay(new Date()),
    }),
  },
] as const

export function PeriodSelector({ value, onChange, disabled }: PeriodSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selecting, setSelecting] = useState<'debut' | 'fin'>('debut')
  const [tempDebut, setTempDebut] = useState<Date | undefined>(value.dateDebut)

  const isPresetActive = (preset: typeof PRESETS[number]) => {
    const p = preset.getValue()
    return (
      Math.abs(p.dateDebut.getTime() - value.dateDebut.getTime()) < 86400000 &&
      Math.abs(p.dateFin.getTime() - value.dateFin.getTime()) < 86400000
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Période :</span>

      {/* Presets */}
      {PRESETS.map((preset) => (
        <Button
          key={preset.label}
          variant={isPresetActive(preset) ? 'default' : 'outline'}
          size="sm"
          disabled={disabled}
          onClick={() => onChange(preset.getValue())}
        >
          {preset.label}
        </Button>
      ))}

      {/* Personnalisé */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled}>
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {format(value.dateDebut, 'dd/MM/yyyy', { locale: fr })}
            {' – '}
            {format(value.dateFin, 'dd/MM/yyyy', { locale: fr })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b text-sm text-muted-foreground">
            {selecting === 'debut'
              ? 'Sélectionnez la date de début'
              : 'Sélectionnez la date de fin'}
          </div>
          <Calendar
            mode="single"
            locale={fr}
            selected={selecting === 'debut' ? tempDebut : value.dateFin}
            onSelect={(date) => {
              if (!date) return
              if (selecting === 'debut') {
                setTempDebut(startOfDay(date))
                setSelecting('fin')
              } else {
                if (tempDebut && date >= tempDebut) {
                  onChange({ dateDebut: tempDebut, dateFin: endOfDay(date) })
                  setOpen(false)
                  setSelecting('debut')
                }
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
