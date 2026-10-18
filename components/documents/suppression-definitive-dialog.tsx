'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteDocument, getSuppressionInfo } from '@/lib/actions/documents'
import { toast } from '@/lib/utils/toast'

interface SuppressionDefinitiveDialogProps {
  /** Document à supprimer ; null = dialogue fermé. */
  documentId: string | null
  onClose: () => void
  /** Appelé après une suppression réussie. */
  onSupprime: (documentId: string) => void
}

/**
 * Confirmation de suppression DÉFINITIVE d'un document (fichier effacé du stockage,
 * versions comprises). Partagé par la liste, la page détail et la fiche marché.
 */
export function SuppressionDefinitiveDialog({
  documentId,
  onClose,
  onSupprime,
}: SuppressionDefinitiveDialogProps) {
  const [nbVersions, setNbVersions] = useState<number | null>(null)
  const [erreurInfo, setErreurInfo] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    setNbVersions(null)
    setErreurInfo(null)
    setErreur(null)
    if (!documentId) return
    let annule = false
    getSuppressionInfo(documentId)
      .then((r) => {
        if (annule) return
        if (r.success) setNbVersions(r.data.nbVersions)
        else setErreurInfo(r.error)
      })
      .catch(() => {
        if (!annule) setErreurInfo('Impossible de vérifier les versions du document.')
      })
    return () => {
      annule = true
    }
  }, [documentId])

  const confirmer = async () => {
    if (!documentId) return
    setEnCours(true)
    setErreur(null)
    try {
      const r = await deleteDocument(documentId)
      if (r.success) {
        toast.success(
          r.data.nbDocuments > 1
            ? `${r.data.nbDocuments} documents supprimés définitivement`
            : 'Document supprimé définitivement'
        )
        onSupprime(documentId)
        onClose()
      } else {
        setErreur(r.error)
        toast.error(r.error)
      }
    } catch {
      const message = 'Erreur lors de la suppression : rien n’a été confirmé. Réessayez.'
      setErreur(message)
      toast.error(message)
    } finally {
      setEnCours(false)
    }
  }

  const verification = nbVersions === null && !erreurInfo

  return (
    <AlertDialog open={!!documentId} onOpenChange={(ouvert) => !ouvert && !enCours && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer définitivement ce document ?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Le fichier sera effacé du stockage. <strong>Cette action est définitive</strong> :
                il n’existe aucune sauvegarde et le fichier ne pourra pas être récupéré.
              </p>
              {nbVersions !== null && nbVersions > 0 && (
                <p className="font-medium text-destructive">
                  {nbVersions === 1
                    ? 'Sa version associée sera également supprimée définitivement.'
                    : `Ses ${nbVersions} autres versions seront également supprimées définitivement.`}
                </p>
              )}
              {verification && <p>Vérification des versions…</p>}
              {erreurInfo && <p className="text-destructive">{erreurInfo}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {erreur && (
          <p role="alert" className="text-sm text-destructive">
            {erreur}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enCours}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              void confirmer()
            }}
            disabled={enCours || verification || !!erreurInfo}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {enCours ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Suppression…
              </>
            ) : (
              'Supprimer définitivement'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
