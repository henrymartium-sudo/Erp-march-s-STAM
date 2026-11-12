import { test, expect } from '@playwright/test'
import {
  parseOpportuniteFilters, buildOpportuniteWhere, serialiserStatuts,
} from '../../lib/utils/opportunite-filters'
import { PHASES_PIPELINE, calculerPipeline } from '../../lib/tableau-de-bord/pipeline'

test('statut avec deux statuts valides : statuts, sans statut seul', () => {
  const f = parseOpportuniteFilters({ statut: 'EN_ANALYSE,IDENTIFIEE' })
  expect(f.statuts).toEqual(['EN_ANALYSE', 'IDENTIFIEE'])
  expect(f.statut).toBeUndefined()
})

test('statut : un seul statut valide parmi des inconnus reste un statut seul', () => {
  const f = parseOpportuniteFilters({ statut: 'GO,XYZ' })
  expect(f.statut).toBe('GO')
  expect(f.statuts).toBeUndefined()
})

test('statut : aucun statut valide donne ni statut ni statuts', () => {
  const f = parseOpportuniteFilters({ statut: 'XYZ' })
  expect(f.statut).toBeUndefined()
  expect(f.statuts).toBeUndefined()
})

test('statut : les doublons sont retirés', () => {
  const f = parseOpportuniteFilters({ statut: 'GO,GO' })
  expect(f.statut).toBe('GO')
  expect(f.statuts).toBeUndefined()
})

test('statut répété dans l’URL (tableau côté Next) : fusionné, sans exception', () => {
  // Next 15 fournit un tableau quand `?statut=` est répété, malgré le type `string`.
  const f = parseOpportuniteFilters({ statut: ['GO', 'EN_ANALYSE'] as unknown as string })
  expect(f.statuts).toEqual(['GO', 'EN_ANALYSE'])
  expect(f.statut).toBeUndefined()
})

test('where : statuts prime sur la phase, sans clause de phase', () => {
  const where = buildOpportuniteWhere({ phase: 'en-cours', statuts: ['EN_ANALYSE', 'IDENTIFIEE'] })
  expect(where).toEqual({ AND: [{ statut: { in: ['EN_ANALYSE', 'IDENTIFIEE'] } }] })
})

test('serialiserStatuts rend l’entrée de parse', () => {
  expect(serialiserStatuts(parseOpportuniteFilters({ statut: 'EN_ANALYSE,IDENTIFIEE' }))).toBe('EN_ANALYSE,IDENTIFIEE')
  expect(serialiserStatuts(parseOpportuniteFilters({ statut: 'GO' }))).toBe('GO')
  expect(serialiserStatuts(parseOpportuniteFilters({}))).toBeUndefined()
})

test('chaque phase du pipeline : le lien liste exactement les statuts comptés', () => {
  const pipeline = calculerPipeline([])
  for (const phase of PHASES_PIPELINE) {
    const href = pipeline.phases.find((p) => p.statut === phase.statut)!.href
    const valeur = href.split('statut=')[1]
    const f = parseOpportuniteFilters({ statut: valeur })
    const lus = f.statuts ?? (f.statut ? [f.statut] : [])
    expect([...lus].sort()).toEqual([...phase.inclut].sort())
  }
})
