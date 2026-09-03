import { describe, expect, it } from 'vitest'
import { evaluateConditions } from './rule-evaluator'
import type { RuleConditions } from '@/lib/alertes/types'

describe('evaluateConditions', () => {
  it('retourne true quand la liste de conditions est vide (déclenche toujours)', () => {
    const conditions: RuleConditions = { operator: 'AND', conditions: [] }
    expect(evaluateConditions(conditions, { joursRestants: 5 })).toBe(true)
  })

  it('AND : exige que toutes les conditions soient vraies', () => {
    const conditions: RuleConditions = {
      operator: 'AND',
      conditions: [
        { field: 'joursRestants', op: 'lte', value: 7 },
        { field: 'statut', op: 'eq', value: 'ACTIVE' },
      ],
    }
    expect(evaluateConditions(conditions, { joursRestants: 3, statut: 'ACTIVE' })).toBe(true)
    expect(evaluateConditions(conditions, { joursRestants: 3, statut: 'EXPIREE' })).toBe(false)
  })

  it('OR : suffit qu\'une condition soit vraie', () => {
    const conditions: RuleConditions = {
      operator: 'OR',
      conditions: [
        { field: 'joursRestants', op: 'lte', value: 7 },
        { field: 'statut', op: 'eq', value: 'CRITIQUE' },
      ],
    }
    expect(evaluateConditions(conditions, { joursRestants: 30, statut: 'CRITIQUE' })).toBe(true)
    expect(evaluateConditions(conditions, { joursRestants: 30, statut: 'ACTIVE' })).toBe(false)
  })

  it('un champ absent du payload rend la condition non satisfaite', () => {
    const conditions: RuleConditions = {
      operator: 'AND',
      conditions: [{ field: 'montant', op: 'gt', value: 1000 }],
    }
    expect(evaluateConditions(conditions, {})).toBe(false)
  })

  it.each([
    ['eq', 'ACTIVE', 'ACTIVE', true],
    ['eq', 'ACTIVE', 'EXPIREE', false],
    ['neq', 'ACTIVE', 'EXPIREE', true],
    ['gt', 10, 5, true],
    ['gt', 5, 10, false],
    ['gte', 10, 10, true],
    ['lt', 5, 10, true],
    ['lte', 10, 10, true],
  ] as const)('op "%s" : champ=%s valeur=%s -> %s', (op, fieldValue, condValue, expected) => {
    const conditions: RuleConditions = {
      operator: 'AND',
      conditions: [{ field: 'x', op, value: condValue }],
    }
    expect(evaluateConditions(conditions, { x: fieldValue })).toBe(expected)
  })

  it('"in" vérifie l\'appartenance à un tableau de valeurs', () => {
    const conditions: RuleConditions = {
      operator: 'AND',
      conditions: [{ field: 'statut', op: 'in', value: ['ACTIVE', 'CRITIQUE'] }],
    }
    expect(evaluateConditions(conditions, { statut: 'CRITIQUE' })).toBe(true)
    expect(evaluateConditions(conditions, { statut: 'EXPIREE' })).toBe(false)
  })

  it('"nin" est l\'inverse de "in"', () => {
    const conditions: RuleConditions = {
      operator: 'AND',
      conditions: [{ field: 'statut', op: 'nin', value: ['ACTIVE', 'CRITIQUE'] }],
    }
    expect(evaluateConditions(conditions, { statut: 'EXPIREE' })).toBe(true)
    expect(evaluateConditions(conditions, { statut: 'ACTIVE' })).toBe(false)
  })

  it('"in"/"nin" avec une valeur non-tableau ne fait pas planter l\'évaluation', () => {
    const inCond: RuleConditions = {
      operator: 'AND',
      conditions: [{ field: 'statut', op: 'in', value: 'ACTIVE' as unknown as string[] }],
    }
    const ninCond: RuleConditions = {
      operator: 'AND',
      conditions: [{ field: 'statut', op: 'nin', value: 'ACTIVE' as unknown as string[] }],
    }
    expect(evaluateConditions(inCond, { statut: 'ACTIVE' })).toBe(false)
    expect(evaluateConditions(ninCond, { statut: 'ACTIVE' })).toBe(true)
  })

  it('une comparaison numérique sur une valeur non numérique ne plante pas (NaN → false)', () => {
    const conditions: RuleConditions = {
      operator: 'AND',
      conditions: [{ field: 'montant', op: 'gt', value: 100 }],
    }
    expect(evaluateConditions(conditions, { montant: 'pas-un-nombre' })).toBe(false)
  })
})
