// tests/unit/echeances-classement.spec.ts
import { test, expect } from '@playwright/test'
import {
  alerteGras, classerOffre, echeanceEffective, ecartJours, grouperEcheances,
  type OffreEcheance,
} from '../../lib/echeances/classement'

const NOW = new Date(Date.UTC(2026, 9, 15, 8, 0)) // jeudi 15 octobre 2026, 08:00
const jour = (n: number, h = 0, m = 0) => new Date(Date.UTC(2026, 9, 15 + n, h, m))

function offre(statut: OffreEcheance['statut'], dateLimite: Date | null, id = 'o'): OffreEcheance {
  return { id, reference: 'REF', objet: 'Objet', autoriteContractante: 'Autorité', statut, dateLimite, lots: [] }
}

test.describe('classement des échéances', () => {
  test('sans heure, l\'échéance effective est 23 h 59 le jour de la date limite', () => {
    expect(echeanceEffective(jour(2)).toISOString()).toBe(jour(2, 23, 59).toISOString())
    expect(echeanceEffective(jour(2, 17, 30)).toISOString()).toBe(jour(2, 17, 30).toISOString())
  })

  test('statuts clos ou de soumission : jamais dans un bloc', () => {
    for (const s of ['NO_GO', 'SOUMISE', 'OFFRE_SOUMISE', 'EN_ATTENTE_ATTRIBUTION', 'ATTRIBUE_PROVISOIREMENT', 'GAGNEE', 'PERDUE'] as const) {
      expect(classerOffre(offre(s, jour(1)), NOW)).toBeNull()
    }
  })

  test('statuts à rendre : classés', () => {
    for (const s of ['IDENTIFIEE', 'EN_ANALYSE', 'GO', 'DOSSIER_EN_PREPARATION'] as const) {
      expect(classerOffre(offre(s, jour(1)), NOW)).toBe('orange')
    }
  })

  test('une offre sans date limite n\'apparaît nulle part', () => {
    expect(classerOffre(offre('GO', null), NOW)).toBeNull()
  })

  test('frontières : aujourd\'hui, demain, surlendemain, J+7 inclus, J+8 exclu', () => {
    expect(classerOffre(offre('GO', jour(0, 12)), NOW)).toBe('orange')
    expect(classerOffre(offre('GO', jour(1, 9)), NOW)).toBe('orange')
    expect(classerOffre(offre('GO', jour(2, 9)), NOW)).toBe('bleu')
    expect(classerOffre(offre('GO', jour(7, 9)), NOW)).toBe('bleu')
    expect(classerOffre(offre('GO', jour(8, 9)), NOW)).toBe('gris')
    expect(classerOffre(offre('EN_ANALYSE', jour(60, 9)), NOW)).toBe('gris')
  })

  test('échéance passée : toujours « À régulariser », même très ancienne', () => {
    expect(classerOffre(offre('GO', jour(0, 7, 59)), NOW)).toBe('rouge')
    expect(classerOffre(offre('GO', jour(-1, 17)), NOW)).toBe('rouge')
    expect(classerOffre(offre('GO', new Date(Date.UTC(2025, 0, 10, 12))), NOW)).toBe('rouge')
  })

  test('sans heure, aujourd\'hui reste à rendre (23 h 59) ; hier est dépassé', () => {
    expect(classerOffre(offre('GO', jour(0)), NOW)).toBe('orange')
    expect(classerOffre(offre('GO', jour(-1)), NOW)).toBe('rouge')
  })

  test('écart en jours calendaires UTC', () => {
    expect(ecartJours(jour(0, 23, 59), NOW)).toBe(0)
    expect(ecartJours(jour(1, 0, 0), NOW)).toBe(1)
    expect(ecartJours(jour(-1, 17), NOW)).toBe(-1)
  })

  test('gras : détectée à J0..J+2, jamais en rouge, jamais pour une offre en préparation', () => {
    expect(alerteGras(offre('EN_ANALYSE', jour(0, 12)), NOW)).toBe(true)
    expect(alerteGras(offre('IDENTIFIEE', jour(2, 9)), NOW)).toBe(true)
    expect(alerteGras(offre('EN_ANALYSE', jour(3, 9)), NOW)).toBe(false)
    expect(alerteGras(offre('EN_ANALYSE', jour(-1, 17)), NOW)).toBe(false)
    expect(alerteGras(offre('EN_ANALYSE', jour(0, 7, 59)), NOW)).toBe(false)
    expect(alerteGras(offre('GO', jour(1, 9)), NOW)).toBe(false)
    expect(alerteGras(offre('DOSSIER_EN_PREPARATION', jour(1, 9)), NOW)).toBe(false)
  })

  test('chaque offre est dans un seul bloc, triée par échéance effective', () => {
    const offres = [
      offre('GO', jour(5, 9), 'c'), offre('GO', jour(-2, 9), 'a'), offre('GO', jour(1), 'b'),
      offre('GO', jour(0, 12), 'd'), offre('PERDUE', jour(1), 'x'), offre('GO', null, 'y'), offre('GO', jour(3, 9), 'e'),
      offre('EN_ANALYSE', jour(40, 9), 'g2'), offre('IDENTIFIEE', jour(12, 9), 'g1'),
    ]
    const g = grouperEcheances(offres, NOW)
    expect(g.rouge.map((o) => o.id)).toEqual(['a'])
    expect(g.orange.map((o) => o.id)).toEqual(['d', 'b'])
    expect(g.bleu.map((o) => o.id)).toEqual(['e', 'c'])
    expect(g.gris.map((o) => o.id)).toEqual(['g1', 'g2'])
    const tous = [...g.rouge, ...g.orange, ...g.bleu, ...g.gris].map((o) => o.id)
    expect(new Set(tous).size).toBe(tous.length)
  })
})
