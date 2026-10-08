import { test, expect } from '@playwright/test'
import { format } from 'date-fns'
import { periodeParDefaut, lirePeriodeUrl, parametresPeriode } from '../../lib/veille/periode'

const MAINTENANT = new Date(2026, 9, 8, 15, 30) // 8 octobre 2026, heure locale

test.describe('période dans l’adresse', () => {
  test('la période par défaut couvre 12 mois glissants', () => {
    const p = periodeParDefaut(MAINTENANT)
    expect(format(p.dateDebut, 'yyyy-MM-dd HH:mm')).toBe('2025-10-08 00:00')
    expect(format(p.dateFin, 'yyyy-MM-dd')).toBe('2026-10-08')
    expect(p.dateFin.getHours()).toBe(23)
  })

  test('lit des dates valides, de minuit à 23 h 59', () => {
    const p = lirePeriodeUrl('2026-01-01', '2026-06-30', MAINTENANT)
    expect(format(p.dateDebut, 'yyyy-MM-dd HH:mm')).toBe('2026-01-01 00:00')
    expect(format(p.dateFin, 'yyyy-MM-dd')).toBe('2026-06-30')
    expect(p.dateFin.getHours()).toBe(23)
  })

  test('retombe sur la période par défaut quand les valeurs sont absentes, mal formées ou inversées', () => {
    const defaut = periodeParDefaut(MAINTENANT)
    for (const [d, f] of [[null, null], ['2026-01-01', null], ['n’importe quoi', '2026-06-30'], ['2026-13-40', '2026-06-30'], ['2026-06-30', '2026-01-01']] as [string | null, string | null][]) {
      const p = lirePeriodeUrl(d, f, MAINTENANT)
      expect(p.dateDebut.getTime(), `${d} / ${f}`).toBe(defaut.dateDebut.getTime())
      expect(p.dateFin.getTime(), `${d} / ${f}`).toBe(defaut.dateFin.getTime())
    }
  })

  test('écrire puis relire redonne la même période', () => {
    const p = lirePeriodeUrl('2026-02-03', '2026-08-09', MAINTENANT)
    const parametres = new URLSearchParams(parametresPeriode(p))
    expect(parametresPeriode(p)).toBe('debut=2026-02-03&fin=2026-08-09')
    const relue = lirePeriodeUrl(parametres.get('debut'), parametres.get('fin'), MAINTENANT)
    expect(relue.dateDebut.getTime()).toBe(p.dateDebut.getTime())
    expect(relue.dateFin.getTime()).toBe(p.dateFin.getTime())
  })
})
