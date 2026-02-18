/**
 * Upload direct vers Supabase Storage depuis le client
 * Utilise XMLHttpRequest pour tracker la progression réelle (vs fetch qui ne supporte pas upload progress)
 */

/**
 * Upload un fichier vers une URL signée Supabase Storage avec suivi de progression
 * @param signedUrl - URL signée retournée par createSignedUploadUrl côté serveur
 * @param file - Fichier à uploader
 * @param onProgress - Callback appelé avec le pourcentage de progression (0-100)
 */
export function uploadWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (percentage: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Suivi de la progression de l'upload
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded / event.total) * 100)
        onProgress(percentage)
      }
    })

    // Upload terminé
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve()
      } else {
        reject(new Error(`Échec upload (HTTP ${xhr.status}): ${xhr.statusText}`))
      }
    })

    // Erreur réseau
    xhr.addEventListener('error', () => {
      reject(new Error('Erreur réseau lors de l\'upload'))
    })

    // Abandon
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload annulé'))
    })

    // PUT vers l'URL signée Supabase Storage
    xhr.open('PUT', signedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}
