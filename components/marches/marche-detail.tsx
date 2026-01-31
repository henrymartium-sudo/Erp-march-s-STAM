import Link from 'next/link'
import { Marche } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatutBadge } from './statut-badge'
import { DeleteMarcheDialog } from './delete-marche-dialog'
import { formatMontant, formatDateLong, formatDelai } from '@/lib/utils/format'
import { ArrowLeft, Pencil } from 'lucide-react'

interface MarcheDetailProps {
  marche: Marche
}

const TYPE_LABELS = {
  TRAVAUX: 'Travaux',
  FOURNITURES: 'Fournitures',
  SERVICES: 'Services',
  PRESTATIONS_INTELLECTUELLES: 'Prestations intellectuelles',
}

export function MarcheDetail({ marche }: MarcheDetailProps) {
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{marche.numero}</h1>
          <p className="text-muted-foreground">{TYPE_LABELS[marche.type]}</p>
        </div>
        <StatutBadge statut={marche.statut} size="lg" />
      </div>

      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Objet</p>
              <p className="text-sm mt-1">{marche.objet}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Montant</p>
              <p className="text-lg font-semibold mt-1">
                {formatMontant(marche.montant)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dates et délais */}
      <Card>
        <CardHeader>
          <CardTitle>Dates et délais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Date de notification
              </p>
              <p className="text-sm mt-1">
                {formatDateLong(marche.dateNotification)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Délai d'exécution
              </p>
              <p className="text-sm mt-1">{formatDelai(marche.delaiExecution)}</p>
            </div>
            {marche.dateOrdreService && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Date ordre de service
                </p>
                <p className="text-sm mt-1">
                  {formatDateLong(marche.dateOrdreService)}
                </p>
              </div>
            )}
            {marche.dateFinPrevue && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Date de fin prévue
                </p>
                <p className="text-sm mt-1">{formatDateLong(marche.dateFinPrevue)}</p>
              </div>
            )}
            {marche.dateReception && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Date de réception
                </p>
                <p className="text-sm mt-1">{formatDateLong(marche.dateReception)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informations fournisseur */}
      <Card>
        <CardHeader>
          <CardTitle>Fournisseur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nom</p>
              <p className="text-sm mt-1">{marche.fournisseurNom}</p>
            </div>
            {marche.fournisseurContact && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contact</p>
                <p className="text-sm mt-1">{marche.fournisseurContact}</p>
              </div>
            )}
            {marche.fournisseurEmail && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm mt-1">
                  <a
                    href={`mailto:${marche.fournisseurEmail}`}
                    className="text-blue-600 hover:underline"
                  >
                    {marche.fournisseurEmail}
                  </a>
                </p>
              </div>
            )}
            {marche.fournisseurTel && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                <p className="text-sm mt-1">
                  <a
                    href={`tel:${marche.fournisseurTel}`}
                    className="text-blue-600 hover:underline"
                  >
                    {marche.fournisseurTel}
                  </a>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Boutons d'action */}
      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/marches">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/marches/${marche.id}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Link>
        </Button>
        <DeleteMarcheDialog
          marcheId={marche.id}
          marcheNumero={marche.numero}
          marcheObjet={marche.objet}
        />
      </div>
    </div>
  )
}
