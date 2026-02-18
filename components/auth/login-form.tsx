'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LogIn, AlertCircle } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = (data: LoginFormValues) => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await signIn('credentials', {
          email: data.email,
          password: data.password,
          redirect: false,
        })

        if (result?.error) {
          setError('Email ou mot de passe incorrect')
          return
        }

        if (result?.ok) {
          router.push('/')
          router.refresh()
        }
      } catch (err) {
        console.error('Login error:', err)
        setError('Une erreur est survenue lors de la connexion')
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="votre.email@example.com"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Mot de passe</FormLabel>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Connexion en cours...
            </>
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" />
              Se connecter
            </>
          )}
        </Button>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-xs text-blue-800 font-semibold mb-2">
            Compte de test par défaut :
          </p>
          <p className="text-xs text-blue-700">
            Email: <span className="font-mono">admin@erp-marches.local</span>
          </p>
          <p className="text-xs text-blue-700">
            Mot de passe: <span className="font-mono">Admin123!</span>
          </p>
        </div>
      </form>
    </Form>
  )
}
