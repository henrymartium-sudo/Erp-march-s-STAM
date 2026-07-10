import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/utils/permissions";
import {
  getAlertesActuelles,
  getDestinataires,
} from "@/lib/actions/alertes-manuelles";
import { getAlertRules } from "@/lib/actions/alert-rules";
import { AlertesDashboard } from "@/components/admin/alertes/alertes-dashboard";
import { AlertesTimeline } from "@/components/admin/alertes/alertes-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RetryButton } from "@/components/shared/retry-button";
import { AlertCircle, Settings2, History } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AlertesPage() {
  await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION']);

  const [alertesResult, destinatairesResult, rules] = await Promise.all([
    getAlertesActuelles(),
    getDestinataires(),
    getAlertRules(),
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
          <CardContent className="space-y-4">
            <p>Impossible de charger les alertes.</p>
            <RetryButton />
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

      {/* Navigation rapide vers les sous-sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/admin/alertes/rules"
          className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="rounded-md bg-primary/10 p-2">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium text-sm">Règles d'alerte</div>
            <div className="text-xs text-muted-foreground">
              {rules.length} règle(s) configurée(s)
            </div>
          </div>
        </Link>

        <Link
          href="/admin/alertes/history"
          className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="rounded-md bg-primary/10 p-2">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium text-sm">Historique</div>
            <div className="text-xs text-muted-foreground">
              Consulter toutes les notifications envoyées
            </div>
          </div>
        </Link>
      </div>

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
