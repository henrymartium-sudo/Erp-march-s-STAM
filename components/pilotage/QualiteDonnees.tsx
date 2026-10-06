import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ElementQualite } from '@/lib/pilotage/calculs'

export function QualiteDonnees({ elements, erreur }: { elements: ElementQualite[]; erreur?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Qualité des données <span className="text-sm font-normal text-muted-foreground">(toutes périodes)</span></CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {erreur ? (
          <p role="alert" className="text-sm text-destructive">{erreur}</p>
        ) : elements.map((e) => (
          <details key={e.cle} className="rounded-lg border p-3">
            <summary className="flex cursor-pointer justify-between gap-2 text-sm">
              <span>{e.libelle}</span>
              <span className={`font-semibold tabular-nums ${e.elements.length ? 'text-amber-800' : 'text-muted-foreground'}`}>
                {e.elements.length}
              </span>
            </summary>
            {e.elements.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                {e.elements.map((x) => <li key={x}>{x}</li>)}
              </ul>
            )}
          </details>
        ))}
      </CardContent>
    </Card>
  )
}
