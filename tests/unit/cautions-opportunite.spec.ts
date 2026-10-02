import { test, expect } from '@playwright/test'
import type { StatutOpportunite } from '@prisma/client'
import {
  STATUTS_CAUTIONS_OPPORTUNITE,
  cautionsOpportuniteVisibles,
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
