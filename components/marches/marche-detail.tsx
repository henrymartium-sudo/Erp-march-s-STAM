'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatutMarche } from '@prisma/client'
import type { SerializedMarche } from '@/types/serialized'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatutBadge } from './statut-badge'
import { StatutChangerButton } from './statut-changer-button'
import { DeleteMarcheDialog } from './delete-marche-dialog'
import { MarcheDocumentsSection } from './marche-documents-section'
import { MarcheCautionsSection } from './marche-cautions-section'
import { MarcheHistoriqueStatuts } from './marche-historique-statuts'
import { MarcheFacturesSection } from './marche-factures-section'
import { MarcheDossiersSection } from './marche-dossiers-section'
import { ConvertirEnOpportuniteButton } from './convertir-en-opportunite-button'
import { formatMontant, formatDateLong, formatDelai } from '@/lib/utils/format'
import { Pencil, Truck } from 'lucide-react'

interface MarcheDetailProps {
  marche: SerializedMarche
  canWrite?: boolean
}

const TYPE_LABELS = {
  TRAVAUX: 'Travaux',
  FOURNITURES: 'Fournitures',
  SERVICES: 'Services',
  PRESTATIONS_INTELLECTUELLES: 'Prestations intellectuelles',
}

const STATUTS_PRE_ATTRIBUTION: StatutMarche[] = [
  'OPPORTUNITE_IDENTIFIEE',
  'DOSSIER_EN_PREPARATION',
  'OFFRE_DEPOSEE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
]

export function MarcheDetail({ marche, canWrite = true }: MarcheDetailProps) {
  const [currentStatut, setCurrentStatut] = useState<StatutMarche>(marche.statut)

  return (
    <div className="space-y-6">
      {/* Header 2 colonnes : identité + statut/actions */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-mono-marche text-stam-accent font-semibold text-base leading-tight">
            {marche.numero}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1 leading-snug">
            {marche.objet}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {TYPE_LABELS[marche.type]}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatutBadge statut={currentStatut} size="lg" />
          {STATUTS_PRE_ATTRIBUTION.includes(currentStatut) && (
            <Badge variant="muted" className="text-xs">
              Dossier pré-attribution
            </Badge>
          )}
          {canWrite && (
            <>
              <StatutChangerButton
                marcheId={marche.id}
                currentStatut={currentStatut}
                onStatutChanged={setCurrentStatut}
              />
              {STATUTS_PRE_ATTRIBUTION.includes(currentStatut) && !marche.opportunite && (
                <ConvertirEnOpportuniteButton marcheId={marche.id} />
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href={`/marches/${marche.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Modifier
                </Link>
              </Button>
              <DeleteMarcheDialog
                marcheId={marche.id}
                marcheNumero={marche.numero}
                marcheObjet={marche.objet}
              />
            </>
          )}
        </div>
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
          {marche.opportunite && (
            <div className="flex justify-between border-t pt-4">
              <span className="text-sm text-muted-foreground">Opportunité d&apos;origine</span>
              <Link
                href={`/opportunites/${marche.opportunite.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {marche.opportunite.reference
                  ? `${marche.opportunite.reference} — `
                  : ''}
                {marche.opportunite.objet}
              </Link>
            </div>
          )}
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

      {/* Informations autorité contractante */}
      <Card>
        <CardHeader>
          <CardTitle>Autorité contractante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nom</p>
              <p className="text-sm mt-1">{marche.autoriteContractanteNom}</p>
            </div>
            {marche.autoriteContractanteContact && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contact</p>
                <p className="text-sm mt-1">{marche.autoriteContractanteContact}</p>
              </div>
            )}
            {marche.autoriteContractanteEmail && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm mt-1">
                  <a
                    href={`mailto:${marche.autoriteContractanteEmail}`}
                    className="text-blue-600 hover:underline"
                  >
                    {marche.autoriteContractanteEmail}
                  </a>
                </p>
              </div>
            )}
            {marche.autoriteContractanteTel && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                <p className="text-sm mt-1">
                  <a
                    href={`tel:${marche.autoriteContractanteTel}`}
                    className="text-blue-600 hover:underline"
                  >
                    {marche.autoriteContractanteTel}
                  </a>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informations spécifiques au statut */}
      {(marche.dateIdentification ||
        marche.dateDepotPrevue ||
        marche.dateDepotOffre ||
        marche.delaiValiditeOffre ||
        marche.dateAttributionProvisoire ||
        marche.dateAttributionDefinitive ||
        marche.dateLivraisonPrevue ||
        marche.dureeLivraisonPrevue ||
        marche.dateReceptionProvisoirePrevue ||
        marche.dateReceptionDefinitive ||
        marche.garantiesLiberees ||
        marche.dateClotureAdministrative ||
        marche.dateResiliation ||
        marche.motifsResiliation ||
        marche.dateAnnulation ||
        marche.motifsAnnulation ||
        marche.dateInfructueux ||
        marche.motifsInfructueux ||
        marche.concurrentGagnant ||
        marche.montantOffreConcurrent) && (
        <Card
          className={
            currentStatut === 'RESILIE'
              ? 'border-red-200 bg-red-50/50'
              : currentStatut === 'ANNULE'
              ? 'border-gray-300 bg-gray-50/50'
              : currentStatut === 'INFRUCTUEUX'
              ? 'border-orange-200 bg-orange-50/50'
              : ''
          }
        >
          <CardHeader>
            <CardTitle>Informations spécifiques au statut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* OPPORTUNITE_IDENTIFIEE */}
              {marche.dateIdentification && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date d'identification
                  </p>
                  <p className="text-sm mt-1">
                    {formatDateLong(marche.dateIdentification)}
                  </p>
                </div>
              )}

              {/* DOSSIER_EN_PREPARATION */}
              {marche.dateDepotPrevue && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date de dépôt prévue
                  </p>
                  <p className="text-sm mt-1">{formatDateLong(marche.dateDepotPrevue)}</p>
                </div>
              )}

              {/* OFFRE_DEPOSEE */}
              {marche.dateDepotOffre && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date de dépôt de l'offre
                  </p>
                  <p className="text-sm mt-1">{formatDateLong(marche.dateDepotOffre)}</p>
                </div>
              )}

              {marche.delaiValiditeOffre && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Délai de validité de l'offre
                  </p>
                  <p className="text-sm mt-1">{formatDelai(marche.delaiValiditeOffre)}</p>
                </div>
              )}

              {/* ATTRIBUE_PROVISOIREMENT */}
              {marche.dateAttributionProvisoire && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date d'attribution provisoire
                  </p>
                  <p className="text-sm mt-1">
                    {formatDateLong(marche.dateAttributionProvisoire)}
                  </p>
                </div>
              )}

              {/* ATTRIBUE_DEFINITIVEMENT */}
              {marche.dateAttributionDefinitive && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date d'attribution définitive
                  </p>
                  <p className="text-sm mt-1">
                    {formatDateLong(marche.dateAttributionDefinitive)}
                  </p>
                </div>
              )}

              {/* EN_ATTENTE_LIVRAISON_OS */}
              {marche.dateLivraisonPrevue && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date de livraison prévue
                  </p>
                  <p className="text-sm mt-1">
                    {formatDateLong(marche.dateLivraisonPrevue)}
                  </p>
                </div>
              )}

              {marche.dureeLivraisonPrevue && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Durée de livraison prévue
                  </p>
                  <p className="text-sm mt-1">{formatDelai(marche.dureeLivraisonPrevue)}</p>
                </div>
              )}

              {/* EN_EXECUTION */}
              {marche.dateReceptionProvisoirePrevue && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date de réception provisoire prévue
                  </p>
                  <p className="text-sm mt-1">
                    {formatDateLong(marche.dateReceptionProvisoirePrevue)}
                  </p>
                </div>
              )}

              {marche.dateReceptionDefinitive && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date de réception définitive
                  </p>
                  <p className="text-sm mt-1">
                    {formatDateLong(marche.dateReceptionDefinitive)}
                  </p>
                </div>
              )}

              {/* EXECUTE_ATTENTE_GARANTIES */}
              {marche.garantiesLiberees !== null && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Garanties libérées
                  </p>
                  <p className="text-sm mt-1">
                    {marche.garantiesLiberees ? '✓ Oui' : '✗ Non'}
                  </p>
                </div>
              )}

              {/* CLOTURE */}
              {marche.dateClotureAdministrative && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date de clôture administrative
                  </p>
                  <p className="text-sm mt-1">
                    {formatDateLong(marche.dateClotureAdministrative)}
                  </p>
                </div>
              )}

              {/* RESILIE */}
              {marche.dateResiliation && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date de résiliation
                  </p>
                  <p className="text-sm mt-1">{formatDateLong(marche.dateResiliation)}</p>
                </div>
              )}

              {/* ANNULE */}
              {marche.dateAnnulation && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date d'annulation
                  </p>
                  <p className="text-sm mt-1">{formatDateLong(marche.dateAnnulation)}</p>
                </div>
              )}

              {/* INFRUCTUEUX */}
              {marche.dateInfructueux && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date de déclaration infructueux
                  </p>
                  <p className="text-sm mt-1">{formatDateLong(marche.dateInfructueux)}</p>
                </div>
              )}

              {marche.concurrentGagnant && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Concurrent gagnant
                  </p>
                  <p className="text-lg font-semibold mt-1 text-orange-700">
                    {marche.concurrentGagnant}
                  </p>
                </div>
              )}

              {marche.montantOffreConcurrent && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Montant de l'offre du concurrent
                  </p>
                  <p className="text-lg font-semibold mt-1 text-orange-700">
                    {formatMontant(marche.montantOffreConcurrent)}
                  </p>
                </div>
              )}
            </div>

            {/* Motifs (affichage en pleine largeur) */}
            {marche.motifsResiliation && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Motifs de résiliation
                </p>
                <p className="text-sm whitespace-pre-wrap bg-white p-3 rounded-md border">
                  {marche.motifsResiliation}
                </p>
              </div>
            )}

            {marche.motifsAnnulation && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Motifs d'annulation
                </p>
                <p className="text-sm whitespace-pre-wrap bg-white p-3 rounded-md border">
                  {marche.motifsAnnulation}
                </p>
              </div>
            )}

            {marche.motifsInfructueux && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Motifs d'infructuosité
                </p>
                <p className="text-sm whitespace-pre-wrap bg-white p-3 rounded-md border">
                  {marche.motifsInfructueux}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section Véhicules associés */}
      {marche.vehicules && marche.vehicules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-muted-foreground" />
              Véhicules associés ({marche.vehicules.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {marche.vehicules.map((vehicule) => (
                <Link
                  key={vehicule.id}
                  href={`/vehicules/${vehicule.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-100 transition-colors"
                >
                  <Truck className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-semibold text-stam-accent truncate">
                      {vehicule.immatriculation}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {vehicule.marque} {vehicule.modele}
                      {vehicule.annee ? ` • ${vehicule.annee}` : ''}
                    </p>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {vehicule.statut.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section Documents */}
      <MarcheDocumentsSection marcheId={marche.id} />

      {/* Section Cautions */}
      <MarcheCautionsSection marcheId={marche.id} />

      {/* Section Dossiers d'offre */}
      <MarcheDossiersSection marcheId={marche.id} canWrite={canWrite} />

      {/* Section Facturation */}
      <MarcheFacturesSection
        marcheId={marche.id}
        marcheNumero={marche.numero}
        canWrite={canWrite}
      />

      {/* Section Historique Statuts */}
      <MarcheHistoriqueStatuts marcheId={marche.id} />

    </div>
  )
}
