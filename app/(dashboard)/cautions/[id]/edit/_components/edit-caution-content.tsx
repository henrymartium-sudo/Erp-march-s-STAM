"use client";

import { useRouter } from "next/navigation";
import { toast } from '@/lib/utils/toast';
import { CautionForm } from "@/components/cautions";
import type { CautionFormValues } from "@/components/cautions";
import { updateCaution } from "@/lib/actions/cautions";
import { TYPES_CAUTION_OPPORTUNITE } from "@/lib/utils/cautions-opportunite";
import type { TypeCaution } from "@prisma/client";

interface EditCautionContentProps {
  caution: any; // Données sérialisées depuis le Server Component
  /** Types proposés pour une caution de marché issu d'une opportunité ; absent = les cinq. */
  typesAutorises?: readonly TypeCaution[];
}

export function EditCautionContent({ caution, typesAutorises }: EditCautionContentProps) {
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

    // Caution d'opportunité : retour sur l'onglet Cautions de l'opportunité ; sinon page de détail
    router.push(
      caution.opportuniteId
        ? `/opportunites/${caution.opportuniteId}?onglet=cautions`
        : `/cautions/${caution.id}`
    );
  };

  return (
    <CautionForm
      caution={caution}
      typesAutorises={caution.opportuniteId ? TYPES_CAUTION_OPPORTUNITE : typesAutorises}
      onSubmit={handleSubmit}
    />
  );
}
