'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layers, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { apercuRetraitLot, retirerLotDuMarche, type ApercuRetraitLot } from '@/lib/actions/marche-lots'
import { formatMontant } from '@/lib/utils/format'
import { toast } from '@/lib/utils/toast'

export interface LotCouvert {
  id: string
  numero: number
  intitule: string
  montantPropose: number | null
}

interface MarcheLotsSectionProps {
  lots: LotCouvert[]
  canWrite: boolean
}

export function MarcheLotsSection({ lots, canWrite }: MarcheLotsSectionProps) {
  const router = useRouter()
  const [lotCible, setLotCible] = useState<LotCouvert | null>(null)
  const [apercu, setApercu] = useState<ApercuRetraitLot | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [montantSaisi, setMontantSaisi] = useState('')

  if (lots.length === 0) return null

  // Un marché à un seul lot ne peut pas en perdre : il se supprime (le serveur refuse aussi ce cas).
  const retraitProposable = canWrite && lots.length > 1

  async function ouvrir(lot: LotCouvert) {
    setLotCible(lot)
    setApercu(null)
    setRefus(null)
    setChargement(true)
    const res = await apercuRetraitLot(lot.id)
    setChargement(false)
    if (res.success) {
      setApercu(res.data)
      setMontantSaisi(String(res.data.montant))
    } else {
      setRefus(res.error ?? 'Retrait impossible.')
    }
  }

  function fermer() {
    if (envoi) return
    setLotCible(null)
  }

  const montant = montantSaisi.trim() === '' ? NaN : Number(montantSaisi)
  const montantValide = Number.isFinite(montant) && montant >= 0

  async function confirmer() {
    if (!lotCible || !apercu || envoi || !montantValide) return
    setEnvoi(true)
    const res = await retirerLotDuMarche({ lotId: lotCible.id, montant })
    setEnvoi(false)
    if (res.success) {
      toast.success('Lot retiré du marché')
      setLotCible(null)
      router.refresh()
      return
    }
    toast.error(res.error ?? 'Erreur lors du retrait du lot')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-muted-foreground" />
          Lots couverts ({lots.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {lots.map((lot) => (
            <li key={lot.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3 text-sm">
              <div className="min-w-0 flex-1">
                <span className="font-medium">Lot {lot.numero}</span>
                <span className="block text-muted-foreground break-words">{lot.intitule}</span>
                <span className="block">{lot.montantPropose != null ? formatMontant(lot.montantPropose) : 'Montant non renseigné'}</span>
              </div>
              {retraitProposable && (
                <Button variant="outline" size="sm" onClick={() => ouvrir(lot)}>
                  Retirer ce lot du marché
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog open={lotCible !== null} onOpenChange={(v) => { if (!v) fermer() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Retirer le lot {lotCible?.numero} du marché</DialogTitle>
            <DialogDescription>
              Le lot redevient libre et pourra être repris dans un autre marché. Le numéro du marché ne change pas.
            </DialogDescription>
          </DialogHeader>

          {chargement && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calcul en cours…
            </div>
          )}

          {refus && <p role="alert" className="text-sm text-destructive">{refus}</p>}

          {apercu && (
            <div className="space-y-3 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="montant-marche-apres-retrait">Montant du marché après retrait</Label>
                <Input
                  id="montant-marche-apres-retrait"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={montantSaisi}
                  onChange={(e) => setMontantSaisi(e.target.value)}
                  disabled={envoi}
                />
                <p className="text-xs text-muted-foreground">
                  Proposé : somme des lots restants ({formatMontant(apercu.montant)}). Modifiable.
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Objet du marché : </span>
                <span className="break-words">{apercu.objet}</span>
                {apercu.objetConserve && (
                  <p className="text-xs text-muted-foreground">Objet modifié à la main : conservé tel quel.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={fermer} disabled={envoi}>
              Annuler
            </Button>
            <Button onClick={confirmer} disabled={!apercu || envoi || !montantValide}>
              {envoi && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Retirer le lot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
