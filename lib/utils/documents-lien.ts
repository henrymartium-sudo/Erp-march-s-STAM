import { toast } from '@/lib/utils/toast'

/** Lien absolu d'un document : origine sans barre finale, puis /documents/<id> */
export function lienAbsoluDocument(origine: string, id: string): string {
  return `${origine.replace(/\/$/, '')}/documents/${id}`
}

/**
 * Copie un texte dans le presse-papiers.
 * `presse` absent = contexte non sécurisé (navigator.clipboard indisponible).
 */
export async function copierTexte(
  texte: string,
  presse?: { writeText: (t: string) => Promise<void> }
): Promise<'copie' | 'refuse'> {
  if (!presse) return 'refuse'
  try {
    await presse.writeText(texte)
    return 'copie'
  } catch {
    return 'refuse'
  }
}

/** Glue navigateur : copie le lien du document et signale le résultat */
export async function copierLienDocument(id: string): Promise<void> {
  const url = lienAbsoluDocument(window.location.origin, id)
  const resultat = await copierTexte(url, navigator.clipboard)
  if (resultat === 'copie') {
    toast.success('Lien copié')
  } else {
    toast.warning(`Copie impossible. Lien du document : ${url}`)
  }
}
