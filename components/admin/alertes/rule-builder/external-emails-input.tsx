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
        Destinataires non enregistrés dans l&apos;application. Appuyez sur Entrée ou virgule pour ajouter.
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
