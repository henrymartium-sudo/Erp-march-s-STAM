import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/utils/permissions";
import { getCaution } from "@/lib/actions/cautions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
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
        </Card>
      </div>
    );
  }

  const caution = result.data;
  const canWrite = session.user?.role === "ADMIN" || session.user?.role === "AVANCE";

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/cautions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {caution.reference || "Caution sans référence"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Détails de la caution bancaire
            </p>
          </div>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href={`/cautions/${caution.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Link>
          </Button>
        )}
      </div>

      {/* Contenu */}
      <CautionDetailContent caution={caution} canWrite={canWrite} />
    </div>
  );
}
