import { test, expect } from '@playwright/test'
import { droitsTableauDeBord, masquerMontantsATraiter, masquerMontantsPipeline } from '../../lib/tableau-de-bord/droits'
import { calculerPipeline } from '../../lib/tableau-de-bord/pipeline'
import type { ResultatATraiter } from '../../lib/tableau-de-bord/a-traiter'

test('ADMIN et AVANCE : finances, montants et passation, aucune restriction de marché', () => {
  expect(droitsTableauDeBord('ADMIN')).toEqual({ finances: true, passation: true, restrictionMarche: undefined })
  expect(droitsTableauDeBord('AVANCE')).toEqual({ finances: true, passation: true, restrictionMarche: undefined })
})

test('EXPLOITATION : ni finances ni passation, marchés en exécution seulement', () => {
  expect(droitsTableauDeBord('EXPLOITATION')).toEqual({ finances: false, passation: false, restrictionMarche: 'EN_EXECUTION' })
})

test('VISITEUR et rôle absent : passation sans finances', () => {
  expect(droitsTableauDeBord('VISITEUR')).toEqual({ finances: false, passation: true, restrictionMarche: undefined })
  expect(droitsTableauDeBord(undefined)).toEqual({ finances: false, passation: true, restrictionMarche: undefined })
  expect(droitsTableauDeBord(null)).toEqual({ finances: false, passation: true, restrictionMarche: undefined })
})

test('masquer les montants de la liste À traiter : montant null, le reste intact', () => {
  const r: ResultatATraiter = {
    lignes: [{
      id: 'A_CLOTURER:m1', nature: 'A_CLOTURER', domaine: 'exec', libelle: 'Marché à clôturer', reference: 'M-1',
      href: '/marches/m1', montant: 5000, echeance: new Date('2026-11-01'), horizon: 'retard', sansRattrapage: false,
    }],
    manquants: { opportunitesSansDateDepot: [], marchesSansDateLivraison: [] },
  }
  const m = masquerMontantsATraiter(r)
  expect(m.lignes[0]).toEqual({ ...r.lignes[0], montant: null })
  expect(JSON.stringify(m)).not.toContain('5000')
})

test('masquer les montants du pipeline : nombres gardés, montants null', () => {
  const p = masquerMontantsPipeline(calculerPipeline([{ statut: 'GO', montantEstime: 7777 }]))
  expect(p.total).toEqual({ nombre: 1, montant: null })
  expect(p.phases.every((ph) => ph.montant === null)).toBe(true)
  expect(p.phases[1]?.nombre).toBe(1)
  expect(JSON.stringify(p)).not.toContain('7777')
})
