import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Calendar, Shield, FileText, ChevronRight } from 'lucide-react'
import { getCautions } from '@/lib/actions/cautions'
import { getAllMarches } from '@/lib/actions/marches'
import { formatDate } from '@/lib/utils'
import { formatMontant } from '@/lib/utils/format'
import { TYPE_CAUTION_LABELS } from '@/lib/constants/caution'

export async function AlertsSection() {
  // Récupérer les cautions actives
  const cautionsResult = await getCautions()
  const cautions = cautionsResult.success ? cautionsResult.data.cautions : []

  // Récupérer tous les marchés
  const marches = await getAllMarches()

  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

  // Filtrer les cautions proches de l'échéance (< 30 jours)
  // Cautions actives uniquement (non libérées, non expirées, non appelées)
  const cautionsProchesEcheance = cautions.filter((caution) => {
    const echeance = new Date(caution.dateEcheance)
    return caution.statut === 'ACTIVE' && echeance > now && echeance <= in30Days
  })

  // Filtrer les marchés en cours avec date de fin proche (< 60 jours)
  const marchesProcheFin = marches.filter((marche) => {
    if (!marche.dateFinPrevue) return false
    const dateFin = new Date(marche.dateFinPrevue)
    const isEnCours = ['EN_EXECUTION', 'EN_ATTENTE_LIVRAISON_OS'].includes(marche.statut)
    return isEnCours && dateFin > now && dateFin <= in60Days
  })

  // Si aucune alerte, ne rien afficher
  if (cautionsProchesEcheance.length === 0 && marchesProcheFin.length === 0) {
    return null
  }

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <CardTitle>Alertes et échéances</CardTitle>
        </div>
        <CardDescription>
          Éléments nécessitant votre attention prochainement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cautions proches échéance */}
        {cautionsProchesEcheance.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-600" />
                <h3 className="font-semibold text-sm">
                  Cautions arrivant à échéance
                </h3>
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  {cautionsProchesEcheance.length}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/cautions">
                  Voir toutes
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="space-y-2">
              {cautionsProchesEcheance.slice(0, 3).map((caution) => {
                const echeance = new Date(caution.dateEcheance)
                const joursRestants = Math.ceil(
                  (echeance.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                )
                return (
                  <Link
                    key={caution.id}
                    href={`/cautions/${caution.id}`}
                    className="block p-3 rounded-lg border border-orange-100 bg-orange-50/50 hover:bg-orange-100/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {TYPE_CAUTION_LABELS[caution.type]}
                        </p>
                        {caution.marche && (
                          <p className="text-xs text-muted-foreground truncate">
                            {caution.marche.numero} - {caution.marche.objet}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3 text-orange-600" />
                          <p className="text-xs text-orange-700">
                            Échéance : {formatDate(caution.dateEcheance)} (
                            {joursRestants} jour{joursRestants > 1 ? 's' : ''})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {formatMontant(caution.montant)}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Marchés proche fin */}
        {marchesProcheFin.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-sm">
                  Marchés en fin d'exécution
                </h3>
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  {marchesProcheFin.length}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/marches">
                  Voir tous
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="space-y-2">
              {marchesProcheFin.slice(0, 3).map((marche) => {
                const dateFin = new Date(marche.dateFinPrevue!)
                const joursRestants = Math.ceil(
                  (dateFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                )
                return (
                  <Link
                    key={marche.id}
                    href={`/marches/${marche.id}`}
                    className="block p-3 rounded-lg border border-blue-100 bg-blue-50/50 hover:bg-blue-100/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {marche.numero}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {marche.objet}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3 text-blue-600" />
                          <p className="text-xs text-blue-700">
                            Fin prévue : {formatDate(marche.dateFinPrevue!)} (
                            {joursRestants} jour{joursRestants > 1 ? 's' : ''})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {formatMontant(marche.montant || 0)}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
