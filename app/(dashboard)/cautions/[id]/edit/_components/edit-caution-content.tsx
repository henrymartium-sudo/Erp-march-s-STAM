"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CautionForm } from "@/components/cautions";
import type { CautionFormValues } from "@/components/cautions";
import { updateCaution } from "@/lib/actions/cautions";
import type { CautionWithRelations } from "@/lib/actions/cautions";

interface EditCautionContentProps {
  caution: CautionWithRelations;
}

export function EditCautionContent({ caution }: EditCautionContentProps) {
  const router = useRouter();

  const handleSubmit = async (data: CautionFormValues) => {
    const result = await updateCaution({ id: caution.id, ...data });

    if (!result.success) {
      toast.error("Erreur", {
        description: result.error,
      });
      throw new Error(result.error);
    }

    toast.success("Caution modifiée", {
      description: "La caution a été modifiée avec succès.",
    });

    // Rediriger vers la page de détail
    router.push(`/cautions/${caution.id}`);
  };

  return (
    <CautionForm
      caution={caution}
      onSubmit={handleSubmit}
    />
  );
}
