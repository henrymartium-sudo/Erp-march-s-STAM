import { test, expect } from '@playwright/test'
import {
  calculerConversion, calculerIssueOffres, calculerEcartPrix, calculerQualite, estAttribueUnJour,
  type MarchePilotage, type LotPilotage,
} from '../../lib/pilotage/calculs'

const PERIODE = { dateDebut: new Date('2026-01-01'), dateFin: new Date('2026-12-31T23:59:59') }

function marche(p: Partial<MarchePilotage>): MarchePilotage {
  return {
    id: p.id ?? 'm1', numero: p.numero ?? 'M-1', objet: 'Objet', statut: p.statut ?? 'EN_EXECUTION',
    montant: p.montant ?? 1000, dateAttribution: p.dateAttribution === undefined ? new Date('2026-03-01') : p.dateAttribution,
    dateDepotOffre: p.dateDepotOffre ?? null, attribueUnJour: p.attribueUnJour ?? true,
    factures: p.factures ?? [], motifRenseigne: p.motifRenseigne ?? false, dateFinPrevue: p.dateFinPrevue ?? null,
    aOpportunite: p.aOpportunite ?? true,
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
    expect(r.nbPerdusApresAttribution).toBe(1)
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

test.describe('calculerIssueOffres', () => {
  test('répartit les lots soumis en nombre et en valeur ; taux de perte sur les seuls dossiers clos', () => {
    const r = calculerIssueOffres([
      lot({ id: '1', resultat: 'GAGNE', montantPropose: 3000 }),
      lot({ id: '2', resultat: 'PERDU', montantPropose: 1000 }),
      lot({ id: '3', resultat: 'PERDU', montantPropose: 500 }),
      lot({ id: '4', resultat: 'INFRUCTUEUX', montantPropose: 700 }),
      lot({ id: '5', resultat: 'EN_COURS', montantPropose: 9000 }),
      lot({ id: '6', resultat: 'ATTRIBUE_PROVISOIREMENT', montantPropose: 100 }),
      lot({ id: '7', resultat: 'PERDU', soumis: false }),
    ], PERIODE)
    expect(r.gagnes).toEqual({ nombre: 1, valeur: 3000 })
    expect(r.perdus).toEqual({ nombre: 2, valeur: 1500 })
    expect(r.sansSuite).toEqual({ nombre: 1, valeur: 700 })
    expect(r.enAttente).toEqual({ nombre: 2, valeur: 9100 })
    expect(r.lotsSoumis).toBe(6)
    expect(r.tauxPerte).toBe(67)  // 2 perdus / (1 gagné + 2 perdus) ; en attente et infructueux hors taux
    expect(r.tauxSucces).toBe(33) // complément exact du taux de perte
  })

  test('aucun dossier clos : pas de taux', () => {
    const r = calculerIssueOffres([lot({ resultat: 'EN_COURS' }), lot({ id: '2', resultat: 'INFRUCTUEUX' })], PERIODE)
    expect(r.tauxPerte).toBeNull()
    expect(r.tauxSucces).toBeNull()
  })

  test('lot soumis sans date de dépôt signalé', () => {
    const r = calculerIssueOffres([lot({ libelle: 'Lot X', dateDepot: null })], PERIODE)
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
    marche({ numero: 'ANCIEN', statut: 'INFRUCTUEUX', motifRenseigne: true, aOpportunite: false }),
    marche({ numero: 'PREPA', statut: 'DOSSIER_EN_PREPARATION', aOpportunite: false }),
  ]
  const lots = [lot({ libelle: 'Lot sans motif', resultat: 'PERDU', motifRenseigne: false })]
  const conversion = calculerConversion(marches, PERIODE)
  const offres = calculerIssueOffres(lots, PERIODE)
  const q = calculerQualite(marches, lots, conversion, offres, new Date('2026-10-02'))
  const par = Object.fromEntries(q.map((e) => [e.cle, e.elements]))
  expect(par.SANS_FACTURE).toEqual(['SANSFAC'])
  expect(par.ECHEANCE_DEPASSEE).toEqual(['RETARD'])
  expect(par.ECHEC_SANS_MOTIF).toEqual(['RESIL', 'Lot sans motif'])
  expect(par.SANS_DATE).toEqual([])
  expect(par.FACTURE_SUPERIEURE).toEqual(['SURFAC'])
  expect(par.SANS_OPPORTUNITE).toEqual(['ANCIEN']) // offre déposée sans opportunité liée ; PREPA pas encore déposé
})

test('un marché résilié a toujours été attribué, même sans date ni historique', () => {
  expect(estAttribueUnJour('RESILIE', null, null)).toBe(true)
  expect(estAttribueUnJour('ANNULE', null, null)).toBe(false)
  expect(estAttribueUnJour('ANNULE', null, new Date('2026-03-01'))).toBe(true)
  expect(estAttribueUnJour('EN_EXECUTION', null, null)).toBe(true)
  expect(estAttribueUnJour('INFRUCTUEUX', null, null)).toBe(false)
  expect(estAttribueUnJour('INFRUCTUEUX', new Date('2026-03-01'), null)).toBe(true)
  // Résilié sans date : signalé dans « exclus faute de date », jamais exclu en silence
  const r = calculerConversion([marche({ numero: 'RES-SANS-DATE', statut: 'RESILIE', dateAttribution: null, attribueUnJour: estAttribueUnJour('RESILIE', null, null) })], PERIODE)
  expect(r.exclusSansDate).toEqual(['RES-SANS-DATE'])
})
