import { test, expect } from '@playwright/test'
import { formaterEcart, formaterPourcentage } from '../../lib/veille/affichage'

test.describe('mise en forme de l’écart', () => {
  test('un écart positif porte le signe plus', () => {
    const t = formaterEcart(25, 1_500_000)
    expect(t).not.toBeNull()
    expect(t!.startsWith('+')).toBe(true)
    expect(t!.endsWith('(+25 %)')).toBe(true)
    expect(t).toContain('FCFA')
  })

  test('un écart négatif garde son signe moins et un écart nul n’a pas de signe', () => {
    expect(formaterEcart(-10, -100)!.endsWith('(-10 %)')).toBe(true)
    expect(formaterEcart(0, 0)!.endsWith('(0 %)')).toBe(true)
  })

  test('arrondit le pourcentage à l’affichage seulement', () => {
    expect(formaterPourcentage(16.666)).toBe('+17 %')
    expect(formaterPourcentage(-0.4)).toBe('0 %')
  })

  test('sans écart calculable, rien à afficher', () => {
    expect(formaterEcart(null, 100)).toBeNull()
    expect(formaterEcart(10, null)).toBeNull()
  })
})
