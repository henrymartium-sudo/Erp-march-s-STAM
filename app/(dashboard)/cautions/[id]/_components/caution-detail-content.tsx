"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CautionDetail } from "@/components/cautions";
import { deleteCaution } from "@/lib/actions/cautions";
import type { CautionWithRelations } from "@/lib/actions/cautions";

interface CautionDetailContentProps {
  caution: CautionWithRelations;
  canWrite: boolean;
}

export function CautionDetailContent({
  caution,
  canWrite,
}: CautionDetailContentProps) {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/cautions/${caution.id}/edit`);
  };

  const handleDelete = async () => {
    const result = await deleteCaution(caution.id);

    if (!result.success) {
      toast.error("Erreur", {
        description: result.error,
      });
      return;
    }

    toast.success("Caution supprimée", {
      description: "La caution a été supprimée avec succès.",
    });

    router.push("/cautions");
  };

  return (
    <CautionDetail
      caution={caution}
      onEdit={canWrite ? handleEdit : undefined}
      onDelete={canWrite ? handleDelete : undefined}
      showActions={canWrite}
    />
  );
}
