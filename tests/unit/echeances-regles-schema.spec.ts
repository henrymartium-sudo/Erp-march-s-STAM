// tests/unit/echeances-regles-schema.spec.ts
import { test, expect } from '@playwright/test'
import { OpportuniteReportingRuleSchema } from '../../lib/validations/opportunite-reporting-rule'

const base = { name: 'Échéances du matin', recipientEmails: ['a@x.test'], scheduleConfig: { type: 'DAILY', hour: 8 } }

test.describe('schéma des règles d\'envoi', () => {
  test('type par défaut : SUIVI', () => {
    expect(OpportuniteReportingRuleSchema.parse(base).reportType).toBe('SUIVI')
  })
  test('type ECHEANCES_MATIN accepté, type inconnu refusé', () => {
    expect(OpportuniteReportingRuleSchema.parse({ ...base, reportType: 'ECHEANCES_MATIN' }).reportType).toBe('ECHEANCES_MATIN')
    expect(OpportuniteReportingRuleSchema.safeParse({ ...base, reportType: 'AUTRE' }).success).toBe(false)
  })
  test('destinataires nettoyés (casse, espaces, doublons)', () => {
    const r = OpportuniteReportingRuleSchema.parse({ ...base, recipientEmails: ['A@x.test', 'a@x.test', 'b@x.test'] })
    expect(r.recipientEmails).toEqual(['a@x.test', 'b@x.test'])
  })
  test('au moins un destinataire, au plus 20', () => {
    expect(OpportuniteReportingRuleSchema.safeParse({ ...base, recipientEmails: [] }).success).toBe(false)
    const trop = Array.from({ length: 21 }, (_, i) => `u${i}@x.test`)
    expect(OpportuniteReportingRuleSchema.safeParse({ ...base, recipientEmails: trop }).success).toBe(false)
  })
})
