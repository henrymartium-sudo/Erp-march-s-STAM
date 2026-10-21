/**
 * Un bouton « Versions » n'a de sens que s'il existe au moins une autre version
 * que le document courant. `total` est le nombre de versions de la chaîne, parent
 * compris (tel que renvoyé par `getDocumentVersions`).
 */
export function doitAfficherVersions(total: number): boolean {
  return total > 1
}

/** Racine d'une chaîne de versions : le parent du document, ou le document lui-même. */
export function racineDeChaine(doc: { id: string; documentParentId: string | null }): string {
  return doc.documentParentId ?? doc.id
}

/**
 * Numéro de la prochaine version. `numeros` doit contenir TOUTES les lignes de la
 * chaîne, supprimées comprises : un numéro n'est jamais réutilisé.
 */
export function prochainNumeroVersion(numeros: number[]): number {
  return numeros.length === 0 ? 2 : Math.max(...numeros) + 1
}

/**
 * Un chemin de stockage envoyé par le client n'est accepté que s'il reste dans le
 * dossier attendu pour ce type et ce marché (`generateStoragePath`).
 */
export function cheminStockageValide(
  storagePath: string,
  type: string,
  marcheId: string | null
): boolean {
  if (storagePath.includes('..') || storagePath.includes('\\')) return false
  const prefixe = `${type.toLowerCase()}/${marcheId ?? 'general'}/`
  return storagePath.startsWith(prefixe) && storagePath.length > prefixe.length
}
