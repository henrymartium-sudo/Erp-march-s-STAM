import { test, expect } from '@playwright/test'
import { updateMarcheSchema } from '../../lib/validations/marche'

const MARCHE_ID = 'cmumsqgvf00043otvgsu7yffx'

const infructueux = {
  id: MARCHE_ID,
  statut: 'INFRUCTUEUX' as const,
  dateInfructueux: new Date('2026-10-01'),
  motifsInfructueux: 'Offre jugée non conforme au cahier des charges',
}

test.describe('marché infructueux : concurrent gagnant exigé', () => {
  test('refusé sans concurrent gagnant', () => {
    const r = updateMarcheSchema.safeParse(infructueux)
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.map((i) => i.path.join('.'))).toContain('concurrentGagnant')
    }
  })

  test('refusé quand le concurrent gagnant est vide ou ne contient que des espaces', () => {
    for (const concurrentGagnant of ['', '   ', null]) {
      const r = updateMarcheSchema.safeParse({ ...infructueux, concurrentGagnant })
      expect(r.success).toBe(false)
    }
  })

  test('accepté avec un concurrent gagnant, montant du concurrent facultatif', () => {
    const r = updateMarcheSchema.safeParse({ ...infructueux, concurrentGagnant: 'Société Test' })
    expect(r.success).toBe(true)
  })

  test('un autre statut n\'exige pas de concurrent gagnant', () => {
    const r = updateMarcheSchema.safeParse({ id: MARCHE_ID, statut: 'EN_EXECUTION' })
    expect(r.success).toBe(true)
  })
})
