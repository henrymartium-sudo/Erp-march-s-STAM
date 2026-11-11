// components/analytique/ListeAnalyse.tsx — liste « libellé à gauche, chiffres à droite », clic optionnel
'use client'

import { ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface LigneAnalyse {
  cle: string
  libelle: string
  valeur: string
  onClick?: () => void
}

const LIGNE = 'flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-sm'

export function ListeAnalyse({ titre, sousTitre, lignes }: { titre: string; sousTitre?: string; lignes: LigneAnalyse[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{titre}</CardTitle>
        {sousTitre && <p className="text-xs text-muted-foreground">{sousTitre}</p>}
      </CardHeader>
      <CardContent>
        <ul aria-label={titre} className="divide-y">
          {lignes.map(({ cle, libelle, valeur, onClick }) => {
            const contenu = (
              <>
                <span className="break-words">{libelle}</span>
                <span className="shrink-0 font-semibold tabular-nums text-stam-primary">{valeur}</span>
              </>
            )
            return (
              <li key={cle}>
                {onClick ? (
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={onClick}
                    className={`${LIGNE} hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring`}
                  >
                    {contenu}
                    <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ) : (
                  <div className={LIGNE}>{contenu}</div>
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
