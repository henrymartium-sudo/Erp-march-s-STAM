import { test, expect } from '@playwright/test'
import { horizonDe, joursDepuis } from '../../lib/tableau-de-bord/dates'

const AUJ = new Date('2026-11-12T15:30:00Z')

test('horizons aux bornes', () => {
  expect(horizonDe(new Date('2026-11-11T23:59:00Z'), AUJ)).toBe('retard')
  expect(horizonDe(new Date('2026-11-12T00:00:00Z'), AUJ)).toBe('semaine')
  expect(horizonDe(new Date('2026-11-19T10:00:00Z'), AUJ)).toBe('semaine') // J+7
  expect(horizonDe(new Date('2026-11-20T00:00:00Z'), AUJ)).toBe('mois') // J+8
  expect(horizonDe(new Date('2026-12-12T00:00:00Z'), AUJ)).toBe('mois') // J+30
  expect(horizonDe(new Date('2026-12-13T00:00:00Z'), AUJ)).toBeNull() // J+31
})

test('joursDepuis compte des jours calendaires UTC', () => {
  expect(joursDepuis(new Date('2026-09-28T23:00:00Z'), AUJ)).toBe(45)
  expect(joursDepuis(new Date('2026-11-13T01:00:00Z'), AUJ)).toBe(-1)
})
