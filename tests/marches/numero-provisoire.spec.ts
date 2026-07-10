import { test, expect } from '@playwright/test'
import { isNumeroProvisoire } from '@/lib/utils/marche-numero'

/**
 * Régression audit UI/UX 2026-07 — correctif #3 (MAJEUR)
 * La conversion Opportunité → Marché génère un numéro temporaire
 * « MARCHE-{année}-{compteur} » (lib/actions/opportunites.ts) censé
 * être remplacé par le vrai numéro administratif. Tant que le numéro
 * commence par « MARCHE- », la fiche et la card doivent afficher un
 * badge « Numéro provisoire — à corriger ».
 *
 * Tests node-side sur le helper partagé utilisé par
 * marche-detail.tsx et marche-card.tsx.
 */

test.describe('isNumeroProvisoire — détection du numéro temporaire', () => {
  test('numéro généré par la conversion → provisoire', () => {
    expect(isNumeroProvisoire('MARCHE-2026-001')).toBe(true)
    expect(isNumeroProvisoire('MARCHE-2025-042')).toBe(true)
  })

  test('numéro administratif réel → non provisoire', () => {
    expect(isNumeroProvisoire('AOO/2026/DGMP/012')).toBe(false)
    expect(isNumeroProvisoire('N°045/PRMP/ANAC/2026')).toBe(false)
    expect(isNumeroProvisoire('2026-MARCHE-001')).toBe(false)
  })

  test('chaîne vide → non provisoire', () => {
    expect(isNumeroProvisoire('')).toBe(false)
  })
})
