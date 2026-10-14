// tests/unit/echeances-affichage.spec.ts
import { test, expect } from '@playwright/test'
import { delaiTexte, echeanceLisible, montantProposeAffiche, objetMail } from '../../lib/echeances/affichage'
import { formatMontant } from '../../lib/utils/format'
import type { GroupesEcheances, OffreEcheance } from '../../lib/echeances/classement'

const NOW = new Date(Date.UTC(2026, 9, 15, 8, 0))
const jour = (n: number, h = 0, m = 0) => new Date(Date.UTC(2026, 9, 15 + n, h, m))
const lot = (numero: number, montantPropose: number | null) => ({ numero, montantPropose, dossier: null })

test.describe('affichage du mail échéances', () => {
  test('montant : aucun lot ou aucun montant → À définir', () => {
    expect(montantProposeAffiche([])).toEqual({ texte: 'À définir', vide: true, note: null })
    expect(montantProposeAffiche([lot(1, null)])).toEqual({ texte: 'À définir', vide: true, note: null })
  })

  test('montant : tous renseignés → total simple', () => {
    const m = montantProposeAffiche([lot(1, 10_000_000), lot(2, 5_000_000)])
    expect(m.texte).toBe(formatMontant(15_000_000))
    expect(m.note).toBeNull()
    expect(m.vide).toBe(false)
  })

  test('montant : lots manquants → total partiel avec les lots nommés', () => {
    expect(montantProposeAffiche([lot(1, 12_000_000), lot(2, null)]).note).toBe('total partiel — lot 2 sans montant')
    expect(montantProposeAffiche([lot(1, 1_000_000), lot(2, null), lot(3, null)]).note).toBe('total partiel — lots 2 et 3 sans montant')
    expect(montantProposeAffiche([lot(1, 1_000_000), lot(2, null), lot(3, null), lot(4, null)]).note).toBe('total partiel — lots 2, 3 et 4 sans montant')
  })

  test('délai selon le bloc', () => {
    expect(delaiTexte(jour(-1, 17), NOW, 'rouge')).toBe('Dépassée de 1 jour')
    expect(delaiTexte(jour(-3, 17), NOW, 'rouge')).toBe('Dépassée de 3 jours')
    expect(delaiTexte(jour(0, 7), NOW, 'rouge')).toBe('Heure dépassée aujourd\'hui')
    expect(delaiTexte(jour(0, 12), NOW, 'orange')).toBe('Aujourd\'hui')
    expect(delaiTexte(jour(1, 12), NOW, 'orange')).toBe('Demain')
    expect(delaiTexte(jour(3, 12), NOW, 'bleu')).toBe('Dans 3 jours')
  })

  test('échéance lisible : avec ou sans heure', () => {
    expect(echeanceLisible(jour(5, 17, 30))).toEqual({ date: '20 oct. 2026', heure: '17:30' })
    expect(echeanceLisible(jour(5))).toEqual({ date: '20 oct. 2026', heure: null })
  })

  test('objet du mail : résume la situation, y compris vide', () => {
    const o = (id: string): OffreEcheance => ({ id, reference: null, objet: '', autoriteContractante: '', statut: 'GO', dateLimite: null, lots: [] })
    const g = (r: number, or: number, b: number): GroupesEcheances => ({
      rouge: Array.from({ length: r }, (_, i) => o(`r${i}`)),
      orange: Array.from({ length: or }, (_, i) => o(`o${i}`)),
      bleu: Array.from({ length: b }, (_, i) => o(`b${i}`)),
    })
    expect(objetMail(g(0, 0, 0))).toBe('Aucune offre à rendre dans les 7 jours')
    expect(objetMail(g(1, 2, 3))).toBe('6 offres à rendre : 1 à régulariser, 2 aujourd\'hui ou demain, 3 dans la semaine')
    expect(objetMail(g(0, 1, 0))).toBe('1 offre à rendre : 1 aujourd\'hui ou demain')
  })
})
