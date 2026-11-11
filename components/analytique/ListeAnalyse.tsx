// components/analytique/ListeAnalyse.tsx — liste « libellé à gauche, chiffres à droite », clic optionnel
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface LigneAnalyse {
  cle: string
  libelle: string
  valeur: string
  onClick?: () => void
}

const LIGNE = 'flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-sm'

export function ListeAnalyse({ titre, lignes }: { titre: string; lignes: LigneAnalyse[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{titre}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul aria-label={titre} className="divide-y">
          {lignes.map(({ cle, libelle, valeur, onClick }) => {
            const contenu = (
              <>
                <span className="break-words">{libelle}</span>
                <span className="shrink-0 font-semibold tabular-nums text-[#1E3A5F]">{valeur}</span>
              </>
            )
            return (
              <li key={cle}>
                {onClick ? (
                  <button
                    type="button"
                    onClick={onClick}
                    className={`${LIGNE} hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring`}
                  >
                    {contenu}
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
