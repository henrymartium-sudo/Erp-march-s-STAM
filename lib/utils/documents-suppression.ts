import { z } from 'zod'

/**
 * Suppression DÉFINITIVE d'un document : logique pure, sans accès direct à la base
 * ni au stockage (injectés), pour pouvoir tester l'ordre des opérations.
 *
 * Règles :
 * - le fichier est effacé du stockage AVANT que la ligne ne soit marquée supprimée ;
 * - un échec d'effacement laisse tout intact ;
 * - supprimer un document supprime aussi ses versions (descendants) ;
 * - un fichier encore utilisé par une autre ligne vivante n'est jamais effacé ;
 * - les chemins viennent de la base, jamais de l'entrée utilisateur.
 */

export interface LigneDocument {
  id: string
  storagePath: string
  documentParentId: string | null
  deleted: boolean
  marcheId: string | null
}

export interface InfoTrace {
  racineId: string
  ids: string[]
  /** false si les fichiers sont effacés mais le marquage en base a échoué */
  complet: boolean
}

export interface DepsSuppression {
  trouver(id: string): Promise<LigneDocument | null>
  /** Versions non supprimées dont le parent est dans `parents`. */
  enfantsVivants(parents: string[]): Promise<LigneDocument[]>
  /** Parmi `chemins`, ceux portés par une ligne non supprimée hors de `ids`. */
  cheminsUtilisesAilleurs(chemins: string[], ids: string[]): Promise<string[]>
  effacerFichiers(chemins: string[]): Promise<{ error: string | null }>
  marquerSupprimes(ids: string[]): Promise<void>
  tracer(info: InfoTrace): Promise<void>
}

export type ResultatSuppression =
  | { success: true; data: { nbDocuments: number; marcheIds: string[] } }
  | { success: false; error: string }

const idSchema = z.string().min(1).max(64)

/** Le document et tous ses descendants non supprimés (racine en premier). */
export async function collecterPortee(
  deps: Pick<DepsSuppression, 'enfantsVivants'>,
  racine: LigneDocument
): Promise<LigneDocument[]> {
  const portee: LigneDocument[] = [racine]
  const vus = new Set([racine.id])
  let frontiere = [racine.id]
  while (frontiere.length > 0) {
    const enfants = (await deps.enfantsVivants(frontiere)).filter((e) => !vus.has(e.id))
    enfants.forEach((e) => vus.add(e.id))
    portee.push(...enfants)
    frontiere = enfants.map((e) => e.id)
  }
  return portee
}

export async function supprimerDefinitivement(
  deps: DepsSuppression,
  id: unknown
): Promise<ResultatSuppression> {
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { success: false, error: 'Identifiant de document invalide' }

  const racine = await deps.trouver(parsed.data)
  if (!racine) return { success: false, error: 'Document introuvable' }
  if (racine.deleted) return { success: false, error: 'Ce document est déjà supprimé' }

  const portee = await collecterPortee(deps, racine)
  const ids = portee.map((l) => l.id)

  const protegesParAilleurs = new Set(
    await deps.cheminsUtilisesAilleurs(portee.map((l) => l.storagePath), ids)
  )
  const chemins = [...new Set(portee.map((l) => l.storagePath))].filter(
    (c) => !protegesParAilleurs.has(c)
  )

  if (chemins.length > 0) {
    const effacement = await deps.effacerFichiers(chemins)
    if (effacement.error) {
      return {
        success: false,
        error:
          'Le fichier n’a pas pu être effacé du stockage : rien n’a été supprimé. Réessayez dans un instant.',
      }
    }
  }

  try {
    await deps.marquerSupprimes(ids)
  } catch {
    await deps.tracer({ racineId: racine.id, ids, complet: false })
    return {
      success: false,
      error:
        'Les fichiers ont été effacés mais la mise à jour a échoué. Réessayez : l’opération peut être relancée sans risque.',
    }
  }

  await deps.tracer({ racineId: racine.id, ids, complet: true })

  const marcheIds = [...new Set(portee.map((l) => l.marcheId).filter((m): m is string => !!m))]
  return { success: true, data: { nbDocuments: ids.length, marcheIds } }
}
