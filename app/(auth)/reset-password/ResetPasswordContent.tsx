'use client'

import { useState, useTransition } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { resetPassword } from '@/lib/actions/auth/reset-password'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react'

export function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('token', token)

    startTransition(async () => {
      const result = await resetPassword(formData)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => router.push('/login'), 3000)
      } else {
        setError(result.error)
      }
    })
  }

  /* ─── Token absent ─── */
  if (!token) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(30,58,95,0.12)] border border-gray-100 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Lien invalide</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Ce lien de réinitialisation est invalide ou a expiré.
        </p>
        <Link href="/forgot-password" className="text-sm font-medium text-[hsl(var(--stam-primary))] hover:underline">
          Demander un nouveau lien
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(30,58,95,0.12)] border border-gray-100 p-8">
      {/* Logo mobile */}
      <div className="flex items-center gap-3 mb-6 lg:hidden">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect width="36" height="36" rx="8" fill="hsl(45 77% 44%)" />
          <text x="18" y="26" textAnchor="middle"
            fontFamily="DM Sans, system-ui, sans-serif"
            fontWeight="900" fontSize="20" fill="hsl(214 52% 18%)">S</text>
        </svg>
        <div>
          <div className="font-bold text-base tracking-widest uppercase text-foreground leading-tight">STAM</div>
          <div className="text-xs text-muted-foreground leading-tight">Marchés Publics</div>
        </div>
      </div>

      {success ? (
        /* ─── Succès ─── */
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Mot de passe mis à jour</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Votre mot de passe a été modifié avec succès.
            <br />Vous allez être redirigé vers la connexion…
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--stam-primary))] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Aller à la connexion
          </Link>
        </div>
      ) : (
        /* ─── Formulaire ─── */
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Nouveau mot de passe
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Choisissez un mot de passe d&apos;au moins 8 caractères.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nouveau mot de passe */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                  minLength={8}
                  disabled={isPending}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirmation */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Mise à jour…
                </>
              ) : (
                'Mettre à jour le mot de passe'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour à la connexion
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
