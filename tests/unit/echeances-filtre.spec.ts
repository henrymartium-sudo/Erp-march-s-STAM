// tests/unit/echeances-filtre.spec.ts
import { test, expect } from '@playwright/test'
import { buildOpportuniteOrderBy, buildOpportuniteWhere } from '../../lib/utils/opportunite-filters'

test('le filtre « à rendre » couvre les statuts avant soumission jusqu\'à J+7, dépassées incluses', () => {
  const now = new Date(Date.UTC(2026, 9, 15, 8, 0))
  const where = buildOpportuniteWhere({ echeance: 'a-rendre' } as never, now) as { AND: unknown[] }
  const json = JSON.stringify(where)
  expect(json).toContain('IDENTIFIEE')
  expect(json).toContain('DOSSIER_EN_PREPARATION')
  expect(json).not.toContain('OFFRE_SOUMISE')
  // même fenêtre que le mail : jusqu'à la fin du jour J+7 (UTC), quelle que soit l'heure du clic
  expect(json).toContain(`"lt":"${new Date(Date.UTC(2026, 9, 23, 0, 0)).toISOString()}"`)
  expect(json).not.toContain('"gte"')
})

test('le filtre « à rendre » trie de l’échéance la plus proche à la plus lointaine, comme le mail', () => {
  const ordre = buildOpportuniteOrderBy('echeance', 'a-rendre')
  expect(JSON.stringify(ordre[0])).toContain('"sort":"asc"')
})
