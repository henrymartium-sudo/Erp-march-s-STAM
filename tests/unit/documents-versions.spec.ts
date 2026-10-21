import { test, expect } from '@playwright/test'
import {
  doitAfficherVersions,
  racineDeChaine,
  prochainNumeroVersion,
  cheminStockageValide,
} from '../../lib/utils/documents-versions'

test('un document racine sans version ne déclenche pas le bouton Versions', () => {
  expect(doitAfficherVersions(1)).toBe(false)
})

test('un document racine avec 2 versions (total 3, parent compris) affiche le bouton', () => {
  expect(doitAfficherVersions(3)).toBe(true)
})

test('un total nul ou négatif n affiche pas le bouton', () => {
  expect(doitAfficherVersions(0)).toBe(false)
  expect(doitAfficherVersions(-2)).toBe(false)
})

test('racineDeChaine : un document racine est sa propre racine', () => {
  expect(racineDeChaine({ id: 'a', documentParentId: null })).toBe('a')
})

test('racineDeChaine : un document déjà version renvoie son parent', () => {
  expect(racineDeChaine({ id: 'b', documentParentId: 'a' })).toBe('a')
})

test('prochainNumeroVersion : max + 1, trous compris', () => {
  expect(prochainNumeroVersion([1, 2, 5])).toBe(6)
})

test('prochainNumeroVersion : liste vide donne 2', () => {
  expect(prochainNumeroVersion([])).toBe(2)
})

test('prochainNumeroVersion : numéro dupliqué', () => {
  expect(prochainNumeroVersion([3, 3, 1])).toBe(4)
})

test('cheminStockageValide : chemin conforme (type en minuscules, marché)', () => {
  expect(cheminStockageValide('dao/m1/123_fichier.pdf', 'DAO', 'm1')).toBe(true)
})

test('cheminStockageValide : sans marché, dossier general', () => {
  expect(cheminStockageValide('dao/general/123_fichier.pdf', 'DAO', null)).toBe(true)
})

test('cheminStockageValide : mauvais type', () => {
  expect(cheminStockageValide('offre/m1/123_f.pdf', 'DAO', 'm1')).toBe(false)
})

test('cheminStockageValide : mauvais marché', () => {
  expect(cheminStockageValide('dao/m2/123_f.pdf', 'DAO', 'm1')).toBe(false)
  expect(cheminStockageValide('dao/m1/123_f.pdf', 'DAO', null)).toBe(false)
})

test('cheminStockageValide : refuse .. et antislash', () => {
  expect(cheminStockageValide('dao/m1/../m2/f.pdf', 'DAO', 'm1')).toBe(false)
  expect(cheminStockageValide('dao/m1/a\\b.pdf', 'DAO', 'm1')).toBe(false)
})

test('cheminStockageValide : préfixe seul sans nom de fichier', () => {
  expect(cheminStockageValide('dao/m1/', 'DAO', 'm1')).toBe(false)
})
