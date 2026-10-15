import { test, expect } from '@playwright/test'
import { classerOpportunites } from '../../lib/email/opportunite-reporting-sections'
import type { OpportuniteForReporting } from '../../lib/email/opportunite-reporting-templates'

const now = new Date('2026-10-14T08:00:00Z')

function opp(id: string, statut: string, dateLimite: string | null): OpportuniteForReporting {
  return {
    id, reference: id, objet: `Objet ${id}`, autoriteContractante: 'Autorité', statut,
    montantEstime: null, lots: [], dateLimite: dateLimite ? new Date(dateLimite) : null,
    periodeValiditeDebut: null, periodeValiditeFin: null, echeanceAttributionProv: null, notes: null,
  }
}

test.describe('classement des opportunités du mail de suivi', () => {
  test('une date limite à 10 h dans 7 jours est à traiter (jours calendaires, pas durée arrondie)', () => {
    const matin = new Date('2026-10-14T09:00:00Z')
    const r = classerOpportunites([opp('go-10h', 'GO', '2026-10-21T10:00:00Z')], matin)
    expect(r.aTraiter.map((x) => x.opp.id)).toEqual(['go-10h'])
  })

  test('un dossier en préparation à échéance proche est à traiter comme un GO', () => {
    const r = classerOpportunites([opp('prepa', 'DOSSIER_EN_PREPARATION', '2026-10-16T00:00:00Z'), opp('prepa-loin', 'DOSSIER_EN_PREPARATION', '2026-11-30T00:00:00Z')], now)
    expect(r.aTraiter.map((x) => [x.opp.id, x.motif])).toEqual([['prepa', 'GO_ECHEANCE']])
  })

  test('sépare actives et terminées (No Go, Perdue)', () => {
    const r = classerOpportunites([opp('a', 'GO', null), opp('b', 'NO_GO', null), opp('c', 'PERDUE', null), opp('d', 'GAGNEE', null)], now)
    expect(r.actives.map((o) => o.id)).toEqual(['a', 'd'])
    expect(r.terminees.map((o) => o.id)).toEqual(['b', 'c'])
  })

  test('à traiter : GO à échéance ≤ 7 j (dépassée comprise) et attentes d’attribution', () => {
    const r = classerOpportunites([
      opp('go-proche', 'GO', '2026-10-21T00:00:00Z'),
      opp('go-loin', 'GO', '2026-10-30T00:00:00Z'),
      opp('go-depasse', 'GO', '2026-10-01T00:00:00Z'),
      opp('go-sans-date', 'GO', null),
      opp('attente', 'EN_ATTENTE_ATTRIBUTION', '2026-08-31T00:00:00Z'),
      opp('perdue', 'PERDUE', '2026-10-15T00:00:00Z'),
    ], now)
    expect(r.aTraiter.map((x) => [x.opp.id, x.motif])).toEqual([
      ['attente', 'ATTENTE_ATTRIBUTION'],
      ['go-depasse', 'GO_ECHEANCE'],
      ['go-proche', 'GO_ECHEANCE'],
    ])
  })

  test('les actives sont triées par date limite croissante, sans date en dernier', () => {
    const r = classerOpportunites([opp('sans', 'GO', null), opp('tard', 'GO', '2026-12-01T00:00:00Z'), opp('tot', 'GO', '2026-11-01T00:00:00Z')], now)
    expect(r.actives.map((o) => o.id)).toEqual(['tot', 'tard', 'sans'])
  })

  test('les terminées sont triées par date limite décroissante, sans date en dernier', () => {
    const r = classerOpportunites([opp('vieille', 'NO_GO', '2026-02-01T00:00:00Z'), opp('sans', 'NO_GO', null), opp('recente', 'PERDUE', '2026-09-01T00:00:00Z')], now)
    expect(r.terminees.map((o) => o.id)).toEqual(['recente', 'vieille', 'sans'])
  })

  test('compteurs : ordre fixe puis autres statuts, statuts absents omis', () => {
    const r = classerOpportunites([opp('1', 'PERDUE', null), opp('2', 'GO', null), opp('3', 'EN_ANALYSE', null), opp('4', 'GO', null)], now)
    expect(r.compteurs).toEqual([
      { statut: 'GO', count: 2 },
      { statut: 'PERDUE', count: 1 },
      { statut: 'EN_ANALYSE', count: 1 },
    ])
  })

  test('liste vide : tout est vide, aucun plantage', () => {
    expect(classerOpportunites([], now)).toEqual({ aTraiter: [], actives: [], terminees: [], compteurs: [] })
  })
})
