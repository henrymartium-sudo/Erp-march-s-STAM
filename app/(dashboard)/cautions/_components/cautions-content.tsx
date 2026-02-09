"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SerializedCaution } from "@/types/serialized";
import { CautionFilters, CautionList } from "@/components/cautions";
import type { CautionFiltersState } from "@/components/cautions";
import { Card } from "@/components/ui/card";

interface CautionsContentProps {
  cautions: SerializedCaution[];
  canWrite: boolean;
}

export function CautionsContent({ cautions, canWrite }: CautionsContentProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<CautionFiltersState>({});

  // Filtrage des cautions
  const filteredCautions = cautions.filter((caution) => {
    // Filtre par type
    if (filters.types && filters.types.length > 0) {
      if (!filters.types.includes(caution.type)) return false;
    }

    // Filtre par statut
    if (filters.statuts && filters.statuts.length > 0) {
      if (!filters.statuts.includes(caution.statut)) return false;
    }

    // Filtre par niveau d'alerte
    if (filters.niveauAlerte && caution.dateEcheance) {
      const jours = Math.ceil(
        (new Date(caution.dateEcheance).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      );

      if (filters.niveauAlerte === "CRITIQUE" && (jours > 7 || jours < 0)) {
        return false;
      }
      if (
        filters.niveauAlerte === "ATTENTION" &&
        (jours > 30 || jours < 0)
      ) {
        return false;
      }
      if (filters.niveauAlerte === "INFO" && (jours > 60 || jours < 0)) {
        return false;
      }
    }

    // Filtre par date d'émission
    if (filters.dateEmissionDebut) {
      if (
        new Date(caution.dateEmission) < new Date(filters.dateEmissionDebut)
      ) {
        return false;
      }
    }
    if (filters.dateEmissionFin) {
      if (new Date(caution.dateEmission) > new Date(filters.dateEmissionFin)) {
        return false;
      }
    }

    // Filtre par date d'échéance
    if (filters.dateEcheanceDebut && caution.dateEcheance) {
      if (
        new Date(caution.dateEcheance) < new Date(filters.dateEcheanceDebut)
      ) {
        return false;
      }
    }
    if (filters.dateEcheanceFin && caution.dateEcheance) {
      if (new Date(caution.dateEcheance) > new Date(filters.dateEcheanceFin)) {
        return false;
      }
    }

    // Filtre par recherche
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchReference = caution.reference
        ?.toLowerCase()
        .includes(searchLower);
      const matchBanque = caution.banqueNom
        ?.toLowerCase()
        .includes(searchLower);
      const matchMarche = caution.marche?.objet
        ?.toLowerCase()
        .includes(searchLower);

      if (!matchReference && !matchBanque && !matchMarche) {
        return false;
      }
    }

    return true;
  });

  // Callbacks pour édition et suppression (uniquement si l'utilisateur a les permissions)
  const handleEdit = canWrite
    ? (id: string) => {
        router.push(`/cautions/${id}/edit`);
      }
    : undefined;

  const handleDelete = canWrite
    ? (id: string) => {
        // La suppression sera gérée par le composant CautionDetail
        router.push(`/cautions/${id}`);
      }
    : undefined;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Filtres */}
        <CautionFilters filters={filters} onFiltersChange={setFilters} />

        {/* Liste */}
        <CautionList
          cautions={filteredCautions}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </Card>
  );
}
