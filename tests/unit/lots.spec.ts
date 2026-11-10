import { test, expect } from '@playwright/test'
import { ResultatLot } from '@prisma/client'
import {
  agregerStatutOpportunite,
  deriverEtatDossier,
  piecesModifiables,
  calculerProgression,
  calculerAvancementLots,
  calculerTotauxLots,
  prochainNumeroLot,
  totalMontantPropose,
  calculerStatsResultatsLots,
  preparerMarcheDepuisLots,
  lotsSansMontantPropose,
  messageMontantsLotsManquants,
  lotsRattachables,
  validerSelectionLots,
  libelleObjetMarche,
  lotEstFige,
  marchePreexistant,
  calculerRetraitLot,
  retraitMarcheAutorise,
  resumerMarchesOpportunite,
  STATUTS_EDITION_LOTS,
  STATUTS_SAISIE_RESULTAT,
  calculerMontantVehicules,
  totalLigneVehicule,
  vehiculesModifiables,
  STATUTS_EDITION_VEHICULES,
} from '../../lib/utils/lots'
import { lotSchema, resultatLotSchema, formResultatLotSchema } from '../../lib/validations/lot'

test.describe('agregerStatutOpportunite', () => {
  test('aucun lot → null', () => {
    expect(agregerStatutOpportunite([])).toBeNull()
  })
  test('un lot gagné parmi des perdus → GAGNEE', () => {
    expect(agregerStatutOpportunite(['PERDU', 'GAGNE', 'INFRUCTUEUX'])).toBe('GAGNEE')
  })
  test('provisoire sans gagné → ATTRIBUE_PROVISOIREMENT', () => {
    expect(agregerStatutOpportunite(['PERDU', 'ATTRIBUE_PROVISOIREMENT', 'EN_COURS'])).toBe('ATTRIBUE_PROVISOIREMENT')
  })
  test('un lot encore en cours → EN_ATTENTE_ATTRIBUTION', () => {
    expect(agregerStatutOpportunite(['PERDU', 'EN_COURS'])).toBe('EN_ATTENTE_ATTRIBUTION')
  })
  test('tous perdus ou infructueux → PERDUE', () => {
    expect(agregerStatutOpportunite(['PERDU', 'INFRUCTUEUX'])).toBe('PERDUE')
    expect(agregerStatutOpportunite(['INFRUCTUEUX'])).toBe('PERDUE')
  })
})

test.describe('deriverEtatDossier', () => {
  test('avant préparation → AUCUN', () => {
    for (const s of ['EN_ANALYSE', 'GO', 'NO_GO', 'IDENTIFIEE'] as const) {
      expect(deriverEtatDossier(s)).toBe('AUCUN')
    }
  })
  test('préparation → EN_PREPARATION', () => {
    expect(deriverEtatDossier('DOSSIER_EN_PREPARATION')).toBe('EN_PREPARATION')
  })
  test('déposé → SOUMIS (legacy SOUMISE inclus)', () => {
    for (const s of ['OFFRE_SOUMISE', 'SOUMISE', 'EN_ATTENTE_ATTRIBUTION'] as const) {
      expect(deriverEtatDossier(s)).toBe('SOUMIS')
    }
  })
  test('attribué → CLOS', () => {
    for (const s of ['ATTRIBUE_PROVISOIREMENT', 'GAGNEE', 'PERDUE'] as const) {
      expect(deriverEtatDossier(s)).toBe('CLOS')
    }
  })
})

test('piecesModifiables uniquement en préparation', () => {
  expect(piecesModifiables('DOSSIER_EN_PREPARATION')).toBe(true)
  expect(piecesModifiables('OFFRE_SOUMISE')).toBe(false)
  expect(piecesModifiables('GO')).toBe(false)
})

test('calculerProgression compte COMPLET et VALIDE', () => {
  expect(calculerProgression([])).toBe(0)
  expect(
    calculerProgression([
      { statut: 'COMPLET' }, { statut: 'VALIDE' }, { statut: 'ABSENT' }, { statut: 'INCOMPLET' },
    ])
  ).toBe(50)
})

test.describe('calculerAvancementLots', () => {
  test('aucun lot → 0 lot et pas de moyenne', () => {
    expect(calculerAvancementLots([])).toEqual({ nbLots: 0, progressionMoyenne: null })
  })
  test('des lots mais aucun dossier → nombre de lots seul, pas de moyenne', () => {
    expect(calculerAvancementLots([{ dossier: null }, { dossier: null }])).toEqual({
      nbLots: 2,
      progressionMoyenne: null,
    })
  })
  test('un lot sans dossier compte pour 0 dans la moyenne', () => {
    expect(calculerAvancementLots([{ dossier: { progression: 80 } }, { dossier: null }])).toEqual({
      nbLots: 2,
      progressionMoyenne: 40,
    })
  })
  test('un dossier à 0 % donne une moyenne de 0, distincte de l’absence de dossier', () => {
    expect(calculerAvancementLots([{ dossier: { progression: 0 } }])).toEqual({ nbLots: 1, progressionMoyenne: 0 })
  })
  test('la moyenne est arrondie à l’entier le plus proche', () => {
    // (50 + 33) / 2 = 41,5 → 42
    expect(calculerAvancementLots([{ dossier: { progression: 50 } }, { dossier: { progression: 33 } }]).progressionMoyenne).toBe(42)
    // 100 / 3 = 33,33 → 33
    expect(
      calculerAvancementLots([{ dossier: { progression: 100 } }, { dossier: { progression: 0 } }, { dossier: null }]).progressionMoyenne
    ).toBe(33)
  })
})

test.describe('prochainNumeroLot', () => {
  test('aucun lot → 1', () => {
    expect(prochainNumeroLot([])).toBe(1)
  })
  test('max des numéros existants + 1, même avec des trous', () => {
    expect(prochainNumeroLot([1, 2, 3])).toBe(4)
    expect(prochainNumeroLot([1, 5, 3])).toBe(6)
    expect(prochainNumeroLot([2])).toBe(3)
  })
})

test.describe('calculerTotauxLots', () => {
  test('aucun lot → totaux à zéro', () => {
    expect(calculerTotauxLots([])).toEqual({ nbLots: 0, nbGagnes: 0, totalEstime: 0, totalPropose: 0 })
  })
  test('somme les montants estimé et proposé (null compté pour 0) et compte les lots gagnés', () => {
    expect(
      calculerTotauxLots([
        { montantEstime: 1000, montantPropose: 900, resultat: 'GAGNE' },
        { montantEstime: 2500, montantPropose: null, resultat: 'PERDU' },
        { montantEstime: null, montantPropose: 400, resultat: 'GAGNE' },
      ])
    ).toEqual({ nbLots: 3, nbGagnes: 2, totalEstime: 3500, totalPropose: 1300 })
  })
})

test('statuts d’édition des lots et de saisie des résultats sont disjoints', () => {
  for (const s of STATUTS_EDITION_LOTS) expect(STATUTS_SAISIE_RESULTAT).not.toContain(s)
  expect(STATUTS_EDITION_LOTS).toContain('DOSSIER_EN_PREPARATION')
  expect(STATUTS_SAISIE_RESULTAT).toContain('EN_ATTENTE_ATTRIBUTION')
})

// ---------------------------------------------------------------------------
// Schémas de validation (lib/validations/lot)
// L'import ci-dessus exécute les .omit() posés au niveau du module. Zod 4 lève sur un objet refiné :
// c'est ce qui faisait planter le dialogue de résultat de lot dès son rendu, sans qu'aucune vérification
// statique (tsc, next build) ne le voie.
// ---------------------------------------------------------------------------

const MESSAGE_MOTIF_PERTE = 'Le motif de perte est obligatoire pour un lot perdu'

test.describe('schémas de validation des lots', () => {
  test('lotSchema reste dérivable par .omit() (formulaire de lot et updateLot)', () => {
    const schemaFormulaire = lotSchema.omit({ opportuniteId: true })
    expect(schemaFormulaire.safeParse({ numero: '3', intitule: 'Fourniture de pick-up' }).success).toBe(true)
    expect(schemaFormulaire.safeParse({ numero: '3', intitule: '   ' }).success).toBe(false)
  })

  test('le schéma de formulaire du résultat se construit et n’exige pas lotId', () => {
    expect(Object.keys(formResultatLotSchema.shape)).not.toContain('lotId')
    expect(formResultatLotSchema.safeParse({ resultat: 'GAGNE' }).success).toBe(true)
  })

  test('resultatLotSchema exige toujours lotId', () => {
    const sansLotId = resultatLotSchema.safeParse({ resultat: 'GAGNE' })
    expect(sansLotId.success).toBe(false)
    expect(sansLotId.error?.issues.map((i) => i.path.join('.'))).toEqual(['lotId'])
    expect(resultatLotSchema.safeParse({ lotId: '', resultat: 'GAGNE' }).success).toBe(false)
    expect(resultatLotSchema.safeParse({ lotId: 'lot_1', resultat: 'GAGNE' }).success).toBe(true)
  })
})

// La règle « motif obligatoire si PERDU » est définie une seule fois et doit valoir pour les deux schémas.
const schemasResultat = [
  { nom: 'serveur (resultatLotSchema)', schema: resultatLotSchema, base: { lotId: 'lot_1' } },
  { nom: 'formulaire (formResultatLotSchema)', schema: formResultatLotSchema, base: {} },
]

for (const { nom, schema, base } of schemasResultat) {
  test.describe(`motif de perte obligatoire si PERDU, schéma ${nom}`, () => {
    test('PERDU sans motif (absent, null, vide ou espaces) → issue sur motifPerte avec le message existant', () => {
      for (const motifPerte of [undefined, null, '', '   ']) {
        const resultat = schema.safeParse({ ...base, resultat: 'PERDU', motifPerte })
        expect(resultat.success, `motifPerte = ${JSON.stringify(motifPerte)}`).toBe(false)
        expect(resultat.error?.issues.map((i) => ({ path: i.path, message: i.message }))).toEqual([
          { path: ['motifPerte'], message: MESSAGE_MOTIF_PERTE },
        ])
      }
    })

    test('PERDU avec motif → valide (motif débarrassé de ses espaces, montant converti)', () => {
      const resultat = schema.safeParse({
        ...base,
        resultat: 'PERDU',
        motifPerte: '  Prix trop élevé  ',
        concurrentGagnant: 'Auto Plus',
        montantOffreConcurrent: '1500000',
      })
      expect(resultat.success).toBe(true)
      expect(resultat.data?.motifPerte).toBe('Prix trop élevé')
      expect(resultat.data?.montantOffreConcurrent).toBe(1500000)
    })

    test('tout autre résultat que PERDU, sans motif → valide', () => {
      const autres = Object.values(ResultatLot).filter((r) => r !== 'PERDU')
      expect(autres).toContain('GAGNE')
      for (const r of autres) {
        expect(schema.safeParse({ ...base, resultat: r }).success, r).toBe(true)
        expect(schema.safeParse({ ...base, resultat: r, motifPerte: null }).success, r).toBe(true)
      }
    })
  })
}

test.describe('totalMontantPropose', () => {
  test('aucun lot → null', () => {
    expect(totalMontantPropose([])).toBeNull()
  })
  test('aucun lot avec un montant → null', () => {
    expect(totalMontantPropose([{ montantPropose: null }])).toBeNull()
  })
  test('somme les montants (string, number) et ignore les lots sans montant', () => {
    expect(
      totalMontantPropose([{ montantPropose: '1500000.00' }, { montantPropose: 2500000 }, { montantPropose: null }])
    ).toBe(4000000)
  })
})

test.describe('calculerStatsResultatsLots', () => {
  test('décompte tous les résultats, infructueux à part', () => {
    expect(
      calculerStatsResultatsLots(['GAGNE', 'GAGNE', 'PERDU', 'INFRUCTUEUX', 'EN_COURS', 'ATTRIBUE_PROVISOIREMENT'])
    ).toEqual({ total: 6, gagnes: 2, perdus: 1, infructueux: 1, enCours: 2, tauxReussite: 67 })
  })
  test('sans lot gagné ni perdu → taux de réussite 0', () => {
    expect(calculerStatsResultatsLots(['INFRUCTUEUX', 'EN_COURS']).tauxReussite).toBe(0)
  })
})

const lot = (
  id: string,
  numero: number,
  resultat: ResultatLot,
  montantPropose: unknown = 1000,
  marcheId: string | null = null
) => ({ id, numero, resultat, montantPropose, marcheId })

test.describe('lotsRattachables', () => {
  test('seuls les lots gagnés et libres', () => {
    const lots = [lot('a', 1, 'GAGNE'), lot('b', 2, 'PERDU'), lot('c', 3, 'GAGNE', 1, 'm1'), lot('d', 4, 'GAGNE')]
    expect(lotsRattachables(lots).map((l) => l.id)).toEqual(['a', 'd'])
  })
})

test.describe('validerSelectionLots', () => {
  const lots = [lot('a', 1, 'GAGNE'), lot('b', 2, 'GAGNE'), lot('c', 3, 'PERDU'), lot('d', 4, 'GAGNE', 1, 'm1')]
  test('sélection vide → refus', () => {
    expect(validerSelectionLots([], lots)).not.toBeNull()
  })
  test('lot perdu → refus', () => {
    expect(validerSelectionLots(['a', 'c'], lots)).not.toBeNull()
  })
  test('lot déjà rattaché à un marché → refus', () => {
    expect(validerSelectionLots(['a', 'd'], lots)).not.toBeNull()
  })
  test('identifiant inconnu (autre opportunité) → refus', () => {
    expect(validerSelectionLots(['a', 'zzz'], lots)).not.toBeNull()
  })
  test('identifiant en double → refus', () => {
    expect(validerSelectionLots(['a', 'a'], lots)).not.toBeNull()
  })
  test('deux lots gagnés libres → null', () => {
    expect(validerSelectionLots(['a', 'b'], lots)).toBeNull()
  })
})

test.describe('libelleObjetMarche', () => {
  test('un lot sur trois → « Lot 1 » au singulier', () => {
    expect(libelleObjetMarche('Objet', [1], 3)).toBe('Objet — Lot 1')
  })
  test('deux lots → « Lots 1, 3 »', () => {
    expect(libelleObjetMarche('Objet', [1, 3], 3)).toBe('Objet — Lots 1, 3')
  })
  test('opportunité à un seul lot → objet inchangé', () => {
    expect(libelleObjetMarche('Objet', [1], 1)).toBe('Objet')
  })
  test('numéros triés numériquement (2 avant 10)', () => {
    expect(libelleObjetMarche('Objet', [10, 2], 12)).toBe('Objet — Lots 2, 10')
  })
})

test.describe('preparerMarcheDepuisLots', () => {
  test('montant = somme des lots sélectionnés seulement', () => {
    const lots = [
      lot('a', 1, 'GAGNE', '43000000.00'),
      lot('b', 2, 'GAGNE', 5000),
      lot('c', 3, 'PERDU', 28000000),
    ]
    expect(preparerMarcheDepuisLots('Objet', lots, ['a'])).toEqual({ objet: 'Objet — Lot 1', montant: 43000000 })
  })
  test('plusieurs lots → numéros triés, montants additionnés', () => {
    const lots = [lot('a', 3, 'GAGNE', 1000), lot('b', 1, 'GAGNE', 2000), lot('c', 2, 'PERDU', 5000)]
    expect(preparerMarcheDepuisLots('Objet', lots, ['a', 'b'])).toEqual({ objet: 'Objet — Lots 1, 3', montant: 3000 })
  })
  test('opportunité à un seul lot → objet inchangé', () => {
    expect(preparerMarcheDepuisLots('Objet', [lot('a', 1, 'GAGNE', 1000)], ['a'])).toEqual({
      objet: 'Objet',
      montant: 1000,
    })
  })
  test('sélection invalide (vide, perdu, déjà rattaché) → null', () => {
    const lots = [lot('a', 1, 'PERDU'), lot('b', 2, 'GAGNE', 1000, 'm1'), lot('c', 3, 'GAGNE')]
    expect(preparerMarcheDepuisLots('Objet', lots, [])).toBeNull()
    expect(preparerMarcheDepuisLots('Objet', lots, ['a'])).toBeNull()
    expect(preparerMarcheDepuisLots('Objet', lots, ['b'])).toBeNull()
  })
  test('lot gagné sans montant → montant 0', () => {
    const lots = [lot('a', 1, 'GAGNE', null), lot('b', 2, 'GAGNE', 1000)]
    expect(preparerMarcheDepuisLots('Objet', lots, ['a'])).toEqual({ objet: 'Objet — Lot 1', montant: 0 })
  })
})

test.describe('lotEstFige', () => {
  test('rattaché à un marché → figé', () => {
    expect(lotEstFige({ marcheId: 'x' })).toBe(true)
  })
  test('libre → modifiable', () => {
    expect(lotEstFige({ marcheId: null })).toBe(false)
  })
})

test.describe('marchePreexistant', () => {
  const opportunite = new Date('2026-03-10T09:00:00Z')
  test('marché plus ancien que l\'opportunité (converti) → true', () => {
    expect(marchePreexistant({ createdAt: opportunite, marche: { createdAt: new Date('2026-02-01T09:00:00Z') } })).toBe(true)
  })
  test('marché plus récent (créé depuis les lots) → false', () => {
    expect(marchePreexistant({ createdAt: opportunite, marche: { createdAt: new Date('2026-03-20T09:00:00Z') } })).toBe(false)
  })
  test('aucun marché lié → false', () => {
    expect(marchePreexistant({ createdAt: opportunite, marche: null })).toBe(false)
  })
})

test.describe('calculerRetraitLot', () => {
  const lotsDuMarche = [lot('a', 1, 'GAGNE', 1000, 'm1'), lot('b', 3, 'GAGNE', 2500, 'm1')]
  const objetGenere = 'Objet — Lots 1, 3'

  test('objet généré → recalculé, montant du lot restant', () => {
    expect(
      calculerRetraitLot({
        objetOpportunite: 'Objet',
        nbLotsTotal: 3,
        marche: { objet: objetGenere, montant: 3500 },
        lotsDuMarche,
        lotRetireId: 'b',
      })
    ).toEqual({ montant: 1000, objet: 'Objet — Lot 1', objetConserve: false })
  })
  test('objet modifié à la main → conservé', () => {
    expect(
      calculerRetraitLot({
        objetOpportunite: 'Objet',
        nbLotsTotal: 3,
        marche: { objet: 'Objet saisi à la main', montant: 3500 },
        lotsDuMarche,
        lotRetireId: 'b',
      })
    ).toEqual({ montant: 1000, objet: 'Objet saisi à la main', objetConserve: true })
  })
  test('marché à un seul lot → refus', () => {
    const resultat = calculerRetraitLot({
      objetOpportunite: 'Objet',
      nbLotsTotal: 3,
      marche: { objet: 'Objet — Lot 1', montant: 1000 },
      lotsDuMarche: [lot('a', 1, 'GAGNE', 1000, 'm1')],
      lotRetireId: 'a',
    })
    expect(resultat).toHaveProperty('refus')
  })
  test('lot absent du marché → refus', () => {
    const resultat = calculerRetraitLot({
      objetOpportunite: 'Objet',
      nbLotsTotal: 3,
      marche: { objet: objetGenere, montant: 3500 },
      lotsDuMarche,
      lotRetireId: 'zzz',
    })
    expect(resultat).toHaveProperty('refus')
  })
})

test.describe('retraitMarcheAutorise', () => {
  test('statuts d\'avant l\'ordre de service, sans facture → autorisé', () => {
    expect(retraitMarcheAutorise({ statut: 'ATTRIBUE_DEFINITIVEMENT', nbFactures: 0 })).toBeNull()
    expect(retraitMarcheAutorise({ statut: 'EN_ATTENTE_LIVRAISON_OS', nbFactures: 0 })).toBeNull()
  })
  test('avec une facture → refus', () => {
    expect(retraitMarcheAutorise({ statut: 'ATTRIBUE_DEFINITIVEMENT', nbFactures: 1 })).not.toBeNull()
  })
  test('statut avancé → refus', () => {
    expect(retraitMarcheAutorise({ statut: 'EN_EXECUTION', nbFactures: 0 })).not.toBeNull()
  })
})

test.describe('lotsSansMontantPropose', () => {
  test('aucun lot → aucun numéro', () => {
    expect(lotsSansMontantPropose([])).toEqual([])
  })
  test('tous les montants renseignés → aucun numéro', () => {
    expect(
      lotsSansMontantPropose([
        { numero: 1, montantPropose: '500000.00' },
        { numero: 2, montantPropose: 0 },
      ])
    ).toEqual([])
  })
  test('montants null ou undefined → numéros triés par ordre croissant', () => {
    expect(
      lotsSansMontantPropose([
        { numero: 3, montantPropose: null },
        { numero: 1, montantPropose: '500000.00' },
        { numero: 2, montantPropose: undefined },
      ])
    ).toEqual([2, 3])
  })
  test('numéros à deux chiffres triés numériquement, pas lexicographiquement', () => {
    expect(
      lotsSansMontantPropose([
        { numero: 10, montantPropose: null },
        { numero: 2, montantPropose: null },
      ])
    ).toEqual([2, 10])
  })
})

test.describe('messageMontantsLotsManquants', () => {
  test('un seul lot → singulier', () => {
    expect(messageMontantsLotsManquants([2])).toBe("Renseignez le montant proposé de chaque lot avant de soumettre l'offre : lot n° 2.")
  })
  test('plusieurs lots → pluriel, numéros séparés par une virgule', () => {
    expect(messageMontantsLotsManquants([2, 3])).toBe("Renseignez le montant proposé de chaque lot avant de soumettre l'offre : lots n° 2, 3.")
  })
})

test.describe('calculerMontantVehicules', () => {
  test('aucun véhicule → null', () => {
    expect(calculerMontantVehicules([])).toBeNull()
  })
  test('somme des quantités × prix unitaires', () => {
    expect(calculerMontantVehicules([
      { quantite: 2, prixUnitaire: 30000000 },
      { quantite: 1, prixUnitaire: 12500000.5 },
    ])).toBe(72500000.5)
  })
  test('pas de dérive de virgule flottante', () => {
    expect(calculerMontantVehicules([{ quantite: 3, prixUnitaire: 0.1 }])).toBe(0.3)
  })
  test('total d\'une ligne', () => {
    expect(totalLigneVehicule({ quantite: 4, prixUnitaire: 250 })).toBe(1000)
  })
})

test.describe('vehiculesModifiables', () => {
  const libre = { marcheId: null }

  test('éditable de « Dossier en préparation » à « Gagnée »', () => {
    for (const statut of ['DOSSIER_EN_PREPARATION', 'OFFRE_SOUMISE', 'SOUMISE', 'EN_ATTENTE_ATTRIBUTION', 'ATTRIBUE_PROVISOIREMENT', 'GAGNEE'] as const) {
      expect(vehiculesModifiables(statut, libre), statut).toBe(true)
    }
  })
  test('non éditable avant la préparation, perdue, no-go', () => {
    for (const statut of ['IDENTIFIEE', 'EN_ANALYSE', 'GO', 'NO_GO', 'PERDUE'] as const) {
      expect(vehiculesModifiables(statut, libre), statut).toBe(false)
    }
  })
  test('figé quand le lot est rattaché à un marché', () => {
    expect(vehiculesModifiables('GAGNEE', { marcheId: 'm1' })).toBe(false)
  })
  test('STATUTS_EDITION_VEHICULES contient 6 statuts', () => {
    expect(STATUTS_EDITION_VEHICULES).toHaveLength(6)
  })
})

test.describe('resumerMarchesOpportunite', () => {
  const m1 = { id: 'm1', numero: 'M-001', montant: 1000 }
  const m2 = { id: 'm2', numero: 'M-002', montant: 2500 }

  test('aucun marché : null', () => {
    expect(resumerMarchesOpportunite({ marche: null, marches: [] })).toBeNull()
  })
  test('un seul marché créé : numéro et montant de ce marché', () => {
    expect(resumerMarchesOpportunite({ marche: m1, marches: [m1] })).toEqual({ numeros: 'M-001', montant: 1000 })
  })
  test('deux marchés : numéros joints par « , » et montants additionnés', () => {
    expect(resumerMarchesOpportunite({ marche: m1, marches: [m1, m2] })).toEqual({ numeros: 'M-001, M-002', montant: 3500 })
  })
  test('marché préexistant sans marché créé : lu via marche', () => {
    expect(resumerMarchesOpportunite({ marche: m1, marches: [] })).toEqual({ numeros: 'M-001', montant: 1000 })
  })
  test('le marché de marcheId n\'est jamais compté deux fois', () => {
    expect(resumerMarchesOpportunite({ marche: m2, marches: [m1, m2] })).toEqual({ numeros: 'M-001, M-002', montant: 3500 })
  })
  test('marche absent de marches : ajouté en dernier', () => {
    expect(resumerMarchesOpportunite({ marche: m2, marches: [m1] })).toEqual({ numeros: 'M-001, M-002', montant: 3500 })
  })
  test('montant absent compté pour zéro', () => {
    expect(resumerMarchesOpportunite({ marche: null, marches: [{ id: 'm3', numero: 'M-003', montant: null }] }))
      .toEqual({ numeros: 'M-003', montant: 0 })
  })
})
