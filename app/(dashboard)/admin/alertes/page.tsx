import { Suspense } from "react";
import { requireRole } from "@/lib/utils/permissions";
import {
  getAlertesActuelles,
  getDestinataires,
} from "@/lib/actions/alertes-manuelles";
import { AlertesDashboard } from "@/components/admin/alertes/alertes-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AlertesPage() {
  await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION']);

  // Récupérer les données en parallèle
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
      <div className="container mx-auto p-6">
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
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestion des Alertes
          </h1>
          <p className="text-muted-foreground mt-1">
            Envoyez manuellement les alertes aux destinataires sélectionnés
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-lg">
          <Mail className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Alertes en cours</p>
            <p className="text-2xl font-bold text-primary">{totalAlertes}</p>
          </div>
        </div>
      </div>

      {/* Dashboard des alertes */}
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
    </div>
  );
}
