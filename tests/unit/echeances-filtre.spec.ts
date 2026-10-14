// tests/unit/echeances-filtre.spec.ts
import { test, expect } from '@playwright/test'
import { buildOpportuniteWhere } from '../../lib/utils/opportunite-filters'

test('le filtre « à rendre » couvre les statuts avant soumission jusqu\'à J+7, dépassées incluses', () => {
  const now = new Date(Date.UTC(2026, 9, 15, 8, 0))
  const where = buildOpportuniteWhere({ echeance: 'a-rendre' } as never, now) as { AND: unknown[] }
  const json = JSON.stringify(where)
  expect(json).toContain('IDENTIFIEE')
  expect(json).toContain('DOSSIER_EN_PREPARATION')
  expect(json).not.toContain('OFFRE_SOUMISE')
  expect(json).toContain(new Date(Date.UTC(2026, 9, 22, 8, 0)).toISOString())
  expect(json).not.toContain('"gte"')
})
