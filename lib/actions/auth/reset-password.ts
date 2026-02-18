'use server'

import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'

const schema = z.object({
  token: z.string().min(1, 'Token manquant'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export type ResetPasswordResult =
  | { success: true }
  | { success: false; error: string }

export async function resetPassword(formData: FormData): Promise<ResetPasswordResult> {
  const result = schema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? 'Données invalides' }
  }

  const { token, password } = result.data

  // Trouver le token valide (non utilisé, non expiré)
  const resetRecord = await prisma.passwordReset.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!resetRecord) {
    return { success: false, error: 'Lien de réinitialisation invalide.' }
  }

  if (resetRecord.used) {
    return { success: false, error: 'Ce lien a déjà été utilisé.' }
  }

  if (resetRecord.expiresAt < new Date()) {
    return { success: false, error: 'Ce lien a expiré. Veuillez en demander un nouveau.' }
  }

  // Hacher le nouveau mot de passe et mettre à jour
  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    }),
  ])

  return { success: true }
}
