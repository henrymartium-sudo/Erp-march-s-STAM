import { test, expect } from '@playwright/test'
import { getMarcheUrgency } from '@/lib/utils/urgence'

/**
 * Régression audit UI/UX 2026-07 — correctif #2 (MAJEUR)
 * Un marché en statut terminal (CLOTURE, RESILIE, ANNULE, INFRUCTUEUX)
 * ne doit plus afficher de badge d'urgence « Dépassé de X j » :
 * l'urgence n'a de sens que pour un marché encore actif.
 *
 * Tests node-side (pas de navigateur) sur la logique partagée
 * utilisée par components/marches/marche-card.tsx.
 */

const PAST_DATE = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // -90 jours
const FUTURE_DATE = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // +60 jours

test.describe('getMarcheUrgency — urgence selon statut', () => {
  test('statut actif + échéance dépassée → badge overdue', () => {
    const urgency = getMarcheUrgency('EN_EXECUTION', PAST_DATE)
    expect(urgency).not.toBeNull()
    expect(urgency!.level).toBe('overdue')
  })

  test('statut actif + échéance future → badge présent', () => {
    const urgency = getMarcheUrgency('EN_EXECUTION', FUTURE_DATE)
    expect(urgency).not.toBeNull()
  })

  for (const statut of ['CLOTURE', 'RESILIE', 'ANNULE', 'INFRUCTUEUX'] as const) {
    test(`statut terminal ${statut} + échéance dépassée → pas de badge`, () => {
      expect(getMarcheUrgency(statut, PAST_DATE)).toBeNull()
    })
  }

  test('sans date de fin prévue → pas de badge', () => {
    expect(getMarcheUrgency('EN_EXECUTION', null)).toBeNull()
    expect(getMarcheUrgency('EN_EXECUTION', undefined)).toBeNull()
  })

  test('accepte une date sérialisée (string ISO)', () => {
    const urgency = getMarcheUrgency('EN_EXECUTION', PAST_DATE.toISOString())
    expect(urgency).not.toBeNull()
    expect(urgency!.level).toBe('overdue')
  })
})
