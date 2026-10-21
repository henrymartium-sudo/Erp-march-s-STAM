import { test, expect } from '@playwright/test'
import {
  construireWhereDocuments,
  tailleEnKo,
  noteTroncature,
  valeurOuND,
} from '../../lib/utils/documents-recherche'

test('aucun filtre : seulement les documents non supprimés', () => {
  expect(construireWhereDocuments({})).toEqual({ deleted: false })
})

test("chaque filtre d'égalité seul", () => {
  expect(construireWhereDocuments({ type: 'DAO' })).toEqual({ deleted: false, type: 'DAO' })
  expect(construireWhereDocuments({ phase: 'SOUMISSION' })).toEqual({
    deleted: false,
    phase: 'SOUMISSION',
  })
  expect(construireWhereDocuments({ marcheId: 'm1' })).toEqual({ deleted: false, marcheId: 'm1' })
})

test('la recherche porte sur trois champs, insensible à la casse', () => {
  expect(construireWhereDocuments({ search: 'abc' })).toEqual({
    deleted: false,
    OR: [
      { nom: { contains: 'abc', mode: 'insensitive' } },
      { nomOriginal: { contains: 'abc', mode: 'insensitive' } },
      { description: { contains: 'abc', mode: 'insensitive' } },
    ],
  })
})

test('la période porte sur createdAt, bornes optionnelles', () => {
  const d1 = new Date('2026-01-01T00:00:00Z')
  const d2 = new Date('2026-02-01T00:00:00Z')
  expect(construireWhereDocuments({ dateDebut: d1 })).toEqual({
    deleted: false,
    createdAt: { gte: d1 },
  })
  expect(construireWhereDocuments({ dateFin: d2 })).toEqual({
    deleted: false,
    createdAt: { lte: d2 },
  })
  expect(construireWhereDocuments({ dateDebut: d1, dateFin: d2 })).toEqual({
    deleted: false,
    createdAt: { gte: d1, lte: d2 },
  })
})

test('combinaison de filtres', () => {
  const d1 = new Date('2026-01-01T00:00:00Z')
  expect(
    construireWhereDocuments({ type: 'DAO', marcheId: 'm1', search: 'x', dateDebut: d1 })
  ).toEqual({
    deleted: false,
    type: 'DAO',
    marcheId: 'm1',
    OR: [
      { nom: { contains: 'x', mode: 'insensitive' } },
      { nomOriginal: { contains: 'x', mode: 'insensitive' } },
      { description: { contains: 'x', mode: 'insensitive' } },
    ],
    createdAt: { gte: d1 },
  })
})

test('tailleEnKo : octets vers Ko, une décimale', () => {
  expect(tailleEnKo(0)).toBe(0)
  expect(tailleEnKo(1024)).toBe(1)
  expect(tailleEnKo(1536)).toBe(1.5)
  expect(tailleEnKo(1000)).toBe(1)
})

test('noteTroncature : nulle si tout est exporté, texte exact sinon', () => {
  expect(noteTroncature(10, 10)).toBeNull()
  expect(noteTroncature(5, 10)).toBeNull()
  expect(noteTroncature(1500, 1000)).toBe(
    'Export limité aux 1000 premiers documents sur 1500. Affinez les filtres pour tout exporter.'
  )
})

test('valeurOuND', () => {
  expect(valeurOuND('')).toBe('n.d.')
  expect(valeurOuND('   ')).toBe('n.d.')
  expect(valeurOuND(null)).toBe('n.d.')
  expect(valeurOuND(undefined)).toBe('n.d.')
  expect(valeurOuND('  texte ')).toBe('texte')
})
