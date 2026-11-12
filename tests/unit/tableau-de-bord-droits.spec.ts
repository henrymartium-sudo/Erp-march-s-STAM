import { test, expect } from '@playwright/test'
import { droitsTableauDeBord } from '../../lib/tableau-de-bord/droits'

test('ADMIN et AVANCE : finances, aucune restriction de marché', () => {
  expect(droitsTableauDeBord('ADMIN')).toEqual({ finances: true, restrictionMarche: undefined })
  expect(droitsTableauDeBord('AVANCE')).toEqual({ finances: true, restrictionMarche: undefined })
})

test('EXPLOITATION : pas de finances, marchés en exécution seulement', () => {
  expect(droitsTableauDeBord('EXPLOITATION')).toEqual({ finances: false, restrictionMarche: 'EN_EXECUTION' })
})

test('VISITEUR et rôle absent : pas de finances', () => {
  expect(droitsTableauDeBord('VISITEUR')).toEqual({ finances: false, restrictionMarche: undefined })
  expect(droitsTableauDeBord(undefined)).toEqual({ finances: false, restrictionMarche: undefined })
  expect(droitsTableauDeBord(null)).toEqual({ finances: false, restrictionMarche: undefined })
})
