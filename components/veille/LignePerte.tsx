import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { PerteVeille } from '@/lib/veille/calculs'
import { formaterEcart } from '@/lib/veille/affichage'
import { formatMontant } from '@/lib/utils/format'

interface Props {
  perte: PerteVeille
  /** affiche la liste de ce qui manque (bloc « non documentées ») */
  afficherManquants?: boolean
}

export function LignePerte({ perte, afficherManquants = false }: Props) {
  const ecart = formaterEcart(perte.ecartPct, perte.ecartFcfa)
  return (
    <li className="rounded-md border p-2">
      <Link
        href={`/opportunites/${perte.opportuniteId}`}
        className="block min-h-11 space-y-1 hover:underline focus-visible:underline"
      >
        <span className="flex flex-wrap justify-between gap-x-2">
          <span className="font-medium break-words">{perte.libelle}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {format(new Date(perte.dateDepot), 'dd/MM/yyyy', { locale: fr })}
          </span>
        </span>
        <span className="block text-muted-foreground break-words">{perte.autorite}</span>
        <span className="block tabular-nums">
          Notre offre : {perte.notreMontant === null ? '—' : formatMontant(perte.notreMontant)}
        </span>
        <span className="block text-muted-foreground tabular-nums break-words">
          Gagnant : {perte.concurrent ?? 'non renseigné'}
          {perte.montantConcurrent !== null && ` — ${formatMontant(perte.montantConcurrent)}`}
          {ecart && ` — écart ${ecart}`}
        </span>
        <span className="block text-muted-foreground break-words">Véhicules : {perte.vehicules}</span>
        <span className="block text-muted-foreground break-words">
          {perte.motif ? `Motif : ${perte.motif}` : 'Motif non renseigné'}
        </span>
        {afficherManquants && perte.manquants.length > 0 && (
          <span className="block font-medium text-destructive">Il manque : {perte.manquants.join(', ')}</span>
        )}
      </Link>
    </li>
  )
}
