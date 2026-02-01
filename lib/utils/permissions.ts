import { auth } from '@/lib/auth/auth.config'

/**
 * Vérifie que l'utilisateur est authentifié
 * @throws Error si l'utilisateur n'est pas authentifié
 */
export async function requireAuth() {
  const session = await auth()

  if (!session || !session.user) {
    throw new Error('Non authentifié')
  }

  return session
}

/**
 * Vérifie que l'utilisateur a l'un des rôles requis
 * @param roles - Liste des rôles autorisés
 * @throws Error si l'utilisateur n'a pas le rôle requis
 */
export async function requireRole(roles: string[]) {
  const session = await requireAuth()

  if (!roles.includes(session.user.role)) {
    throw new Error(`Non autorisé. Rôles requis: ${roles.join(', ')}`)
  }

  return session
}

/**
 * Vérifie si l'utilisateur a le rôle ADMIN
 */
export async function requireAdmin() {
  return requireRole(['ADMIN'])
}

/**
 * Vérifie si l'utilisateur peut créer/modifier des marchés
 * (ADMIN ou AVANCE)
 */
export async function requireMarcheWrite() {
  return requireRole(['ADMIN', 'AVANCE'])
}

/**
 * Vérifie si l'utilisateur peut supprimer des données
 * (ADMIN ou AVANCE uniquement)
 */
export async function requireDelete() {
  return requireRole(['ADMIN', 'AVANCE'])
}

/**
 * Vérifie si l'utilisateur a au moins un accès en lecture
 * (tous les rôles sauf si non authentifié)
 */
export async function requireRead() {
  return requireAuth()
}
