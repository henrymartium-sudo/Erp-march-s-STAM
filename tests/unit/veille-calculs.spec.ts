import { test, expect } from '@playwright/test'
import {
  normaliserTexte, normaliserNom, distanceLevenshtein, libelleRetenu, trouverDoublons,
} from '../../lib/veille/calculs'

test.describe('normalisation des noms', () => {
  test('ignore la casse, les accents, la ponctuation et les espaces multiples', () => {
    expect(normaliserTexte('  Étoile   Motors, ')).toBe('etoile motors')
    expect(normaliserTexte('AUTO-PLUS')).toBe('auto plus')
  })

  test('retire les formes juridiques courantes', () => {
    expect(normaliserNom('Auto Plus SARL')).toBe('auto plus')
    expect(normaliserNom('Société AUTO-PLUS S.A.R.L.')).toBe('auto plus')
    expect(normaliserNom('Ets. Kodjo')).toBe('kodjo')
    expect(normaliserNom('Kodjo Cie')).toBe('kodjo')
  })

  test('deux orthographes qui ne diffèrent que par ces détails ont la même forme', () => {
    expect(normaliserNom('AUTO PLUS')).toBe(normaliserNom('  auto-plus sa '))
  })

  test('un nom réduit à une forme juridique ou à de la ponctuation reste exploitable', () => {
    expect(normaliserNom('SARL')).toBe('sarl')
    expect(normaliserNom('---')).toBe('---')
  })
})

test.describe('distanceLevenshtein', () => {
  test('compte les insertions, suppressions et substitutions', () => {
    expect(distanceLevenshtein('kodjo', 'kodjo')).toBe(0)
    expect(distanceLevenshtein('toyota', 'toyata')).toBe(1)
    expect(distanceLevenshtein('abc', '')).toBe(3)
    expect(distanceLevenshtein('', 'abc')).toBe(3)
  })
})

test.describe('libelleRetenu', () => {
  test('retient l’orthographe la plus fréquente', () => {
    expect(libelleRetenu(['AUTO PLUS', 'Auto Plus', 'Auto Plus'])).toBe('Auto Plus')
  })
  test('à égalité, la plus longue, puis l’ordre alphabétique', () => {
    expect(libelleRetenu(['Kodjo', 'Kodjo SA'])).toBe('Kodjo SA')
    expect(libelleRetenu(['Beta', 'Alfa'])).toBe('Alfa')
  })
})

test.describe('trouverDoublons', () => {
  const g = (cle: string, nombre = 1) => ({ cle, libelle: cle, nombre })

  test('signale deux noms à 2 lettres près', () => {
    const r = trouverDoublons([g('auto plus'), g('auto pluss')])
    expect(r).toHaveLength(1)
    expect(r[0]?.a.cle).toBe('auto plus')
  })

  test('signale un nom qui commence l’autre au mot près', () => {
    expect(trouverDoublons([g('auto plus'), g('auto plus togo')])).toHaveLength(1)
  })

  test('ne signale pas un simple préfixe de lettres (il faut un mot entier)', () => {
    expect(trouverDoublons([g('autoplus'), g('autoplusmobile')])).toHaveLength(0)
  })

  test('ignore les noms de moins de 5 caractères', () => {
    expect(trouverDoublons([g('abcd'), g('abce')])).toHaveLength(0)
  })

  test('ne signale pas des noms éloignés', () => {
    expect(trouverDoublons([g('garage central'), g('camion express')])).toHaveLength(0)
  })

  test('ne compare pas un groupe avec lui-même', () => {
    expect(trouverDoublons([g('auto plus')])).toHaveLength(0)
  })
})
