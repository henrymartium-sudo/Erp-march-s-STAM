import { test, expect } from '@playwright/test'
import {
  lireOngletAlertes,
  urlOngletAlertes,
  ongletsAutorises,
  ongletAutorise,
} from '../../lib/alertes/onglets'

test.describe('onglet de /admin/alertes dans l’adresse', () => {
  test('onglet absent, vide ou inconnu → envoi', () => {
    expect(lireOngletAlertes(undefined)).toBe('envoi')
    expect(lireOngletAlertes('')).toBe('envoi')
    expect(lireOngletAlertes('inconnu')).toBe('envoi')
  })

  test('onglets reconnus', () => {
    expect(lireOngletAlertes('regles')).toBe('regles')
    expect(lireOngletAlertes('rapports')).toBe('rapports')
    expect(lireOngletAlertes('historique')).toBe('historique')
  })

  test('paramètre répété : première valeur seulement', () => {
    expect(lireOngletAlertes(['rapports', 'regles'])).toBe('rapports')
    expect(lireOngletAlertes(['x', 'rapports'])).toBe('envoi')
  })

  test("adresse d'un onglet", () => {
    expect(urlOngletAlertes('envoi')).toBe('/admin/alertes')
    expect(urlOngletAlertes('regles')).toBe('/admin/alertes?onglet=regles')
    expect(urlOngletAlertes('rapports')).toBe('/admin/alertes?onglet=rapports')
    expect(urlOngletAlertes('historique')).toBe('/admin/alertes?onglet=historique')
  })
})

test.describe('onglets autorisés par rôle', () => {
  test('ADMIN : les quatre, dans l’ordre', () => {
    expect(ongletsAutorises('ADMIN')).toEqual(['envoi', 'regles', 'rapports', 'historique'])
  })

  test('AVANCE : sans les rapports programmés', () => {
    expect(ongletsAutorises('AVANCE')).toEqual(['envoi', 'regles', 'historique'])
  })

  test('EXPLOITATION : envoi manuel seulement', () => {
    expect(ongletsAutorises('EXPLOITATION')).toEqual(['envoi'])
  })

  test('VISITEUR, rôle inconnu ou absent : aucun', () => {
    expect(ongletsAutorises('VISITEUR')).toEqual([])
    expect(ongletsAutorises('AUTRE')).toEqual([])
    expect(ongletsAutorises(undefined)).toEqual([])
  })

  test('ongletAutorise suit la même table', () => {
    expect(ongletAutorise('rapports', 'ADMIN')).toBe(true)
    expect(ongletAutorise('rapports', 'AVANCE')).toBe(false)
    expect(ongletAutorise('regles', 'EXPLOITATION')).toBe(false)
    expect(ongletAutorise('envoi', 'EXPLOITATION')).toBe(true)
    expect(ongletAutorise('envoi', 'VISITEUR')).toBe(false)
  })
})
