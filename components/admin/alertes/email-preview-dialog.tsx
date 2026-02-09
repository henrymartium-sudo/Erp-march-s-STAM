"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Eye } from "lucide-react";
import { previewAlertEmail } from "@/lib/actions/alertes-manuelles";
import { toast } from "sonner";

type EmailPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EmailPreviewDialog({
  open,
  onOpenChange,
}: EmailPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    html: string;
    subject: string;
    summary: string;
  } | null>(null);

  useEffect(() => {
    if (open && !preview) {
      loadPreview();
    }
  }, [open]);

  const loadPreview = async () => {
    setLoading(true);
    const result = await previewAlertEmail();
    setLoading(false);

    if (result.success && result.data) {
      setPreview(result.data);
    } else {
      toast.error(!result.success ? result.error : "Erreur lors de la prévisualisation");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Prévisualisation de l'email
          </DialogTitle>
          {preview && (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <strong>Sujet :</strong> {preview.subject}
              </p>
              <p className="text-xs">{preview.summary}</p>
            </div>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : preview ? (
          <div className="flex-1 overflow-y-auto border rounded-lg bg-white">
            <iframe
              srcDoc={preview.html}
              className="w-full h-full min-h-[500px]"
              title="Email Preview"
            />
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            Aucune prévisualisation disponible
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {preview && (
            <Button onClick={loadPreview} variant="secondary">
              Actualiser
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
