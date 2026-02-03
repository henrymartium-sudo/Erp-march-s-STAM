"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CautionCard, CautionTimeline } from "@/components/cautions";
import { getCautionsByMarche } from "@/lib/actions/cautions";
import type { CautionWithRelations } from "@/lib/actions/cautions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface MarcheCautionsSectionProps {
  marcheId: string;
}

export function MarcheCautionsSection({
  marcheId,
}: MarcheCautionsSectionProps) {
  const [cautions, setCautions] = useState<CautionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCautions = async () => {
      setLoading(true);
      setError(null);

      const result = await getCautionsByMarche(marcheId);

      if (!result.success) {
        setError(result.error || "Erreur lors du chargement des cautions");
        setLoading(false);
        return;
      }

      setCautions(result.data);
      setLoading(false);
    };

    loadCautions();
  }, [marcheId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Erreur</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Statistiques des cautions
  const cautionsActives = cautions.filter((c) => c.statut === "ACTIVE");
  const montantTotal = cautionsActives.reduce((sum, c) => {
    const montant = typeof c.montant === "number"
      ? c.montant
      : c.montant.toNumber();
    return sum + montant;
  }, 0);
  const cautionsCritiques = cautions.filter((c) => {
    if (c.statut !== "ACTIVE" || !c.dateEcheance) return false;
    const jours = Math.ceil(
      (new Date(c.dateEcheance).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return jours <= 7 && jours >= 0;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Cautions & Garanties</CardTitle>
            <CardDescription>
              {cautions.length === 0
                ? "Aucune caution associée à ce marché"
                : `${cautions.length} caution${cautions.length > 1 ? "s" : ""} • ${cautionsActives.length} active${cautionsActives.length > 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href={`/cautions/nouvelle?marcheId=${marcheId}`}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiques */}
        {cautions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Cautions Actives</CardDescription>
                <CardTitle className="text-2xl">
                  {cautionsActives.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Montant Total</CardDescription>
                <CardTitle className="text-2xl">
                  {new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0,
                  }).format(montantTotal)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Alertes Critiques</CardDescription>
                <CardTitle className="text-2xl text-destructive">
                  {cautionsCritiques.length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Timeline des échéances */}
        {cautionsActives.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3">
              Échéances à venir ({cautionsActives.length})
            </h3>
            <CautionTimeline cautions={cautionsActives} maxItems={5} />
          </div>
        )}

        {/* Liste des cautions */}
        {cautions.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium mb-3">
              Toutes les cautions ({cautions.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cautions.map((caution) => (
                <CautionCard
                  key={caution.id}
                  caution={caution}
                  mode="compact"
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucune caution associée à ce marché.</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href={`/cautions/nouvelle?marcheId=${marcheId}`}>
                <Plus className="h-4 w-4 mr-2" />
                Créer la première caution
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
