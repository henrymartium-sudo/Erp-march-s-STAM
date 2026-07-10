import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/utils/permissions";
import { getCaution } from "@/lib/actions/cautions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RetryButton } from "@/components/shared/retry-button";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/shared/breadcrumb-nav";
import { PageHeader } from "@/components/shared/page-header";
import { Edit } from "lucide-react";
import Link from "next/link";
import { CautionDetailContent } from "./_components/caution-detail-content";

interface CautionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: CautionDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getCaution(id);

  if (!result.success) {
    return {
      title: "Caution introuvable - ERP Marchés",
    };
  }

  return {
    title: `${result.data.reference || "Caution"} - ERP Marchés`,
    description: `Détails de la caution ${result.data.reference || ""}`,
  };
}

export default async function CautionDetailPage({
  params,
}: CautionDetailPageProps) {
  const session = await requireAuth();
  const { id } = await params;

  const result = await getCaution(id);

  if (!result.success) {
    if (result.error?.includes("introuvable")) {
      notFound();
    }

    return (
      <div className="container mx-auto py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur</CardTitle>
            <CardDescription>
              Impossible de charger la caution : {result.error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetryButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  const rawCaution = result.data;
  const canWrite = session.user?.role === "ADMIN" || session.user?.role === "AVANCE";

  // Sérialiser pour le Client Component (Decimal -> number, Date -> string ISO)
  const caution = {
    ...rawCaution,
    montant: typeof rawCaution.montant === 'number'
      ? rawCaution.montant
      : Number(rawCaution.montant),
    dateEmission: rawCaution.dateEmission instanceof Date
      ? rawCaution.dateEmission.toISOString()
      : String(rawCaution.dateEmission),
    dateEcheance: rawCaution.dateEcheance instanceof Date
      ? rawCaution.dateEcheance.toISOString()
      : String(rawCaution.dateEcheance),
    createdAt: rawCaution.createdAt instanceof Date
      ? rawCaution.createdAt.toISOString()
      : String(rawCaution.createdAt),
    updatedAt: rawCaution.updatedAt instanceof Date
      ? rawCaution.updatedAt.toISOString()
      : String(rawCaution.updatedAt),
    marche: rawCaution.marche ? {
      ...rawCaution.marche,
      montant: typeof rawCaution.marche.montant === 'number'
        ? rawCaution.marche.montant
        : Number(rawCaution.marche.montant),
    } : undefined,
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <BreadcrumbNav
        showHome
        items={[
          { label: 'Cautions', href: '/cautions' },
          { label: caution.reference || 'Détail caution' },
        ]}
      />
      <PageHeader
        title={caution.reference || "Caution sans référence"}
        description="Détails de la caution bancaire"
        action={canWrite ? (
          <Button asChild>
            <Link href={`/cautions/${caution.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Link>
          </Button>
        ) : undefined}
      />

      {/* Contenu */}
      <CautionDetailContent caution={caution} canWrite={canWrite} />
    </div>
  );
}
