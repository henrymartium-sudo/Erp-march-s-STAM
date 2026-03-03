import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieceStatutButton } from './piece-statut-button'
import { CheckCircle2, AlertCircle, Clock, Circle } from 'lucide-react'
import type { PieceOffre } from '@prisma/client'

interface ChecklistViewProps {
  pieces: PieceOffre[]
  progression: number
  canWrite: boolean
}

const ICONE: Record<string, React.ComponentType<{ className?: string }>> = {
  ABSENT:    Circle,
  INCOMPLET: Clock,
  COMPLET:   CheckCircle2,
  VALIDE:    CheckCircle2,
}

const ICONE_COLOR: Record<string, string> = {
  ABSENT:    'text-destructive',
  INCOMPLET: 'text-amber-500',
  COMPLET:   'text-blue-500',
  VALIDE:    'text-green-500',
}

export function ChecklistView({ pieces, progression, canWrite }: ChecklistViewProps) {
  const nbDone   = pieces.filter((p) => p.statut === 'COMPLET' || p.statut === 'VALIDE').length
  const obligNonDone = pieces.filter(
    (p) => p.obligatoire && p.statut !== 'COMPLET' && p.statut !== 'VALIDE'
  ).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Pièces du dossier</CardTitle>
          <div className="flex items-center gap-2">
            {obligNonDone > 0 && (
              <Badge variant="danger" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                {obligNonDone} obligatoire{obligNonDone > 1 ? 's' : ''} manquante{obligNonDone > 1 ? 's' : ''}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {nbDone}/{pieces.length}
            </span>
          </div>
        </div>
        <div className="space-y-1 pt-2">
          <Progress value={progression} className="h-2" />
          <p className="text-xs text-muted-foreground">{progression}% complété</p>
        </div>
      </CardHeader>
      <CardContent>
        {pieces.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune pièce dans ce dossier.
          </p>
        ) : (
          <div className="space-y-1">
            {pieces.map((piece) => {
              const Icone = ICONE[piece.statut] ?? Circle
              return (
                <div
                  key={piece.id}
                  className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icone className={`h-4 w-4 flex-shrink-0 ${ICONE_COLOR[piece.statut]}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {piece.nom}
                        {piece.obligatoire && (
                          <span className="text-destructive ml-1 text-xs">*</span>
                        )}
                      </p>
                      {piece.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {piece.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <PieceStatutButton
                      pieceId={piece.id}
                      statut={piece.statut}
                      canWrite={canWrite}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          <span className="text-destructive">*</span> Pièce obligatoire
        </p>
      </CardContent>
    </Card>
  )
}
