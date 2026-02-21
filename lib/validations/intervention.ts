import { z } from 'zod'
import { TypeIntervention, StatutIntervention } from '@prisma/client'

export const createInterventionSchema = z.object({
  vehiculeId: z.string().min(1, "L'ID du véhicule est obligatoire"),
  type: z.nativeEnum(TypeIntervention),
  sousGarantie: z.boolean().default(true),
  signaleAt: z.date().optional(),
  immobiliseAt: z.date().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  cout: z.number().min(0).optional().nullable(),
})

export const updateInterventionStatutSchema = z.object({
  id: z.string().min(1),
  statut: z.nativeEnum(StatutIntervention),
  immobiliseAt: z.date().optional().nullable(),
  resolveAt: z.date().optional().nullable(),
})

export const updateCommentaireContractuelSchema = z.object({
  id: z.string().min(1),
  commentaireContractuel: z.string().max(2000).nullable(),
})

export const filterInterventionsSchema = z.object({
  vehiculeId: z.string().optional(),
  type: z.nativeEnum(TypeIntervention).optional(),
  statut: z.nativeEnum(StatutIntervention).optional(),
  sousGarantie: z.boolean().optional(),
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().positive().max(100).default(50).optional(),
})

export type CreateInterventionInput = z.infer<typeof createInterventionSchema>
export type UpdateInterventionStatutInput = z.infer<typeof updateInterventionStatutSchema>
export type UpdateCommentaireContractuelInput = z.infer<typeof updateCommentaireContractuelSchema>
export type FilterInterventionsInput = z.infer<typeof filterInterventionsSchema>
