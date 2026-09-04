import { describe, expect, it } from 'vitest'
import { formatMontantFCFA, fmtAbrege, formatMontant, formatMontantSansDevise } from './format'

/**
 * Régression : le 2026-02-09, un audit (docs/audit/2026-02-09-audit-incoherences-prd.md,
 * incohérence #6, CRITIQUE) a constaté que ce module affichait "DH" (Dirham) au lieu de
 * "FCFA" (Franc CFA — devise réelle du contexte métier, Afrique de l'Ouest francophone)
 * dans l'UI, les exports Excel et les rapports PDF. Corrigé depuis, mais jamais verrouillé
 * par un test — ces fonctions sont appelées depuis ~28 fichiers (composants, emails,
 * exports), donc une régression sur la devise se propagerait aussi largement que la
 * première fois.
 */
describe('formatMontantFCFA', () => {
  it('affiche toujours le suffixe "FCFA" (jamais "DH" ni aucune autre devise)', () => {
    for (const valeur of [0, 500, 12_000, 3_500_000, 3_396_000_000]) {
      expect(formatMontantFCFA(valeur)).toMatch(/FCFA$/)
      expect(formatMontantFCFA(valeur)).not.toMatch(/DH/)
    }
  })

  it('abrège en milliards (Md) au-delà de 1 000 000 000, avec 2 décimales', () => {
    expect(formatMontantFCFA(3_396_000_000)).toBe('3,40 Md FCFA')
    expect(formatMontantFCFA(1_000_000_000)).toBe('1,00 Md FCFA')
  })

  it('abrège en millions (M) entre 1 000 000 et 999 999 999, arrondi', () => {
    expect(formatMontantFCFA(245_000_000)).toBe('245 M FCFA')
    expect(formatMontantFCFA(1_000_000)).toBe('1 M FCFA')
  })

  it('abrège en milliers (k) entre 1 000 et 999 999, arrondi', () => {
    expect(formatMontantFCFA(12_000)).toBe('12 k FCFA')
    expect(formatMontantFCFA(1_000)).toBe('1 k FCFA')
  })

  it('affiche le nombre brut en dessous de 1 000, avec séparateurs fr-FR', () => {
    expect(formatMontantFCFA(500)).toBe('500 FCFA')
    expect(formatMontantFCFA(0)).toBe('0 FCFA')
  })
})

describe('fmtAbrege', () => {
  it('ne contient jamais le suffixe devise (pour axes/tooltips de graphique)', () => {
    expect(fmtAbrege(3_396_000_000)).not.toMatch(/FCFA|DH/)
  })

  it('même logique de seuils que formatMontantFCFA, sans le suffixe FCFA', () => {
    // Note : contrairement à formatMontantFCFA, fmtAbrege n'a pas de
    // .replace('.', ',') — la décimale du "Md" reste au format anglais
    // (point). Le docstring de la fonction donne "3,4 Md" (virgule) comme
    // exemple, ce qui ne correspond pas au comportement réel : test aligné
    // sur le comportement réel, écart signalé séparément (hors périmètre
    // de ce point, qui porte sur le libellé de devise FCFA/DH).
    expect(fmtAbrege(3_396_000_000)).toBe('3.4 Md')
    expect(fmtAbrege(245_000_000)).toBe('245 M')
    expect(fmtAbrege(12_000)).toBe('12 k')
    expect(fmtAbrege(500)).toBe('500')
  })
})

describe('formatMontant', () => {
  it('affiche toujours "FCFA" et jamais "DH"', () => {
    expect(formatMontant(1_234_567)).toMatch(/FCFA$/)
    expect(formatMontant(1_234_567)).not.toMatch(/DH/)
  })

  it('formate un number avec séparateurs de milliers fr-FR', () => {
    expect(formatMontant(1_234_567)).toMatch(/^1\s234\s567 FCFA$/)
  })

  it('accepte une chaîne numérique (montant transmis en string)', () => {
    expect(formatMontant('1234567')).toMatch(/^1\s234\s567 FCFA$/)
  })

  it('accepte un objet de type Prisma Decimal (méthode toNumber())', () => {
    const decimalLike = { toNumber: () => 1_234_567 }
    expect(formatMontant(decimalLike)).toMatch(/^1\s234\s567 FCFA$/)
  })

  it('retombe sur "0 FCFA" pour une valeur non numérique (jamais de crash ni "NaN FCFA")', () => {
    expect(formatMontant('pas-un-nombre')).toBe('0 FCFA')
    expect(formatMontant(undefined)).toBe('0 FCFA')
    expect(formatMontant(null)).toBe('0 FCFA')
  })
})

describe('formatMontantSansDevise', () => {
  it('ne contient jamais de suffixe devise', () => {
    expect(formatMontantSansDevise(1_234_567)).not.toMatch(/FCFA|DH/)
  })

  it('formate avec séparateurs de milliers fr-FR', () => {
    expect(formatMontantSansDevise(1_234_567)).toMatch(/^1\s234\s567$/)
  })

  it('accepte string et Decimal-like comme formatMontant', () => {
    expect(formatMontantSansDevise('1234567')).toMatch(/^1\s234\s567$/)
    expect(formatMontantSansDevise({ toNumber: () => 1_234_567 })).toMatch(/^1\s234\s567$/)
  })

  it('retombe sur "0" pour une valeur non numérique', () => {
    expect(formatMontantSansDevise('pas-un-nombre')).toBe('0')
    expect(formatMontantSansDevise(undefined)).toBe('0')
  })
})
