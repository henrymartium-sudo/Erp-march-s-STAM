import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CautionCard } from '@/components/cautions/caution-card'
import { serializeCaution } from '@/lib/utils/serialize'
import type { Caution } from '@prisma/client'

/** Cautions rattachées à l'opportunité, en lecture (la création et le rattachement arrivent aux phases suivantes). */
export function CautionsSection({ cautions }: { cautions: Caution[] }) {
  const serialisees = cautions.map(serializeCaution)
  const actives = serialisees.filter((c) => c.statut === 'ACTIVE').length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cautions &amp; Garanties</CardTitle>
        <CardDescription>
          {serialisees.length === 0
            ? 'Aucune caution rattachée à cette opportunité'
            : `${serialisees.length} caution${serialisees.length > 1 ? 's' : ''} • ${actives} active${actives > 1 ? 's' : ''}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {serialisees.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {serialisees.map((caution) => (
              <CautionCard key={caution.id} caution={caution} mode="compact" />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <p>Aucune caution rattachée à cette opportunité.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
