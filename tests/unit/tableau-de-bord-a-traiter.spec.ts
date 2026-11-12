import { test, expect } from '@playwright/test'
import {
  construireATraiter, cautionEncoreNecessaire,
  type OpportuniteEcheances, type MarcheEcheances, type CautionEcheances, type FactureEcheances,
  type SourcesATraiter, type NatureEcheance,
} from '../../lib/tableau-de-bord/a-traiter'

const AUJ = new Date('2026-11-12T10:00:00Z')
/** Date à J+n (n négatif = passé). */
const J = (n: number) => new Date(Date.UTC(2026, 10, 12 + n, 9))

function opp(p: Partial<OpportuniteEcheances>): OpportuniteEcheances {
  return {
    id: p.id ?? 'o1', reference: p.reference ?? 'AO-1', objet: p.objet ?? 'Véhicules',
    statut: p.statut ?? 'GO', montantEstime: p.montantEstime ?? 1000,
    dateLimite: p.dateLimite ?? null, periodeValiditeFin: p.periodeValiditeFin ?? null,
    echeanceAttributionProv: p.echeanceAttributionProv ?? null,
  }
}
function marche(p: Partial<MarcheEcheances>): MarcheEcheances {
  return {
    id: p.id ?? 'm1', numero: p.numero ?? 'M-1', objet: p.objet ?? 'Entretien', statut: p.statut ?? 'EN_EXECUTION',
    montant: p.montant ?? 5000, dateLivraisonPrevue: p.dateLivraisonPrevue ?? null,
    dateFinPrevue: p.dateFinPrevue ?? null, garantiesLiberees: p.garantiesLiberees ?? null,
  }
}
function caution(p: Partial<CautionEcheances>): CautionEcheances {
  return {
    id: p.id ?? 'c1', reference: p.reference ?? 'C-1', type: p.type ?? 'BONNE_EXECUTION', statut: p.statut ?? 'ACTIVE',
    montant: p.montant ?? 300, dateEcheance: p.dateEcheance ?? J(10),
    opportunite: p.opportunite === undefined ? null : p.opportunite,
    marche: p.marche === undefined ? { id: 'm1', numero: 'M-1', statut: 'EN_EXECUTION', garantiesLiberees: null } : p.marche,
  }
}
function facture(p: Partial<FactureEcheances>): FactureEcheances {
  return {
    id: p.id ?? 'f1', numero: p.numero ?? 'F-1', marcheId: p.marcheId ?? 'm1', statut: p.statut ?? 'EMISE',
    montantTTC: p.montantTTC ?? 1180, dateEmission: p.dateEmission === undefined ? J(-40) : p.dateEmission,
    dateEcheance: p.dateEcheance ?? null, datePaiement: p.datePaiement ?? null,
  }
}
function sources(p: Partial<SourcesATraiter>): SourcesATraiter {
  return { opportunites: p.opportunites ?? [], marches: p.marches ?? [], cautions: p.cautions ?? [], factures: p.factures === undefined ? [] : p.factures }
}
const natures = (s: SourcesATraiter) => construireATraiter(s, AUJ).lignes.map((l) => l.nature)
const une = (s: SourcesATraiter, n: NatureEcheance) => construireATraiter(s, AUJ).lignes.filter((l) => l.nature === n)

test('DEPOT_OFFRE : opportunité avant soumission avec date limite, sans rattrapage', () => {
  const [l] = une(sources({ opportunites: [opp({ statut: 'GO', dateLimite: J(3) })] }), 'DEPOT_OFFRE')
  expect(l).toMatchObject({ domaine: 'passation', horizon: 'semaine', sansRattrapage: true, href: '/opportunites/o1', montant: 1000 })
  expect(natures(sources({ opportunites: [opp({ statut: 'OFFRE_SOUMISE', dateLimite: J(3) })] }))).toEqual([])
  expect(natures(sources({ opportunites: [opp({ statut: 'GO', dateLimite: J(31) })] }))).toEqual([])
})

test('FIN_VALIDITE_OFFRE : offre soumise ou en attente, sans rattrapage', () => {
  const [l] = une(sources({ opportunites: [opp({ statut: 'SOUMISE', periodeValiditeFin: J(20) })] }), 'FIN_VALIDITE_OFFRE')
  expect(l).toMatchObject({ domaine: 'passation', horizon: 'mois', sansRattrapage: true })
  expect(une(sources({ opportunites: [opp({ statut: 'EN_ATTENTE_ATTRIBUTION', periodeValiditeFin: J(2) })] }), 'FIN_VALIDITE_OFFRE')).toHaveLength(1)
  expect(natures(sources({ opportunites: [opp({ statut: 'GO', periodeValiditeFin: J(2) })] }))).toEqual([])
})

test('ATTRIBUTION_PROVISOIRE : opportunité en attente d’attribution avec échéance', () => {
  const [l] = une(sources({ opportunites: [opp({ statut: 'EN_ATTENTE_ATTRIBUTION', echeanceAttributionProv: J(-2) })] }), 'ATTRIBUTION_PROVISOIRE')
  expect(l).toMatchObject({ domaine: 'passation', horizon: 'retard', sansRattrapage: false })
  expect(natures(sources({ opportunites: [opp({ statut: 'GAGNEE', echeanceAttributionProv: J(2) })] }))).toEqual([])
})

test('LIVRAISON_EN_RETARD : marché en attente de livraison dont la date prévue est passée', () => {
  const [l] = une(sources({ marches: [marche({ statut: 'EN_ATTENTE_LIVRAISON_OS', dateLivraisonPrevue: J(-1) })] }), 'LIVRAISON_EN_RETARD')
  expect(l).toMatchObject({ domaine: 'exec', horizon: 'retard', href: '/marches/m1', montant: 5000 })
  expect(natures(sources({ marches: [marche({ statut: 'EN_ATTENTE_LIVRAISON_OS', dateLivraisonPrevue: J(0) })] }))).toEqual([])
})

test('RECEPTION_DEFINITIVE : marché en exécution dont la fin prévue est dépassée, en retard', () => {
  const [l] = une(sources({ marches: [marche({ statut: 'EN_EXECUTION', dateFinPrevue: J(-3) })] }), 'RECEPTION_DEFINITIVE')
  expect(l).toMatchObject({ domaine: 'exec', horizon: 'retard', libelle: 'Réception définitive à obtenir', sansRattrapage: false, href: '/marches/m1' })
})

test('FIN_EXECUTION_PROCHE : marché en exécution, fin prévue aujourd’hui ou dans les 30 jours', () => {
  const [auj] = une(sources({ marches: [marche({ dateFinPrevue: J(0) })] }), 'FIN_EXECUTION_PROCHE')
  expect(auj).toMatchObject({ horizon: 'semaine', libelle: "Fin d'exécution proche" })
  expect(natures(sources({ marches: [marche({ dateFinPrevue: J(0) })] }))).not.toContain('RECEPTION_DEFINITIVE')
  expect(une(sources({ marches: [marche({ dateFinPrevue: J(30) })] }), 'FIN_EXECUTION_PROCHE')[0]).toMatchObject({ horizon: 'mois' })
  expect(natures(sources({ marches: [marche({ dateFinPrevue: J(31) })] }))).toEqual([])
})

test('marché EN_EXECUTION sans fin prévue : aucune ligne, listé dans les données manquantes', () => {
  const s = sources({ marches: [marche({ id: 'm9', numero: 'M-9', statut: 'EN_EXECUTION', dateFinPrevue: null })] })
  const r = construireATraiter(s, AUJ)
  expect(r.lignes).toEqual([])
  expect(r.manquants.marchesEnExecutionSansFin).toEqual([{ libelle: 'M-9', href: '/marches/m9' }])
})

test('marché hors exécution avec fin prévue dépassée : ni réception ni fin proche ni manquant', () => {
  const s = sources({ marches: [marche({ statut: 'EN_ATTENTE_LIVRAISON_OS', dateFinPrevue: J(-10), dateLivraisonPrevue: J(5) })] })
  expect(natures(s)).toEqual([])
  expect(construireATraiter(s, AUJ).manquants.marchesEnExecutionSansFin).toEqual([])
})

test('GARANTIES_A_LIBERER : une ligne par caution active d’un marché exécuté en attente de garanties', () => {
  const m = { id: 'm2', numero: 'M-2', statut: 'EXECUTE_ATTENTE_GARANTIES' as const, garantiesLiberees: false }
  const s = sources({ cautions: [caution({ id: 'c1', marche: m }), caution({ id: 'c2', marche: m }), caution({ id: 'c3', statut: 'EXPIREE', marche: m })] })
  expect(natures(s)).toEqual(['GARANTIES_A_LIBERER', 'GARANTIES_A_LIBERER'])
  expect(natures(sources({ cautions: [caution({ marche: { ...m, garantiesLiberees: true } })] }))).not.toContain('GARANTIES_A_LIBERER')
})

test('marché en attente de garanties, garanties cochées libérées : la caution encore active est à libérer', () => {
  const m = { id: 'm2', numero: 'M-2', statut: 'EXECUTE_ATTENTE_GARANTIES' as const, garantiesLiberees: true }
  expect(natures(sources({ cautions: [caution({ marche: m })] }))).toEqual(['CAUTION_A_LIBERER'])
})

test('CAUTION_A_RENOUVELER : caution encore nécessaire, active ou expirée', () => {
  expect(natures(sources({ cautions: [caution({ statut: 'EXPIREE', dateEcheance: J(-1) })] }))).toEqual(['CAUTION_A_RENOUVELER'])
  expect(natures(sources({ cautions: [caution({ statut: 'LIBEREE' })] }))).toEqual([])
})

test('CAUTION_A_LIBERER : caution active qui n’est plus nécessaire', () => {
  const s = sources({ cautions: [caution({ marche: { id: 'm1', numero: 'M-1', statut: 'CLOTURE', garantiesLiberees: true } })] })
  expect(natures(s)).toEqual(['CAUTION_A_LIBERER'])
  expect(natures(sources({ cautions: [caution({ statut: 'EXPIREE', marche: { id: 'm1', numero: 'M-1', statut: 'CLOTURE', garantiesLiberees: true } })] }))).toEqual([])
})

test('FACTURE_ECHUE : facture émise non payée, 45 jours après l’émission', () => {
  expect(natures(sources({ factures: [facture({ dateEmission: J(-50) })] }))).toEqual(['FACTURE_ECHUE'])
  expect(natures(sources({ factures: [facture({ statut: 'PAYEE', dateEmission: J(-50) })] }))).toEqual([])
  expect(natures(sources({ factures: [facture({ dateEmission: J(-50), datePaiement: J(-1) })] }))).toEqual([])
  expect(natures(sources({ factures: [facture({ dateEmission: null })] }))).toEqual([])
})

test('ordonne par échéance, sans rattrapage en tête à horizon égal', () => {
  const s = sources({
    opportunites: [opp({ id: 'o1', statut: 'GO', dateLimite: J(6) })],
    marches: [marche({ id: 'm1', statut: 'EN_EXECUTION', dateFinPrevue: J(-5) })],
    cautions: [caution({ id: 'c1', dateEcheance: J(2) }), caution({ id: 'c2', dateEcheance: J(20) })],
  })
  expect(natures(s)).toEqual(['RECEPTION_DEFINITIVE', 'DEPOT_OFFRE', 'CAUTION_A_RENOUVELER', 'CAUTION_A_RENOUVELER'])
  expect(construireATraiter(s, AUJ).lignes.map((l) => l.id)).toEqual(['RECEPTION_DEFINITIVE:m1','DEPOT_OFFRE:o1', 'CAUTION_A_RENOUVELER:c1', 'CAUTION_A_RENOUVELER:c2'])
})

test('caution de soumission sur opportunité PERDUE : à libérer, pas à renouveler', () => {
  const c = caution({ type: 'SOUMISSION', opportunite: { id: 'o9', statut: 'PERDUE' }, marche: null })
  expect(cautionEncoreNecessaire(c)).toBe(false)
  const [l] = construireATraiter(sources({ cautions: [c] }), AUJ).lignes
  expect(l).toMatchObject({ nature: 'CAUTION_A_LIBERER', domaine: 'passation', href: '/cautions/c1' })
})

test('caution de bonne exécution sur marché EN_EXECUTION expirant à J+6 : à renouveler, horizon semaine', () => {
  const [l] = construireATraiter(sources({ cautions: [caution({ dateEcheance: J(6) })] }), AUJ).lignes
  expect(l).toMatchObject({ nature: 'CAUTION_A_RENOUVELER', domaine: 'exec', horizon: 'semaine', montant: 300 })
})

test('factures null : aucune ligne FACTURE_ECHUE', () => {
  expect(natures(sources({ factures: null }))).toEqual([])
})

test('facture émise le 2026-09-28 : échue le 2026-11-12, horizon semaine', () => {
  const [l] = construireATraiter(sources({ factures: [facture({ dateEmission: new Date('2026-09-28T08:00:00Z') })] }), AUJ).lignes
  expect(l).toMatchObject({ nature: 'FACTURE_ECHUE', horizon: 'semaine', href: '/factures/f1', montant: 1180 })
  expect(l?.echeance.toISOString().slice(0, 10)).toBe('2026-11-12')
})

test('manquants : opportunité GO sans dateLimite, marché EN_ATTENTE_LIVRAISON_OS sans dateLivraisonPrevue', () => {
  const r = construireATraiter(sources({
    opportunites: [opp({ id: 'o1', statut: 'GO', dateLimite: null }), opp({ id: 'o2', statut: 'OFFRE_SOUMISE', dateLimite: null })],
    marches: [marche({ id: 'm1', statut: 'EN_ATTENTE_LIVRAISON_OS', dateLivraisonPrevue: null }), marche({ id: 'm2', statut: 'EN_EXECUTION' })],
  }), AUJ)
  expect(r.manquants.opportunitesSansDateDepot.map((e) => e.href)).toEqual(['/opportunites/o1'])
  expect(r.manquants.marchesSansDateLivraison.map((e) => e.href)).toEqual(['/marches/m1'])
})

test('manquants : facture due sans échéance ni émission ; payée ou rôle sans finances exclus', () => {
  const r = construireATraiter(sources({
    factures: [
      facture({ id: 'f1', numero: 'F-1', dateEmission: null }),
      facture({ id: 'f2', numero: 'F-2', dateEmission: null, datePaiement: J(-1) }),
      facture({ id: 'f3', numero: 'F-3', dateEmission: null, dateEcheance: J(5) }),
    ],
  }), AUJ)
  expect(r.manquants.facturesSansDate).toEqual([{ libelle: 'F-1', href: '/factures/f1' }])
  expect(construireATraiter(sources({ factures: null }), AUJ).manquants.facturesSansDate).toEqual([])
})

test('FACTURE_ECHUE : l’échéance saisie remplace émission + 45 j', () => {
  const [l] = construireATraiter(sources({ factures: [facture({ dateEmission: J(-60), dateEcheance: J(5) })] }), AUJ).lignes
  expect(l).toMatchObject({ nature: 'FACTURE_ECHUE', horizon: 'semaine' })
  expect(l?.echeance.toISOString().slice(0, 10)).toBe('2026-11-17')
  expect(natures(sources({ factures: [facture({ dateEmission: null, dateEcheance: J(2) })] }))).toEqual(['FACTURE_ECHUE'])
})
