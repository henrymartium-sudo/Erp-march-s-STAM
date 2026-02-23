'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const ROLES = [
  { value: 'ADMIN',        label: 'Administrateur' },
  { value: 'AVANCE',       label: 'Utilisateur avancé' },
  { value: 'EXPLOITATION', label: 'Exploitation' },
  { value: 'VISITEUR',     label: 'Visiteur' },
]

interface Props {
  targetRoles: string[]
  onRolesChange: (roles: string[]) => void
}

export function RecipientPicker({ targetRoles, onRolesChange }: Props) {
  const toggle = (value: string, checked: boolean) => {
    onRolesChange(
      checked ? [...targetRoles, value] : targetRoles.filter((r) => r !== value)
    )
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
          <Label htmlFor={`role-${value}`} className="cursor-pointer font-normal">
            {label}
          </Label>
        </div>
      ))}
    </div>
  )
}
