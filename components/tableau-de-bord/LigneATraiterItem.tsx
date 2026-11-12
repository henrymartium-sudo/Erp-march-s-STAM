import Link from 'next/link'
import {
  AlertOctagon, Award, CheckCheck, FileSignature, FileUp, Flag, Hourglass, Receipt, Shield, ShieldCheck, Truck,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { LigneATraiter, NatureEcheance } from '@/lib/tableau-de-bord/a-traiter'
import { libelleDelai, VERBES_ACTION } from '@/lib/tableau-de-bord/presentation'
import { formatMontant } from '@/lib/utils/format'

const ICONES: Record<NatureEcheance, LucideIcon> = {
  DEPOT_OFFRE: FileUp,
  FIN_VALIDITE_OFFRE: Hourglass,
  ATTRIBUTION_PROVISOIRE: Award,
  LIVRAISON_EN_RETARD: Truck,
  FIN_EXECUTION_PROCHE: Flag,
  RECEPTION_DEFINITIVE: CheckCheck,
  GARANTIES_A_LIBERER: ShieldCheck,
  CAUTION_A_LIBERER: FileSignature,
  CAUTION_A_RENOUVELER: Shield,
  FACTURE_ECHUE: Receipt,
}

const VARIANTE_HORIZON = { retard: 'danger', semaine: 'warning', mois: 'muted' } as const

function dateCourte(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d)
}

/** Une échéance : toute la ligne mène à la fiche, où l'action se fait (le verbe n'est qu'un libellé). */
export function LigneATraiterItem({ ligne, aujourdHui }: { ligne: LigneATraiter; aujourdHui: Date }) {
  const Icone = ICONES[ligne.nature]
  return (
    <li>
      <Link
        href={ligne.href}
        className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-muted/60 focus-visible:bg-muted/60 sm:px-5"
      >
        <span className="row-span-2 flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icone className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">
            {ligne.libelle}
            {ligne.sansRattrapage && (
              <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-bold uppercase tracking-wide text-stam-danger">
                <AlertOctagon className="h-3 w-3" aria-hidden="true" />
                Sans rattrapage
              </span>
            )}
          </span>
          <span className="block text-sm text-muted-foreground">
            <span className="font-mono text-xs">{ligne.reference}</span>
            {ligne.montant !== null && <> · {formatMontant(ligne.montant)}</>}
          </span>
        </span>
        <span className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
          <Badge variant={VARIANTE_HORIZON[ligne.horizon]} className="whitespace-nowrap">
            {libelleDelai(ligne.echeance, aujourdHui)}
          </Badge>
          <span>{dateCourte(ligne.echeance)}</span>
        </span>
        <span className="col-start-2 col-end-4 text-sm font-semibold text-primary">{VERBES_ACTION[ligne.nature]}</span>
      </Link>
    </li>
  )
}
