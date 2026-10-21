'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FilePlus2, Loader2 } from 'lucide-react'
import type { Document } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getUploadUrl, saveDocumentVersionMetadata } from '@/lib/actions/documents'
import { uploadWithProgress } from '@/lib/supabase/upload-client'
import { ALLOWED_FILE_EXTENSIONS, validateFile } from '@/lib/validations/document'
import { toast } from '@/lib/utils/toast'

interface DocumentNouvelleVersionProps {
  document: Document
}

/**
 * Bouton + fenêtre « Nouvelle version » de la page détail.
 * Envoi direct du fichier vers le stockage (comme « Nouveau document »), puis
 * enregistrement de la version côté serveur.
 */
export function DocumentNouvelleVersion({ document }: DocumentNouvelleVersionProps) {
  const router = useRouter()
  const [ouvert, setOuvert] = useState(false)
  const [fichier, setFichier] = useState<File | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [progression, setProgression] = useState(0)

  const changerOuverture = (valeur: boolean) => {
    if (enCours) return
    setOuvert(valeur)
    if (!valeur) {
      setFichier(null)
      setProgression(0)
    }
  }

  const ajouter = async () => {
    if (!fichier || enCours) return

    const validation = validateFile(fichier)
    if (!validation.success) {
      toast.error(validation.error ?? 'Fichier invalide')
      return
    }

    setEnCours(true)
    setProgression(0)
    try {
      const urlResult = await getUploadUrl({
        type: document.type,
        fileName: fichier.name,
        marcheId: document.marcheId ?? undefined,
      })
      if (!urlResult.success) {
        toast.error(urlResult.error)
        return
      }
      const { signedUrl, storagePath } = urlResult.data

      await uploadWithProgress(signedUrl, fichier, setProgression)

      const meta = await saveDocumentVersionMetadata({
        parentId: document.id,
        storagePath,
        nomOriginal: fichier.name,
        taille: fichier.size,
        mimeType: fichier.type,
      })
      if (!meta.success) {
        toast.error(meta.error)
        return
      }

      toast.success('Nouvelle version ajoutée')
      setOuvert(false)
      setFichier(null)
      router.push('/documents/' + meta.data.id)
    } catch (error) {
      console.error('Nouvelle version error:', error)
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : 'Erreur lors de l’envoi de la nouvelle version'
      )
    } finally {
      setEnCours(false)
      setProgression(0)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="gap-2 min-h-11"
        onClick={() => setOuvert(true)}
      >
        <FilePlus2 className="h-4 w-4" />
        Nouvelle version
      </Button>

      <Dialog open={ouvert} onOpenChange={changerOuverture}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle version</DialogTitle>
            <DialogDescription>
              Ajouter une nouvelle version de « {document.nom} » ? L’ancienne version reste dans
              l’historique.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="nouvelle-version-fichier">Fichier</Label>
            <Input
              id="nouvelle-version-fichier"
              type="file"
              accept={ALLOWED_FILE_EXTENSIONS.map((e) => `.${e}`).join(',')}
              disabled={enCours}
              className="min-h-11"
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            />
            {enCours && (
              <p role="status" className="text-sm text-muted-foreground">
                Envoi en cours : {progression} %
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="min-h-11"
              disabled={enCours}
              onClick={() => changerOuverture(false)}
            >
              Annuler
            </Button>
            <Button className="min-h-11 gap-2" disabled={!fichier || enCours} onClick={ajouter}>
              {enCours && <Loader2 className="h-4 w-4 animate-spin" />}
              Ajouter la version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
