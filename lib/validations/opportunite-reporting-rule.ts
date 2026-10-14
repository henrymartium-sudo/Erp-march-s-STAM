// lib/validations/opportunite-reporting-rule.ts
import { z } from 'zod'
import { MAX_DESTINATAIRES, nettoyerDestinataires } from '@/lib/email/envoi-destinataires'

export const ReportingScheduleConfigSchema = z
  .object({
    type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'MANUAL']),
    hour: z.number().int().min(0).max(23),
    days: z.array(z.number().int().min(1).max(31)).optional(),
  })
  .nullable()

export const OpportuniteReportingRuleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  reportType: z.enum(['SUIVI', 'ECHEANCES_MATIN']).default('SUIVI'),
  recipientEmails: z
    .array(z.string().email('Adresse e-mail invalide'))
    .min(1, 'Sélectionnez au moins un destinataire')
    .max(MAX_DESTINATAIRES, `Au plus ${MAX_DESTINATAIRES} destinataires`)
    .transform(nettoyerDestinataires),
  scheduleConfig: ReportingScheduleConfigSchema.optional().default(null),
  isActive: z.boolean().default(true),
})
