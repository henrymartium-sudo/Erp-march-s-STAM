import { describe, expect, it } from 'vitest'
import { shouldRunRuleToday } from './schedule-checker'

describe('shouldRunRuleToday', () => {
  it('config null/undefined -> toujours true (comportement historique préservé)', () => {
    expect(shouldRunRuleToday(null)).toBe(true)
    expect(shouldRunRuleToday(undefined)).toBe(true)
  })

  it('DAILY -> toujours true', () => {
    expect(shouldRunRuleToday({ type: 'DAILY' }, new Date('2026-03-05'))).toBe(true)
  })

  describe('WEEKLY', () => {
    it('sans daysOfWeek -> toujours true', () => {
      expect(shouldRunRuleToday({ type: 'WEEKLY' }, new Date('2026-03-05'))).toBe(true)
    })

    it('exécute uniquement les jours listés (0=dimanche)', () => {
      // 2026-03-02 est un lundi (jour 1)
      const lundi = new Date('2026-03-02T10:00:00')
      expect(lundi.getDay()).toBe(1)

      expect(shouldRunRuleToday({ type: 'WEEKLY', daysOfWeek: [1, 5] }, lundi)).toBe(true)
      expect(shouldRunRuleToday({ type: 'WEEKLY', daysOfWeek: [2, 5] }, lundi)).toBe(false)
    })
  })

  describe('MONTHLY', () => {
    it('sans dayOfMonth -> toujours true', () => {
      expect(shouldRunRuleToday({ type: 'MONTHLY' }, new Date('2026-03-05'))).toBe(true)
    })

    it('exécute uniquement le jour du mois configuré', () => {
      const le15 = new Date('2026-03-15T10:00:00')
      expect(shouldRunRuleToday({ type: 'MONTHLY', dayOfMonth: 15 }, le15)).toBe(true)
      expect(shouldRunRuleToday({ type: 'MONTHLY', dayOfMonth: 16 }, le15)).toBe(false)
    })
  })

  describe('INTERVAL', () => {
    it('intervalDays <= 1 -> toujours true', () => {
      expect(shouldRunRuleToday({ type: 'INTERVAL', intervalDays: 1 }, new Date('2026-03-05'))).toBe(true)
      expect(shouldRunRuleToday({ type: 'INTERVAL' }, new Date('2026-03-05'))).toBe(true)
    })

    it('exécute tous les N jours à partir de la date de référence (2024-01-01)', () => {
      // Référence = 2024-01-01. +10 jours = exécution attendue pour intervalDays=10.
      const dixJoursApres = new Date('2024-01-11T00:00:00')
      expect(shouldRunRuleToday({ type: 'INTERVAL', intervalDays: 10 }, dixJoursApres)).toBe(true)

      const neufJoursApres = new Date('2024-01-10T00:00:00')
      expect(shouldRunRuleToday({ type: 'INTERVAL', intervalDays: 10 }, neufJoursApres)).toBe(false)
    })
  })

  it('type inconnu -> true par défaut (fail-open)', () => {
    expect(
      shouldRunRuleToday({ type: 'INCONNU' as never }, new Date('2026-03-05'))
    ).toBe(true)
  })
})
