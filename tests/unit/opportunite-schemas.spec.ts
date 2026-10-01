import { test, expect } from '@playwright/test'
import {
  formOpportuniteSchema,
  createOpportuniteSchema,
  updateOpportuniteSchema,
} from '../../lib/validations/opportunite'

// Le montant proposé, le résultat et les informations de perte se saisissent par lot (lib/validations/lot).
// L'import ci-dessus exécute le `.partial().extend()` posé au niveau du module : Zod 4 lève à l'exécution
// sur un objet refiné, sans qu'aucune vérification statique (tsc, next build) ne le voie.

const CHAMPS_DEPLACES_SUR_LES_LOTS = ['montantPropose', 'motifPerte', 'concurrentGagnant', 'montantOffreConcurrent']

const ANCIENS_CHAMPS = {
  montantPropose: 1500000,
  motifPerte: 'Prix trop élevé',
  concurrentGagnant: 'Auto Plus',
  montantOffreConcurrent: 1200000,
}

const ID_CUID = 'cjld2cjxh0000qzrmn831i7rn'

const schemas = [
  {
    nom: 'formulaire (formOpportuniteSchema)',
    schema: formOpportuniteSchema,
    valide: {
      objet: 'Fourniture de véhicules utilitaires',
      autoriteContractante: 'Ministère des Transports',
      statut: 'EN_ANALYSE',
      montantEstime: 50000000,
      dateLimite: new Date('2026-12-31'),
    },
  },
  {
    nom: 'création (createOpportuniteSchema)',
    schema: createOpportuniteSchema,
    valide: {
      objet: 'Fourniture de véhicules utilitaires',
      autoriteContractante: 'Ministère des Transports',
      montantEstime: 50000000,
      dateLimite: '2026-12-31',
    },
  },
  {
    nom: 'mise à jour (updateOpportuniteSchema)',
    schema: updateOpportuniteSchema,
    valide: { id: ID_CUID, objet: 'Fourniture de véhicules utilitaires' },
  },
]

for (const { nom, schema, valide } of schemas) {
  test.describe(`schéma ${nom}`, () => {
    test('se charge et parse un exemple valide', () => {
      expect(schema.safeParse(valide).success).toBe(true)
    })

    test('ne porte plus les champs déplacés sur les lots', () => {
      for (const champ of CHAMPS_DEPLACES_SUR_LES_LOTS) {
        expect(Object.keys(schema.shape), champ).not.toContain(champ)
      }
    })

    test('ignore les anciens champs envoyés par un client périmé au lieu de les enregistrer', () => {
      const resultat = schema.safeParse({ ...valide, ...ANCIENS_CHAMPS })
      expect(resultat.success).toBe(true)
      for (const champ of CHAMPS_DEPLACES_SUR_LES_LOTS) {
        expect(Object.keys(resultat.data ?? {}), champ).not.toContain(champ)
      }
    })
  })
}

test.describe('schéma serveur de création', () => {
  test('convertit la date limite, vide le marché lié et applique le statut par défaut', () => {
    const resultat = createOpportuniteSchema.safeParse({
      objet: 'Fourniture de véhicules utilitaires',
      autoriteContractante: 'Ministère des Transports',
      dateLimite: '2026-12-31',
      marcheId: '',
    })
    expect(resultat.success).toBe(true)
    expect(resultat.data?.dateLimite).toBeInstanceOf(Date)
    expect(resultat.data?.marcheId).toBeNull()
    expect(resultat.data?.statut).toBe('EN_ANALYSE')
  })

  test('garde le statut : EN_ANALYSE par défaut, valeur explicite acceptée', () => {
    const base = { objet: 'Fourniture de véhicules utilitaires', autoriteContractante: 'Ministère des Transports' }
    expect(createOpportuniteSchema.safeParse(base).data?.statut).toBe('EN_ANALYSE')
    expect(createOpportuniteSchema.safeParse({ ...base, statut: 'GO' }).data?.statut).toBe('GO')
  })

  // Les statuts suivants passent par changerStatutOpportunite (transitions, commentaire, lots, dossiers).
  test('n’accepte à la création que EN_ANALYSE, GO et NO_GO', () => {
    const base = { objet: 'Fourniture de véhicules utilitaires', autoriteContractante: 'Ministère des Transports' }
    for (const statut of ['EN_ANALYSE', 'GO', 'NO_GO']) {
      expect(createOpportuniteSchema.safeParse({ ...base, statut }).success, statut).toBe(true)
    }
    for (const statut of ['DOSSIER_EN_PREPARATION', 'OFFRE_SOUMISE', 'EN_ATTENTE_ATTRIBUTION', 'ATTRIBUE_PROVISOIREMENT', 'GAGNEE', 'PERDUE']) {
      expect(createOpportuniteSchema.safeParse({ ...base, statut }).success, statut).toBe(false)
    }
  })
})

test.describe('schéma serveur de mise à jour', () => {
  test('exige l’identifiant et laisse tous les autres champs facultatifs', () => {
    expect(updateOpportuniteSchema.safeParse({ objet: 'Nouvel objet' }).success).toBe(false)
    expect(updateOpportuniteSchema.safeParse({ id: ID_CUID }).success).toBe(true)
  })

  // Le statut ne se change que par le dialogue (changerStatutOpportunite) : « Modifier » ne doit pas le réécrire.
  test('retire la clé statut envoyée par le formulaire au lieu de l’enregistrer', () => {
    const resultat = updateOpportuniteSchema.safeParse({ id: ID_CUID, objet: 'Nouvel objet', statut: 'GAGNEE' })
    expect(resultat.success).toBe(true)
    expect(Object.keys(resultat.data ?? {})).not.toContain('statut')
  })

  // Le lien vers le marché est écrit par la conversion et par la création du marché depuis les lots : « Modifier » le renvoie
  // tel qu’il l’a chargé et, périmé (marché créé entre-temps dans un autre onglet), le remettrait à null (2e marché possible).
  test('retire la clé marcheId envoyée par le formulaire au lieu de l’enregistrer', () => {
    const resultat = updateOpportuniteSchema.safeParse({ id: ID_CUID, objet: 'Nouvel objet', marcheId: '' })
    expect(resultat.success).toBe(true)
    expect(Object.keys(resultat.data ?? {})).not.toContain('marcheId')
  })

  test('n’applique aucun statut par défaut sur une mise à jour partielle', () => {
    const resultat = updateOpportuniteSchema.safeParse({ id: ID_CUID, objet: 'Nouvel objet' })
    expect(resultat.success).toBe(true)
    expect(Object.keys(resultat.data ?? {})).not.toContain('statut')
  })
})

test.describe('échéance d’attribution provisoire (MOD-7)', () => {
  const exempleValide = {
    objet: 'Fourniture de véhicules utilitaires',
    autoriteContractante: 'Ministère des Transports',
    statut: 'EN_ANALYSE',
  }

  test('le schéma du formulaire accepte une date, null ou l’absence de la clé', () => {
    // Zod retire les clés inconnues : on vérifie la valeur conservée, pas seulement le succès du parse.
    const avecDate = formOpportuniteSchema.safeParse({ ...exempleValide, echeanceAttributionProv: new Date('2026-10-15') })
    expect(avecDate.success).toBe(true)
    expect(avecDate.data?.echeanceAttributionProv?.getTime()).toBe(new Date('2026-10-15').getTime())
    const avecNull = formOpportuniteSchema.safeParse({ ...exempleValide, echeanceAttributionProv: null })
    expect(avecNull.success).toBe(true)
    expect(avecNull.data?.echeanceAttributionProv).toBeNull()
    const sansCle = formOpportuniteSchema.safeParse(exempleValide)
    expect(sansCle.success).toBe(true)
    expect(sansCle.data?.echeanceAttributionProv).toBeUndefined()
  })

  test('le schéma de mise à jour convertit une chaîne ISO en date', () => {
    const resultat = updateOpportuniteSchema.safeParse({ id: ID_CUID, echeanceAttributionProv: '2026-10-15' })
    expect(resultat.success).toBe(true)
    expect(resultat.data?.echeanceAttributionProv).toBeInstanceOf(Date)
    expect(resultat.data?.echeanceAttributionProv?.getTime()).toBe(new Date('2026-10-15').getTime())
  })

  test('le schéma de mise à jour conserve une date', () => {
    const resultat = updateOpportuniteSchema.safeParse({ id: ID_CUID, echeanceAttributionProv: new Date('2026-10-15') })
    expect(resultat.success).toBe(true)
    expect(resultat.data?.echeanceAttributionProv).toBeInstanceOf(Date)
    expect(resultat.data?.echeanceAttributionProv?.getTime()).toBe(new Date('2026-10-15').getTime())
  })

  test('le schéma de mise à jour efface la date sur null ou chaîne vide', () => {
    for (const valeur of [null, '']) {
      const resultat = updateOpportuniteSchema.safeParse({ id: ID_CUID, echeanceAttributionProv: valeur })
      expect(resultat.success, String(valeur)).toBe(true)
      expect(resultat.data?.echeanceAttributionProv, String(valeur)).toBeNull()
    }
  })

  test('le schéma de mise à jour laisse la date inchangée quand la clé est absente', () => {
    const resultat = updateOpportuniteSchema.safeParse({ id: ID_CUID })
    expect(resultat.success).toBe(true)
    expect(resultat.data?.echeanceAttributionProv).toBeUndefined()
  })

  test('le schéma de mise à jour rejette une date invalide', () => {
    expect(updateOpportuniteSchema.safeParse({ id: ID_CUID, echeanceAttributionProv: 'pas une date' }).success).toBe(false)
  })

  test('le schéma de création ne porte pas ce champ', () => {
    expect(Object.keys(createOpportuniteSchema.shape)).not.toContain('echeanceAttributionProv')
  })
})
