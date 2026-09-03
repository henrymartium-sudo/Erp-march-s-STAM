import { describe, expect, it } from 'vitest'
import { cautionSchema, cautionFiltersSchema } from './caution'

const base = {
  reference: 'CAUT-2026-001',
  type: 'SOUMISSION' as const,
  montant: 20_000,
  dateEmission: new Date('2026-01-01'),
  dateEcheance: new Date('2026-06-01'),
  statut: 'ACTIVE' as const,
  banqueNom: 'Banque Atlantique',
}

describe('cautionSchema', () => {
  it('accepte des données valides', () => {
    const result = cautionSchema.safeParse(base)
    expect(result.success).toBe(true)
  })

  it('rejette une date d\'échéance antérieure ou égale à la date d\'émission', () => {
    const antérieure = cautionSchema.safeParse({
      ...base,
      dateEmission: new Date('2026-06-01'),
      dateEcheance: new Date('2026-01-01'),
    })
    expect(antérieure.success).toBe(false)

    const égale = cautionSchema.safeParse({
      ...base,
      dateEmission: new Date('2026-06-01'),
      dateEcheance: new Date('2026-06-01'),
    })
    expect(égale.success).toBe(false)
  })

  it('rejette une caution SOUMISSION avec statut LIBEREE (règle métier : remplacée par BONNE_EXECUTION)', () => {
    const result = cautionSchema.safeParse({
      ...base,
      type: 'SOUMISSION',
      statut: 'LIBEREE',
    })
    expect(result.success).toBe(false)
  })

  it('accepte une caution BONNE_EXECUTION avec statut LIBEREE', () => {
    const result = cautionSchema.safeParse({
      ...base,
      type: 'BONNE_EXECUTION',
      statut: 'LIBEREE',
    })
    expect(result.success).toBe(true)
  })

  it('rejette le statut EXPIREE si la date d\'échéance n\'est pas dépassée', () => {
    const dansLeFutur = new Date()
    dansLeFutur.setFullYear(dansLeFutur.getFullYear() + 1)

    const result = cautionSchema.safeParse({
      ...base,
      dateEmission: new Date(),
      dateEcheance: dansLeFutur,
      statut: 'EXPIREE',
    })
    expect(result.success).toBe(false)
  })

  it('rejette un montant négatif ou nul', () => {
    expect(cautionSchema.safeParse({ ...base, montant: -1 }).success).toBe(false)
    expect(cautionSchema.safeParse({ ...base, montant: 0 }).success).toBe(false)
  })

  it('rejette une référence vide', () => {
    expect(cautionSchema.safeParse({ ...base, reference: '' }).success).toBe(false)
  })
})

describe('cautionFiltersSchema', () => {
  it('accepte un objet de filtres vide (tous les champs sont optionnels)', () => {
    expect(cautionFiltersSchema.safeParse({}).success).toBe(true)
  })

  it('rejette une limite de pagination supérieure à 100', () => {
    expect(cautionFiltersSchema.safeParse({ limit: 101 }).success).toBe(false)
    expect(cautionFiltersSchema.safeParse({ limit: 100 }).success).toBe(true)
  })
})
