import { test, expect } from '@playwright/test'
import { prochainNumeroProvisoire } from '../../lib/utils/marche-numero'

test.describe('prochainNumeroProvisoire', () => {
  test('suit le plus grand numéro provisoire de l\'année', () => {
    expect(prochainNumeroProvisoire(2026, ['MARCHE-2026-007', 'MARCHE-2025-099', 'N°1/2026'])).toBe('MARCHE-2026-008')
  })
  test('aucun numéro → 001', () => {
    expect(prochainNumeroProvisoire(2026, [])).toBe('MARCHE-2026-001')
  })
  test('un trou dans la suite n\'est pas réutilisé (max + 1, pas un compteur)', () => {
    expect(prochainNumeroProvisoire(2026, ['MARCHE-2026-001', 'MARCHE-2026-005'])).toBe('MARCHE-2026-006')
  })
  test('numéros administratifs et autres années ignorés', () => {
    expect(prochainNumeroProvisoire(2026, ['MARCHE-2025-050', 'AO-2026-012'])).toBe('MARCHE-2026-001')
  })
})
