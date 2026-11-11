import { test, expect } from '@playwright/test'
import { lireOnglet, avecOnglet, urlVeilleVersPilotage } from '../../lib/pilotage/onglets'

test.describe('onglet de /pilotage dans l’adresse', () => {
  test('onglet absent ou inconnu → indicateurs', () => {
    expect(lireOnglet(null)).toBe('indicateurs')
    expect(lireOnglet('inconnu')).toBe('indicateurs')
    expect(lireOnglet('veille')).toBe('veille')
  })

  test("changer d'onglet garde la période", () => {
    expect(avecOnglet('debut=2026-01-01&fin=2026-06-30', 'analyses'))
      .toBe('debut=2026-01-01&fin=2026-06-30&onglet=analyses')
    expect(avecOnglet('onglet=veille&debut=2026-01-01', 'indicateurs'))
      .toBe('onglet=indicateurs&debut=2026-01-01')
  })

  test('redirection de /veille', () => {
    expect(urlVeilleVersPilotage('2026-01-01', '2026-06-30'))
      .toBe('/pilotage?onglet=veille&debut=2026-01-01&fin=2026-06-30')
    expect(urlVeilleVersPilotage()).toBe('/pilotage?onglet=veille')
    expect(urlVeilleVersPilotage(['2026-01-01', '2027-01-01'], undefined))
      .toBe('/pilotage?onglet=veille&debut=2026-01-01')
  })
})
