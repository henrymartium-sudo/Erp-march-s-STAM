import { test, expect } from '@playwright/test'
import {
  parseVue, paramVue, filtrerATraiter, compteursHorizon, libelleDelai, VERBES_ACTION,
  voyantsVisibles, pipelineVisible, lienVoyant, SEUILS_EN_CLAIR, ETATS_VOYANT,
} from '../../lib/tableau-de-bord/presentation'
import type { LigneATraiter, NatureEcheance, ResultatATraiter } from '../../lib/tableau-de-bord/a-traiter'

const AUJ = new Date('2026-11-12T10:00:00Z')
const J = (n: number) => new Date(Date.UTC(2026, 10, 12 + n, 9))

function ligne(p: Partial<LigneATraiter>): LigneATraiter {
  return {
    id: p.id ?? 'x:1', nature: p.nature ?? 'FACTURE_ECHUE', domaine: p.domaine ?? 'exec', libelle: 'L', reference: 'R',
    href: '/x', montant: p.montant ?? null, echeance: p.echeance ?? J(-1), horizon: p.horizon ?? 'retard',
    sansRattrapage: p.sansRattrapage ?? false,
  }
}
const resultat = (lignes: LigneATraiter[]): ResultatATraiter => ({
  lignes,
  manquants: {
    opportunitesSansDateDepot: [{ libelle: 'O', href: '/o' }],
    marchesSansDateLivraison: [{ libelle: 'M', href: '/m' }],
    marchesEnExecutionSansFin: [{ libelle: 'M2', href: '/m2' }],
    facturesSansDate: [{ libelle: 'F', href: '/f' }],
  },
})

test('parseVue : paramètres connus, inconnus, tableau', () => {
  expect(parseVue('execution', 'ADMIN')).toBe('exec')
  expect(parseVue('passation', 'ADMIN')).toBe('passation')
  expect(parseVue('xyz', 'ADMIN')).toBe('tout')
  expect(parseVue(undefined, 'AVANCE')).toBe('tout')
  expect(parseVue(['passation', 'execution'], 'ADMIN')).toBe('passation')
})

test('parseVue : EXPLOITATION reçoit toujours exec', () => {
  expect(parseVue('passation', 'EXPLOITATION')).toBe('exec')
  expect(parseVue(undefined, 'EXPLOITATION')).toBe('exec')
})

test('paramVue : undefined pour tout', () => {
  expect(paramVue('tout')).toBeUndefined()
  expect(paramVue('passation')).toBe('passation')
  expect(paramVue('exec')).toBe('execution')
})

test('filtrerATraiter : la vue exec ne garde que les lignes exec et vide les opportunités manquantes', () => {
  const r = filtrerATraiter(resultat([ligne({ id: 'a', domaine: 'exec' }), ligne({ id: 'b', domaine: 'passation' })]), 'exec')
  expect(r.lignes.map((l) => l.id)).toEqual(['a'])
  expect(r.manquants.opportunitesSansDateDepot).toEqual([])
  expect(r.manquants.marchesEnExecutionSansFin).toHaveLength(1)
  expect(r.manquants.marchesSansDateLivraison).toHaveLength(1)
  expect(r.manquants.facturesSansDate).toHaveLength(1)
})

test('filtrerATraiter : la vue passation ne garde que la passation et vide les manquants d’exécution', () => {
  const r = filtrerATraiter(resultat([ligne({ id: 'a', domaine: 'exec' }), ligne({ id: 'b', domaine: 'passation' })]), 'passation')
  expect(r.lignes.map((l) => l.id)).toEqual(['b'])
  expect(r.manquants).toEqual({
    opportunitesSansDateDepot: [{ libelle: 'O', href: '/o' }],
    marchesSansDateLivraison: [], marchesEnExecutionSansFin: [], facturesSansDate: [],
  })
})

test('filtrerATraiter : la vue tout ne change rien', () => {
  const r = resultat([ligne({ domaine: 'exec' }), ligne({ id: 'b', domaine: 'passation' })])
  expect(filtrerATraiter(r, 'tout')).toEqual(r)
})

test('compteursHorizon : 2 en retard dont 1 sans rattrapage sur 3 lignes', () => {
  const c = compteursHorizon([
    ligne({ horizon: 'retard', sansRattrapage: true }), ligne({ horizon: 'retard' }), ligne({ horizon: 'semaine' }),
  ])
  expect(c).toEqual({ retard: 2, semaine: 1, mois: 0, sansRattrapage: { retard: 1, semaine: 0, mois: 0 } })
})

test('libelleDelai : échue, aujourd’hui, à venir', () => {
  expect(libelleDelai(J(-12), AUJ)).toBe('Échue depuis 12 j')
  expect(libelleDelai(J(0), AUJ)).toBe("Aujourd'hui")
  expect(libelleDelai(J(4), AUJ)).toBe('J-4')
})

test('VERBES_ACTION couvre toutes les natures', () => {
  const natures: NatureEcheance[] = [
    'DEPOT_OFFRE', 'FIN_VALIDITE_OFFRE', 'ATTRIBUTION_PROVISOIRE', 'LIVRAISON_EN_RETARD', 'FIN_EXECUTION_PROCHE',
    'RECEPTION_DEFINITIVE', 'GARANTIES_A_LIBERER', 'CAUTION_A_RENOUVELER', 'CAUTION_A_LIBERER', 'FACTURE_ECHUE',
  ]
  expect(Object.keys(VERBES_ACTION).sort()).toEqual([...natures].sort())
  expect(VERBES_ACTION.RECEPTION_DEFINITIVE).toBe("Relancer l'autorité")
  expect(VERBES_ACTION.FIN_EXECUTION_PROCHE).toBe('Préparer la réception')
  expect(VERBES_ACTION.CAUTION_A_LIBERER).toBe('Demander la mainlevée')
})

test('voyantsVisibles et pipelineVisible par vue', () => {
  expect(voyantsVisibles('exec')).toEqual({ encaissements: true, cautions: true, resteAFacturer: true, tauxSucces: false, depots: false })
  expect(voyantsVisibles('passation')).toEqual({ encaissements: false, cautions: false, resteAFacturer: false, tauxSucces: true, depots: true })
  expect(Object.values(voyantsVisibles('tout')).every(Boolean)).toBe(true)
  expect(pipelineVisible('exec')).toBe(false)
  expect(pipelineVisible('passation')).toBe(true)
  expect(pipelineVisible('tout')).toBe(true)
})

test('lienVoyant : listes les plus proches ; taux de succès réservé à ADMIN et AVANCE', () => {
  expect(lienVoyant('tauxSucces', 'VISITEUR', AUJ)).toBeNull()
  expect(lienVoyant('tauxSucces', 'EXPLOITATION', AUJ)).toBeNull()
  expect(lienVoyant('tauxSucces', 'AVANCE', AUJ)).toBe('/pilotage')
  expect(lienVoyant('tauxSucces', 'ADMIN', AUJ)).toBe('/pilotage')
  expect(lienVoyant('cautions', 'ADMIN', AUJ)).toBe('/cautions?dateEcheanceFin=2026-12-12')
  expect(lienVoyant('encaissements', 'ADMIN', AUJ)).toBe('/factures')
  expect(lienVoyant('resteAFacturer', 'ADMIN', AUJ)).toBe('/marches')
  expect(lienVoyant('depots', 'VISITEUR', AUJ)).toBe('/opportunites?echeance=a-venir')
})

test('seuils en clair et états de voyant', () => {
  expect(Object.keys(SEUILS_EN_CLAIR).sort()).toEqual(['cautions', 'depots', 'encaissements', 'resteAFacturer', 'tauxSucces'])
  expect(SEUILS_EN_CLAIR.cautions).toBe("Orange sous 30 j, rouge sous 7 j avant l'échéance")
  expect(ETATS_VOYANT).toEqual({ vert: 'Correct', ambre: 'À surveiller', rouge: 'Urgent', gris: 'Pas assez de données' })
})
