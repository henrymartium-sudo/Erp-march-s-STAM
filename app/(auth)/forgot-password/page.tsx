'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/lib/actions/auth/forgot-password'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await forgotPassword(formData)
      setSent(true)
    })
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

      {sent ? (
        /* ─── État envoyé ─── */
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Email envoyé</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Si un compte existe pour <strong>{email}</strong>, vous recevrez
            un email avec un lien de réinitialisation valable 1 heure.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Pensez à vérifier vos spams.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--stam-primary))] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
        </div>
      ) : (
        /* ─── Formulaire ─── */
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Mot de passe oublié
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Saisissez votre email pour recevoir un lien de réinitialisation.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="votre.email@example.com"
                  className="pl-9"
                  required
                  disabled={isPending}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Envoi en cours...
                </>
              ) : (
                'Envoyer le lien de réinitialisation'
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
