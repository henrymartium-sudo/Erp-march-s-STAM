import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/utils/permissions";
import { getCaution } from "@/lib/actions/cautions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EditCautionContent } from "./_components/edit-caution-content";

interface EditCautionPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: EditCautionPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getCaution(id);

  if (!result.success) {
    return {
      title: "Modifier Caution - ERP Marchés",
    };
  }

  return {
    title: `Modifier ${result.data.reference || "Caution"} - ERP Marchés`,
    description: `Modifier la caution ${result.data.reference || ""}`,
  };
}

export default async function EditCautionPage({
  params,
}: EditCautionPageProps) {
  const session = await requireAuth();
  const { id } = await params;

  // Vérifier les permissions d'écriture
  if (session.user?.role !== "ADMIN" && session.user?.role !== "AVANCE") {
    redirect(`/cautions/${id}`);
  }

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

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/cautions/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Modifier la Caution
          </h1>
          <p className="text-muted-foreground mt-1">
            {caution.reference || "Caution sans référence"}
          </p>
        </div>
      </div>

      {/* Formulaire */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de la Caution</CardTitle>
          <CardDescription>
            Modifier les détails de la caution bancaire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditCautionContent caution={caution} />
        </CardContent>
      </Card>
    </div>
  );
}
