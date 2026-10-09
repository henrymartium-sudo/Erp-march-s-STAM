import { test, expect } from '@playwright/test'
import {
  normaliserTexte, normaliserNom, distanceLevenshtein, libelleRetenu, trouverDoublons,
  construirePertes, cleVehicules, calculerVeille, type LotVeille,
} from '../../lib/veille/calculs'
import { calculerEcartPrix, type LotPilotage } from '../../lib/pilotage/calculs'

const PERIODE = { dateDebut: new Date('2026-01-01'), dateFin: new Date('2026-12-31T23:59:59') }

function lot(p: Partial<LotVeille> = {}): LotVeille {
  return {
    id: p.id ?? 'l1', opportuniteId: p.opportuniteId ?? 'o1', libelle: p.libelle ?? 'AO test — Lot 1',
    autorite: p.autorite ?? 'Mairie A', resultat: p.resultat ?? 'PERDU', soumis: p.soumis ?? true,
    dateDepot: p.dateDepot === undefined ? new Date('2026-03-01') : p.dateDepot,
    montantPropose: p.montantPropose === undefined ? 1000 : p.montantPropose,
    montantOffreConcurrent: p.montantOffreConcurrent === undefined ? 800 : p.montantOffreConcurrent,
    concurrentGagnant: p.concurrentGagnant === undefined ? 'Auto Plus' : p.concurrentGagnant,
    motif: p.motif === undefined ? 'Prix' : p.motif,
    vehicules: p.vehicules ?? [{ marque: 'Toyota', modele: 'Hilux' }],
  }
}

test.describe('normalisation des noms', () => {
  test('ignore la casse, les accents, la ponctuation et les espaces multiples', () => {
    expect(normaliserTexte('  Étoile   Motors, ')).toBe('etoile motors')
    expect(normaliserTexte('AUTO-PLUS')).toBe('auto plus')
  })

  test('retire les formes juridiques courantes', () => {
    expect(normaliserNom('Auto Plus SARL')).toBe('auto plus')
    expect(normaliserNom('Société AUTO-PLUS S.A.R.L.')).toBe('auto plus')
    expect(normaliserNom('Ets. Kodjo')).toBe('kodjo')
    expect(normaliserNom('Kodjo Cie')).toBe('kodjo')
  })

  test('deux orthographes qui ne diffèrent que par ces détails ont la même forme', () => {
    expect(normaliserNom('AUTO PLUS')).toBe(normaliserNom('  auto-plus sa '))
  })

  test('un nom réduit à une forme juridique ou à de la ponctuation reste exploitable', () => {
    expect(normaliserNom('SARL')).toBe('sarl')
    expect(normaliserNom('---')).toBe('---')
  })
})

test.describe('distanceLevenshtein', () => {
  test('compte les insertions, suppressions et substitutions', () => {
    expect(distanceLevenshtein('kodjo', 'kodjo')).toBe(0)
    expect(distanceLevenshtein('toyota', 'toyata')).toBe(1)
    expect(distanceLevenshtein('abc', '')).toBe(3)
    expect(distanceLevenshtein('', 'abc')).toBe(3)
  })
})

test.describe('libelleRetenu', () => {
  test('retient l’orthographe la plus fréquente', () => {
    expect(libelleRetenu(['AUTO PLUS', 'Auto Plus', 'Auto Plus'])).toBe('Auto Plus')
  })
  test('à égalité, la plus longue, puis l’ordre alphabétique', () => {
    expect(libelleRetenu(['Kodjo', 'Kodjo SA'])).toBe('Kodjo SA')
    expect(libelleRetenu(['Beta', 'Alfa'])).toBe('Alfa')
  })
})

test.describe('trouverDoublons', () => {
  const g = (cle: string, nombre = 1) => ({ cle, libelle: cle, nombre })

  test('signale deux noms à 2 lettres près', () => {
    const r = trouverDoublons([g('auto plus'), g('auto pluss')])
    expect(r).toHaveLength(1)
    expect(r[0]?.a.cle).toBe('auto plus')
  })

  test('signale un nom qui commence l’autre au mot près', () => {
    expect(trouverDoublons([g('auto plus'), g('auto plus togo')])).toHaveLength(1)
  })

  test('ne signale pas un simple préfixe de lettres (il faut un mot entier)', () => {
    expect(trouverDoublons([g('autoplus'), g('autoplusmobile')])).toHaveLength(0)
  })

  test('ignore les noms de moins de 5 caractères', () => {
    expect(trouverDoublons([g('abcd'), g('abce')])).toHaveLength(0)
  })

  test('ne signale pas des noms éloignés', () => {
    expect(trouverDoublons([g('garage central'), g('camion express')])).toHaveLength(0)
  })

  test('ne compare pas un groupe avec lui-même', () => {
    expect(trouverDoublons([g('auto plus')])).toHaveLength(0)
  })
})

test.describe('cleVehicules', () => {
  test('la clé ne dépend ni de l’ordre ni de la casse ni des doublons', () => {
    const a = cleVehicules([{ marque: 'Toyota', modele: 'Hilux' }, { marque: 'Isuzu', modele: 'D-Max' }])
    const b = cleVehicules([{ marque: 'isuzu', modele: 'd-max' }, { marque: 'TOYOTA', modele: 'HILUX' }, { marque: 'Toyota', modele: 'Hilux' }])
    expect(a.cle).toBe(b.cle)
    expect(a.libelle).toBe('Isuzu D-Max + Toyota Hilux')
  })
  test('aucun véhicule : clé vide et libellé explicite', () => {
    expect(cleVehicules([])).toEqual({ cle: '', libelle: 'Véhicule non renseigné' })
  })
})

test.describe('construirePertes', () => {
  test('ne garde que les lots perdus, soumis, dans la période', () => {
    const { pertes } = construirePertes([
      lot({ id: 'a' }),
      lot({ id: 'gagne', resultat: 'GAGNE' }),
      lot({ id: 'nonsoumis', soumis: false }),
      lot({ id: 'hors', dateDepot: new Date('2025-06-01') }),
    ], PERIODE)
    expect(pertes.map((p) => p.id)).toEqual(['a'])
  })

  test('un lot perdu sans date de dépôt est exclu et signalé avec son lien', () => {
    const r = construirePertes([lot({ id: 'a', opportuniteId: 'opp9', libelle: 'AO — Lot 2', dateDepot: null })], PERIODE)
    expect(r.pertes).toHaveLength(0)
    expect(r.exclusSansDate).toEqual([{ libelle: 'AO — Lot 2', href: '/opportunites/opp9' }])
  })

  test('un lot complet est documenté, avec son écart non arrondi', () => {
    const { pertes } = construirePertes([lot({ montantPropose: 1000, montantOffreConcurrent: 800 })], PERIODE)
    const p = pertes[0]!
    expect(p.documentee).toBe(true)
    expect(p.manquants).toEqual([])
    expect(p.ecartPct).toBeCloseTo(25, 10)
    expect(p.ecartFcfa).toBe(200)
  })

  test('chaque information manquante rend le lot non documenté (sauf le motif et le véhicule)', () => {
    const cas: [Partial<LotVeille>, string[], boolean][] = [
      [{ concurrentGagnant: null }, ['concurrent'], false],
      [{ concurrentGagnant: '   ' }, ['concurrent'], false],
      [{ montantOffreConcurrent: null }, ['montant du concurrent'], false],
      [{ montantOffreConcurrent: 0 }, ['montant du concurrent'], false],
      [{ montantPropose: null }, ['notre montant'], false],
      [{ motif: null }, ['motif'], true],
      [{ vehicules: [] }, ['véhicule'], true],
    ]
    for (const [surcharge, manquants, documentee] of cas) {
      const p = construirePertes([lot(surcharge)], PERIODE).pertes[0]!
      expect(p.manquants, JSON.stringify(surcharge)).toEqual(manquants)
      expect(p.documentee, JSON.stringify(surcharge)).toBe(documentee)
    }
  })

  test('sans montant du concurrent, aucun écart n’est calculé', () => {
    const p = construirePertes([lot({ montantOffreConcurrent: null })], PERIODE).pertes[0]!
    expect(p.ecartPct).toBeNull()
    expect(p.ecartFcfa).toBeNull()
  })

  test('la clé du concurrent est la forme normalisée du nom', () => {
    const p = construirePertes([lot({ concurrentGagnant: ' Société AUTO-PLUS SARL ' })], PERIODE).pertes[0]!
    expect(p.concurrent).toBe('Société AUTO-PLUS SARL')
    expect(p.concurrentCle).toBe('auto plus')
  })
})

test.describe('calculerVeille', () => {
  test('deux orthographes d’un même concurrent donnent une seule ligne', () => {
    const r = calculerVeille([
      lot({ id: '1', concurrentGagnant: 'AUTO PLUS' }),
      lot({ id: '2', concurrentGagnant: 'Auto Plus' }),
      lot({ id: '3', concurrentGagnant: 'auto-plus sarl' }),
    ], PERIODE)
    expect(r.parConcurrent).toHaveLength(1)
    expect(r.parConcurrent[0]?.nombre).toBe(3)
  })

  test('le seuil de 3 lots s’applique à chaque ligne', () => {
    const deux = calculerVeille([lot({ id: '1' }), lot({ id: '2' })], PERIODE)
    expect(deux.parConcurrent[0]?.suffisant).toBe(false)
    expect(deux.parConcurrent[0]?.ecartMoyenPct).toBeNull()
    expect(deux.parConcurrent[0]?.pertes).toHaveLength(2)
    expect(deux.ecartGlobal.suffisant).toBe(false)

    const trois = calculerVeille([lot({ id: '1' }), lot({ id: '2' }), lot({ id: '3', montantOffreConcurrent: 1000 })], PERIODE)
    const l = trois.parConcurrent[0]!
    expect(l.suffisant).toBe(true)
    // écarts : 25 %, 25 %, 0 % → moyenne 16,67 (non arrondie)
    expect(l.ecartMoyenPct).toBeCloseTo(50 / 3, 10)
    expect(l.ecartMoyenFcfa).toBeCloseTo((200 + 200 + 0) / 3, 10)
    expect(trois.ecartGlobal.moyennePct).toBeCloseTo(50 / 3, 10)
  })

  test('chaque perte documentée figure une fois dans chaque angle, les autres uniquement dans « non documentées »', () => {
    const lots = [
      lot({ id: 'a', concurrentGagnant: 'Alpha Motors', autorite: 'Mairie A', vehicules: [{ marque: 'Toyota', modele: 'Hilux' }] }),
      lot({ id: 'b', concurrentGagnant: 'Beta Auto', autorite: 'mairie a', vehicules: [{ marque: 'Toyota', modele: 'Hilux' }, { marque: 'Isuzu', modele: 'D-Max' }] }),
      lot({ id: 'c', concurrentGagnant: 'Alpha Motors', autorite: 'Région B', vehicules: [] }),
      lot({ id: 'd', concurrentGagnant: null }),
      lot({ id: 'e', montantOffreConcurrent: null }),
    ]
    const r = calculerVeille(lots, PERIODE)
    const ids = (lignes: { pertes: { id: string }[] }[]) => lignes.flatMap((l) => l.pertes.map((p) => p.id)).sort()
    expect(ids(r.parConcurrent)).toEqual(['a', 'b', 'c'])
    expect(ids(r.parAutorite)).toEqual(['a', 'b', 'c'])
    expect(ids(r.parVehicule)).toEqual(['a', 'b', 'c'])
    expect(r.nonDocumentees.map((p) => p.id).sort()).toEqual(['d', 'e'])
    expect(r.chronologie.map((p) => p.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
    // les autorités « Mairie A » et « mairie a » forment une seule ligne
    expect(r.parAutorite.map((l) => l.nombre).sort()).toEqual([1, 2])
    // trois combinaisons de véhicules distinctes, dont « Véhicule non renseigné »
    expect(r.parVehicule.map((l) => l.libelle).sort()).toEqual(['Isuzu D-Max + Toyota Hilux', 'Toyota Hilux', 'Véhicule non renseigné'])
  })

  test('la couverture égale les lignes affichées', () => {
    const r = calculerVeille([lot({ id: '1' }), lot({ id: '2', concurrentGagnant: null }), lot({ id: '3' })], PERIODE)
    expect(r.couverture).toEqual({ documentees: 2, total: 3 })
    expect(r.parConcurrent.reduce((s, l) => s + l.nombre, 0) + r.nonDocumentees.length).toBe(r.couverture.total)
  })

  test('une période sans perte donne des listes vides et une couverture nulle', () => {
    const r = calculerVeille([lot({ resultat: 'GAGNE' })], PERIODE)
    expect(r.couverture).toEqual({ documentees: 0, total: 0 })
    expect(r.parConcurrent).toEqual([])
    expect(r.chronologie).toEqual([])
    expect(r.ecartGlobal.moyennePct).toBeNull()
  })

  test('la chronologie met la plus récente en premier', () => {
    const r = calculerVeille([
      lot({ id: 'ancien', dateDepot: new Date('2026-02-01') }),
      lot({ id: 'recent', dateDepot: new Date('2026-09-01') }),
      lot({ id: 'milieu', dateDepot: new Date('2026-05-01') }),
    ], PERIODE)
    expect(r.chronologie.map((p) => p.id)).toEqual(['recent', 'milieu', 'ancien'])
  })

  test('les doublons possibles viennent des groupes de concurrents', () => {
    const r = calculerVeille([
      lot({ id: '1', concurrentGagnant: 'Auto Plus' }),
      lot({ id: '2', concurrentGagnant: 'Auto Pluss' }),
    ], PERIODE)
    expect(r.parConcurrent).toHaveLength(2)
    expect(r.doublons).toHaveLength(1)
  })

  test('les valeurs et les associés sont agrégés par ligne', () => {
    const r = calculerVeille([
      lot({ id: '1', montantPropose: 1000, montantOffreConcurrent: 800, autorite: 'Mairie A' }),
      lot({ id: '2', montantPropose: 2000, montantOffreConcurrent: 1500, autorite: 'Région B' }),
    ], PERIODE)
    const l = r.parConcurrent[0]!
    expect(l.valeurPerdue).toBe(3000)
    expect(l.valeurGagneeParLesConcurrents).toBe(2300)
    expect(l.associes).toEqual(['Mairie A', 'Région B'])
  })

  test('l’écart global arrondi égale celui de /pilotage quand tous les lots avec montants ont un nom', () => {
    const lots = [
      lot({ id: '1', montantPropose: 1000, montantOffreConcurrent: 800 }),
      lot({ id: '2', montantPropose: 2000, montantOffreConcurrent: 1900, concurrentGagnant: 'Beta Auto' }),
      lot({ id: '3', montantPropose: 700, montantOffreConcurrent: 650, concurrentGagnant: 'Gamma' }),
    ]
    const pilotage: LotPilotage[] = lots.map((l) => ({
      id: l.id, opportuniteId: l.opportuniteId, libelle: l.libelle, resultat: l.resultat,
      montantPropose: l.montantPropose, montantOffreConcurrent: l.montantOffreConcurrent,
      dateDepot: l.dateDepot, soumis: l.soumis, motifRenseigne: !!l.motif, autorite: l.autorite,
      concurrentGagnant: l.concurrentGagnant, motif: l.motif,
    }))
    const veille = calculerVeille(lots, PERIODE)
    expect(Math.round(veille.ecartGlobal.moyennePct!)).toBe(calculerEcartPrix(pilotage, PERIODE).ecartMoyen)
  })
})
