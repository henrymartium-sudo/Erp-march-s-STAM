"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Calendar,
  FileText,
  Mail,
  Eye,
  Send,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import type {
  AlertesActuelles,
  AlerteDestinataire,
} from "@/lib/actions/alertes-manuelles";
import { formatMontant, formatDateCourt } from "@/lib/utils/format";
import { DestinatairesList } from "./destinataires-list";
import { EmailPreviewDialog } from "./email-preview-dialog";
import { SendAlertDialog } from "./send-alert-dialog";

type AlertesDashboardProps = {
  alertes: AlertesActuelles;
  destinataires: AlerteDestinataire[];
};

export function AlertesDashboard({
  alertes,
  destinataires,
}: AlertesDashboardProps) {
  const [selectedDestinataires, setSelectedDestinataires] = useState<string[]>(
    destinataires.filter((d) => d.actif).map((d) => d.id)
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const totalAlertes = alertes.cautions.length + alertes.marches.length;

  const handleToggleDestinataire = (id: string) => {
    setSelectedDestinataires((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedDestinataires(destinataires.map((d) => d.id));
  };

  const handleDeselectAll = () => {
    setSelectedDestinataires([]);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Section Alertes */}
      <div className="space-y-6">
        {/* Cautions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Cautions proches échéance
              <Badge variant="secondary">{alertes.cautions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertes.cautions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune caution proche de l'échéance
              </p>
            ) : (
              <div className="space-y-3">
                {alertes.cautions.map((caution) => (
                  <div
                    key={caution.id}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {caution.reference}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {caution.type}
                        </p>
                      </div>
                      <Badge
                        variant={
                          caution.joursRestants <= 7
                            ? "destructive"
                            : caution.joursRestants <= 15
                              ? "default"
                              : "secondary"
                        }
                      >
                        {caution.joursRestants}j
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatMontant(caution.montant)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateCourt(caution.dateEcheance)}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <FileText className="h-3 w-3 inline mr-1" />
                      {caution.marcheNumero} - {caution.marcheObjet}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Marchés */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Marchés en fin d'exécution
              <Badge variant="secondary">{alertes.marches.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertes.marches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun marché en fin d'exécution
              </p>
            ) : (
              <div className="space-y-3">
                {alertes.marches.map((marche) => (
                  <div
                    key={marche.id}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{marche.numero}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {marche.objet}
                        </p>
                      </div>
                      <Badge
                        variant={
                          marche.joursRestants <= 14
                            ? "destructive"
                            : marche.joursRestants <= 30
                              ? "default"
                              : "secondary"
                        }
                      >
                        {marche.joursRestants}j
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatMontant(marche.montant)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateCourt(marche.dateFinPrevue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section Destinataires & Actions */}
      <div className="space-y-6">
        {/* Destinataires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Destinataires
                <Badge variant="secondary">
                  {selectedDestinataires.length} / {destinataires.length}
                </Badge>
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={
                    selectedDestinataires.length === destinataires.length
                  }
                >
                  Tout sélectionner
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={selectedDestinataires.length === 0}
                >
                  Tout désélectionner
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DestinatairesList
              destinataires={destinataires}
              selectedIds={selectedDestinataires}
              onToggle={handleToggleDestinataire}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Résumé */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Résumé de l'envoi</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Cautions</p>
                  <p className="font-semibold">{alertes.cautions.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Marchés</p>
                  <p className="font-semibold">{alertes.marches.length}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Destinataires</p>
                  <p className="font-semibold">
                    {selectedDestinataires.length}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Boutons d'action */}
            <div className="space-y-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                disabled={totalAlertes === 0}
              >
                <Eye className="mr-2 h-4 w-4" />
                Prévisualiser l'email
              </Button>
              <Button
                className="w-full"
                onClick={() => setSendOpen(true)}
                disabled={
                  totalAlertes === 0 || selectedDestinataires.length === 0
                }
              >
                <Send className="mr-2 h-4 w-4" />
                Envoyer maintenant
              </Button>
            </div>

            {/* Messages d'avertissement */}
            {totalAlertes === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Aucune alerte à envoyer
              </p>
            )}
            {totalAlertes > 0 && selectedDestinataires.length === 0 && (
              <p className="text-xs text-amber-600 text-center">
                Sélectionnez au moins un destinataire
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <EmailPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />
      <SendAlertDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        destinataireIds={selectedDestinataires}
        cautionsCount={alertes.cautions.length}
        marchesCount={alertes.marches.length}
      />
    </div>
  );
}
