'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/utils/permissions'
import type { ActionResult } from '@/types'
import type { SavedFilter } from '@prisma/client'

// ============================================================================
// TYPES
// ============================================================================

export type SavedFilterModule = 'marches' | 'cautions' | 'vehicules'

// ============================================================================
// VALIDATION
// ============================================================================

const createSavedFilterSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(80, 'Nom trop long'),
  module: z.enum(['marches', 'cautions', 'vehicules'] as [string, ...string[]]),
  filtres: z.record(z.string(), z.string()),
})

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Récupère les filtres sauvegardés de l'utilisateur connecté pour un module donné.
 */
export async function getSavedFilters(
  module: SavedFilterModule
): Promise<ActionResult<SavedFilter[]>> {
  try {
    const session = await requireAuth()
    const userId = (session.user as { id?: string } | undefined)?.id
    if (!userId) return { success: false, error: 'Utilisateur non identifié' }

    const filters = await prisma.savedFilter.findMany({
      where: { userId, module },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, data: filters }
  } catch (error) {
    console.error('Erreur getSavedFilters:', error)
    return { success: false, error: 'Impossible de charger les filtres sauvegardés' }
  }
}

/**
 * Crée un nouveau filtre sauvegardé pour l'utilisateur connecté.
 */
export async function createSavedFilter(data: {
  nom: string
  module: SavedFilterModule
  filtres: Record<string, string>
}): Promise<ActionResult<SavedFilter>> {
  try {
    const session = await requireAuth()
    const userId = (session.user as { id?: string } | undefined)?.id
    if (!userId) return { success: false, error: 'Utilisateur non identifié' }

    const validated = createSavedFilterSchema.parse(data)

    const savedFilter = await prisma.savedFilter.create({
      data: {
        userId,
        nom: validated.nom,
        module: validated.module,
        filtres: validated.filtres as Record<string, string>,
      },
    })

    revalidatePath(`/${validated.module}`)

    return { success: true, data: savedFilter }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Validation échouée' }
    }
    console.error('Erreur createSavedFilter:', error)
    return { success: false, error: 'Impossible de sauvegarder le filtre' }
  }
}

/**
 * Supprime un filtre sauvegardé (vérification que l'utilisateur en est propriétaire).
 */
export async function deleteSavedFilter(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth()
    const userId = (session.user as { id?: string } | undefined)?.id
    if (!userId) return { success: false, error: 'Utilisateur non identifié' }

    // Vérification de propriété
    const filter = await prisma.savedFilter.findUnique({ where: { id } })
    if (!filter) return { success: false, error: 'Filtre introuvable' }
    if (filter.userId !== userId) return { success: false, error: 'Accès refusé' }

    await prisma.savedFilter.delete({ where: { id } })

    revalidatePath(`/${filter.module}`)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Erreur deleteSavedFilter:', error)
    return { success: false, error: 'Impossible de supprimer le filtre' }
  }
}
