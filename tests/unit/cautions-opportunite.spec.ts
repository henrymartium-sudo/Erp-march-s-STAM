import { test, expect } from '@playwright/test'
import type { StatutOpportunite, TypeCaution } from '@prisma/client'
import {
  STATUTS_CAUTIONS_OPPORTUNITE,
  TYPES_CAUTION_OPPORTUNITE,
  cautionsOpportuniteVisibles,
  typeCautionAutoriseSurOpportunite,
  verdictRattachementOpportunite,
  TYPES_CAUTION_MARCHE_ISSU_OPPORTUNITE,
  typeCautionAutoriseSurMarche,
  typesCautionProposesSurMarche,
  verdictRattachementMarche,
} from '../../lib/utils/cautions-opportunite'

test.describe('cautionsOpportuniteVisibles', () => {
  const visibles: StatutOpportunite[] = [
    'DOSSIER_EN_PREPARATION',
    'OFFRE_SOUMISE',
    'SOUMISE',
    'EN_ATTENTE_ATTRIBUTION',
    'ATTRIBUE_PROVISOIREMENT',
    'GAGNEE',
    'PERDUE',
  ]
  const masques: StatutOpportunite[] = ['IDENTIFIEE', 'EN_ANALYSE', 'GO', 'NO_GO']

  for (const statut of visibles) {
    test(`${statut} → section visible`, () => {
      expect(cautionsOpportuniteVisibles(statut)).toBe(true)
    })
  }

  for (const statut of masques) {
    test(`${statut} → section masquée`, () => {
      expect(cautionsOpportuniteVisibles(statut)).toBe(false)
    })
  }

  test('la liste exportée correspond aux statuts visibles attendus', () => {
    expect([...STATUTS_CAUTIONS_OPPORTUNITE].sort()).toEqual([...visibles].sort())
  })
})

test.describe('typeCautionAutoriseSurOpportunite', () => {
  const autorises: TypeCaution[] = ['SOUMISSION', 'CAPACITE_FINANCIERE']
  const refuses: TypeCaution[] = ['BONNE_EXECUTION', 'AVANCE_DEMARRAGE', 'RETENUE_GARANTIE']

  for (const type of autorises) {
    test(`${type} → autorisé`, () => {
      expect(typeCautionAutoriseSurOpportunite(type)).toBe(true)
    })
  }

  for (const type of refuses) {
    test(`${type} → refusé`, () => {
      expect(typeCautionAutoriseSurOpportunite(type)).toBe(false)
    })
  }

  test('la liste exportée contient exactement les deux types d\'avant dépôt', () => {
    expect([...TYPES_CAUTION_OPPORTUNITE].sort()).toEqual([...autorises].sort())
  })
})

test.describe('verdictRattachementOpportunite', () => {
  test('caution de soumission sans lien → rattachable', () => {
    expect(verdictRattachementOpportunite({ type: 'SOUMISSION', marcheId: null, opportuniteId: null })).toEqual({ ok: true })
  })
  test('caution de capacité financière sans lien → rattachable', () => {
    expect(verdictRattachementOpportunite({ type: 'CAPACITE_FINANCIERE', marcheId: null, opportuniteId: null })).toEqual({ ok: true })
  })
  test('déjà rattachée à une opportunité → refusée', () => {
    const v = verdictRattachementOpportunite({ type: 'SOUMISSION', marcheId: null, opportuniteId: 'opp1' })
    expect(v.ok).toBe(false)
  })
  test('déjà rattachée à un marché → refusée', () => {
    const v = verdictRattachementOpportunite({ type: 'SOUMISSION', marcheId: 'm1', opportuniteId: null })
    expect(v.ok).toBe(false)
  })
  test("type d'après attribution → refusée", () => {
    const v = verdictRattachementOpportunite({ type: 'BONNE_EXECUTION', marcheId: null, opportuniteId: null })
    expect(v.ok).toBe(false)
  })
})

test.describe('types de caution sur un marché', () => {
  const avantDepot: TypeCaution[] = ['SOUMISSION', 'CAPACITE_FINANCIERE']
  const apresAttribution: TypeCaution[] = ['BONNE_EXECUTION', 'AVANCE_DEMARRAGE', 'RETENUE_GARANTIE']

  test("marché issu d'une opportunité : trois types proposés", () => {
    expect([...(typesCautionProposesSurMarche(true) ?? [])].sort()).toEqual([...apresAttribution].sort())
    expect([...TYPES_CAUTION_MARCHE_ISSU_OPPORTUNITE].sort()).toEqual([...apresAttribution].sort())
  })

  test('marché sans opportunité : aucune restriction (les cinq types)', () => {
    expect(typesCautionProposesSurMarche(false)).toBeUndefined()
  })

  for (const type of avantDepot) {
    test(`${type} : refusé sur un marché issu d'une opportunité, accepté sinon`, () => {
      expect(typeCautionAutoriseSurMarche(type, true)).toBe(false)
      expect(typeCautionAutoriseSurMarche(type, false)).toBe(true)
    })
  }

  for (const type of apresAttribution) {
    test(`${type} : accepté dans les deux cas`, () => {
      expect(typeCautionAutoriseSurMarche(type, true)).toBe(true)
      expect(typeCautionAutoriseSurMarche(type, false)).toBe(true)
    })
  }
})

test.describe('verdictRattachementMarche', () => {
  const libre = { marcheId: null, opportuniteId: null }

  test('caution libre de type compatible → ok', () => {
    expect(verdictRattachementMarche({ type: 'BONNE_EXECUTION', ...libre }, true)).toEqual({ ok: true })
    expect(verdictRattachementMarche({ type: 'SOUMISSION', ...libre }, false)).toEqual({ ok: true })
  })

  test("soumission sur marché issu d'une opportunité → refus avec renvoi vers l'opportunité", () => {
    const v = verdictRattachementMarche({ type: 'SOUMISSION', ...libre }, true)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.error).toContain('opportunité')
  })

  test('caution déjà rattachée (marché ou opportunité) → refus', () => {
    expect(verdictRattachementMarche({ type: 'BONNE_EXECUTION', marcheId: 'm1', opportuniteId: null }, false).ok).toBe(false)
    expect(verdictRattachementMarche({ type: 'BONNE_EXECUTION', marcheId: null, opportuniteId: 'o1' }, false).ok).toBe(false)
  })
})
