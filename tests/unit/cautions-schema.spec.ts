import { test, expect } from '@playwright/test'
import { createCautionSchema } from '../../lib/validations/caution'

const OPPORTUNITE_ID = 'cmumsqgvf00043otvgsu7yffx'

const base = {
  reference: 'CAU-TEST-001',
  type: 'SOUMISSION' as const,
  montant: 1500000,
  dateEmission: new Date('2026-10-01'),
  dateEcheance: new Date('2027-02-01'),
  statut: 'LIBEREE' as const,
  banqueNom: 'Banque Test',
}

test.describe('caution de soumission libérée', () => {
  test('refusée sans rattachement (règle historique des marchés)', () => {
    const r = createCautionSchema.safeParse(base)
    expect(r.success).toBe(false)
  })

  test('acceptée quand elle est rattachée à une opportunité', () => {
    const r = createCautionSchema.safeParse({ ...base, opportuniteId: OPPORTUNITE_ID })
    expect(r.success).toBe(true)
  })

  test('toujours refusée pour une caution de marché (lien d\'opportunité vide)', () => {
    const r = createCautionSchema.safeParse({ ...base, opportuniteId: '', marcheId: OPPORTUNITE_ID })
    expect(r.success).toBe(false)
  })

  test('un statut actif reste accepté dans tous les cas', () => {
    expect(createCautionSchema.safeParse({ ...base, statut: 'ACTIVE' }).success).toBe(true)
    expect(createCautionSchema.safeParse({ ...base, statut: 'ACTIVE', opportuniteId: OPPORTUNITE_ID }).success).toBe(true)
  })
})
