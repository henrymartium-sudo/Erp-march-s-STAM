"use client";

import { useState } from "react";
import { toast } from '@/lib/utils/toast';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, User } from "lucide-react";
import type { AlerteDestinataire } from "@/lib/actions/alertes-manuelles";
import {
  addDestinataire,
  removeDestinataire,
} from "@/lib/actions/alertes-manuelles";

type DestinatairesListProps = {
  destinataires: AlerteDestinataire[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

export function DestinatairesList({
  destinataires,
  selectedIds,
  onToggle,
}: DestinatairesListProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newNom, setNewNom] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newEmail.trim()) {
      toast.error("L'email est requis");
      return;
    }

    setIsAdding(true);
    const result = await addDestinataire(newEmail, newNom || undefined);
    setIsAdding(false);

    if (result.success) {
      toast.success("Destinataire ajouté avec succès");
      setNewEmail("");
      setNewNom("");
      setAddDialogOpen(false);
    } else {
      toast.error(result.error || "Erreur lors de l'ajout");
    }
  };

  const handleRemove = async (id: string, email: string) => {
    const confirmed = confirm(
      `Êtes-vous sûr de vouloir supprimer ${email} ?`
    );
    if (!confirmed) return;

    const result = await removeDestinataire(id);
    if (result.success) {
      toast.success("Destinataire supprimé");
    } else {
      toast.error(result.error || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-4">
      {/* Liste */}
      {destinataires.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun destinataire configuré
        </p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {destinataires.map((dest) => (
            <div
              key={dest.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Checkbox
                  id={dest.id}
                  checked={selectedIds.includes(dest.id)}
                  onCheckedChange={() => onToggle(dest.id)}
                  disabled={!dest.actif}
                />
                <label
                  htmlFor={dest.id}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {dest.nom && (
                        <p className="text-sm font-medium truncate">
                          {dest.nom}
                        </p>
                      )}
                      <p
                        className={`text-xs ${dest.nom ? "text-muted-foreground" : "text-sm font-medium"} truncate`}
                      >
                        {dest.email}
                      </p>
                    </div>
                  </div>
                </label>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(dest.id, dest.email)}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Bouton Ajouter */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un destinataire
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un destinataire</DialogTitle>
            <DialogDescription>
              Ajoutez une nouvelle personne pour recevoir les alertes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemple@domaine.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={isAdding}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom (optionnel)</Label>
              <Input
                id="nom"
                placeholder="Jean Dupont"
                value={newNom}
                onChange={(e) => setNewNom(e.target.value)}
                disabled={isAdding}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={isAdding}
            >
              Annuler
            </Button>
            <Button onClick={handleAdd} disabled={isAdding}>
              {isAdding ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
