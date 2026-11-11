import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/utils/permissions";
import {
  getAlertesActuelles,
  getDestinataires,
} from "@/lib/actions/alertes-manuelles";
import { getAlertRules } from "@/lib/actions/alert-rules";
import { getNotificationHistory } from "@/lib/actions/alert-history";
import { getReportingRules } from "@/lib/actions/reporting-rules";
import { getOpportuniteReportingRules } from "@/lib/actions/opportunite-reporting-rules";
import type { ReportingScheduleConfig } from "@/lib/cron/reporting-processor";
import { lireOngletAlertes, ongletAutorise } from "@/lib/alertes/onglets";
import { AlertesOnglets } from "@/components/admin/alertes/alertes-onglets";
import { AlertesDashboard } from "@/components/admin/alertes/alertes-dashboard";
import { AlertesTimeline } from "@/components/admin/alertes/alertes-timeline";
import { RulesListClient } from "@/components/admin/alertes/rule-builder/rules-list-client";
import { HistoryTable } from "@/components/admin/alertes/history-table";
import { ReportingRulesClient } from "@/components/admin/alertes/rapports/ReportingRulesClient";
import { OpportuniteReportingRulesClient } from "@/components/admin/alertes/rapports/OpportuniteReportingRulesClient";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RetryButton } from "@/components/shared/retry-button";
import { AlertCircle, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

interface AlertesPageProps {
  searchParams: Promise<{ onglet?: string | string[] }>;
}

function ErreurChargement({ message }: { message: string }) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Erreur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>{message}</p>
        <RetryButton />
      </CardContent>
    </Card>
  );
}

async function OngletEnvoi() {
  const [alertesResult, destinatairesResult] = await Promise.all([
    getAlertesActuelles(),
    getDestinataires(),
  ]);

  const alertes = alertesResult.success ? alertesResult.data : null;
  const destinataires = destinatairesResult.success
    ? destinatairesResult.data
    : [];

  if (!alertes) {
    return <ErreurChargement message="Impossible de charger les alertes." />;
  }

  return (
    <div className="space-y-6">
      {/* Timeline visuelle rouge / ambre / vert */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Tableau de bord des échéances
        </h2>
        <AlertesTimeline alertes={alertes} />
      </section>

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

async function OngletRegles() {
  const rules = await getAlertRules().catch(() => null);
  if (!rules) {
    return <ErreurChargement message="Impossible de charger les règles." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {rules.length} règle(s) configurée(s)
        </p>
        <Button asChild>
          <Link href="/admin/alertes/rules/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle règle
          </Link>
        </Button>
      </div>
      <RulesListClient rules={rules} />
    </div>
  );
}

function serialiserRegle<
  T extends { scheduleConfig: unknown; createdAt: Date; updatedAt: Date },
>(r: T) {
  return {
    ...r,
    scheduleConfig: r.scheduleConfig as ReportingScheduleConfig | null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function OngletRapports() {
  const [rules, opportuniteRules] = await Promise.all([
    getReportingRules(),
    getOpportuniteReportingRules(),
  ]).catch(() => [null, null] as const);

  if (!rules || !opportuniteRules) {
    return (
      <ErreurChargement message="Impossible de charger les rapports programmés." />
    );
  }

  const serializedRules = rules.map(serialiserRegle);
  const serializedOpportuniteRules = opportuniteRules.map(serialiserRegle);

  return (
    <Tabs defaultValue="reporting">
      <TabsList>
        <TabsTrigger value="reporting">Règles email</TabsTrigger>
        <TabsTrigger value="opportunites">Suivi Opportunités</TabsTrigger>
      </TabsList>

      <TabsContent value="reporting" className="mt-4">
        <ReportingRulesClient initialRules={serializedRules} />
      </TabsContent>

      <TabsContent value="opportunites" className="mt-4">
        <OpportuniteReportingRulesClient
          initialRules={serializedOpportuniteRules}
        />
      </TabsContent>
    </Tabs>
  );
}

async function OngletHistorique() {
  const historique = await getNotificationHistory().catch(() => null);
  if (!historique) {
    return <ErreurChargement message="Impossible de charger l'historique." />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {historique.total} notification(s) au total
      </p>
      <HistoryTable notifications={historique.notifications} />
    </div>
  );
}

export default async function AlertesPage({ searchParams }: AlertesPageProps) {
  const session = await requireAuth().catch(() => null);
  if (!session) redirect("/");

  const role = session.user.role;
  const onglet = lireOngletAlertes((await searchParams).onglet);
  if (!ongletAutorise(onglet, role)) redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertes et e-mails"
        description="Envois manuels, règles d'alerte, rapports programmés et historique"
      />

      <AlertesOnglets onglet={onglet} role={role} />

      {onglet === "envoi" && <OngletEnvoi />}
      {onglet === "regles" && <OngletRegles />}
      {onglet === "rapports" && <OngletRapports />}
      {onglet === "historique" && <OngletHistorique />}
    </div>
  );
}
