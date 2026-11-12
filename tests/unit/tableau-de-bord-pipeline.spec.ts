import { test, expect } from '@playwright/test'
import { calculerPipeline, PHASES_PIPELINE } from '../../lib/tableau-de-bord/pipeline'

test('IDENTIFIEE compte dans En analyse, SOUMISE dans Offre soumise', () => {
  const r = calculerPipeline([
    { statut: 'IDENTIFIEE', montantEstime: 100 }, { statut: 'EN_ANALYSE', montantEstime: 50 },
    { statut: 'SOUMISE', montantEstime: 200 }, { statut: 'OFFRE_SOUMISE', montantEstime: 300 },
  ])
  expect(r.phases[0]).toEqual({ statut: 'EN_ANALYSE', libelle: 'En analyse', nombre: 2, montant: 150, href: '/opportunites?statut=EN_ANALYSE' })
  expect(r.phases[3]).toMatchObject({ statut: 'OFFRE_SOUMISE', nombre: 2, montant: 500 })
  expect(r.total).toEqual({ nombre: 4, montant: 650 })
})

test('GAGNEE, PERDUE, NO_GO exclus du total', () => {
  const r = calculerPipeline([
    { statut: 'GAGNEE', montantEstime: 100 }, { statut: 'PERDUE', montantEstime: 100 },
    { statut: 'NO_GO', montantEstime: 100 }, { statut: 'GO', montantEstime: 10 },
  ])
  expect(r.total).toEqual({ nombre: 1, montant: 10 })
})

test('montant null compté 0', () => {
  expect(calculerPipeline([{ statut: 'GO', montantEstime: null }]).phases[1]).toMatchObject({ nombre: 1, montant: 0 })
})

test('six phases toujours présentes, même à 0', () => {
  const r = calculerPipeline([])
  expect(r.phases.map((p) => p.statut)).toEqual([
    'EN_ANALYSE', 'GO', 'DOSSIER_EN_PREPARATION', 'OFFRE_SOUMISE', 'EN_ATTENTE_ATTRIBUTION', 'ATTRIBUE_PROVISOIREMENT',
  ])
  expect(r.phases.every((p) => p.nombre === 0 && p.montant === 0)).toBe(true)
  expect(PHASES_PIPELINE).toHaveLength(6)
})
