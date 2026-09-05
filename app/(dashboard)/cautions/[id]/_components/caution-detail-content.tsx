"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from '@/lib/utils/toast';
import { CautionDetail } from "@/components/cautions";
import { deleteCaution } from "@/lib/actions/cautions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CautionDetailContentProps {
  caution: any; // Données sérialisées depuis le Server Component
  canWrite: boolean;
}

export function CautionDetailContent({
  caution,
  canWrite,
}: CautionDetailContentProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleEdit = () => {
    router.push(`/cautions/${caution.id}/edit`);
  };

  // Le bouton "Supprimer" n'ouvre que la confirmation : aucune suppression
  // n'est déclenchée tant que l'utilisateur n'a pas confirmé explicitement.
  const handleDeleteRequest = () => {
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    startTransition(async () => {
      const result = await deleteCaution(caution.id);

      if (!result.success) {
        toast.error("Erreur", {
          description: result.error,
        });
        return;
      }

      setConfirmOpen(false);

      toast.success("Caution supprimée", {
        description: "La caution a été supprimée avec succès.",
      });

      router.push("/cautions");
      router.refresh();
    });
  };

  return (
    <>
      <CautionDetail
        caution={caution}
        onEdit={canWrite ? handleEdit : undefined}
        onDelete={canWrite ? handleDeleteRequest : undefined}
        showActions={canWrite}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la caution</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez supprimer définitivement la caution &quot;
              {caution.reference}&quot; ({caution.banqueNom}). Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // Empêche la fermeture automatique du dialog tant que
                // la Server Action n'a pas répondu (affichage de l'état "en cours").
                event.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
