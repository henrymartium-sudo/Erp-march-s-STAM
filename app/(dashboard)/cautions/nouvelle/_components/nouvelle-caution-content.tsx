"use client";

import { useRouter } from "next/navigation";
import { toast } from '@/lib/utils/toast';
import { CautionForm } from "@/components/cautions";
import type { CautionFormValues } from "@/components/cautions";
import { createCaution } from "@/lib/actions/cautions";

interface NouvelleCautionContentProps {
  marcheId?: string;
}

export function NouvelleCautionContent({
  marcheId,
}: NouvelleCautionContentProps) {
  const router = useRouter();

  const handleSubmit = async (data: CautionFormValues) => {
    const result = await createCaution(data);

    if (!result.success) {
      toast.error("Erreur", {
        description: result.error,
      });
      throw new Error(result.error);
    }

    toast.success("Caution créée", {
      description: "La caution a été créée avec succès.",
    });

    // Rediriger vers la page de détail
    router.push(`/cautions/${result.data.id}`);
  };

  return (
    <CautionForm
      marcheId={marcheId}
      onSubmit={handleSubmit}
    />
  );
}
