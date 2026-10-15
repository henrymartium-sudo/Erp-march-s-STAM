import { test, expect } from '@playwright/test'
import { construireSuiviOpportunites } from '../../lib/email/opportunite-reporting-suivi'
import type { OpportuniteForReporting } from '../../lib/email/opportunite-reporting-templates'

const now = new Date('2026-10-14T08:00:00Z')
const opp: OpportuniteForReporting = {
  id: '1', reference: 'REF-1', objet: 'Objet', autoriteContractante: 'Autorité', statut: 'GO',
  montantEstime: null, lots: [], dateLimite: null, periodeValiditeDebut: null, periodeValiditeFin: null,
  echeanceAttributionProv: null, notes: null,
}

test('le suivi contient le mail et une pièce jointe Excel nommée par date', async () => {
  const r = await construireSuiviOpportunites('Règle', [opp], now)
  expect(r.subject).toContain('14/10/2026')
  expect(r.html).toContain('Suivi des opportunités')
  expect(r.attachments).toHaveLength(1)
  expect(r.attachments[0]!.filename).toBe('suivi-opportunites-2026-10-14.xlsx')
  expect(r.attachments[0]!.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  expect(r.attachments[0]!.content.length).toBeGreaterThan(1000)
})
