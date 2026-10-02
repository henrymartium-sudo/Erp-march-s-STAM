"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CautionCard, CautionTimeline } from "@/components/cautions";
import { DetacherCautionButton } from "@/components/cautions/detacher-caution-button";
import { RattacherCautionDialog } from "@/components/opportunites/rattacher-caution-dialog";
import {
  getCautionsByMarche,
  getCautionsOpportuniteByMarche,
  getContexteCautionsMarche,
  type ContexteCautionsMarche,
} from "@/lib/actions/cautions";
import type { SerializedCaution } from "@/types/serialized";
import { formatMontant } from "@/lib/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { serializeMarche } from "@/lib/utils/serialize";

interface MarcheCautionsSectionProps {
  marcheId: string;
  /** Création, rattachement, modification et détachement : ADMIN et AVANCE seulement. */
  canWrite?: boolean;
}

/**
 * Sérialise les données Prisma reçues via Server Action pour les Client Components.
 * Les Server Actions sérialisent automatiquement mais les Decimal deviennent des strings.
 */
function serializeCautionFromAction(caution: any): SerializedCaution {
  return {
    ...caution,
    montant: Number(caution.montant),
    dateEmission: typeof caution.dateEmission === 'string'
      ? caution.dateEmission
      : caution.dateEmission instanceof Date
        ? caution.dateEmission.toISOString()
        : String(caution.dateEmission),
    dateEcheance: typeof caution.dateEcheance === 'string'
      ? caution.dateEcheance
      : caution.dateEcheance instanceof Date
        ? caution.dateEcheance.toISOString()
        : String(caution.dateEcheance),
    createdAt: typeof caution.createdAt === 'string'
      ? caution.createdAt
      : caution.createdAt instanceof Date
        ? caution.createdAt.toISOString()
        : String(caution.createdAt),
    updatedAt: typeof caution.updatedAt === 'string'
      ? caution.updatedAt
      : caution.updatedAt instanceof Date
        ? caution.updatedAt.toISOString()
        : String(caution.updatedAt),
    marche: caution.marche ? serializeMarche(caution.marche) : undefined,
  };
}

export function MarcheCautionsSection({
  marcheId,
  canWrite = false,
}: MarcheCautionsSectionProps) {
  const router = useRouter();
  const [cautions, setCautions] = useState<SerializedCaution[]>([]);
  // Origine du marché : un marché issu d'une opportunité ne porte que les cautions d'après attribution
  const [contexte, setContexte] = useState<ContexteCautionsMarche | null>(null);
  // Cautions des opportunités liées au marché (soumission, capacité financière), en lecture ici
  const [cautionsOpportunite, setCautionsOpportunite] = useState<SerializedCaution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // `silencieux` : rechargement après un rattachement ou un détachement, sans repasser par l'état de chargement
  const loadCautions = useCallback(async (silencieux = false) => {
    if (!silencieux) setLoading(true);
    setError(null);

    const [result, resultOpportunite, resultContexte] = await Promise.all([
      getCautionsByMarche(marcheId),
      getCautionsOpportuniteByMarche(marcheId),
      getContexteCautionsMarche(marcheId),
    ]);

    if (!result.success) {
      setError(result.error || "Erreur lors du chargement des cautions");
      setLoading(false);
      return;
    }

    setCautions(result.data.map(serializeCautionFromAction));
    // Un échec de lecture des cautions d'opportunité ne masque pas celles du marché
    setCautionsOpportunite(
      resultOpportunite.success ? resultOpportunite.data.map(serializeCautionFromAction) : []
    );
    setContexte(resultContexte.success ? resultContexte.data : null);
    setLoading(false);
  }, [marcheId]);

  useEffect(() => {
    loadCautions();
  }, [loadCautions]);

  const recharger = () => {
    loadCautions(true);
    router.refresh();
  };

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

  // Statistiques : les cautions du marché et celles de son opportunité d'origine
  // (les montants sont déjà des numbers après sérialisation)
  const toutes = [...cautions, ...cautionsOpportunite];
  const cautionsActives = toutes.filter((c) => c.statut === "ACTIVE");
  const montantTotal = cautionsActives.reduce(
    (sum, c) => sum + c.montant,
    0
  );
  const cautionsCritiques = toutes.filter((c) => {
    if (c.statut !== "ACTIVE" || !c.dateEcheance) return false;
    const jours = Math.ceil(
      (new Date(c.dateEcheance).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return jours <= 7 && jours >= 0;
  });

  // Regroupement des cautions d'opportunité par opportunité (en pratique une seule)
  const groupesOpportunite = Object.values(
    cautionsOpportunite.reduce<Record<string, { opportunite: { id: string; objet: string }; cautions: SerializedCaution[] }>>(
      (acc, c) => {
        if (!c.opportunite) return acc;
        (acc[c.opportunite.id] ??= { opportunite: c.opportunite, cautions: [] }).cautions.push(c);
        return acc;
      },
      {}
    )
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Cautions & Garanties</CardTitle>
            <CardDescription>
              {toutes.length === 0
                ? "Aucune caution associée à ce marché"
                : `${toutes.length} caution${toutes.length > 1 ? "s" : ""} • ${cautionsActives.length} active${cautionsActives.length > 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          {canWrite && (
            <div className="flex items-center gap-2">
              <RattacherCautionDialog marcheId={marcheId} onDone={recharger} />
              <Button asChild size="sm">
                <Link href={`/cautions/nouvelle?marcheId=${marcheId}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer
                </Link>
              </Button>
            </div>
          )}
        </div>
        {/* Marché issu d'une opportunité : les deux types d'avant dépôt se gèrent sur l'opportunité */}
        {contexte?.issuDOpportunite && contexte.opportunite && (
          <p className="text-sm text-muted-foreground">
            Les cautions de soumission et de capacité financière se gèrent depuis{" "}
            <Link
              href={`/opportunites/${contexte.opportunite.id}?onglet=cautions`}
              className="text-primary hover:underline"
            >
              l&apos;opportunité d&apos;origine
            </Link>
            .
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiques */}
        {toutes.length > 0 && (
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
                  {formatMontant(montantTotal)}
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
        {toutes.length > 0 ? (
          <div className="space-y-6">
            {cautions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">
                  Cautions du marché ({cautions.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cautions.map((caution) => (
                    <div key={caution.id} className="space-y-1">
                      <CautionCard
                        caution={caution}
                        mode="compact"
                        onEdit={canWrite ? (id) => router.push(`/cautions/${id}/edit`) : undefined}
                      />
                      {canWrite && (
                        <DetacherCautionButton caution={caution} cible="marche" onDone={recharger} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Cautions de l'opportunité d'origine : marquées comme telles, avec un lien vers elle */}
            {groupesOpportunite.map((groupe) => (
              <div key={groupe.opportunite.id}>
                <h3 className="text-sm font-medium mb-1">
                  Issues de l&apos;opportunité ({groupe.cautions.length})
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  <Link
                    href={`/opportunites/${groupe.opportunite.id}?onglet=cautions`}
                    className="text-primary hover:underline"
                  >
                    {groupe.opportunite.objet}
                  </Link>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupe.cautions.map((caution) => (
                    <CautionCard
                      key={caution.id}
                      caution={caution}
                      mode="compact"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucune caution associée à ce marché.</p>
            {canWrite && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button asChild variant="outline">
                  <Link href={`/cautions/nouvelle?marcheId=${marcheId}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer la première caution
                  </Link>
                </Button>
                <RattacherCautionDialog marcheId={marcheId} onDone={recharger} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
