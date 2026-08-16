'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/permissions'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import type { UserRole } from '@prisma/client'

export type UserApprovalResult =
  | { success: true }
  | { success: false; error: string }

// ─── Approbation ────────────────────────────────────────────────────────────

export async function approveUser(userId: string, role: UserRole): Promise<UserApprovalResult> {
  let session
  try {
    session = await requireRole(['ADMIN'])
  } catch {
    return { success: false, error: 'Non autorisé' }
  }

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) {
    return { success: false, error: 'Utilisateur introuvable' }
  }
  if (target.accountStatus !== 'PENDING') {
    return { success: false, error: 'Ce compte n\'est pas en attente de validation' }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: 'ACTIVE', role },
  })

  await logAction({
    userId:     session.user.id,
    userEmail:  session.user.email,
    action:     AUDIT_ACTION.APPROVE_USER,
    entityType: AUDIT_ENTITY.USER,
    entityId:   userId,
    metadata:   { approvedEmail: target.email, role },
  })

  revalidatePath('/admin/utilisateurs')
  return { success: true }
}

// ─── Rejet ──────────────────────────────────────────────────────────────────

export async function rejectUser(userId: string): Promise<UserApprovalResult> {
  let session
  try {
    session = await requireRole(['ADMIN'])
  } catch {
    return { success: false, error: 'Non autorisé' }
  }

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) {
    return { success: false, error: 'Utilisateur introuvable' }
  }
  if (target.accountStatus !== 'PENDING') {
    return { success: false, error: 'Ce compte n\'est pas en attente de validation' }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: 'REJECTED' },
  })

  await logAction({
    userId:     session.user.id,
    userEmail:  session.user.email,
    action:     AUDIT_ACTION.REJECT_USER,
    entityType: AUDIT_ENTITY.USER,
    entityId:   userId,
    metadata:   { rejectedEmail: target.email },
  })

  revalidatePath('/admin/utilisateurs')
  return { success: true }
}

// ─── Désactivation ──────────────────────────────────────────────────────────

export async function deactivateUser(userId: string): Promise<UserApprovalResult> {
  let session
  try {
    session = await requireRole(['ADMIN'])
  } catch {
    return { success: false, error: 'Non autorisé' }
  }

  if (userId === session.user.id) {
    return { success: false, error: 'Vous ne pouvez pas désactiver votre propre compte' }
  }

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) {
    return { success: false, error: 'Utilisateur introuvable' }
  }
  if (target.accountStatus !== 'ACTIVE') {
    return { success: false, error: 'Ce compte n\'est pas actif' }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: 'DEACTIVATED' },
  })

  await logAction({
    userId:     session.user.id,
    userEmail:  session.user.email,
    action:     AUDIT_ACTION.DEACTIVATE_USER,
    entityType: AUDIT_ENTITY.USER,
    entityId:   userId,
    metadata:   { deactivatedEmail: target.email },
  })

  revalidatePath('/admin/utilisateurs')
  return { success: true }
}

// ─── Réactivation ───────────────────────────────────────────────────────────

export async function reactivateUser(userId: string): Promise<UserApprovalResult> {
  let session
  try {
    session = await requireRole(['ADMIN'])
  } catch {
    return { success: false, error: 'Non autorisé' }
  }

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) {
    return { success: false, error: 'Utilisateur introuvable' }
  }
  if (target.accountStatus !== 'DEACTIVATED') {
    return { success: false, error: 'Ce compte n\'est pas désactivé' }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: 'ACTIVE' },
  })

  await logAction({
    userId:     session.user.id,
    userEmail:  session.user.email,
    action:     AUDIT_ACTION.REACTIVATE_USER,
    entityType: AUDIT_ENTITY.USER,
    entityId:   userId,
    metadata:   { reactivatedEmail: target.email },
  })

  revalidatePath('/admin/utilisateurs')
  return { success: true }
}
