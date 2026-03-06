'use client'

import { useState, useTransition } from 'react'
import { StatutOpportunite } from '@prisma/client'
import { ArrowLeftRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  getAvailableStatutsOpportunite,
  COMMENTAIRE_OBLIGATOIRE_OPPORTUNITE,
} from '@/lib/utils/workflow-statuts-opportunite'
import {
  STATUT_OPPORTUNITE_LABELS,
  STATUT_OPPORTUNITE_COLORS,
} from '@/lib/validations/opportunite'
import { changerStatutOpportunite } from '@/lib/actions/statuts-opportunite'
import { toast } from '@/lib/utils/toast'

interface StatutChangerOpportuniteButtonProps {
  opportuniteId: string
  currentStatut: StatutOpportunite
  onStatutChanged?: (newStatut: StatutOpportunite) => void
}

export function StatutChangerOpportuniteButton({
  opportuniteId,
  currentStatut,
  onStatutChanged,
}: StatutChangerOpportuniteButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedStatut, setSelectedStatut] = useState<StatutOpportunite | ''>('')
  const [commentaire, setCommentaire] = useState('')
  const [motifPerte, setMotifPerte] = useState('')
  const [concurrentGagnant, setConcurrentGagnant] = useState('')
  const [montantConcurrent, setMontantConcurrent] = useState('')
  const [isPending, startTransition] = useTransition()

  const availableStatuts = getAvailableStatutsOpportunite(currentStatut).filter(
    (s) => s !== currentStatut
  )

  const needsComment =
    selectedStatut !== '' &&
    COMMENTAIRE_OBLIGATOIRE_OPPORTUNITE.includes(selectedStatut as StatutOpportunite)

  const isPerdue = selectedStatut === 'PERDUE'

  function handleClose() {
    setOpen(false)
    setSelectedStatut('')
    setCommentaire('')
    setMotifPerte('')
    setConcurrentGagnant('')
    setMontantConcurrent('')
  }

  function handleSubmit() {
    if (!selectedStatut) return

    if (needsComment && !commentaire.trim()) {
      toast.error('Un commentaire est obligatoire pour cette transition.')
      return
    }

    startTransition(async () => {
      const result = await changerStatutOpportunite({
        opportuniteId,
        newStatut: selectedStatut,
        commentaire: commentaire.trim() || undefined,
        motifPerte: isPerdue ? motifPerte.trim() || null : null,
        concurrentGagnant: isPerdue ? concurrentGagnant.trim() || null : null,
        montantOffreConcurrent: isPerdue && montantConcurrent
          ? parseFloat(montantConcurrent)
          : null,
      })

      if (result.success) {
        toast.success(`Statut changé : ${STATUT_OPPORTUNITE_LABELS[result.data.statut]}`)
        handleClose()
        onStatutChanged?.(result.data.statut)
      } else {
        toast.error(result.error ?? 'Erreur lors du changement de statut.')
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={availableStatuts.length === 0}
      >
        <ArrowLeftRight className="h-4 w-4 mr-1.5" />
        Statut
      </Button>

      <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Changer le statut</SheetTitle>
            <SheetDescription>
              Sélectionnez le nouveau statut de l&apos;opportunité.
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-5">
            {/* Statut actuel */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Statut actuel</p>
              <Badge variant={STATUT_OPPORTUNITE_COLORS[currentStatut] as 'success' | 'warning' | 'danger' | 'info' | 'muted'}>
                {STATUT_OPPORTUNITE_LABELS[currentStatut]}
              </Badge>
            </div>

            {/* Select nouveau statut */}
            <div className="space-y-1.5">
              <Label htmlFor="new-statut">Nouveau statut *</Label>
              <Select
                value={selectedStatut}
                onValueChange={(v) => setSelectedStatut(v as StatutOpportunite)}
              >
                <SelectTrigger id="new-statut">
                  <SelectValue placeholder="Choisir un statut..." />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuts.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUT_OPPORTUNITE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Commentaire */}
            {selectedStatut && (
              <div className="space-y-1.5">
                <Label htmlFor="commentaire">
                  {needsComment ? 'Commentaire *' : 'Commentaire (optionnel)'}
                </Label>
                <Textarea
                  id="commentaire"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder={
                    needsComment
                      ? 'Expliquez la raison de ce changement...'
                      : 'Note sur ce changement (facultatif)'
                  }
                  rows={3}
                />
              </div>
            )}

            {/* Champs spécifiques PERDUE */}
            {isPerdue && (
              <div className="space-y-3 border rounded-md p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Informations sur la perte (optionnel)
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="motif-perte">Motif de la perte</Label>
                  <Textarea
                    id="motif-perte"
                    value={motifPerte}
                    onChange={(e) => setMotifPerte(e.target.value)}
                    placeholder="Prix trop élevé, délai non respecté..."
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="concurrent">Concurrent retenu</Label>
                  <Input
                    id="concurrent"
                    value={concurrentGagnant}
                    onChange={(e) => setConcurrentGagnant(e.target.value)}
                    placeholder="Nom de l'entreprise gagnante"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="montant-concurrent">Montant de l&apos;offre concurrente (XOF)</Label>
                  <Input
                    id="montant-concurrent"
                    type="number"
                    value={montantConcurrent}
                    onChange={(e) => setMontantConcurrent(e.target.value)}
                    placeholder="45000000"
                  />
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isPending}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedStatut || isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Confirmer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
