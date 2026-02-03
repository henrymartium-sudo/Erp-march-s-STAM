import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/utils/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NouvelleChutionContent } from "./_components/nouvelle-caution-content";

export const metadata: Metadata = {
  title: "Nouvelle Caution - ERP Marchés",
  description: "Créer une nouvelle caution bancaire",
};

interface NouvelleCautionPageProps {
  searchParams: Promise<{
    marcheId?: string;
  }>;
}

export default async function NouvelleCautionPage({
  searchParams,
}: NouvelleCautionPageProps) {
  const session = await requireAuth();
  const params = await searchParams;

  // Vérifier les permissions d'écriture
  if (session.user?.role !== "ADMIN" && session.user?.role !== "AVANCE") {
    redirect("/cautions");
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Nouvelle Caution</CardTitle>
          <CardDescription>
            Créer une nouvelle caution ou garantie bancaire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NouvelleChutionContent marcheId={params.marcheId} />
        </CardContent>
      </Card>
    </div>
  );
}
