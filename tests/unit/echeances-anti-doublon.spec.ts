// tests/unit/echeances-anti-doublon.spec.ts
import { test, expect } from '@playwright/test'
import { envoyerEcheancesMatinCron, type JournalEnvoiCron } from '../../lib/cron/echeances-matin'

const NOW = new Date(Date.UTC(2026, 9, 15, 8, 0))
const H = 3_600_000

function montage(dernier: Date | null = null, echoue: string[] = []) {
  const envois: string[] = []
  const traces: { ruleId: string; envoyes: number }[] = []
  const journal: JournalEnvoiCron = {
    async dernierEnvoi() { return dernier },
    async enregistrer(ruleId, envoyes) { traces.push({ ruleId, envoyes }) },
  }
  const deps = {
    charger: async () => [],
    transporteur: {
      async sendMail(o: { to: string }) {
        if (echoue.includes(o.to)) throw new Error('refusé')
        envois.push(o.to)
        return {}
      },
    },
    from: 'ERP <noreply@x.test>',
    baseUrl: 'https://app.exemple.invalid',
  }
  return { envois, traces, journal, deps }
}

test.describe('mail échéances du matin — garde anti-doublon du cron', () => {
  test('premier passage : envoie et consigne l\'envoi', async () => {
    const m = montage(null)
    const r = await envoyerEcheancesMatinCron('r1', ['a@x.test'], NOW, m.journal, m.deps)
    expect(r.ignore).toBe(false)
    expect(m.envois).toEqual(['a@x.test'])
    expect(m.traces).toEqual([{ ruleId: 'r1', envoyes: 1 }])
  })

  test('rappel du cron dans l\'heure : aucun second mail', async () => {
    const m = montage(new Date(NOW.getTime() - 1 * H))
    const r = await envoyerEcheancesMatinCron('r1', ['a@x.test'], NOW, m.journal, m.deps)
    expect(r.ignore).toBe(true)
    expect(m.envois).toEqual([])
    expect(m.traces).toEqual([])
  })

  test('dernier envoi la veille à la même heure (24 h) : envoie', async () => {
    const m = montage(new Date(NOW.getTime() - 24 * H))
    const r = await envoyerEcheancesMatinCron('r1', ['a@x.test'], NOW, m.journal, m.deps)
    expect(r.ignore).toBe(false)
    expect(m.envois).toHaveLength(1)
  })

  test('aucun envoi réussi : rien n\'est consigné (le rappel peut réessayer)', async () => {
    const m = montage(null, ['a@x.test'])
    const r = await envoyerEcheancesMatinCron('r1', ['a@x.test'], NOW, m.journal, m.deps)
    expect(r.ignore).toBe(false)
    expect(r.resultat?.echecs).toHaveLength(1)
    expect(m.traces).toEqual([])
  })

  test('échec de la consignation : l\'envoi reste compté, pas d\'exception', async () => {
    const m = montage(null)
    m.journal.enregistrer = async () => { throw new Error('base indisponible') }
    const r = await envoyerEcheancesMatinCron('r1', ['a@x.test'], NOW, m.journal, m.deps)
    expect(r.ignore).toBe(false)
    expect(r.resultat?.envoyes).toBe(1)
  })
})
