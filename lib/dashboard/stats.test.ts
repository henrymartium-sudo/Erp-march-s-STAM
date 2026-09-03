import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const groupByMock = vi.fn()
const findManyMock = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    marche: {
      groupBy: groupByMock,
      findMany: findManyMock,
    },
  },
}))

const { getStatutDistribution, getCAEffectif } = await import('./stats')

beforeEach(() => {
  groupByMock.mockReset()
  findManyMock.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getStatutDistribution', () => {
  it('retourne un tableau vide si aucun marché', async () => {
    groupByMock.mockResolvedValue([])
    expect(await getStatutDistribution()).toEqual([])
  })

  it('calcule le pourcentage de chaque statut arrondi', async () => {
    groupByMock.mockResolvedValue([
      { statut: 'EN_EXECUTION', _count: { id: 5 } },
      { statut: 'CLOTURE', _count: { id: 3 } },
    ])

    const result = await getStatutDistribution()

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ statut: 'EN_EXECUTION', count: 5, pourcentage: 63 }) // 5/8 = 62.5% -> 63
    expect(result[1]).toMatchObject({ statut: 'CLOTURE', count: 3, pourcentage: 38 }) // 3/8 = 37.5% -> 38
  })

  it('ne plante pas et retourne [] si la requête échoue', async () => {
    groupByMock.mockRejectedValue(new Error('boom'))
    expect(await getStatutDistribution()).toEqual([])
  })
})

describe('getCAEffectif', () => {
  it('somme les montants par mois de notification sur les 12 derniers mois', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T00:00:00Z'))

    findManyMock.mockResolvedValue([
      { dateNotification: new Date('2026-01-10T00:00:00Z'), montant: 500_000 },
      { dateNotification: new Date('2026-01-20T00:00:00Z'), montant: 250_000 },
      { dateNotification: new Date('2026-02-05T00:00:00Z'), montant: 100_000 },
      // Hors fenêtre des 12 derniers mois : ne doit apparaître dans aucun bucket, sans planter.
      { dateNotification: new Date('2020-01-01T00:00:00Z'), montant: 999_999 },
      // dateNotification absente : doit être ignoré (continue), sans planter.
      { dateNotification: null, montant: 42 },
    ])

    const result = await getCAEffectif()

    expect(result).toHaveLength(12)

    const janvier = result.find((p) => p.label === '2026-01')
    const fevrier = result.find((p) => p.label === '2026-02')
    const mars = result.find((p) => p.label === '2026-03')

    expect(janvier?.montant).toBe(750_000)
    expect(fevrier?.montant).toBe(100_000)
    expect(mars?.montant).toBe(0)

    const totalSomme = result.reduce((sum, p) => sum + p.montant, 0)
    expect(totalSomme).toBe(850_000) // la ligne hors-fenêtre (999 999) n'est comptée nulle part
  })

  it('retourne 12 mois à 0 si aucun marché', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T00:00:00Z'))
    findManyMock.mockResolvedValue([])

    const result = await getCAEffectif()

    expect(result).toHaveLength(12)
    expect(result.every((p) => p.montant === 0)).toBe(true)
  })

  it('ne plante pas et retourne [] si la requête échoue', async () => {
    findManyMock.mockRejectedValue(new Error('boom'))
    expect(await getCAEffectif()).toEqual([])
  })
})
