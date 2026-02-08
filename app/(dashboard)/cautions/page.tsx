import { Suspense } from "react";
import { Metadata } from "next";
import { requireAuth } from "@/lib/utils/permissions";
import { getCautions } from "@/lib/actions/cautions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExportExcelButton } from "@/components/exports/export-excel-button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { CautionsContent } from "./_components/cautions-content";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Cautions & Garanties - ERP Marchés",
  description: "Gestion des cautions et garanties bancaires",
};

interface CautionsPageProps {
  searchParams: Promise<{
    type?: string;
    statut?: string;
    niveauAlerte?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function CautionsPage({ searchParams }: CautionsPageProps) {
  const session = await requireAuth();
  const params = await searchParams;

  // Récupérer les cautions avec filtres
  const result = await getCautions({
    type: params.type,
    statut: params.statut,
    niveauAlerte: params.niveauAlerte,
    search: params.search,
  });

  if (!result.success) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur</CardTitle>
            <CardDescription>
              Impossible de charger les cautions : {result.error}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { cautions, total } = result.data;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Cautions & Garanties
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion et suivi des cautions bancaires
          </p>
        </div>
        <div className="flex gap-2">
          <ExportExcelButton
            type="cautions"
            filters={{
              statut: params.statut,
              type: params.type,
            }}
          />
          <Button asChild>
            <Link href="/cautions/nouvelle">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Caution
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Cautions</CardDescription>
            <CardTitle className="text-2xl">{cautions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actives</CardDescription>
            <CardTitle className="text-2xl">
              {cautions.filter((c) => c.statut === "ACTIVE").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alertes Critiques</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {
                cautions.filter((c) => {
                  if (c.statut !== "ACTIVE" || !c.dateEcheance) return false;
                  const jours = Math.ceil(
                    (new Date(c.dateEcheance).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return jours <= 7 && jours >= 0;
                }).length
              }
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Montant Total Actif</CardDescription>
            <CardTitle className="text-2xl">
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              }).format(
                cautions
                  .filter((c) => c.statut === "ACTIVE")
                  .reduce((sum, c) => {
                    const montant = typeof c.montant === "number"
                      ? c.montant
                      : c.montant.toNumber();
                    return sum + montant;
                  }, 0)
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Liste des cautions */}
      <Suspense fallback={<CautionsListSkeleton />}>
        <CautionsContent
          cautions={cautions}
          canWrite={session.user?.role === "ADMIN" || session.user?.role === "AVANCE"}
        />
      </Suspense>
    </div>
  );
}

function CautionsListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}
