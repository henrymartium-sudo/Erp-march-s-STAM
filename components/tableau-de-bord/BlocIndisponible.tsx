import { Card, CardContent } from '@/components/ui/card'

/** Bloc dont le calcul a échoué : un message dans son cadre, les autres blocs restent affichés. */
export function BlocIndisponible({ titre }: { titre: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p role="alert" className="text-sm text-destructive">
          {titre} est indisponible. Rechargez la page.
        </p>
      </CardContent>
    </Card>
  )
}
