import { test, expect } from '@playwright/test'
import { lienAbsoluDocument, copierTexte } from '../../lib/utils/documents-lien'

test.describe('lienAbsoluDocument (copier le lien)', () => {
  test('origine sans barre finale et origine avec barre finale donnent le même lien', () => {
    const sans = lienAbsoluDocument('https://erp.exemple.test', 'doc-42')
    const avec = lienAbsoluDocument('https://erp.exemple.test/', 'doc-42')
    expect(sans).toBe('https://erp.exemple.test/documents/doc-42')
    expect(avec).toBe('https://erp.exemple.test/documents/doc-42')
  })

  test("l'identifiant est conservé tel quel (aucun encodage ni troncature)", () => {
    const id = 'cm9x7k2ab0001abc-DEF_123'
    expect(lienAbsoluDocument('http://localhost:3000', id)).toBe(`http://localhost:3000/documents/${id}`)
  })
})

test.describe('copierTexte', () => {
  test("renvoie 'copie' et transmet le texte exact à writeText quand la copie réussit", async () => {
    const recus: string[] = []
    const presse = {
      writeText: async (t: string) => {
        recus.push(t)
      },
    }
    const resultat = await copierTexte('https://erp.exemple.test/documents/doc-1', presse)
    expect(resultat).toBe('copie')
    expect(recus).toEqual(['https://erp.exemple.test/documents/doc-1'])
  })

  test("renvoie 'refuse' quand writeText rejette (permission refusée)", async () => {
    const presse = {
      writeText: async () => {
        throw new Error('NotAllowedError')
      },
    }
    expect(await copierTexte('https://erp.exemple.test/documents/doc-1', presse)).toBe('refuse')
  })

  test("renvoie 'refuse' quand writeText lève une exception synchrone", async () => {
    const presse = {
      writeText: (): Promise<void> => {
        throw new Error('contexte non sécurisé')
      },
    }
    expect(await copierTexte('https://erp.exemple.test/documents/doc-1', presse)).toBe('refuse')
  })

  test("renvoie 'refuse' quand le presse-papiers est absent (contexte non sécurisé)", async () => {
    expect(await copierTexte('https://erp.exemple.test/documents/doc-1', undefined)).toBe('refuse')
  })
})
