import { StatutVehicule } from "@prisma/client";

/**
 * Libellés des statuts de véhicules
 */
export const STATUT_VEHICULE_LABELS: Record<StatutVehicule, string> = {
  EN_ATTENTE_LIVRAISON: "En attente de livraison",
  LIVRE: "Livré",
  RECEPTION_PROVISOIRE: "Réception provisoire",
  RECEPTION_DEFINITIVE: "Réception définitive",
  GARANTIE: "Sous garantie",
  HORS_SERVICE: "Hors service",
};

/**
 * Couleurs des statuts de véhicules (pour les badges UI)
 */
export const STATUT_VEHICULE_COLORS: Record<
  StatutVehicule,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
> = {
  EN_ATTENTE_LIVRAISON: "secondary",
  LIVRE: "success",
  RECEPTION_PROVISOIRE: "warning",
  RECEPTION_DEFINITIVE: "success",
  GARANTIE: "default",
  HORS_SERVICE: "destructive",
};

/**
 * Liste des marques de véhicules les plus courantes (pour autocomplete)
 */
export const MARQUES_VEHICULES = [
  "Renault",
  "Peugeot",
  "Citroën",
  "Dacia",
  "Ford",
  "Volkswagen",
  "Mercedes-Benz",
  "BMW",
  "Audi",
  "Toyota",
  "Nissan",
  "Hyundai",
  "Kia",
  "Fiat",
  "Opel",
  "Seat",
  "Skoda",
  "Volvo",
  "Autre",
] as const;

/**
 * Années disponibles pour les véhicules (dernières 10 années + année en cours)
 */
export const ANNEES_VEHICULES = Array.from(
  { length: 11 },
  (_, i) => new Date().getFullYear() - i
);

/**
 * Alias pour ANNEES_VEHICULES (rétrocompatibilité)
 */
export const ANNEES_DISPONIBLES = ANNEES_VEHICULES;

/**
 * Couleurs simplifiées pour les graphiques (barres de progression)
 * Mappe chaque statut à une classe Tailwind de couleur de fond
 */
export const STATUT_VEHICULE_COLORS_CHART: Record<StatutVehicule, string> = {
  EN_ATTENTE_LIVRAISON: "bg-yellow-500",
  LIVRE: "bg-green-500",
  RECEPTION_PROVISOIRE: "bg-orange-500",
  RECEPTION_DEFINITIVE: "bg-emerald-500",
  GARANTIE: "bg-blue-500",
  HORS_SERVICE: "bg-red-500",
} as const;
