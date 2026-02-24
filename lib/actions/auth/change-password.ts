'use server'

import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { requireAuth } from '@/lib/utils/permissions'
import { prisma } from '@/lib/db/prisma'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'

const schema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
}).refine((d) => d.newPassword !== d.currentPassword, {
  message: 'Le nouveau mot de passe doit être différent de l\'actuel',
  path: ['newPassword'],
})

export type ChangePasswordResult =
  | { success: true }
  | { success: false; error: string }

export async function changePassword(formData: FormData): Promise<ChangePasswordResult> {
  let session: Awaited<ReturnType<typeof requireAuth>>;
  try {
    session = await requireAuth();
  } catch {
    return { success: false, error: 'Non authentifié' };
  }

  const result = schema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? 'Données invalides' }
  }

  const { currentPassword, newPassword } = result.data

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return { success: false, error: 'Utilisateur introuvable' }
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) {
    return { success: false, error: 'Mot de passe actuel incorrect' }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  })

  await logAction({
    userId:     session.user.id,
    userEmail:  session.user.email,
    action:     AUDIT_ACTION.CHANGE_PASSWORD,
    entityType: AUDIT_ENTITY.AUTH,
  })

  return { success: true }
}
