import { describe, expect, it } from 'vitest'
import { applyFormula } from './excelFormulaEngine'

describe('applyFormula', () => {
  it('remplace {row} par le numéro de ligne réel', () => {
    expect(applyFormula(6, 'C{row}*1.18')).toBe('C6*1.18')
  })

  it('remplace toutes les occurrences de {row} dans une même formule', () => {
    expect(applyFormula(6, 'D{row}+E{row}')).toBe('D6+E6')
  })

  it('remplace les clés métier par leurs lettres de colonne', () => {
    expect(applyFormula(6, '{montant}{row}*1.18', { montant: 'C' })).toBe('C6*1.18')
  })

  it('gère plusieurs clés métier différentes', () => {
    expect(
      applyFormula(3, '{ht}{row}+{tva}{row}', { ht: 'B', tva: 'C' })
    ).toBe('B3+C3')
  })

  it('formule sans placeholder reste inchangée', () => {
    expect(applyFormula(6, 'SUM(A1:A10)')).toBe('SUM(A1:A10)')
  })

  it('columnsMap absent laisse les placeholders métier non résolus tels quels', () => {
    expect(applyFormula(6, '{montant}{row}')).toBe('{montant}6')
  })
})
