import type { Prisma, TypeDocument } from '@prisma/client'
import { TYPE_DOCUMENT_LABELS } from '@/lib/utils/document'

/**
 * Tri de la liste des documents, côté serveur.
 *
 * Sécurité : la colonne de tri vient de l'URL. Elle n'est jamais passée telle quelle à Prisma :
 * seule la liste fermée ci-dessous est acceptée, toute autre valeur retombe sur le défaut.
 */
export const COLONNES_TRI = ['nom', 'type', 'taille', 'createdAt'] as const
export type ColonneTri = (typeof COLONNES_TRI)[number]
export type SensTri = 'asc' | 'desc'

export const TRI_DEFAUT: { tri: ColonneTri; sens: SensTri } = { tri: 'createdAt', sens: 'desc' }

const estColonne = (v: unknown): v is ColonneTri =>
  typeof v === 'string' && (COLONNES_TRI as readonly string[]).includes(v)

/** Valide les paramètres d'URL : liste fermée, repli sur le défaut sans erreur */
export function lireTri(tri?: string, sens?: string): { tri: ColonneTri; sens: SensTri } {
  const colonne = estColonne(tri) ? tri : TRI_DEFAUT.tri
  if (sens === 'asc' || sens === 'desc') return { tri: colonne, sens }
  // Sens absent ou inconnu : le sens par défaut de la colonne (dates décroissantes, le reste croissant)
  return { tri: colonne, sens: colonne === 'createdAt' ? 'desc' : 'asc' }
}

/** Ordre Prisma pour nom, taille et date ; l'identifiant départage pour que la pagination soit stable */
export function construireOrderBy(
  tri: Exclude<ColonneTri, 'type'>,
  sens: SensTri
): Prisma.DocumentOrderByWithRelationInput[] {
  return [{ [tri]: sens }, { id: 'asc' }]
}

/**
 * Tri du type par libellé affiché (« PV Réception », pas « PV_RECEPTION »).
 * Prisma trierait selon l'ordre de déclaration de l'énumération, d'où ce tri en mémoire sur
 * des lignes minimales (id, type, date). À type égal : le plus récent d'abord, puis l'identifiant.
 */
export function trierParLibelleType<T extends { id: string; type: TypeDocument; createdAt: Date }>(
  lignes: T[],
  sens: SensTri
): T[] {
  const ordre = [...lignes].sort((a, b) => {
    const parLibelle = TYPE_DOCUMENT_LABELS[a.type].localeCompare(TYPE_DOCUMENT_LABELS[b.type], 'fr')
    if (parLibelle !== 0) return parLibelle
    const parDate = b.createdAt.getTime() - a.createdAt.getTime()
    if (parDate !== 0) return parDate
    return a.id.localeCompare(b.id)
  })
  return sens === 'asc' ? ordre : ordre.reverse()
}
