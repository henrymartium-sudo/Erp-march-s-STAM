import Link from 'next/link'
import type { LigneIssue as Ligne } from '@/lib/pilotage/calculs'
import { formatMontant } from '@/lib/utils/format'

export function LigneIssue({ ligne }: { ligne: Ligne }) {
  const ecart = ligne.ecartFcfa !== null && ligne.ecartPct !== null
    ? `${ligne.ecartFcfa > 0 ? '+' : ''}${formatMontant(ligne.ecartFcfa)} (${ligne.ecartPct > 0 ? '+' : ''}${ligne.ecartPct} %)`
    : null
  return (
    <li className="rounded-md border p-2">
      <Link href={`/opportunites/${ligne.opportuniteId}`} className="block min-h-11 space-y-1 hover:underline focus-visible:underline">
        <span className="flex flex-wrap justify-between gap-x-2">
          <span className="font-medium break-words">{ligne.libelle}</span>
          <span className="shrink-0">{ligne.issue}</span>
        </span>
        <span className="block text-muted-foreground">{ligne.autorite}</span>
        <span className="block tabular-nums">Notre offre : {ligne.montantPropose === null ? '—' : formatMontant(ligne.montantPropose)}</span>
        {ligne.issue === 'Perdu' && (
          <span className="block text-muted-foreground tabular-nums">
            Gagnant : {ligne.concurrentGagnant ?? 'non renseigné'}
            {ligne.montantOffreConcurrent !== null && ` — ${formatMontant(ligne.montantOffreConcurrent)}`}
            {ecart && ` — écart ${ecart}`}
            {ligne.motif ? ` — motif : ${ligne.motif}` : ' — motif non renseigné'}
          </span>
        )}
      </Link>
    </li>
  )
}
