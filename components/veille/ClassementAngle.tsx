'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LignePerte } from '@/components/veille/LignePerte'
import { MIN_CAS_ECART } from '@/lib/pilotage/calculs'
import type { LigneClassement } from '@/lib/veille/calculs'
import { formaterEcart } from '@/lib/veille/affichage'
import { formatMontant } from '@/lib/utils/format'

interface Props {
  lignes: LigneClassement[]
  /** intitulé des valeurs liées : « Autorités concernées » ou « Concurrents » */
  libelleAssocies: string
  vide: string
}

export function ClassementAngle({ lignes, libelleAssocies, vide }: Props) {
  if (lignes.length === 0) {
    return <p role="status" className="text-sm text-muted-foreground">{vide}</p>
  }
  return (
    <ul className="space-y-3">
      {lignes.map((ligne) => (
        <CarteLigne key={ligne.cle || 'sans-cle'} ligne={ligne} libelleAssocies={libelleAssocies} />
      ))}
    </ul>
  )
}

function CarteLigne({ ligne, libelleAssocies }: { ligne: LigneClassement; libelleAssocies: string }) {
  const [ouvert, setOuvert] = useState(false)
  const detailId = useId()
  const ecart = ligne.suffisant ? formaterEcart(ligne.ecartMoyenPct, ligne.ecartMoyenFcfa) : null
  return (
    <li className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-medium break-words">{ligne.libelle}</span>
        <span className="tabular-nums">{ligne.nombre} lot(s) perdu(s)</span>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Nos offres perdues</dt>
          <dd className="tabular-nums">{formatMontant(ligne.valeurPerdue)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Offres gagnantes</dt>
          <dd className="tabular-nums">{formatMontant(ligne.valeurGagneeParLesConcurrents)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Écart moyen</dt>
          <dd className="tabular-nums">{ecart ?? `Pas assez de lots (minimum ${MIN_CAS_ECART})`}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{libelleAssocies}</dt>
          <dd className="break-words">{ligne.associes.join(', ') || '—'}</dd>
        </div>
      </dl>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        aria-expanded={ouvert}
        aria-controls={detailId}
        onClick={() => setOuvert((v) => !v)}
      >
        Voir les pertes
        <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${ouvert ? 'rotate-180' : ''}`} aria-hidden="true" />
      </Button>
      {ouvert && (
        <ul id={detailId} className="space-y-2 text-sm">
          {ligne.pertes.map((p) => <LignePerte key={p.id} perte={p} />)}
        </ul>
      )}
    </li>
  )
}
