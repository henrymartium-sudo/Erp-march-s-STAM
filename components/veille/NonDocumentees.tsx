import { LignePerte } from '@/components/veille/LignePerte'
import type { PerteVeille } from '@/lib/veille/calculs'

export function NonDocumentees({ pertes }: { pertes: PerteVeille[] }) {
  return (
    <section aria-labelledby="non-documentees" className="space-y-2">
      <h2 id="non-documentees" className="text-lg font-semibold">Non documentées</h2>
      <p className="text-sm text-muted-foreground">
        Pertes sans concurrent ou sans montant : à compléter dans le lot concerné pour entrer dans les classements.
      </p>
      {pertes.length === 0 ? (
        <p role="status" className="text-sm text-muted-foreground">Toutes les pertes de la période sont documentées.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {pertes.map((p) => <LignePerte key={p.id} perte={p} afficherManquants />)}
        </ul>
      )}
    </section>
  )
}
