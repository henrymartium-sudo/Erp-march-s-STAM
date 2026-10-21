import type { Prisma } from '@prisma/client'

export interface FiltresDocuments {
  type?: Prisma.DocumentWhereInput['type']
  phase?: Prisma.DocumentWhereInput['phase']
  marcheId?: string
  search?: string
  dateDebut?: Date
  dateFin?: Date
}

/**
 * Constructeur de filtres partagé par la liste et les exports de documents :
 * les deux voient exactement le même jeu de lignes.
 */
export function construireWhereDocuments(filtres: FiltresDocuments): Prisma.DocumentWhereInput {
  const { type, phase, marcheId, search, dateDebut, dateFin } = filtres

  const where: Prisma.DocumentWhereInput = {
    deleted: false, // Exclure les documents supprimés
  }

  if (type) where.type = type
  if (phase) where.phase = phase
  if (marcheId) where.marcheId = marcheId

  // Recherche texte (nom, description, nom original)
  if (search) {
    where.OR = [
      { nom: { contains: search, mode: 'insensitive' } },
      { nomOriginal: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Filtrage par période
  if (dateDebut || dateFin) {
    const createdAt: Prisma.DateTimeFilter = {}
    if (dateDebut) createdAt.gte = dateDebut
    if (dateFin) createdAt.lte = dateFin
    where.createdAt = createdAt
  }

  return where
}

/** Octets vers Ko, arrondi à une décimale. */
export function tailleEnKo(octets: number): number {
  return Math.round((octets / 1024) * 10) / 10
}

/** Message affiché quand l'export est plafonné ; null si tout est exporté. */
export function noteTroncature(total: number, exportees: number): string | null {
  if (total <= exportees) return null
  return `Export limité aux ${exportees} premiers documents sur ${total}. Affinez les filtres pour tout exporter.`
}

/** Texte nettoyé, ou « n.d. » s'il est vide. */
export function valeurOuND(valeur: string | null | undefined): string {
  const nettoye = (valeur ?? '').trim()
  return nettoye === '' ? 'n.d.' : nettoye
}
