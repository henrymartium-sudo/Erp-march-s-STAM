'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  titre: string
  valeur: string
  sousLignes: string[]
  explication: string
  alerte?: boolean
  detail?: ReactNode
}

export function IndicateurCard({ titre, valeur, sousLignes, explication, alerte, detail }: Props) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <Card className={alerte ? 'border-destructive/40' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titre}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold tabular-nums">{valeur}</span>
          {alerte && <AlertTriangle className="h-5 w-5 text-destructive" aria-label="Sous le seuil" />}
        </div>
        {sousLignes.map((l) => <p key={l} className="text-sm text-muted-foreground tabular-nums">{l}</p>)}
        <p className="text-xs text-muted-foreground">{explication}</p>
        {detail && (
          <>
            <Button variant="ghost" size="sm" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert}>
              <ChevronDown className={`h-4 w-4 transition-transform ${ouvert ? 'rotate-180' : ''}`} />
              Voir le détail
            </Button>
            {ouvert && <div className="max-h-64 overflow-auto text-sm">{detail}</div>}
          </>
        )}
      </CardContent>
    </Card>
  )
}
