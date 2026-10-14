import { test, expect } from '@playwright/test'
import { appliquerHeureLimite, conserverHeureLimite, heureLimiteDe } from '../../lib/utils/heure-limite'

test.describe('heure limite de dépôt', () => {
  test('minuit exact = heure non renseignée', () => {
    expect(heureLimiteDe(new Date(2026, 9, 20, 0, 0))).toBeNull()
    expect(heureLimiteDe(null)).toBeNull()
    expect(heureLimiteDe(undefined)).toBeNull()
  })

  test("00:01 est une vraie heure et s'affiche", () => {
    expect(heureLimiteDe(new Date(2026, 9, 20, 0, 1))).toBe('00:01')
  })

  test('affiche une heure renseignée sur deux chiffres', () => {
    expect(heureLimiteDe(new Date(2026, 9, 20, 9, 5))).toBe('09:05')
    expect(heureLimiteDe(new Date(2026, 9, 20, 17, 30))).toBe('17:30')
  })

  test('accepte une date sérialisée', () => {
    expect(heureLimiteDe(new Date(2026, 9, 20, 12, 0).toISOString())).toBe('12:00')
  })

  test("applique l'heure sans toucher au jour ni à la date d'origine", () => {
    const base = new Date(2026, 9, 20)
    const res = appliquerHeureLimite(base, '17:30')
    expect(res.getDate()).toBe(20)
    expect(res.getHours()).toBe(17)
    expect(res.getMinutes()).toBe(30)
    expect(base.getHours()).toBe(0)
  })

  test('une saisie vide ou invalide remet minuit', () => {
    const base = new Date(2026, 9, 20, 17, 30)
    expect(heureLimiteDe(appliquerHeureLimite(base, ''))).toBeNull()
    expect(heureLimiteDe(appliquerHeureLimite(base, '25:99'))).toBeNull()
    expect(heureLimiteDe(appliquerHeureLimite(base, 'abc'))).toBeNull()
  })

  test("changer de jour au calendrier garde l'heure saisie", () => {
    const ancienne = new Date(2026, 9, 20, 12, 0)
    const res = conserverHeureLimite(new Date(2026, 9, 25), ancienne)
    expect(res.getDate()).toBe(25)
    expect(heureLimiteDe(res)).toBe('12:00')
  })

  test("changer de jour sans heure saisie reste à minuit", () => {
    expect(heureLimiteDe(conserverHeureLimite(new Date(2026, 9, 25), null))).toBeNull()
    expect(heureLimiteDe(conserverHeureLimite(new Date(2026, 9, 25), new Date(2026, 9, 20)))).toBeNull()
  })
})
