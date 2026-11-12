import { test, expect } from '@playwright/test'
import {
  voyantEncaissements, voyantResteAFacturer, voyantCautions, voyantDepots, voyantTauxSucces,
  type MarcheReception, type OpportuniteDepot,
} from '../../lib/tableau-de-bord/voyants'
import type { FactureEcheances, CautionEcheances } from '../../lib/tableau-de-bord/a-traiter'
import type { LotPilotage } from '../../lib/pilotage/calculs'

const AUJ = new Date('2026-11-12T10:00:00Z')
/** Date à J+n (n négatif = passé). */
const J = (n: number) => new Date(Date.UTC(2026, 10, 12 + n, 9))

let n = 0
function facture(p: Partial<FactureEcheances>): FactureEcheances {
  n++
  return {
    id: p.id ?? `f${n}`, numero: p.numero ?? `F-${n}`, marcheId: 'm1', statut: p.statut ?? 'EMISE',
    montantTTC: p.montantTTC ?? 100, dateEmission: p.dateEmission === undefined ? J(-10) : p.dateEmission,
    dateEcheance: p.dateEcheance ?? null, datePaiement: p.datePaiement ?? null,
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
  expect(v.detail.anciennete).toEqual({ dansDelai: 95, retard1a45: 0, retardPlusDe45: 5 })
})

test('facture sans dateEmission : dans le total, dans facturesSansDate, ni en retard ni dans le délai', () => {
  const v = voyantEncaissements([facture({ id: 'fx', numero: 'F-X', montantTTC: 50, dateEmission: null }), facture({ montantTTC: 50 })], AUJ)
  expect(v.detail.totalNonEncaisse).toBe(100)
  expect(v.detail.enRetard).toBe(0)
  expect(v.detail.anciennete).toEqual({ dansDelai: 50, retard1a45: 0, retardPlusDe45: 0 })
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

// ── Voyants 2, 3, 4 ─────────────────────────────────────────────────────────

function caution(p: Partial<CautionEcheances>): CautionEcheances {
  return {
    id: p.id ?? 'c1', reference: p.reference ?? 'C-1', type: p.type ?? 'BONNE_EXECUTION', statut: p.statut ?? 'ACTIVE',
    montant: 300, dateEcheance: p.dateEcheance ?? J(60),
    opportunite: p.opportunite === undefined ? null : p.opportunite,
    marche: p.marche === undefined ? { id: 'm1', numero: 'M-1', statut: 'EN_EXECUTION', garantiesLiberees: null } : p.marche,
  }
}

test('caution nécessaire à J+6 : rouge', () => {
  const v = voyantCautions([caution({ dateEcheance: J(6) }), caution({ id: 'c2', dateEcheance: J(60) })], AUJ)
  expect(v.etat).toBe('rouge')
  expect(v.detail).toEqual({ sous30: 1, plusProcheDansJours: 6, elements: [{ libelle: 'C-1', href: '/cautions/c1' }] })
})

test('à J+18 : ambre', () => {
  expect(voyantCautions([caution({ dateEcheance: J(18) })], AUJ).etat).toBe('ambre')
})

test('expirée hier : rouge', () => {
  const v = voyantCautions([caution({ statut: 'EXPIREE', dateEcheance: J(-1) })], AUJ)
  expect(v.etat).toBe('rouge')
  expect(v.detail.plusProcheDansJours).toBe(-1)
})

test('caution de soumission sur opportunité PERDUE à J+2 : ignorée', () => {
  const v = voyantCautions([caution({ type: 'SOUMISSION', dateEcheance: J(2), opportunite: { id: 'o1', statut: 'PERDUE' }, marche: null })], AUJ)
  expect(v.etat).toBe('vert')
  expect(v.detail).toEqual({ sous30: 0, plusProcheDansJours: null, elements: [] })
})

function depot(p: Partial<OpportuniteDepot>): OpportuniteDepot {
  return {
    id: p.id ?? 'o1', reference: p.reference ?? 'AO-1', objet: 'Véhicules', statut: p.statut ?? 'DOSSIER_EN_PREPARATION',
    dateLimite: p.dateLimite === undefined ? J(10) : p.dateLimite, aUnDossier: p.aUnDossier ?? true,
    piecesObligatoires: p.piecesObligatoires ?? [{ statut: 'COMPLET' }, { statut: 'VALIDE' }],
  }
}

test('dépôt à J+4 avec une pièce obligatoire ABSENT : ambre', () => {
  const v = voyantDepots([depot({ dateLimite: J(4), piecesObligatoires: [{ statut: 'COMPLET' }, { statut: 'ABSENT' }] })], AUJ)
  expect(v.etat).toBe('ambre')
  expect(v.detail).toEqual({ nonPrets: 1, depotsSous14: 1, elements: [{ libelle: 'AO-1', href: '/opportunites/o1' }] })
})

test('à J+3 : rouge', () => {
  expect(voyantDepots([depot({ dateLimite: J(3), piecesObligatoires: [{ statut: 'INCOMPLET' }] })], AUJ).etat).toBe('rouge')
})

test('à J+10 sans dossier : rouge', () => {
  expect(voyantDepots([depot({ dateLimite: J(10), aUnDossier: false, piecesObligatoires: [] })], AUJ).etat).toBe('rouge')
})

test('pièce facultative ABSENT : prête', () => {
  // seules les pièces obligatoires sont transmises : une facultative absente ne compte pas
  const v = voyantDepots([depot({ dateLimite: J(2) })], AUJ)
  expect(v.etat).toBe('vert')
  expect(v.detail).toEqual({ nonPrets: 0, depotsSous14: 1, elements: [] })
})

test('dossier sans aucune pièce obligatoire : non prêt', () => {
  expect(voyantDepots([depot({ dateLimite: J(10), piecesObligatoires: [] })], AUJ).etat).toBe('ambre')
})

test('dépôt à J+15 : ignoré', () => {
  const v = voyantDepots([depot({ dateLimite: J(15), aUnDossier: false })], AUJ)
  expect(v.etat).toBe('vert')
  expect(v.detail.depotsSous14).toBe(0)
})

let nl = 0
/** `g` lots gagnés et `p` perdus déposés il y a `jours` jours. */
function lots(g: number, p: number, jours: number): LotPilotage[] {
  const un = (resultat: LotPilotage['resultat']): LotPilotage => ({
    id: `l${++nl}`, opportuniteId: 'o1', libelle: 'AO — Lot', resultat, montantPropose: 100, montantOffreConcurrent: null,
    dateDepot: J(-jours), soumis: true, motifRenseigne: true, autorite: 'X', concurrentGagnant: null, motif: null,
  })
  return [...Array.from({ length: g }, () => un('GAGNE')), ...Array.from({ length: p }, () => un('PERDU'))]
}

test('4 résultats sur 6 mois : gris', () => {
  const v = voyantTauxSucces([...lots(2, 2, 30), ...lots(10, 10, 400)], AUJ)
  expect(v.etat).toBe('gris')
  expect(v.detail.resultats6Mois).toBe(4)
})

test('6 mois 33 %, 24 mois 45 % : ambre, écart 12', () => {
  const v = voyantTauxSucces([...lots(2, 4, 30), ...lots(7, 7, 400)], AUJ)
  expect(v.etat).toBe('ambre')
  expect(v.detail).toEqual({ taux6Mois: 33, taux24Mois: 45, resultats6Mois: 6, ecartPoints: 12 })
})

test('écart 20 : rouge', () => {
  const v = voyantTauxSucces([...lots(2, 8, 30), ...lots(6, 4, 400)], AUJ)
  expect(v.detail.ecartPoints).toBe(20)
  expect(v.etat).toBe('rouge')
})

test('écart 9 : vert', () => {
  const v = voyantTauxSucces([...lots(2, 3, 30), ...lots(47, 48, 400)], AUJ)
  expect(v.detail.ecartPoints).toBe(9)
  expect(v.etat).toBe('vert')
})

test('aucun lot : gris, sans NaN', () => {
  expect(voyantTauxSucces([], AUJ)).toEqual({ etat: 'gris', detail: { taux6Mois: null, taux24Mois: null, resultats6Mois: 0, ecartPoints: null } })
})

test('lot déposé il y a plus de 24 mois : hors calcul', () => {
  expect(voyantTauxSucces([...lots(5, 0, 30), ...lots(0, 50, 800)], AUJ).detail.taux24Mois).toBe(100)
})

// ── Échéance saisie sur la facture (décision d'Abel, 2026-11-12) ────────────

test('échéance saisie dans le futur : dans le délai, même émise il y a 60 j', () => {
  const v = voyantEncaissements([facture({ dateEmission: J(-60), dateEcheance: J(5) })], AUJ)
  expect(v.detail.enRetard).toBe(0)
  expect(v.etat).toBe('vert')
})

test('échéance saisie dépassée de 10 j : en retard de 1 à 45 j', () => {
  const v = voyantEncaissements([facture({ dateEmission: J(-20), dateEcheance: J(-10) })], AUJ)
  expect(v.detail.anciennete).toEqual({ dansDelai: 0, retard1a45: 100, retardPlusDe45: 0 })
  expect(v.etat).toBe('rouge') // 100 % en retard
})

test('échéance saisie dépassée de 46 j : rouge, même à 5 %', () => {
  const v = voyantEncaissements([facture({ montantTTC: 5, dateEmission: J(-50), dateEcheance: J(-46) }), facture({ montantTTC: 95 })], AUJ)
  expect(v.etat).toBe('rouge')
  expect(v.detail.anciennete.retardPlusDe45).toBe(5)
})

test('échéance saisie sans date d’émission : datée, pas dans facturesSansDate', () => {
  const v = voyantEncaissements([facture({ dateEmission: null, dateEcheance: J(-3) })], AUJ)
  expect(v.detail.facturesSansDate).toEqual([])
  expect(v.detail.enRetard).toBe(100)
})
