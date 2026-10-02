"use client";

import { useRouter } from "next/navigation";
import { toast } from '@/lib/utils/toast';
import { CautionForm } from "@/components/cautions";
import type { CautionFormValues } from "@/components/cautions";
import { createCaution } from "@/lib/actions/cautions";
import { TYPES_CAUTION_OPPORTUNITE } from "@/lib/utils/cautions-opportunite";
import type { TypeCaution } from "@prisma/client";

interface NouvelleCautionContentProps {
  marcheId?: string;
  opportuniteId?: string;
  /** Types proposés pour un marché issu d'une opportunité ; absent = les cinq. */
  typesAutorises?: readonly TypeCaution[];
}

export function NouvelleCautionContent({
  marcheId,
  opportuniteId,
  typesAutorises,
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

    // Depuis une opportunité : retour sur son onglet Cautions ; sinon page de détail
    router.push(
      opportuniteId
        ? `/opportunites/${opportuniteId}?onglet=cautions`
        : `/cautions/${result.data.id}`
    );
  };

  return (
    <CautionForm
      marcheId={marcheId}
      opportuniteId={opportuniteId}
      typesAutorises={opportuniteId ? TYPES_CAUTION_OPPORTUNITE : typesAutorises}
      onSubmit={handleSubmit}
    />
  );
}
