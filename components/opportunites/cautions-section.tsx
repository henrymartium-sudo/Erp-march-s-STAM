import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CautionsListe } from '@/components/opportunites/cautions-liste'
import { RattacherCautionDialog } from '@/components/opportunites/rattacher-caution-dialog'
import { serializeCaution } from '@/lib/utils/serialize'
import type { Caution } from '@prisma/client'

/** Cautions rattachées à l'opportunité : création, rattachement d'une caution existante, modification, détachement. */
export function CautionsSection({
  opportuniteId,
  cautions,
  canWrite,
}: {
  opportuniteId: string
  cautions: Caution[]
  canWrite: boolean
}) {
  const serialisees = cautions.map(serializeCaution)
  const actives = serialisees.filter((c) => c.statut === 'ACTIVE').length
  const lienCreation = `/cautions/nouvelle?opportuniteId=${opportuniteId}`

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Cautions &amp; Garanties</CardTitle>
            <CardDescription>
              {serialisees.length === 0
                ? 'Aucune caution rattachée à cette opportunité'
                : `${serialisees.length} caution${serialisees.length > 1 ? 's' : ''} • ${actives} active${actives > 1 ? 's' : ''}`}
            </CardDescription>
          </div>
          {canWrite && (
            <div className="flex items-center gap-2">
              <RattacherCautionDialog opportuniteId={opportuniteId} />
              <Button asChild size="sm">
                <Link href={lienCreation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer
                </Link>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {serialisees.length > 0 ? (
          <CautionsListe cautions={serialisees} canWrite={canWrite} />
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <p>Aucune caution rattachée à cette opportunité.</p>
            {canWrite && (
              <>
                <p className="mt-1 text-sm">
                  Enregistrez la caution de soumission ou de capacité financière dès que la banque vous la remet, ou rattachez-en une déjà créée.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Button asChild variant="outline">
                    <Link href={lienCreation}>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer la première caution
                    </Link>
                  </Button>
                  <RattacherCautionDialog opportuniteId={opportuniteId} />
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
