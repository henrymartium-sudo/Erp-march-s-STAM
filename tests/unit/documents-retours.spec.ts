import { test, expect } from '@playwright/test'
import { ouvrirTelechargement } from '../../lib/utils/documents-telechargement'
import { aDesFiltresActifs } from '../../lib/utils/documents-filtres'

test.describe('ouvrirTelechargement (I8)', () => {
  test("renvoie 'ouvert' quand la fenêtre s'ouvre, avec l'URL demandée", () => {
    const appels: string[] = []
    const resultat = ouvrirTelechargement('https://exemple.test/fichier', (url) => {
      appels.push(url)
      return {}
    })
    expect(resultat).toBe('ouvert')
    expect(appels).toEqual(['https://exemple.test/fichier'])
  })

  test("renvoie 'bloque' quand le navigateur refuse d'ouvrir la fenêtre (null)", () => {
    expect(ouvrirTelechargement('https://exemple.test/f', () => null)).toBe('bloque')
  })

  test("renvoie 'bloque' quand l'ouverture lève une exception", () => {
    const resultat = ouvrirTelechargement('https://exemple.test/f', () => {
      throw new Error('refusé')
    })
    expect(resultat).toBe('bloque')
  })
})

test.describe('aDesFiltresActifs (état vide)', () => {
  test('aucun paramètre : pas de filtre', () => {
    expect(aDesFiltresActifs(new URLSearchParams())).toBe(false)
  })

  test('tri, sens et page ne sont pas des filtres', () => {
    expect(aDesFiltresActifs(new URLSearchParams('tri=nom&sens=asc&page=2'))).toBe(false)
  })

  test('recherche, type, phase ou marché sont des filtres', () => {
    for (const q of ['search=abc', 'type=AUTRE', 'phase=SOUMISSION', 'marcheId=x']) {
      expect(aDesFiltresActifs(new URLSearchParams(q))).toBe(true)
    }
  })

  test('valeurs vides ou « all » ne comptent pas', () => {
    expect(aDesFiltresActifs(new URLSearchParams('search=&type=all&phase=all'))).toBe(false)
  })
})
