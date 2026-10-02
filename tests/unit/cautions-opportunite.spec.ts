import { test, expect } from '@playwright/test'
import type { StatutOpportunite, TypeCaution } from '@prisma/client'
import {
  STATUTS_CAUTIONS_OPPORTUNITE,
  TYPES_CAUTION_OPPORTUNITE,
  cautionsOpportuniteVisibles,
  typeCautionAutoriseSurOpportunite,
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
