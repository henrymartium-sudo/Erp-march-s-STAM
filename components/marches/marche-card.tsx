import Link from 'next/link'
import { Marche } from '@prisma/client'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatutBadge } from './statut-badge'
import { formatMontant, formatDateCourt } from '@/lib/utils/format'
import { Eye, Pencil, Trash2 } from 'lucide-react'

interface MarcheCardProps {
  marche: Marche
}

const TYPE_LABELS = {
  TRAVAUX: 'Travaux',
  FOURNITURES: 'Fournitures',
  SERVICES: 'Services',
  PRESTATIONS_INTELLECTUELLES: 'Prestations intellectuelles',
}

export function MarcheCard({ marche }: MarcheCardProps) {
  // Tronquer l'objet si trop long
  const objetTronque =
    marche.objet.length > 80
      ? `${marche.objet.substring(0, 80)}...`
      : marche.objet

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer">
      <Link href={`/marches/${marche.id}`} className="flex-1 flex flex-col">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">{marche.numero}</h3>
              <p className="text-sm text-muted-foreground">
                {TYPE_LABELS[marche.type]}
              </p>
            </div>
            <StatutBadge statut={marche.statut} size="sm" />
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          <p className="text-sm text-gray-700 line-clamp-2">{objetTronque}</p>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant</span>
              <span className="font-semibold">{formatMontant(marche.montant)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fournisseur</span>
              <span className="font-medium truncate max-w-[180px]">
                {marche.fournisseurNom}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Notification</span>
              <span>{formatDateCourt(marche.dateNotification)}</span>
            </div>
          </div>
        </CardContent>
      </Link>

      <CardFooter className="border-t pt-4 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link href={`/marches/${marche.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            Voir détails
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/marches/${marche.id}/edit`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
