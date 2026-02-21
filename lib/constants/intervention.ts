import { TypeIntervention, StatutIntervention } from "@prisma/client";

export const TYPE_INTERVENTION_LABELS: Record<TypeIntervention, string> = {
  PANNE: "Panne",
  ENTRETIEN: "Entretien",
  RAPPEL: "Rappel constructeur",
};

export const STATUT_INTERVENTION_LABELS: Record<StatutIntervention, string> = {
  SIGNALE: "Signalé",
  DIAGNOSTIC: "En diagnostic",
  EN_COURS: "En cours",
  RESOLU: "Résolu",
  CLOS: "Clos",
};

export const STATUT_INTERVENTION_COLORS: Record<
  StatutIntervention,
  "secondary" | "warning" | "default" | "success" | "muted"
> = {
  SIGNALE: "secondary",
  DIAGNOSTIC: "warning",
  EN_COURS: "default",
  RESOLU: "success",
  CLOS: "muted",
};
