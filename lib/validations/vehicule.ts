import { z } from "zod";
import { StatutVehicule } from "@prisma/client";

/**
 * Validation de l'immatriculation française
 * Formats acceptés :
 * - Ancien format (XX-XXX-XX ou XXXX-XX-XX)
 * - Nouveau format SIV (XX-XXX-XX)
 */
const immatriculationRegex = /^[A-Z]{2}-\d{3}-[A-Z]{2}$|^\d{1,4}[A-Z]{1,3}\d{2}$/;

/**
 * Schema de création d'un véhicule
 */
export const createVehiculeSchema = z.object({
  immatriculation: z
    .string()
    .min(1, "L'immatriculation est obligatoire")
    .max(20, "L'immatriculation ne peut pas dépasser 20 caractères")
    .regex(
      /^[A-Z0-9-]+$/,
      "L'immatriculation ne peut contenir que des lettres majuscules, chiffres et tirets"
    )
    .transform((val) => val.toUpperCase()),

  marque: z
    .string()
    .min(1, "La marque est obligatoire")
    .max(100, "La marque ne peut pas dépasser 100 caractères"),

  modele: z
    .string()
    .min(1, "Le modèle est obligatoire")
    .max(100, "Le modèle ne peut pas dépasser 100 caractères"),

  annee: z
    .number()
    .int("L'année doit être un nombre entier")
    .min(1990, "L'année doit être supérieure ou égale à 1990")
    .max(
      new Date().getFullYear() + 1,
      "L'année ne peut pas être supérieure à l'année prochaine"
    )
    .optional()
    .nullable(),

  // Tracking livraison
  dateLivraison: z.date().optional().nullable(),
  bonLivraisonRef: z
    .string()
    .max(100, "La référence ne peut pas dépasser 100 caractères")
    .optional()
    .nullable(),
  dateReceptionProvisoire: z.date().optional().nullable(),
  dateReceptionDefinitive: z.date().optional().nullable(),
  reservesReception: z
    .string()
    .max(2000, "Les réserves ne peuvent pas dépasser 2000 caractères")
    .optional()
    .nullable(),

  statut: z
    .nativeEnum(StatutVehicule)
    .default(StatutVehicule.EN_ATTENTE_LIVRAISON)
    .optional(),
});

/**
 * Schema de mise à jour d'un véhicule
 * Tous les champs sont optionnels
 */
export const updateVehiculeSchema = createVehiculeSchema.partial();

/**
 * Schema de filtrage des véhicules
 */
export const filterVehiculesSchema = z.object({
  search: z.string().optional(),
  marque: z.string().optional(),
  statut: z.nativeEnum(StatutVehicule).optional(),
  annee: z.number().int().optional(),
  // Pagination
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().positive().max(100).default(50).optional(),
  // Tri
  sortBy: z
    .enum([
      "immatriculation",
      "marque",
      "modele",
      "annee",
      "statut",
      "dateLivraison",
      "createdAt",
    ])
    .default("createdAt")
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

/**
 * Types TypeScript inférés des schémas Zod
 */
export type CreateVehiculeInput = z.infer<typeof createVehiculeSchema>;
export type UpdateVehiculeInput = z.infer<typeof updateVehiculeSchema>;
export type FilterVehiculesInput = z.infer<typeof filterVehiculesSchema>;
