import { test, expect } from '@playwright/test'
import { appliquerFiltreMarche, libelleMarche } from '../../lib/utils/documents-filtres'

test('ajoute le filtre marché et ne touche pas aux autres clés', () => {
  const entree = new URLSearchParams('type=DAO&phase=SOUMISSION&search=offre')
  const sortie = appliquerFiltreMarche(entree, 'marche-42')
  expect(sortie.get('marcheId')).toBe('marche-42')
  expect(sortie.get('type')).toBe('DAO')
  expect(sortie.get('phase')).toBe('SOUMISSION')
  expect(sortie.get('search')).toBe('offre')
})

test("retire le filtre marché quand la valeur est 'all'", () => {
  const entree = new URLSearchParams('marcheId=marche-42&type=DAO')
  const sortie = appliquerFiltreMarche(entree, 'all')
  expect(sortie.has('marcheId')).toBe(false)
  expect(sortie.get('type')).toBe('DAO')
})

test('retire le filtre marché quand la valeur est vide', () => {
  const entree = new URLSearchParams('marcheId=marche-42')
  const sortie = appliquerFiltreMarche(entree, '')
  expect(sortie.has('marcheId')).toBe(false)
})

test('remet la pagination à zéro à chaque changement de marché', () => {
  const entree = new URLSearchParams('page=3&marcheId=marche-1')
  expect(appliquerFiltreMarche(entree, 'marche-2').has('page')).toBe(false)
  expect(appliquerFiltreMarche(entree, 'all').has('page')).toBe(false)
  expect(appliquerFiltreMarche(entree, 'marche-2').get('marcheId')).toBe('marche-2')
})

test('préserve tri et sens', () => {
  const entree = new URLSearchParams('tri=taille&sens=desc&search=x')
  const sortie = appliquerFiltreMarche(entree, 'marche-9')
  expect(sortie.get('tri')).toBe('taille')
  expect(sortie.get('sens')).toBe('desc')
  expect(sortie.get('search')).toBe('x')
  expect(sortie.get('marcheId')).toBe('marche-9')
})

test("renvoie une copie : l'entrée n'est pas modifiée", () => {
  const entree = new URLSearchParams('page=2&marcheId=marche-1')
  const avant = entree.toString()
  const sortie = appliquerFiltreMarche(entree, 'all')
  expect(entree.toString()).toBe(avant)
  expect(entree.get('page')).toBe('2')
  expect(sortie).not.toBe(entree)
  expect(sortie.has('page')).toBe(false)
})

test('libellé court : numéro, puis tiret cadratin, puis objet complet', () => {
  expect(libelleMarche({ numero: 'AO-2026-001', objet: 'Fourniture de véhicules' })).toBe(
    'AO-2026-001 — Fourniture de véhicules'
  )
})

test('libellé long : objet tronqué à 60 caractères suivi de « … »', () => {
  const objet = 'A'.repeat(59) + 'B' + 'C'.repeat(20)
  expect(libelleMarche({ numero: 'AO-1', objet })).toBe(
    'AO-1 — ' + 'A'.repeat(59) + 'B' + '…'
  )
})

test('libellé de 60 caractères exactement : pas de troncature', () => {
  const objet = 'D'.repeat(60)
  expect(libelleMarche({ numero: 'AO-2', objet })).toBe('AO-2 — ' + objet)
})
