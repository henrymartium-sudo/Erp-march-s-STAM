import { test, expect } from '@playwright/test'
import { voyantEncaissements, voyantResteAFacturer, type MarcheReception } from '../../lib/tableau-de-bord/voyants'
import type { FactureEcheances } from '../../lib/tableau-de-bord/a-traiter'

const AUJ = new Date('2026-11-12T10:00:00Z')
/** Date à J+n (n négatif = passé). */
const J = (n: number) => new Date(Date.UTC(2026, 10, 12 + n, 9))

let n = 0
function facture(p: Partial<FactureEcheances>): FactureEcheances {
  n++
  return {
    id: p.id ?? `f${n}`, numero: p.numero ?? `F-${n}`, marcheId: 'm1', statut: p.statut ?? 'EMISE',
    montantTTC: p.montantTTC ?? 100, dateEmission: p.dateEmission === undefined ? J(-10) : p.dateEmission,
    datePaiement: p.datePaiement ?? null,
  }
}
/** Deux factures : `enRetard` à 60 jours, le reste à 10 jours, total 100. */
const repartition = (enRetard: number) => [
  facture({ montantTTC: enRetard, dateEmission: J(-60) }),
  facture({ montantTTC: 100 - enRetard, dateEmission: J(-10) }),
]

test('19 % en retard : vert', () => {
  const v = voyantEncaissements(repartition(19), AUJ)
  expect(v.etat).toBe('vert')
  expect(v.detail).toMatchObject({ pourcentageEnRetard: 19, totalNonEncaisse: 100, enRetard: 19 })
})

test('20 % : ambre', () => {
  expect(voyantEncaissements(repartition(20), AUJ).etat).toBe('ambre')
})

test('40 % : rouge', () => {
  expect(voyantEncaissements(repartition(40), AUJ).etat).toBe('rouge')
})

test('une facture à 91 j suffit pour le rouge, même à 5 %', () => {
  const v = voyantEncaissements([facture({ montantTTC: 5, dateEmission: J(-91) }), facture({ montantTTC: 95 })], AUJ)
  expect(v.etat).toBe('rouge')
  expect(v.detail.pourcentageEnRetard).toBe(5)
  expect(v.detail.anciennete).toEqual({ dansDelai: 95, de46a90: 0, plusDe90: 5 })
})

test('facture sans dateEmission : dans le total, dans facturesSansDate, ni en retard ni dans le délai', () => {
  const v = voyantEncaissements([facture({ id: 'fx', numero: 'F-X', montantTTC: 50, dateEmission: null }), facture({ montantTTC: 50 })], AUJ)
  expect(v.detail.totalNonEncaisse).toBe(100)
  expect(v.detail.enRetard).toBe(0)
  expect(v.detail.anciennete).toEqual({ dansDelai: 50, de46a90: 0, plusDe90: 0 })
  expect(v.detail.facturesSansDate).toEqual([{ libelle: 'F-X', href: '/factures/fx' }])
})

test('aucune facture : vert, 0 %', () => {
  const v = voyantEncaissements([], AUJ)
  expect(v.etat).toBe('vert')
  expect(v.detail.pourcentageEnRetard).toBe(0)
  expect(v.detail.totalNonEncaisse).toBe(0)
})

test('facture PAYEE ou avec datePaiement : ignorée', () => {
  const v = voyantEncaissements([
    facture({ statut: 'PAYEE', dateEmission: J(-100) }),
    facture({ dateEmission: J(-100), datePaiement: J(-1) }),
  ], AUJ)
  expect(v.etat).toBe('vert')
  expect(v.detail.totalNonEncaisse).toBe(0)
})

test('45 jours pile : encore dans le délai', () => {
  const v = voyantEncaissements([facture({ dateEmission: J(-45) })], AUJ)
  expect(v.detail.enRetard).toBe(0)
})

function marche(p: Partial<MarcheReception>): MarcheReception {
  return {
    id: p.id ?? 'm1', numero: p.numero ?? 'M-1', statut: p.statut ?? 'EXECUTE_ATTENTE_GARANTIES', montant: p.montant ?? 1000,
    dateReception: p.dateReception === undefined ? J(-10) : p.dateReception, factures: p.factures ?? [],
  }
}

test('reste à facturer à 16 j : ambre ; à 31 j : rouge ; à 15 j : vert', () => {
  expect(voyantResteAFacturer([marche({ dateReception: J(-16) })], AUJ).etat).toBe('ambre')
  expect(voyantResteAFacturer([marche({ dateReception: J(-31) })], AUJ).etat).toBe('rouge')
  const v = voyantResteAFacturer([marche({ dateReception: J(-15), factures: [{ statut: 'EMISE', montantTTC: 400 }] })], AUJ)
  expect(v.etat).toBe('vert')
  expect(v.detail).toEqual({ marches: [{ id: 'm1', numero: 'M-1', reste: 600, joursDepuisReception: 15 }], total: 600 })
})

test('marché facturé à 99 % : pas de reste (tolérance 2 %)', () => {
  const v = voyantResteAFacturer([marche({ dateReception: J(-40), factures: [{ statut: 'PAYEE', montantTTC: 990 }] })], AUJ)
  expect(v.etat).toBe('vert')
  expect(v.detail.marches).toEqual([])
})

test('marché RESILIE réceptionné : ignoré', () => {
  const v = voyantResteAFacturer([marche({ statut: 'RESILIE', dateReception: J(-40) })], AUJ)
  expect(v.etat).toBe('vert')
  expect(v.detail.total).toBe(0)
})

test('marché sans date de réception : ignoré', () => {
  expect(voyantResteAFacturer([marche({ dateReception: null })], AUJ).detail.marches).toEqual([])
})
