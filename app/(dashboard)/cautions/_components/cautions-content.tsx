"use client";

import { useRouter } from "next/navigation";
import type { SerializedCaution } from "@/types/serialized";
import { CautionFilters, CautionList } from "@/components/cautions";
import { Card } from "@/components/ui/card";

interface CautionsContentProps {
  cautions: SerializedCaution[];
  canWrite: boolean;
}

/**
 * Le filtrage et la pagination sont entièrement pilotés par l'URL et appliqués
 * côté serveur (voir CautionFilters et getCautions) : les cautions reçues ici
 * sont déjà filtrées et paginées, aucun re-filtrage client n'est nécessaire.
 */
export function CautionsContent({ cautions, canWrite }: CautionsContentProps) {
  const router = useRouter();

  const handleEdit = canWrite
    ? (id: string) => {
        router.push(`/cautions/${id}/edit`);
      }
    : undefined;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Filtres (pilotés par l'URL) */}
        <CautionFilters />

        {/* Liste */}
        <CautionList cautions={cautions} onEdit={handleEdit} />
      </div>
    </Card>
  );
}
