import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LotFormDialog } from './lot-form-dialog'
import { LotResultatDialog } from './lot-resultat-dialog'
import { VehiculesProposeDialog } from './vehicules-propose-dialog'
import { ChecklistView } from '@/components/dossiers-offre/checklist-view'
import { RESULTAT_LOT_LABELS } from '@/lib/validations/lot'
import {
  piecesModifiables,
  calculerProgression,
  calculerTotauxLots,
  prochainNumeroLot,
  STATUTS_EDITION_LOTS,
  STATUTS_SAISIE_RESULTAT,
} from '@/lib/utils/lots'
import type { SerializedLot } from '@/lib/utils/serialize'
import type { StatutOpportunite, ResultatLot } from '@prisma/client'

const RESULTAT_LOT_COLORS: Record<ResultatLot, 'success' | 'warning' | 'danger' | 'info' | 'muted'> = {
  EN_COURS:                'muted',
  ATTRIBUE_PROVISOIREMENT: 'info',
  GAGNE:                   'success',
  PERDU:                   'danger',
  INFRUCTUEUX:              'warning',
}

interface LotsSectionProps {
  opportuniteId: string
  statutOpportunite: StatutOpportunite
  lots: SerializedLot[]
  canWrite: boolean
  vehiculesModifiables: boolean
}

function formatMontant(val: number | null): string {
  if (val === null || val === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(val)
}

export function LotsSection({ opportuniteId, statutOpportunite, lots, canWrite, vehiculesModifiables }: LotsSectionProps) {
  const peutEditerLots = canWrite && STATUTS_EDITION_LOTS.includes(statutOpportunite)
  const peutSaisirResultat = canWrite && STATUTS_SAISIE_RESULTAT.includes(statutOpportunite)
  const peutEditerVehicules = canWrite && vehiculesModifiables
  const avecActions = peutEditerLots || peutSaisirResultat || peutEditerVehicules

  const { nbLots, nbGagnes, totalEstime, totalPropose } = calculerTotauxLots(lots)
  const libelleGagnes = `${nbGagnes} lot${nbGagnes > 1 ? 's' : ''} gagné${nbGagnes > 1 ? 's' : ''} / ${nbLots}`

  const lotsAvecDossier = lots.filter((l) => l.dossier)

  return (
    <div className="space-y-6">
      {peutEditerLots && (
        <div className="flex justify-end">
          <LotFormDialog
            opportuniteId={opportuniteId}
            numeroParDefaut={prochainNumeroLot(lots.map((l) => l.numero))}
          />
        </div>
      )}

      {lots.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun lot pour cette opportunité.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Lot</TableHead>
                <TableHead className="hidden text-right xl:table-cell">Montant proposé</TableHead>
                <TableHead className="hidden xl:table-cell">Résultat</TableHead>
                <TableHead className="hidden min-w-[180px] xl:table-cell">Dossier</TableHead>
                {avecActions && (
                  <TableHead className="w-[60px]"><span className="sr-only">Actions</span></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => {
                const montantProposeFmt = formatMontant(lot.montantPropose)
                const dossierPieces = lot.dossier?.pieces ?? []
                const progression = lot.dossier ? calculerProgression(dossierPieces) : 0
                const nbDone = dossierPieces.filter((p) => p.statut === 'COMPLET' || p.statut === 'VALIDE').length

                return (
                  <TableRow key={lot.id}>
                    <TableCell className="align-top">
                      <span className="font-medium">Lot {lot.numero}</span>
                      <p className="text-sm text-muted-foreground">{lot.intitule}</p>
                      {lot.vehiculesProposes.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground" aria-label={`Véhicules proposés du lot ${lot.numero}`}>
                          {lot.vehiculesProposes.map((v) => (
                            <li key={v.id}>{v.quantite} × {v.marque} {v.modele} — {formatMontant(v.prixUnitaire)}</li>
                          ))}
                        </ul>
                      )}
                      {/* Colonnes masquées sur petit écran : leur contenu passe sous l'intitulé */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs xl:hidden">
                        <Badge variant={RESULTAT_LOT_COLORS[lot.resultat]} className="whitespace-nowrap">
                          {RESULTAT_LOT_LABELS[lot.resultat]}
                        </Badge>
                        {lot.montantPropose != null && (
                          <span className="tabular-nums text-muted-foreground">{montantProposeFmt}</span>
                        )}
                        {lot.dossier && (
                          <Link href={`#lot-${lot.numero}`} className="text-primary hover:underline">
                            {nbDone}/{dossierPieces.length} pièces
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-right align-top tabular-nums xl:table-cell">
                      {montantProposeFmt}
                    </TableCell>
                    <TableCell className="hidden align-top xl:table-cell">
                      <Badge variant={RESULTAT_LOT_COLORS[lot.resultat]} className="whitespace-nowrap">
                        {RESULTAT_LOT_LABELS[lot.resultat]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden align-top xl:table-cell">
                      {lot.dossier ? (
                        <div className="space-y-1">
                          <Progress value={progression} className="h-2" />
                          <Link href={`#lot-${lot.numero}`} className="text-xs text-primary hover:underline">
                            {nbDone}/{dossierPieces.length} pièces
                          </Link>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {avecActions && (
                      <TableCell className="align-top">
                        <div className="flex flex-wrap gap-1">
                          {peutEditerVehicules && (
                            <VehiculesProposeDialog lotId={lot.id} numeroLot={lot.numero} vehicules={lot.vehiculesProposes} />
                          )}
                          {peutEditerLots && (
                            <LotFormDialog
                              opportuniteId={opportuniteId}
                              lot={{
                                id: lot.id,
                                numero: lot.numero,
                                intitule: lot.intitule,
                                montantEstime: lot.montantEstime,
                                montantPropose: lot.montantPropose,
                              }}
                              montantCalcule={lot.vehiculesProposes.length > 0}
                            />
                          )}
                          {peutSaisirResultat && (
                            <LotResultatDialog
                              lotId={lot.id}
                              numeroLot={lot.numero}
                              resultatActuel={lot.resultat}
                              motifPerte={lot.motifPerte}
                              concurrentGagnant={lot.concurrentGagnant}
                              montantOffreConcurrent={lot.montantOffreConcurrent}
                            />
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="align-top">
                  Total
                  <div className="mt-1 space-y-0.5 text-xs font-normal text-muted-foreground">
                    <p>Estimé : {formatMontant(totalEstime)}</p>
                    {/* Colonnes masquées sur petit écran : leurs totaux passent sous « Total » */}
                    <p className="xl:hidden">Proposé : {formatMontant(totalPropose)}</p>
                    <p className="xl:hidden">{libelleGagnes}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-right align-top tabular-nums xl:table-cell">
                  {formatMontant(totalPropose)}
                </TableCell>
                <TableCell className="hidden align-top xl:table-cell" colSpan={2}>
                  {libelleGagnes}
                </TableCell>
                {avecActions && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {lotsAvecDossier.length > 0 && (
        <div className="space-y-4">
          {lotsAvecDossier.map((lot) => (
            <section key={lot.id} id={`lot-${lot.numero}`}>
              <h3 className="text-sm font-semibold mb-2">
                Dossier — Lot {lot.numero} : {lot.intitule}
              </h3>
              <ChecklistView
                pieces={lot.dossier!.pieces}
                progression={calculerProgression(lot.dossier!.pieces)}
                canWrite={canWrite && piecesModifiables(statutOpportunite)}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
