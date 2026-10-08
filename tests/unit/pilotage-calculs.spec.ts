import { test, expect } from '@playwright/test'
import {
  calculerConversion, calculerIssueOffres, calculerEcartPrix, calculerQualite, estAttribueUnJour, intituleLot,
  calculerMarchesHistoriques, issueMarcheHistorique,
  type MarchePilotage, type LotPilotage,
} from '../../lib/pilotage/calculs'
import { calculerStatsResultatsLots } from '../../lib/utils/lots'

const libelles = (els: { libelle: string }[]) => els.map((e) => e.libelle)

const PERIODE = { dateDebut: new Date('2026-01-01'), dateFin: new Date('2026-12-31T23:59:59') }

function marche(p: Partial<MarchePilotage>): MarchePilotage {
  return {
    id: p.id ?? 'm1', numero: p.numero ?? 'M-1', objet: 'Objet', statut: p.statut ?? 'EN_EXECUTION',
    montant: p.montant ?? 1000, dateAttribution: p.dateAttribution === undefined ? new Date('2026-03-01') : p.dateAttribution,
    dateDepotOffre: p.dateDepotOffre ?? null, attribueUnJour: p.attribueUnJour ?? true,
    factures: p.factures ?? [], motifRenseigne: p.motifRenseigne ?? false, dateFinPrevue: p.dateFinPrevue ?? null,
    aOpportunite: p.aOpportunite ?? true,
    concurrentGagnant: p.concurrentGagnant ?? null,
    dateDernierStatut: p.dateDernierStatut ?? null,
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
    expect(libelles(r.exclusSansDate)).toEqual(['M-SD'])
    expect(r.exclusSansDate[0]!.href).toBe('/marches/sansdate')
  })
})

function lot(p: Partial<LotPilotage>): LotPilotage {
  return {
    id: p.id ?? 'l1', opportuniteId: p.opportuniteId ?? 'o1', libelle: p.libelle ?? 'Lot 1', resultat: p.resultat ?? 'PERDU',
    montantPropose: p.montantPropose === undefined ? 1100 : p.montantPropose,
    montantOffreConcurrent: p.montantOffreConcurrent === undefined ? 1000 : p.montantOffreConcurrent,
    dateDepot: p.dateDepot === undefined ? new Date('2026-02-01') : p.dateDepot,
    soumis: p.soumis ?? true, motifRenseigne: p.motifRenseigne ?? false,
    autorite: p.autorite ?? 'Autorité Test', concurrentGagnant: p.concurrentGagnant === undefined ? 'Concurrent Test' : p.concurrentGagnant,
    motif: p.motif === undefined ? null : p.motif,
  }
}

test('intituleLot : référence, sinon objet, sinon repli ; jamais vide', () => {
  expect(intituleLot('AO-2026-01', 'Objet', 2)).toBe('AO-2026-01 — Lot 2')
  expect(intituleLot('', 'Objet', 1)).toBe('Objet — Lot 1')
  expect(intituleLot('   ', null, 3)).toBe('Sans intitulé — Lot 3')
  expect(intituleLot(null, '  Objet  ', 1)).toBe('Objet — Lot 1')
})

test.describe('calculerIssueOffres — détail complet', () => {
  test('toutes les issues figurent au détail et leur nombre égale les lots soumis', () => {
    const r = calculerIssueOffres([
      lot({ id: '1', resultat: 'GAGNE', montantPropose: 3000, concurrentGagnant: null }),
      lot({ id: '2', resultat: 'PERDU', montantPropose: 1100, montantOffreConcurrent: 1000, motif: 'Prix trop élevé' }),
      lot({ id: '3', resultat: 'INFRUCTUEUX', montantPropose: 700 }),
      lot({ id: '4', resultat: 'EN_COURS', montantPropose: 900 }),
      lot({ id: '5', resultat: 'PERDU', soumis: false }),
    ], PERIODE)
    expect(r.detail).toHaveLength(r.lotsSoumis)
    expect(r.detail.map((d) => d.issue)).toEqual(['Gagné', 'Perdu', 'Sans suite', 'En attente'])
    const perdu = r.detail.find((d) => d.id === '2')!
    expect(perdu).toMatchObject({
      autorite: 'Autorité Test', concurrentGagnant: 'Concurrent Test', montantOffreConcurrent: 1000,
      ecartFcfa: 100, ecartPct: 10, motif: 'Prix trop élevé', opportuniteId: 'o1',
    })
  })

  test("l'écart n'est calculé que pour un lot perdu avec les deux montants", () => {
    const r = calculerIssueOffres([
      lot({ id: 'a', resultat: 'PERDU', montantOffreConcurrent: null }),
      lot({ id: 'b', resultat: 'GAGNE' }),
    ], PERIODE)
    expect(r.detail.find((d) => d.id === 'a')).toMatchObject({ ecartFcfa: null, ecartPct: null })
    expect(r.detail.find((d) => d.id === 'b')).toMatchObject({ ecartFcfa: null, ecartPct: null })
  })
})

test.describe('calculerConversion — drapeaux de ligne', () => {
  const AUJOURDHUI = new Date('2026-06-10')

  test('facturé au-delà du contractuel (+2 %) signalé sur la ligne', () => {
    const r = calculerConversion([
      marche({ id: 'ok', montant: 1000, factures: [{ statut: 'PAYEE', montantTTC: 1020 }] }),
      marche({ id: 'trop', montant: 1000, factures: [{ statut: 'PAYEE', montantTTC: 1021 }] }),
    ], PERIODE, AUJOURDHUI)
    expect(r.marches.find((m) => m.id === 'ok')?.auDelaContractuel).toBe(false)
    expect(r.marches.find((m) => m.id === 'trop')?.auDelaContractuel).toBe(true)
  })

  test('un marché attribué depuis moins de 30 jours et non facturé est « récent »', () => {
    const r = calculerConversion([
      marche({ id: 'recent', dateAttribution: new Date('2026-05-20') }),
      marche({ id: 'ancien', dateAttribution: new Date('2026-03-01') }),
      marche({ id: 'recent-facture', dateAttribution: new Date('2026-05-20'), factures: [{ statut: 'EMISE', montantTTC: 10 }] }),
    ], PERIODE, AUJOURDHUI)
    expect(r.marches.find((m) => m.id === 'recent')?.recent).toBe(true)
    expect(r.marches.find((m) => m.id === 'ancien')?.recent).toBe(false)
    expect(r.marches.find((m) => m.id === 'recent-facture')?.recent).toBe(false)
  })
})

test("issue des offres : le taux n'est fiable qu'à partir de 3 dossiers clos", () => {
  const peu = calculerIssueOffres([lot({ id: '1', resultat: 'GAGNE' }), lot({ id: '2', resultat: 'PERDU' })], PERIODE)
  expect(peu.suffisant).toBe(false)
  const assez = calculerIssueOffres([
    lot({ id: '1', resultat: 'GAGNE' }), lot({ id: '2', resultat: 'PERDU' }), lot({ id: '3', resultat: 'PERDU' }),
  ], PERIODE)
  expect(assez.suffisant).toBe(true)
})

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
    expect(libelles(r.exclusSansDate)).toEqual(['Lot X'])
    expect(r.exclusSansDate[0]!.href).toBe('/opportunites/o1')
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
  const par = Object.fromEntries(q.map((e) => [e.cle, libelles(e.elements)]))
  expect(q.find((e) => e.cle === 'SANS_FACTURE')!.elements[0]!.href).toBe('/marches/m1')
  expect(q.find((e) => e.cle === 'ECHEC_SANS_MOTIF')!.elements.at(-1)!.href).toBe('/opportunites/o1')
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
  expect(libelles(r.exclusSansDate)).toEqual(['RES-SANS-DATE'])
})

test('multi-lots : chaque lot d\'une même opportunité compte pour lui-même', () => {
  const r = calculerIssueOffres([
    lot({ id: 'a', resultat: 'GAGNE', montantPropose: 100 }),
    lot({ id: 'b', resultat: 'PERDU', montantPropose: 200 }),
    lot({ id: 'c', resultat: 'INFRUCTUEUX', montantPropose: 300 }),
  ], PERIODE) // même opportunité 'o1' pour les trois
  expect(r.gagnes.nombre).toBe(1)
  expect(r.perdus.nombre).toBe(1)
  expect(r.sansSuite.nombre).toBe(1)
  // Cohérence avec la règle « Résultats par lot » déjà en production
  expect(r.tauxSucces).toBe(calculerStatsResultatsLots(['GAGNE', 'PERDU', 'INFRUCTUEUX']).tauxReussite)
})

test('garde-fou facture : 2 % tolérés, au-delà signalé', () => {
  const ms = [
    marche({ numero: 'PILE', montant: 1000, factures: [{ statut: 'PAYEE', montantTTC: 1020 }] }),
    marche({ numero: 'AU-DELA', montant: 1000, factures: [{ statut: 'PAYEE', montantTTC: 1021 }] }),
  ]
  const q = calculerQualite(ms, [], calculerConversion(ms, PERIODE), calculerIssueOffres([], PERIODE), new Date('2026-10-02'))
  expect(libelles(q.find((e) => e.cle === 'FACTURE_SUPERIEURE')!.elements)).toEqual(['AU-DELA'])
})

test('écart de prix : un lot perdu d\'une offre non soumise est ignoré', () => {
  const r = calculerEcartPrix([lot({ id: '1' }), lot({ id: '2', soumis: false })], PERIODE)
  expect(r.n).toBe(1)
})

test.describe('marchés historiques', () => {
  const hist = (p: Partial<MarchePilotage>) => marche({ aOpportunite: false, ...p })

  test('le statut détermine l’issue, le concurrent renseigné ne change rien', () => {
    expect(issueMarcheHistorique(hist({ statut: 'CLOTURE' }))).toBe('GAGNE')
    expect(issueMarcheHistorique(hist({ statut: 'EN_EXECUTION', concurrentGagnant: 'X' }))).toBe('GAGNE')
    expect(issueMarcheHistorique(hist({ statut: 'RESILIE' }))).toBe('PERDU_APRES_ATTRIBUTION')
    expect(issueMarcheHistorique(hist({ statut: 'ANNULE', attribueUnJour: true }))).toBe('PERDU_APRES_ATTRIBUTION')
    expect(issueMarcheHistorique(hist({ statut: 'ANNULE', attribueUnJour: false }))).toBe('SANS_SUITE')
    expect(issueMarcheHistorique(hist({ statut: 'INFRUCTUEUX' }))).toBe('SANS_SUITE')
    expect(issueMarcheHistorique(hist({ statut: 'OFFRE_DEPOSEE', concurrentGagnant: 'X' }))).toBe('A_QUALIFIER')
    expect(issueMarcheHistorique(hist({ statut: 'EN_ATTENTE_ATTRIBUTION' }))).toBe('A_QUALIFIER')
    expect(issueMarcheHistorique(hist({ statut: 'ATTRIBUE_PROVISOIREMENT' }))).toBe('A_QUALIFIER')
    expect(issueMarcheHistorique(hist({ statut: 'DOSSIER_EN_PREPARATION' }))).toBeNull()
  })

  test('répartit par issue sans jamais produire de perdu au sens des lots', () => {
    const r = calculerMarchesHistoriques([
      hist({ id: 'a', statut: 'CLOTURE', montant: 100 }),
      hist({ id: 'b', statut: 'EN_EXECUTION', montant: 200 }),
      hist({ id: 'c', statut: 'RESILIE', montant: 50 }),
      hist({ id: 'd', statut: 'INFRUCTUEUX', montant: 70, dateAttribution: null, dateDernierStatut: new Date('2026-05-01') }),
      hist({ id: 'e', statut: 'OFFRE_DEPOSEE', montant: 30, dateAttribution: null, dateDernierStatut: new Date('2026-06-01') }),
    ], PERIODE)
    expect(r.parIssue.GAGNE).toEqual({ nombre: 2, valeur: 300 })
    expect(r.parIssue.PERDU_APRES_ATTRIBUTION).toEqual({ nombre: 1, valeur: 50 })
    expect(r.parIssue.SANS_SUITE).toEqual({ nombre: 1, valeur: 70 })
    expect(r.parIssue.A_QUALIFIER).toEqual({ nombre: 1, valeur: 30 })
    expect(r.total).toEqual({ nombre: 5, valeur: 450 })
    expect(r.lignes).toHaveLength(5)
    expect(r.lignes[0]?.href).toBe('/marches/a')
  })

  test('un marché lié à une opportunité n’est jamais compté', () => {
    const r = calculerMarchesHistoriques([marche({ aOpportunite: true, statut: 'CLOTURE' })], PERIODE)
    expect(r.total.nombre).toBe(0)
  })

  test('hors période exclu ; sans aucune date signalé', () => {
    const r = calculerMarchesHistoriques([
      hist({ id: 'hors', statut: 'CLOTURE', dateAttribution: new Date('2025-06-01') }),
      hist({ id: 'sd', numero: 'M-SD', statut: 'INFRUCTUEUX', dateAttribution: null, dateDernierStatut: null }),
    ], PERIODE)
    expect(r.total.nombre).toBe(0)
    expect(libelles(r.exclusSansDate)).toEqual(['M-SD'])
  })
})

test('qualité : compteur d’incohérence statut / concurrent et libellé historiques', () => {
  const ms = [
    marche({ id: 'i1', numero: 'INC', aOpportunite: false, statut: 'CLOTURE', concurrentGagnant: 'X' }),
    marche({ id: 'i2', numero: 'OK', aOpportunite: false, statut: 'CLOTURE' }),
    marche({ id: 'i3', numero: 'QUAL', aOpportunite: false, statut: 'OFFRE_DEPOSEE', concurrentGagnant: 'X' }),
  ]
  const q = calculerQualite(ms, [], calculerConversion(ms, PERIODE), calculerIssueOffres([], PERIODE), new Date('2026-10-02'))
  const par = Object.fromEntries(q.map((e) => [e.cle, libelles(e.elements)]))
  expect(par.STATUT_CONCURRENT_INCOHERENT).toEqual(['INC'])
  expect(q.find((e) => e.cle === 'SANS_OPPORTUNITE')?.libelle).toContain('présentés à part')
})
