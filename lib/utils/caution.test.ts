import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  getJoursRestants,
  isExpired,
  isExpiringSoon,
  getNiveauAlerte,
  isDureeCoherente,
  isMontantCoherent,
  getMontantSuggere,
  getDateEcheanceSuggeree,
  comparerParEcheance,
  comparerParMontant,
} from './caution'

// Toutes les dates sont alignées sur minuit UTC (y compris "maintenant") pour que
// les calculs de jours soient des différences de calendrier exactes et déterministes.
const NOW = new Date('2026-03-15T00:00:00Z')

afterEach(() => {
  vi.useRealTimers()
})

describe('getJoursRestants', () => {
  it('calcule le nombre de jours restants jusqu\'à l\'échéance', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    expect(getJoursRestants(new Date('2026-03-25T00:00:00Z'))).toBe(10)
  })

  it('retourne un nombre négatif pour une date déjà passée', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    expect(getJoursRestants(new Date('2026-03-05T00:00:00Z'))).toBe(-10)
  })
})

describe('isExpired / isExpiringSoon', () => {
  it('isExpired est vrai uniquement pour une échéance strictement passée', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    expect(isExpired(new Date('2026-03-01T00:00:00Z'))).toBe(true)
    expect(isExpired(new Date('2026-04-01T00:00:00Z'))).toBe(false)
  })

  it('isExpiringSoon est vrai dans la fenêtre du seuil, faux hors fenêtre ou déjà expiré', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    expect(isExpiringSoon(new Date('2026-03-25T00:00:00Z'), 30)).toBe(true) // dans 10 jours
    expect(isExpiringSoon(new Date('2026-06-01T00:00:00Z'), 30)).toBe(false) // trop loin
    expect(isExpiringSoon(new Date('2026-03-01T00:00:00Z'), 30)).toBe(false) // déjà expiré
  })
})

describe('getNiveauAlerte', () => {
  it('statut EXPIREE -> niveau EXPIRE, quelle que soit la date', () => {
    expect(getNiveauAlerte('EXPIREE', new Date('2099-01-01T00:00:00Z'))).toBe('EXPIRE')
  })

  it('statut LIBEREE ou APPELEE -> niveau AUCUN (terminal, plus d\'alerte)', () => {
    expect(getNiveauAlerte('LIBEREE', new Date('2026-03-16T00:00:00Z'))).toBe('AUCUN')
    expect(getNiveauAlerte('APPELEE', new Date('2020-01-01T00:00:00Z'))).toBe('AUCUN')
  })

  it('caution ACTIVE : applique les seuils CRITIQUE(7) / ATTENTION(30) / INFO(60) / AUCUN', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)

    expect(getNiveauAlerte('ACTIVE', new Date('2026-03-14T00:00:00Z'))).toBe('EXPIRE') // -1j
    expect(getNiveauAlerte('ACTIVE', new Date('2026-03-20T00:00:00Z'))).toBe('CRITIQUE') // 5j
    expect(getNiveauAlerte('ACTIVE', new Date('2026-04-10T00:00:00Z'))).toBe('ATTENTION') // 26j
    expect(getNiveauAlerte('ACTIVE', new Date('2026-05-10T00:00:00Z'))).toBe('INFO') // 56j
    expect(getNiveauAlerte('ACTIVE', new Date('2026-08-01T00:00:00Z'))).toBe('AUCUN') // loin
  })

  it('limites exactes des seuils (7, 30, 60 jours)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)

    expect(getNiveauAlerte('ACTIVE', new Date('2026-03-22T00:00:00Z'))).toBe('CRITIQUE') // 7j
    expect(getNiveauAlerte('ACTIVE', new Date('2026-03-23T00:00:00Z'))).toBe('ATTENTION') // 8j
    expect(getNiveauAlerte('ACTIVE', new Date('2026-04-14T00:00:00Z'))).toBe('ATTENTION') // 30j
    expect(getNiveauAlerte('ACTIVE', new Date('2026-04-15T00:00:00Z'))).toBe('INFO') // 31j
    expect(getNiveauAlerte('ACTIVE', new Date('2026-05-14T00:00:00Z'))).toBe('INFO') // 60j
    expect(getNiveauAlerte('ACTIVE', new Date('2026-05-15T00:00:00Z'))).toBe('AUCUN') // 61j
  })
})

describe('isDureeCoherente', () => {
  it('SOUMISSION attend une durée de 30 à 180 jours', () => {
    expect(
      isDureeCoherente('SOUMISSION', new Date('2026-01-01T00:00:00Z'), new Date('2026-02-01T00:00:00Z'))
    ).toBe(true) // 31 jours
    expect(
      isDureeCoherente('SOUMISSION', new Date('2026-01-01T00:00:00Z'), new Date('2026-01-05T00:00:00Z'))
    ).toBe(false) // 4 jours, trop court
  })
})

describe('isMontantCoherent', () => {
  it('SOUMISSION attend 1 à 3% du montant du marché', () => {
    expect(isMontantCoherent('SOUMISSION', 20_000, 1_000_000)).toBe(true) // 2%
    expect(isMontantCoherent('SOUMISSION', 500_000, 1_000_000)).toBe(false) // 50%, aberrant
  })
})

describe('getMontantSuggere', () => {
  it('retourne le montant au pourcentage moyen du type', () => {
    // SOUMISSION : 1-3% -> moyenne 2%
    expect(getMontantSuggere('SOUMISSION', 1_000_000)).toBe(20_000)
  })
})

describe('getDateEcheanceSuggeree', () => {
  it('ajoute la durée moyenne typique du type à la date d\'émission', () => {
    // SOUMISSION : 30-180 jours -> moyenne 105 jours
    const emission = new Date('2026-01-01T00:00:00Z')
    const echeance = getDateEcheanceSuggeree('SOUMISSION', emission)
    const joursEcoules = Math.round((echeance.getTime() - emission.getTime()) / (24 * 60 * 60 * 1000))
    expect(joursEcoules).toBe(105)
  })
})

describe('comparerParEcheance', () => {
  it('trie par échéance la plus proche en premier', () => {
    const proche = { dateEcheance: new Date('2026-04-01T00:00:00Z') }
    const lointaine = { dateEcheance: new Date('2026-12-01T00:00:00Z') }
    expect(comparerParEcheance(proche, lointaine)).toBeLessThan(0)
    expect(comparerParEcheance(lointaine, proche)).toBeGreaterThan(0)
  })
})

describe('comparerParMontant', () => {
  it('trie par montant décroissant avec des montants number', () => {
    const petit = { montant: 100 }
    const grand = { montant: 1000 }
    expect(comparerParMontant(grand, petit)).toBeLessThan(0)
    expect(comparerParMontant(petit, grand)).toBeGreaterThan(0)
  })

  it('supporte les montants de type Prisma Decimal (objet avec toNumber())', () => {
    const decimalLike = { montant: { toNumber: () => 500 } }
    const nombre = { montant: 100 }
    expect(comparerParMontant(decimalLike, nombre)).toBeLessThan(0)
  })
})
