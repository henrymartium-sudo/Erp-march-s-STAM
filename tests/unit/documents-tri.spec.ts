import { test, expect } from '@playwright/test'
import {
  COLONNES_TRI,
  TRI_DEFAUT,
  construireOrderBy,
  lireTri,
  trierParLibelleType,
} from '../../lib/utils/documents-tri'
import { TYPE_DOCUMENT_LABELS } from '../../lib/utils/document'

test('liste fermée : seules nom, type, taille et date sont triables', () => {
  expect([...COLONNES_TRI].sort()).toEqual(['createdAt', 'nom', 'taille', 'type'])
})

test('une valeur valide est conservée', () => {
  expect(lireTri('nom', 'asc')).toEqual({ tri: 'nom', sens: 'asc' })
  expect(lireTri('taille', 'desc')).toEqual({ tri: 'taille', sens: 'desc' })
})

test('une colonne inconnue ou sensible retombe sur le défaut, sans erreur', () => {
  for (const tri of ['storagePath', 'userId', '__proto__', 'nom; DROP TABLE documents', '', undefined]) {
    expect(lireTri(tri, 'asc')).toEqual({ tri: TRI_DEFAUT.tri, sens: 'asc' })
  }
})

test('un sens inconnu retombe sur le sens par défaut de la colonne choisie', () => {
  expect(lireTri('nom', 'sideways')).toEqual({ tri: 'nom', sens: 'asc' })
  expect(lireTri(undefined, undefined)).toEqual(TRI_DEFAUT)
})

test("l'ordre Prisma est construit depuis la liste fermée, avec un ordre secondaire stable", () => {
  expect(construireOrderBy('nom', 'asc')).toEqual([{ nom: 'asc' }, { id: 'asc' }])
  expect(construireOrderBy('taille', 'desc')).toEqual([{ taille: 'desc' }, { id: 'asc' }])
  expect(construireOrderBy('createdAt', 'desc')).toEqual([{ createdAt: 'desc' }, { id: 'asc' }])
})

test('le tri du type suit le libellé affiché, pas la valeur technique', () => {
  const docs = [
    { id: 'a', type: 'PV_RECEPTION' as const, createdAt: new Date('2026-01-01') },
    { id: 'b', type: 'DAO' as const, createdAt: new Date('2026-01-02') },
    { id: 'c', type: 'COURRIER' as const, createdAt: new Date('2026-01-03') },
  ]
  const libelles = trierParLibelleType(docs, 'asc').map((d) => TYPE_DOCUMENT_LABELS[d.type])
  expect(libelles).toEqual([...libelles].sort((x, y) => x.localeCompare(y, 'fr')))
  const inverse = trierParLibelleType(docs, 'desc').map((d) => d.id)
  expect(inverse).toEqual(trierParLibelleType(docs, 'asc').map((d) => d.id).reverse())
})

test('à type égal, le plus récent passe en premier puis l’identifiant départage', () => {
  const docs = [
    { id: 'z', type: 'AUTRE' as const, createdAt: new Date('2026-01-01') },
    { id: 'y', type: 'AUTRE' as const, createdAt: new Date('2026-01-05') },
    { id: 'x', type: 'AUTRE' as const, createdAt: new Date('2026-01-05') },
  ]
  expect(trierParLibelleType(docs, 'asc').map((d) => d.id)).toEqual(['x', 'y', 'z'])
})
