import { test, expect } from '@playwright/test'
import {
  createMarcheSchema,
  createMarcheServerSchema,
  updateMarcheServerSchema,
} from '@/lib/validations/marche'

/**
 * Régression audit UI/UX 2026-07 — correctif #4 (MAJEUR)
 * Un statut de terminaison (RESILIE, ANNULE, INFRUCTUEUX) exigeait
 * seulement un avertissement non bloquant (checkTerminationWarnings
 * retournait toujours true). La date et les motifs (≥ 10 caractères)
 * sont désormais obligatoires via validation Zod conditionnelle,
 * côté client (createMarcheSchema, resolver du formulaire) et côté
 * serveur (createMarcheServerSchema, updateMarcheServerSchema).
 */

const basePayload = {
  numero: 'AOO/2026/TEST/001',
  objet: 'Fourniture de véhicules de test pour validation',
  type: 'FOURNITURES' as const,
  montant: 1_000_000,
  dateNotification: new Date('2026-01-15'),
  delaiExecution: 90,
  autoriteContractanteNom: 'Autorité de test',
}

const TERMINAISONS = [
  { statut: 'RESILIE', dateField: 'dateResiliation', motifsField: 'motifsResiliation' },
  { statut: 'ANNULE', dateField: 'dateAnnulation', motifsField: 'motifsAnnulation' },
  { statut: 'INFRUCTUEUX', dateField: 'dateInfructueux', motifsField: 'motifsInfructueux' },
] as const

test.describe('Validation Zod — statuts de terminaison bloquants', () => {
  for (const { statut, dateField, motifsField } of TERMINAISONS) {
    test(`${statut} sans date ni motifs → rejeté (client + serveur)`, () => {
      const payload = { ...basePayload, statut }

      const client = createMarcheSchema.safeParse(payload)
      expect(client.success).toBe(false)
      if (!client.success) {
        const paths = client.error.issues.map((i) => i.path[0])
        expect(paths).toContain(dateField)
        expect(paths).toContain(motifsField)
      }

      const server = createMarcheServerSchema.safeParse(payload)
      expect(server.success).toBe(false)
    })

    test(`${statut} avec motifs trop courts → rejeté`, () => {
      const payload = {
        ...basePayload,
        statut,
        [dateField]: new Date('2026-06-01'),
        [motifsField]: 'court',
      }
      expect(createMarcheSchema.safeParse(payload).success).toBe(false)
    })

    test(`${statut} avec date + motifs complets → accepté`, () => {
      const payload = {
        ...basePayload,
        statut,
        [dateField]: new Date('2026-06-01'),
        [motifsField]: 'Motifs détaillés suffisamment longs pour la validation.',
      }
      const result = createMarcheSchema.safeParse(payload)
      expect(result.success, JSON.stringify(!result.success ? result.error.issues : null)).toBe(true)
    })

    test(`update vers ${statut} sans date/motifs → rejeté côté serveur`, () => {
      const result = updateMarcheServerSchema.safeParse({
        id: 'cjld2cjxh0000qzrmn831i7rn',
        ...basePayload,
        statut,
      })
      expect(result.success).toBe(false)
    })
  }

  test('statut non terminal sans champs de terminaison → accepté', () => {
    const result = createMarcheSchema.safeParse({
      ...basePayload,
      statut: 'EN_EXECUTION',
    })
    expect(result.success, JSON.stringify(!result.success ? result.error.issues : null)).toBe(true)
  })

  test('update partiel sans statut → non bloqué par la terminaison', () => {
    const result = updateMarcheServerSchema.safeParse({
      id: 'cjld2cjxh0000qzrmn831i7rn',
      objet: 'Nouvel objet suffisamment long pour la validation',
      dateNotification: new Date('2026-01-15'),
    })
    expect(result.success, JSON.stringify(!result.success ? result.error.issues : null)).toBe(true)
  })
})
