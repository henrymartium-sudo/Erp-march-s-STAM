import { Suspense } from "react";
import { requireRole } from "@/lib/utils/permissions";
import {
  getAlertesActuelles,
  getDestinataires,
} from "@/lib/actions/alertes-manuelles";
import { AlertesDashboard } from "@/components/admin/alertes/alertes-dashboard";
import { AlertesTimeline } from "@/components/admin/alertes/alertes-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AlertesPage() {
  await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION']);

  const [alertesResult, destinatairesResult] = await Promise.all([
    getAlertesActuelles(),
    getDestinataires(),
  ]);

  const alertes = alertesResult.success ? alertesResult.data : null;
  const destinataires = destinatairesResult.success
    ? destinatairesResult.data
    : [];

  if (!alertes) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gestion des Alertes"
          description="Envoyez manuellement les alertes aux destinataires sélectionnés"
        />
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Erreur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Impossible de charger les alertes.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAlertes = alertes.cautions.length + alertes.marches.length;

  return (
    <div className="space-y-6">
      {/* En-tête STAM */}
      <PageHeader
        title="Gestion des Alertes"
        description="Surveillance en temps réel — marchés et cautions proches échéance"
        count={totalAlertes > 0 ? totalAlertes : undefined}
      />

      {/* Timeline visuelle rouge / ambre / vert */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Tableau de bord des échéances
        </h2>
        <AlertesTimeline alertes={alertes} />
      </section>

      {/* Séparateur visuel */}
      <div className="border-t border-dashed border-gray-200" />

      {/* Dashboard email (destinataires + envoi) */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Envoi manuel des alertes
        </h2>
        <Suspense
          fallback={
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  Chargement...
                </p>
              </CardContent>
            </Card>
          }
        >
          <AlertesDashboard
            alertes={alertes}
            destinataires={destinataires || []}
          />
        </Suspense>
      </section>
    </div>
  );
}
