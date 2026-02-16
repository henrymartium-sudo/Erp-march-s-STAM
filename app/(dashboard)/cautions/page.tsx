import { Suspense } from "react";
import { Metadata } from "next";
import { requireAuth } from "@/lib/utils/permissions";
import { getCautions } from "@/lib/actions/cautions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/components/exports";
import { Plus } from "lucide-react";
import Link from "next/link";
import { CautionsContent } from "./_components/cautions-content";
import { Skeleton } from "@/components/ui/skeleton";
import type { SerializedCaution } from "@/types/serialized";
import { serializeMarche } from "@/lib/utils/serialize";
import { formatMontant } from "@/lib/utils/format";
import { DataPagination } from "@/components/ui/data-pagination";
import { shouldShowPagination } from "@/lib/utils/pagination";

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

/**
 * Sérialise une caution Prisma en objet plain pour le passage aux Client Components.
 * Convertit les Decimal en number et les Date en string ISO.
 */
function serializeCaution(caution: any): SerializedCaution {
  return {
    ...caution,
    montant: typeof caution.montant === 'number'
      ? caution.montant
      : Number(caution.montant),
    dateEmission: caution.dateEmission instanceof Date
      ? caution.dateEmission.toISOString()
      : String(caution.dateEmission),
    dateEcheance: caution.dateEcheance instanceof Date
      ? caution.dateEcheance.toISOString()
      : String(caution.dateEcheance),
    createdAt: caution.createdAt instanceof Date
      ? caution.createdAt.toISOString()
      : String(caution.createdAt),
    updatedAt: caution.updatedAt instanceof Date
      ? caution.updatedAt.toISOString()
      : String(caution.updatedAt),
    marche: caution.marche ? serializeMarche(caution.marche) : undefined,
  };
}

export default async function CautionsPage({ searchParams }: CautionsPageProps) {
  const session = await requireAuth();
  const params = await searchParams;

  // Parse page number
  const currentPage = Number(params.page) || 1;

  // Récupérer les cautions avec filtres et pagination
  const result = await getCautions({
    type: params.type,
    statut: params.statut,
    niveauAlerte: params.niveauAlerte,
    search: params.search,
    page: currentPage,
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

  const { data: rawCautions, pagination } = result.data;

  // Sérialiser les cautions pour les Client Components
  const cautions = rawCautions.map(serializeCaution);

  // Calculs statistiques côté serveur
  const activeCautions = cautions.filter((c) => c.statut === "ACTIVE");
  const criticalCount = cautions.filter((c) => {
    if (c.statut !== "ACTIVE" || !c.dateEcheance) return false;
    const jours = Math.ceil(
      (new Date(c.dateEcheance).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    );
    return jours <= 7 && jours >= 0;
  }).length;
  const montantTotalActif = activeCautions.reduce(
    (sum, c) => sum + c.montant,
    0
  );

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
          <ExportMenu
            type="cautions"
            filters={{
              statut: params.statut,
              type: params.type,
              search: params.search,
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
              {activeCautions.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alertes Critiques</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {criticalCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Montant Total Actif</CardDescription>
            <CardTitle className="text-2xl">
              {formatMontant(montantTotalActif)}
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

      {/* Pagination */}
      {shouldShowPagination(pagination.totalItems) && (
        <DataPagination pagination={pagination} />
      )}
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
