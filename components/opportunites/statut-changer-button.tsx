'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
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
import { STATUTS_PILOTES_PAR_LOTS } from '@/lib/utils/lots'
import {
  STATUT_OPPORTUNITE_LABELS,
  STATUT_OPPORTUNITE_COLORS,
} from '@/lib/validations/opportunite'
import { changerStatutOpportunite } from '@/lib/actions/statuts-opportunite'
import { toast } from '@/lib/utils/toast'

interface StatutChangerOpportuniteButtonProps {
  opportuniteId: string
  currentStatut: StatutOpportunite
  nbLots: number
  onStatutChanged?: (newStatut: StatutOpportunite) => void
}

export function StatutChangerOpportuniteButton({
  opportuniteId,
  currentStatut,
  nbLots,
  onStatutChanged,
}: StatutChangerOpportuniteButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedStatut, setSelectedStatut] = useState<StatutOpportunite | ''>('')
  const [commentaire, setCommentaire] = useState('')
  // MOD-6 — période de validité offre
  const [periodeValiditeDebut, setPeriodeValiditeDebut] = useState('')
  const [periodeValiditeFin, setPeriodeValiditeFin] = useState('')
  // MOD-7 — échéance attribution provisoire
  const [echeanceAttributionProv, setEcheanceAttributionProv] = useState('')
  const [isPending, startTransition] = useTransition()

  const transitions = getAvailableStatutsOpportunite(currentStatut).filter(
    (s) => s !== currentStatut
  )
  // Avec des lots, l'attribution et son résultat se déduisent des résultats saisis par lot :
  // ces statuts ne se choisissent plus ici, un lien renvoie vers la saisie par lot.
  const availableStatuts =
    nbLots > 0 ? transitions.filter((s) => !STATUTS_PILOTES_PAR_LOTS.includes(s)) : transitions
  const lienResultatsParLot = availableStatuts.length < transitions.length
  const peutChoisirStatut = availableStatuts.length > 0

  const needsComment =
    selectedStatut !== '' &&
    COMMENTAIRE_OBLIGATOIRE_OPPORTUNITE.includes(selectedStatut as StatutOpportunite)

  const isOffreSoumise = selectedStatut === 'OFFRE_SOUMISE'
  const isAttributionProv = selectedStatut === 'ATTRIBUE_PROVISOIREMENT'

  function handleClose() {
    setOpen(false)
    setSelectedStatut('')
    setCommentaire('')
    setPeriodeValiditeDebut('')
    setPeriodeValiditeFin('')
    setEcheanceAttributionProv('')
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
        periodeValiditeDebut: isOffreSoumise && periodeValiditeDebut
          ? periodeValiditeDebut
          : null,
        periodeValiditeFin: isOffreSoumise && periodeValiditeFin
          ? periodeValiditeFin
          : null,
        echeanceAttributionProv: isAttributionProv && echeanceAttributionProv
          ? echeanceAttributionProv
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
        disabled={!peutChoisirStatut && !lienResultatsParLot}
      >
        <ArrowLeftRight className="h-4 w-4 mr-1.5" />
        Statut
      </Button>

      <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Changer le statut</SheetTitle>
            <SheetDescription>
              {peutChoisirStatut
                ? "Sélectionnez le nouveau statut de l'opportunité."
                : 'Après attribution, le statut se déduit des résultats saisis sur chaque lot.'}
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
            {peutChoisirStatut && (
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
            )}

            {/* Statuts pilotés par les lots : renvoi vers la saisie des résultats par lot */}
            {lienResultatsParLot && (
              <Link
                href={`/opportunites/${opportuniteId}?onglet=lots`}
                onClick={handleClose}
                className="inline-block text-sm font-medium text-primary hover:underline"
              >
                Saisir les résultats par lot
              </Link>
            )}

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

            {/* Champs spécifiques OFFRE_SOUMISE (MOD-6) */}
            {isOffreSoumise && (
              <div className="space-y-3 border rounded-md p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Période de validité de l&apos;offre (optionnel)
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="validite-debut">Début de validité</Label>
                  <Input
                    id="validite-debut"
                    type="date"
                    value={periodeValiditeDebut}
                    onChange={(e) => setPeriodeValiditeDebut(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="validite-fin">Fin de validité</Label>
                  <Input
                    id="validite-fin"
                    type="date"
                    value={periodeValiditeFin}
                    onChange={(e) => setPeriodeValiditeFin(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Champ spécifique ATTRIBUE_PROVISOIREMENT (MOD-7) */}
            {isAttributionProv && (
              <div className="space-y-3 border rounded-md p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Échéance attribution provisoire (optionnel)
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="echeance-attribution">Date limite d&apos;attribution</Label>
                  <Input
                    id="echeance-attribution"
                    type="date"
                    value={echeanceAttributionProv}
                    onChange={(e) => setEcheanceAttributionProv(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isPending}>
              Annuler
            </Button>
            {peutChoisirStatut && (
              <Button
                onClick={handleSubmit}
                disabled={!selectedStatut || isPending}
              >
                {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Confirmer
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
