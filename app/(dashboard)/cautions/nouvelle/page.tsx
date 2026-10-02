import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/utils/permissions";
import { prisma } from "@/lib/db/prisma";
import { cautionsOpportuniteVisibles } from "@/lib/utils/cautions-opportunite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NouvelleCautionContent } from "./_components/nouvelle-caution-content";

export const metadata: Metadata = {
  title: "Nouvelle Caution - ERP Marchés",
  description: "Créer une nouvelle caution bancaire",
};

interface NouvelleCautionPageProps {
  searchParams: Promise<{
    marcheId?: string;
    opportuniteId?: string;
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

  // Création depuis une opportunité : elle doit exister et être au statut « Dossier en préparation » ou au-delà
  let opportunite: { id: string; objet: string } | null = null;
  if (params.opportuniteId) {
    const trouvee = await prisma.opportunite.findUnique({
      where: { id: params.opportuniteId },
      select: { id: true, objet: true, statut: true },
    });
    if (!trouvee) redirect("/opportunites");
    if (!cautionsOpportuniteVisibles(trouvee.statut)) redirect(`/opportunites/${trouvee.id}`);
    opportunite = { id: trouvee.id, objet: trouvee.objet };
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-4">
      {opportunite && (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/opportunites/${opportunite.id}?onglet=cautions`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l&apos;opportunité
          </Link>
        </Button>
      )}
      <h1 className="sr-only">Nouvelle caution</h1>
      <Card>
        <CardHeader>
          <CardTitle>Nouvelle Caution</CardTitle>
          <CardDescription>
            {opportunite
              ? `Rattachée à l'opportunité « ${opportunite.objet} » : caution de soumission ou de capacité financière`
              : "Créer une nouvelle caution ou garantie bancaire"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NouvelleCautionContent marcheId={params.marcheId} opportuniteId={opportunite?.id} />
        </CardContent>
      </Card>
    </div>
  );
}
