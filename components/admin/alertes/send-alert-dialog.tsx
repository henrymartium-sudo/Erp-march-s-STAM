"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { sendAlertEmailManual } from "@/lib/actions/alertes-manuelles";
import { toast } from '@/lib/utils/toast';

type SendAlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinataireIds: string[];
  cautionsCount: number;
  marchesCount: number;
};

export function SendAlertDialog({
  open,
  onOpenChange,
  destinataireIds,
  cautionsCount,
  marchesCount,
}: SendAlertDialogProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setSending(true);
    const result = await sendAlertEmailManual(destinataireIds);
    setSending(false);

    if (result.success && result.data) {
      setSent(true);
      toast.success(
        `Email envoyé à ${result.data.emailsSent} destinataire(s)`
      );

      // Fermer après 2 secondes
      setTimeout(() => {
        setSent(false);
        onOpenChange(false);
        router.refresh();
      }, 2000);
    } else {
      toast.error(!result.success ? result.error : "Erreur lors de l'envoi");
    }
  };

  const handleClose = () => {
    if (!sending) {
      setSent(false);
      onOpenChange(false);
    }
  };

  const totalAlertes = cautionsCount + marchesCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {sent ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            {sent ? "Email envoyé avec succès" : "Confirmer l'envoi"}
          </DialogTitle>
          <DialogDescription>
            {sent
              ? "Les alertes ont été envoyées aux destinataires sélectionnés."
              : "Vous êtes sur le point d'envoyer les alertes par email."}
          </DialogDescription>
        </DialogHeader>

        {!sent && (
          <div className="space-y-4 py-4">
            {/* Résumé */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Résumé de l'envoi :</p>
              <ul className="text-sm space-y-1">
                <li>
                  <strong>{cautionsCount}</strong> caution(s) proche(s) de
                  l'échéance
                </li>
                <li>
                  <strong>{marchesCount}</strong> marché(s) en fin d'exécution
                </li>
                <li>
                  <strong>{destinataireIds.length}</strong> destinataire(s)
                  sélectionné(s)
                </li>
              </ul>
            </div>

            {/* Avertissement */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Les emails seront envoyés immédiatement et ne pourront pas être
                annulés.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {sent && (
          <div className="py-8 flex flex-col items-center justify-center gap-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <p className="text-center text-muted-foreground">
              Fermeture automatique...
            </p>
          </div>
        )}

        {!sent && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={sending}
            >
              Annuler
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer maintenant
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
