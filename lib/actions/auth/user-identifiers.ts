'use server'

import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/permissions'

export type IdentifierResult =
  | { success: true }
  | { success: false; error: string }

const emailSchema = z.object({
  email: z.string().trim().email('Email invalide'),
})

// ─── Lecture ────────────────────────────────────────────────────────────────

export async function getUserIdentifiers(userId: string) {
  try {
    await requireRole(['ADMIN'])
  } catch {
    return { success: false as const, error: 'Non autorisé' }
  }

  const identifiers = await prisma.userIdentifier.findMany({
    where: { userId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  })

  return { success: true as const, identifiers }
}

// ─── Ajout ──────────────────────────────────────────────────────────────────

export async function addUserIdentifier(
  userId: string,
  email: string,
): Promise<IdentifierResult> {
  try {
    await requireRole(['ADMIN'])
  } catch {
    return { success: false, error: 'Non autorisé' }
  }

  const parsed = emailSchema.safeParse({ email })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Email invalide' }
  }

  const cleanEmail = parsed.data.email

  // Vérifier que l'utilisateur cible existe
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { success: false, error: 'Utilisateur introuvable' }
  }

  // L'email ne peut pas être l'adresse principale de ce même utilisateur
  if (user.email.toLowerCase() === cleanEmail.toLowerCase()) {
    return { success: false, error: "Cet email est déjà l'adresse principale de cet utilisateur" }
  }

  // L'email ne peut pas être l'adresse principale d'un autre utilisateur
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: cleanEmail, mode: 'insensitive' } },
  })
  if (existingUser) {
    return { success: false, error: 'Cet email est déjà utilisé comme adresse principale' }
  }

  // L'email ne peut pas déjà exister dans user_identifiers
  const existingIdentifier = await prisma.userIdentifier.findFirst({
    where: { email: { equals: cleanEmail, mode: 'insensitive' } },
  })
  if (existingIdentifier) {
    return { success: false, error: 'Cet email est déjà associé à un compte' }
  }

  await prisma.userIdentifier.create({
    data: { userId, email: cleanEmail },
  })

  return { success: true }
}

// ─── Suppression ────────────────────────────────────────────────────────────

export async function removeUserIdentifier(identifierId: string): Promise<IdentifierResult> {
  try {
    await requireRole(['ADMIN'])
  } catch {
    return { success: false, error: 'Non autorisé' }
  }

  const identifier = await prisma.userIdentifier.findUnique({ where: { id: identifierId } })
  if (!identifier) {
    return { success: false, error: 'Identifiant introuvable' }
  }

  await prisma.userIdentifier.delete({ where: { id: identifierId } })

  return { success: true }
}

// ─── Définir comme principal ─────────────────────────────────────────────────

export async function setPrimaryUserIdentifier(identifierId: string): Promise<IdentifierResult> {
  try {
    await requireRole(['ADMIN'])
  } catch {
    return { success: false, error: 'Non autorisé' }
  }

  const identifier = await prisma.userIdentifier.findUnique({ where: { id: identifierId } })
  if (!identifier) {
    return { success: false, error: 'Identifiant introuvable' }
  }

  // Réinitialise tous les isPrimary du user, puis marque celui-ci
  await prisma.$transaction([
    prisma.userIdentifier.updateMany({
      where: { userId: identifier.userId },
      data: { isPrimary: false },
    }),
    prisma.userIdentifier.update({
      where: { id: identifierId },
      data: { isPrimary: true },
    }),
  ])

  return { success: true }
}
