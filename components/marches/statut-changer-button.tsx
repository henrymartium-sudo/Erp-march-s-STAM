'use client'

import { useState, useTransition } from 'react'
import { StatutMarche } from '@prisma/client'
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
import { Label } from '@/components/ui/label'
import { StatutBadge } from './statut-badge'
import { StatutWorkflowStepper } from './statut-workflow-stepper'
import { changerStatutMarche } from '@/lib/actions/statuts'
import { getAvailableStatuts, COMMENTAIRE_OBLIGATOIRE } from '@/lib/utils/workflow-statuts'
import { STATUT_LABELS } from '@/lib/utils/statut'
import { toast } from '@/lib/utils/toast'

interface StatutChangerButtonProps {
  marcheId: string
  currentStatut: StatutMarche
  onStatutChanged?: (newStatut: StatutMarche) => void
}

export function StatutChangerButton({
  marcheId,
  currentStatut,
  onStatutChanged,
}: StatutChangerButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedStatut, setSelectedStatut] = useState<StatutMarche | ''>('')
  const [commentaire, setCommentaire] = useState('')
  const [isPending, startTransition] = useTransition()

  const availableStatuts = getAvailableStatuts(currentStatut).filter(
    (s) => s !== currentStatut
  )

  const needsComment =
    selectedStatut !== '' && COMMENTAIRE_OBLIGATOIRE.includes(selectedStatut as StatutMarche)

  const commentaireLabel =
    selectedStatut === 'RESILIE' ? 'Motif de résiliation *' : 'Commentaire *'

  function handleClose() {
    setOpen(false)
    setSelectedStatut('')
    setCommentaire('')
  }

  function handleSubmit() {
    if (!selectedStatut) return

    if (needsComment && !commentaire.trim()) {
      toast.error('Un commentaire est obligatoire pour cette transition.')
      return
    }

    startTransition(async () => {
      const result = await changerStatutMarche({
        marcheId,
        newStatut: selectedStatut,
        commentaire: commentaire.trim() || undefined,
      })

      if (result.success) {
        toast.success(`Statut changé : ${STATUT_LABELS[result.data.statut]}`)
        handleClose()
        onStatutChanged?.(result.data.statut)
      } else {
        toast.error(result.error)
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
              Sélectionnez le nouveau statut du marché.
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-5">
            {/* Statut actuel */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Statut actuel</p>
              <StatutBadge statut={currentStatut} />
            </div>

            {/* Stepper visuel */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Workflow</p>
              <StatutWorkflowStepper
                currentStatut={currentStatut}
                selectedStatut={selectedStatut || undefined}
              />
            </div>

            {/* Select nouveau statut */}
            <div className="space-y-1.5">
              <Label htmlFor="new-statut">Nouveau statut *</Label>
              <Select
                value={selectedStatut}
                onValueChange={(v) => setSelectedStatut(v as StatutMarche)}
              >
                <SelectTrigger id="new-statut">
                  <SelectValue placeholder="Choisir un statut..." />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuts.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Commentaire conditionnel */}
            {selectedStatut && (
              <div className="space-y-1.5">
                <Label htmlFor="commentaire">
                  {needsComment ? commentaireLabel : 'Commentaire (optionnel)'}
                </Label>
                <Textarea
                  id="commentaire"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder={
                    needsComment
                      ? 'Expliquez la raison de ce changement...'
                      : 'Note sur ce changement de statut (facultatif)'
                  }
                  rows={3}
                />
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
