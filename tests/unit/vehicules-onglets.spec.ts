import { test, expect } from '@playwright/test'
import { lireOngletVehicules, urlOngletVehicules } from '../../lib/vehicules/onglets'

test.describe('onglet de /vehicules dans l’adresse', () => {
  test('onglet absent, vide ou inconnu → parc', () => {
    expect(lireOngletVehicules(undefined)).toBe('parc')
    expect(lireOngletVehicules('')).toBe('parc')
    expect(lireOngletVehicules('inconnu')).toBe('parc')
  })

  test('onglet sav reconnu', () => {
    expect(lireOngletVehicules('sav')).toBe('sav')
  })

  test('paramètre répété : première valeur seulement', () => {
    expect(lireOngletVehicules(['sav', 'parc'])).toBe('sav')
    expect(lireOngletVehicules(['x', 'sav'])).toBe('parc')
  })

  test("adresse d'un onglet", () => {
    expect(urlOngletVehicules('parc')).toBe('/vehicules')
    expect(urlOngletVehicules('sav')).toBe('/vehicules?onglet=sav')
  })
})
