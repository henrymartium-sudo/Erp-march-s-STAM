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

  // PENDING/REJECTED/DEACTIVATED explicites uniquement — une session JWT émise
  // avant l'ajout de ce champ n'a pas accountStatus dans son token ; la traiter
  // comme bloquée déconnecterait tous les utilisateurs déjà connectés au
  // déploiement de cette fonctionnalité, alors qu'ils étaient légitimement actifs.
  //
  // Limite connue : un token déjà émis pour un compte ACTIVE n'est jamais
  // resynchronisé avec la DB en cours de session (le callback jwt() de
  // auth.config.ts ne relit accountStatus qu'au moment du login, cf. le bloc
  // `if (user && account?.provider === ...)`). Désactiver un utilisateur ne
  // met donc PAS fin à une session déjà ouverte — elle expire naturellement.
  // Ce garde bloque en revanche toute NOUVELLE tentative de connexion.
  if (
    session.user.accountStatus === 'PENDING' ||
    session.user.accountStatus === 'REJECTED' ||
    session.user.accountStatus === 'DEACTIVATED'
  ) {
    throw new Error('Compte en attente de validation ou désactivé')
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
 * Détermine si un rôle peut écrire (créer, modifier, supprimer).
 * Synchrone — à utiliser dans les composants/pages serveur.
 */
export function canWrite(role?: string | null): boolean {
  return role === 'ADMIN' || role === 'AVANCE'
}

/**
 * Détermine si un rôle est EXPLOITATION (accès restreint aux marchés EN_EXECUTION).
 */
export function isExploitation(role?: string | null): boolean {
  return role === 'EXPLOITATION'
}

/**
 * Statut de marché forcé pour un rôle en lecture (EXPLOITATION restreint à EN_EXECUTION).
 * Source unique de vérité : à utiliser dans toute fonction qui lit des marchés
 * (liste, détail, export) pour que la restriction s'applique partout.
 */
export function getMarcheStatutRestriction(role?: string | null): 'EN_EXECUTION' | undefined {
  return isExploitation(role) ? 'EN_EXECUTION' : undefined
}

/**
 * Détermine si un rôle peut exporter des données (PDF / Excel).
 * ADMIN, AVANCE et VISITEUR peuvent exporter tous les modules.
 * EXPLOITATION peut uniquement exporter les véhicules (géré au niveau de la page).
 */
export function canExport(role?: string | null): boolean {
  return role === 'ADMIN' || role === 'AVANCE' || role === 'VISITEUR'
}

/**
 * Détermine si un rôle peut créer/modifier des interventions SAV.
 * ADMIN, AVANCE et EXPLOITATION peuvent écrire dans le SAV.
 */
export function canWriteSAV(role?: string | null): boolean {
  return role === 'ADMIN' || role === 'AVANCE' || role === 'EXPLOITATION'
}

/**
 * Détermine si un rôle peut ajouter un commentaire contractuel sur une intervention.
 * Réservé à ADMIN et AVANCE.
 */
export function canWriteCommentaireContractuel(role?: string | null): boolean {
  return role === 'ADMIN' || role === 'AVANCE'
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
