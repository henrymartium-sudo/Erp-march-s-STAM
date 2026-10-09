import type { DoublonPossible } from '@/lib/veille/calculs'

export function DoublonsPossibles({ doublons }: { doublons: DoublonPossible[] }) {
  return (
    <section aria-labelledby="doublons-possibles" className="space-y-2">
      <h2 id="doublons-possibles" className="text-lg font-semibold">Doublons possibles</h2>
      <p className="text-sm text-muted-foreground">
        Noms proches non regroupés. Corrigez l’orthographe dans le lot concerné pour les réunir.
      </p>
      {doublons.length === 0 ? (
        <p role="status" className="text-sm text-muted-foreground">Aucun doublon possible.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {doublons.map((d) => (
            <li key={`${d.a.cle}|${d.b.cle}`} className="break-words">
              « {d.a.libelle} » ({d.a.nombre} lot(s)) et « {d.b.libelle} » ({d.b.nombre} lot(s))
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
