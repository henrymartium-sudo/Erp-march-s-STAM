import { test, expect } from '@playwright/test'
import {
  calculerConversion, calculerEchecs, calculerEcartPrix, calculerQualite,
  type MarchePilotage, type LotPilotage,
} from '../../lib/pilotage/calculs'

const PERIODE = { dateDebut: new Date('2026-01-01'), dateFin: new Date('2026-12-31T23:59:59') }

function marche(p: Partial<MarchePilotage>): MarchePilotage {
  return {
    id: p.id ?? 'm1', numero: p.numero ?? 'M-1', objet: 'Objet', statut: p.statut ?? 'EN_EXECUTION',
    montant: p.montant ?? 1000, dateAttribution: p.dateAttribution === undefined ? new Date('2026-03-01') : p.dateAttribution,
    dateDepotOffre: p.dateDepotOffre ?? null, attribueUnJour: p.attribueUnJour ?? true,
    factures: p.factures ?? [], motifRenseigne: p.motifRenseigne ?? false, dateFinPrevue: p.dateFinPrevue ?? null,
  }
}

test.describe('calculerConversion', () => {
  test('compte les factures émises, en attente et payées, ignore brouillon/rejetée/annulée', () => {
    const r = calculerConversion([marche({ factures: [
      { statut: 'EMISE', montantTTC: 100 }, { statut: 'EN_ATTENTE', montantTTC: 100 },
      { statut: 'PAYEE', montantTTC: 200 }, { statut: 'BROUILLON', montantTTC: 999 },
      { statut: 'REJETEE', montantTTC: 999 }, { statut: 'ANNULEE', montantTTC: 999 },
    ] })], PERIODE)
    expect(r.valeurAttribuee).toBe(1000)
    expect(r.facture).toBe(400)
    expect(r.encaisse).toBe(200)
    expect(r.taux).toBe(40)
    expect(r.tauxEncaisse).toBe(20)
    expect(r.alerte).toBe(false)
  })

  test('un marché résilié après attribution reste au dénominateur et compte en perdu', () => {
    const r = calculerConversion([
      marche({ id: 'a', montant: 1000, factures: [{ statut: 'PAYEE', montantTTC: 250 }] }),
      marche({ id: 'b', statut: 'RESILIE', montant: 1000 }),
    ], PERIODE)
    expect(r.valeurAttribuee).toBe(2000)
    expect(r.perduApresAttribution).toBe(1000)
    expect(r.taux).toBe(13) // 250 / 2000 = 12,5 → arrondi 13
    expect(r.alerte).toBe(true)
  })

  test('un marché annulé avant attribution est exclu', () => {
    const r = calculerConversion([marche({ statut: 'ANNULE', attribueUnJour: false })], PERIODE)
    expect(r.valeurAttribuee).toBe(0)
    expect(r.taux).toBeNull()
  })

  test('hors période exclu ; attribué sans date signalé', () => {
    const r = calculerConversion([
      marche({ id: 'hors', dateAttribution: new Date('2025-06-01') }),
      marche({ id: 'sansdate', numero: 'M-SD', dateAttribution: null }),
    ], PERIODE)
    expect(r.valeurAttribuee).toBe(0)
    expect(r.exclusSansDate).toEqual(['M-SD'])
  })
})

function lot(p: Partial<LotPilotage>): LotPilotage {
  return {
    id: p.id ?? 'l1', opportuniteId: 'o1', libelle: p.libelle ?? 'Lot 1', resultat: p.resultat ?? 'PERDU',
    montantPropose: p.montantPropose === undefined ? 1100 : p.montantPropose,
    montantOffreConcurrent: p.montantOffreConcurrent === undefined ? 1000 : p.montantOffreConcurrent,
    dateDepot: p.dateDepot === undefined ? new Date('2026-02-01') : p.dateDepot,
    soumis: p.soumis ?? true, motifRenseigne: p.motifRenseigne ?? false,
  }
}

test.describe('calculerEchecs', () => {
  test('cumule perdus + infructueux sur les lots soumis, succès selon la règle par lot', () => {
    const r = calculerEchecs([
      lot({ id: '1', resultat: 'GAGNE' }), lot({ id: '2', resultat: 'PERDU' }),
      lot({ id: '3', resultat: 'INFRUCTUEUX' }), lot({ id: '4', resultat: 'EN_COURS' }),
      lot({ id: '5', resultat: 'PERDU', soumis: false }),
    ], [], PERIODE)
    expect(r.lotsSoumis).toBe(4)
    expect(r.tauxEchec).toBe(50)  // (1 perdu + 1 infructueux) / 4
    expect(r.tauxSucces).toBe(50) // 1 gagné / (1 gagné + 1 perdu)
  })

  test('compte les marchés annulés ou résiliés après attribution', () => {
    const r = calculerEchecs([], [
      marche({ id: 'a', statut: 'RESILIE', montant: 500 }),
      marche({ id: 'b', statut: 'ANNULE', attribueUnJour: false }),
    ], PERIODE)
    expect(r.marchesAnnulesOuResilies).toBe(1)
    expect(r.valeurMarchesPerdus).toBe(500)
  })

  test('lot soumis sans date de dépôt signalé', () => {
    const r = calculerEchecs([lot({ libelle: 'Lot X', dateDepot: null })], [], PERIODE)
    expect(r.lotsSoumis).toBe(0)
    expect(r.exclusSansDate).toEqual(['Lot X'])
  })
})

test.describe('calculerEcartPrix', () => {
  test('moyenne des écarts sur les lots perdus renseignés', () => {
    const r = calculerEcartPrix([
      lot({ id: '1', montantPropose: 1100, montantOffreConcurrent: 1000 }), // +10 %
      lot({ id: '2', montantPropose: 1200, montantOffreConcurrent: 1000 }), // +20 %
      lot({ id: '3', montantPropose: 900, montantOffreConcurrent: 1000 }),  // -10 %
      lot({ id: '4', montantOffreConcurrent: null }),                       // ignoré
      lot({ id: '5', resultat: 'GAGNE' }),                                  // ignoré
    ], PERIODE)
    expect(r.n).toBe(3)
    expect(r.ecartMoyen).toBe(7) // (10 + 20 - 10) / 3 = 6,67 → 7
    expect(r.suffisant).toBe(true)
  })

  test('moins de 3 cas : insuffisant', () => {
    const r = calculerEcartPrix([lot({})], PERIODE)
    expect(r.n).toBe(1)
    expect(r.suffisant).toBe(false)
  })
})

test('calculerQualite signale chaque anomalie', () => {
  const marches = [
    marche({ numero: 'SANSFAC', statut: 'EN_EXECUTION' }),
    marche({ numero: 'RETARD', statut: 'EN_EXECUTION', dateFinPrevue: new Date('2026-01-01'), factures: [{ statut: 'EMISE', montantTTC: 10 }] }),
    marche({ numero: 'RESIL', statut: 'RESILIE', motifRenseigne: false }),
    marche({ numero: 'SURFAC', montant: 1000, factures: [{ statut: 'PAYEE', montantTTC: 1030 }] }),
  ]
  const lots = [lot({ libelle: 'Lot sans motif', resultat: 'PERDU', motifRenseigne: false })]
  const conversion = calculerConversion(marches, PERIODE)
  const echecs = calculerEchecs(lots, marches, PERIODE)
  const q = calculerQualite(marches, lots, conversion, echecs, new Date('2026-10-02'))
  const par = Object.fromEntries(q.map((e) => [e.cle, e.elements]))
  expect(par.SANS_FACTURE).toEqual(['SANSFAC'])
  expect(par.ECHEANCE_DEPASSEE).toEqual(['RETARD'])
  expect(par.ECHEC_SANS_MOTIF).toEqual(['RESIL', 'Lot sans motif'])
  expect(par.SANS_DATE).toEqual([])
  expect(par.FACTURE_SUPERIEURE).toEqual(['SURFAC'])
})
