import { test, expect } from '@playwright/test'
import { vehiculeProposeSchema, vehiculesLotSchema } from '../../lib/validations/vehicule-propose'
import { construireSuggestions } from '../../lib/utils/vehicules-proposes'

const ligne = { marque: 'Toyota', modele: 'Hilux', quantite: 2, prixUnitaire: 25000000 }

test.describe('vehiculeProposeSchema', () => {
  test('ligne valide, valeurs de formulaire en chaînes acceptées', () => {
    const r = vehiculeProposeSchema.safeParse({ ...ligne, quantite: '2', prixUnitaire: '25000000' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.quantite).toBe(2)
  })
  test('marque et modèle obligatoires', () => {
    expect(vehiculeProposeSchema.safeParse({ ...ligne, marque: '  ' }).success).toBe(false)
    expect(vehiculeProposeSchema.safeParse({ ...ligne, modele: '' }).success).toBe(false)
  })
  test('quantité entière ≥ 1', () => {
    expect(vehiculeProposeSchema.safeParse({ ...ligne, quantite: 0 }).success).toBe(false)
    expect(vehiculeProposeSchema.safeParse({ ...ligne, quantite: 1.5 }).success).toBe(false)
    expect(vehiculeProposeSchema.safeParse({ ...ligne, quantite: '' }).success).toBe(false)
  })
  test('prix obligatoire et positif ou nul', () => {
    expect(vehiculeProposeSchema.safeParse({ ...ligne, prixUnitaire: '' }).success).toBe(false)
    expect(vehiculeProposeSchema.safeParse({ ...ligne, prixUnitaire: '   ' }).success).toBe(false)
    expect(vehiculeProposeSchema.safeParse({ ...ligne, quantite: '   ' }).success).toBe(false)
    expect(vehiculeProposeSchema.safeParse({ ...ligne, prixUnitaire: -1 }).success).toBe(false)
    expect(vehiculeProposeSchema.safeParse({ ...ligne, prixUnitaire: 0 }).success).toBe(true)
  })
})

test.describe('vehiculesLotSchema', () => {
  test('liste vide acceptée (retour à la saisie manuelle)', () => {
    expect(vehiculesLotSchema.safeParse({ lotId: 'l1', vehicules: [] }).success).toBe(true)
  })
  test('20 lignes au plus', () => {
    expect(vehiculesLotSchema.safeParse({ lotId: 'l1', vehicules: Array(21).fill(ligne) }).success).toBe(false)
  })
  test('total du lot limité à la capacité de la colonne', () => {
    const enorme = { ...ligne, quantite: 999, prixUnitaire: 999999999 }
    expect(vehiculesLotSchema.safeParse({ lotId: 'l1', vehicules: Array(20).fill(enorme) }).success).toBe(false)
  })
})

test.describe('construireSuggestions', () => {
  test('garde la plus récente par couple, insensible à la casse et aux accents', () => {
    const r = construireSuggestions([
      { marque: 'Toyota', modele: 'Hilux', prixUnitaire: 26000000 },
      { marque: 'TOYOTA', modele: 'hilux', prixUnitaire: 25000000 },
      { marque: 'Renault', modele: 'Duster', prixUnitaire: 15000000 },
    ])
    expect(r).toEqual([
      { marque: 'Toyota', modele: 'Hilux', prixUnitaire: 26000000 },
      { marque: 'Renault', modele: 'Duster', prixUnitaire: 15000000 },
    ])
  })
  test('accents : « Citroën » et « Citroen » sont le même couple', () => {
    expect(construireSuggestions([
      { marque: 'Citroën', modele: 'Jumpy', prixUnitaire: 1 },
      { marque: 'Citroen', modele: 'Jumpy', prixUnitaire: 2 },
    ])).toHaveLength(1)
  })
  test('liste vide', () => {
    expect(construireSuggestions([])).toEqual([])
  })
})
