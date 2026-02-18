'use client'

import { useState, useTransition } from 'react'
import { User, Mail, Shield, KeyRound, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { changePassword } from '@/lib/actions/auth/change-password'
import { toast } from '@/lib/utils/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

type BadgeVariant = 'success' | 'warning' | 'info' | 'muted'

function getRoleVariant(role?: string | null): BadgeVariant {
  switch (role) {
    case 'ADMIN':        return 'success'
    case 'AVANCE':       return 'warning'
    case 'EXPLOITATION': return 'info'
    default:             return 'muted'
  }
}

function getRoleLabel(role?: string | null): string {
  switch (role) {
    case 'ADMIN':        return 'Administrateur'
    case 'AVANCE':       return 'Avancé'
    case 'EXPLOITATION': return 'Exploitation'
    case 'VISITEUR':     return 'Visiteur'
    default:             return role ?? 'Visiteur'
  }
}

interface ProfilClientProps {
  name: string
  email: string
  role: string
}

export function ProfilClient({ name, email, role }: ProfilClientProps) {
  const [isPending, startTransition] = useTransition()
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)
    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const result = await changePassword(formData)
      if (result.success) {
        setPasswordSuccess(true)
        form.reset()
        toast.success('Mot de passe mis à jour avec succès')
      } else {
        setPasswordError(result.error)
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Section 1 : Informations du profil ── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: 'hsl(var(--border))' }}
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" style={{ color: 'hsl(var(--stam-primary))' }} />
            <h2 className="text-[15px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Informations du compte
            </h2>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Avatar + nom */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--stam-primary)) 0%, hsl(214 52% 35%) 100%)',
                color: 'white',
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">{name}</div>
              <div className="mt-1">
                <Badge variant={getRoleVariant(role)} className="text-[11px]">
                  {getRoleLabel(role)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Champs lecture seule */}
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                Nom complet
              </Label>
              <div
                className="h-9 px-3 rounded-md border flex items-center text-sm"
                style={{ backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' }}
              >
                {name}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                Adresse email
              </Label>
              <div
                className="h-9 px-3 rounded-md border flex items-center text-sm"
                style={{ backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' }}
              >
                {email}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                Rôle
              </Label>
              <div
                className="h-9 px-3 rounded-md border flex items-center"
                style={{ backgroundColor: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}
              >
                <Badge variant={getRoleVariant(role)} className="text-[11px]">
                  {getRoleLabel(role)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2 : Changement de mot de passe ── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: 'hsl(var(--border))' }}
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" style={{ color: 'hsl(var(--stam-primary))' }} />
            <h2 className="text-[15px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Changer le mot de passe
            </h2>
          </div>
        </div>

        <div className="p-6">
          {/* Succès */}
          {passwordSuccess && (
            <div className="mb-5 flex items-start gap-2.5 rounded-md bg-green-50 border border-green-200 px-4 py-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-800">
                Mot de passe mis à jour avec succès.
              </p>
            </div>
          )}

          {/* Erreur */}
          {passwordError && (
            <div className="mb-5 flex items-start gap-2.5 rounded-md bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{passwordError}</p>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Mot de passe actuel */}
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                  disabled={isPending}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowCurrent(!showCurrent)}
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Nouveau mot de passe */}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showNew ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                  minLength={8}
                  disabled={isPending}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowNew(!showNew)}
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Minimum 8 caractères</p>
            </div>

            {/* Confirmation */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                  minLength={8}
                  disabled={isPending}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                {isPending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Mise à jour…
                  </>
                ) : (
                  'Mettre à jour le mot de passe'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
