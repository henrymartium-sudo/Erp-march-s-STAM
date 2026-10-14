import { test, expect } from '@playwright/test'
import { NextRequest } from 'next/server'

// Les routes cron envoient de vrais e-mails : les traitements sont remplacés par des compteurs,
// sans base ni SMTP. Le secret est posé par le test lui-même (aucune dépendance à .env.test).
const SECRET = 'secret-de-test-unitaire'

const appels = { reporting: 0, opportunites: 0, alertes: 0 }

function remplacerModule(chemin: string, exports: Record<string, unknown>) {
  const resolu = require.resolve(chemin)
  require.cache[resolu] = { id: resolu, filename: resolu, loaded: true, exports, children: [], paths: [] } as unknown as NodeModule
}

remplacerModule('../../lib/cron/reporting-processor', {
  runReportingCron: async () => { appels.reporting++; return { sent: 0, failed: 0 } },
  runOpportuniteReportingCron: async () => { appels.opportunites++; return { sent: 0, failed: 0 } },
})
remplacerModule('../../lib/alertes/engine/cron-processor', {
  runDailyAlertsCron: async () => {
    appels.alertes++
    return { cautionsCount: 0, marchesCount: 0, documentsCount: 0 }
  },
})

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = [
  { nom: 'reporting', url: 'http://localhost/api/cron/reporting', GET: require('../../app/api/cron/reporting/route').GET },
  { nom: 'daily-alerts', url: 'http://localhost/api/cron/daily-alerts', GET: require('../../app/api/cron/daily-alerts/route').GET },
] as const
/* eslint-enable @typescript-eslint/no-require-imports */

const secretInitial = process.env.CRON_SECRET

test.beforeEach(() => {
  process.env.CRON_SECRET = SECRET
  appels.reporting = appels.opportunites = appels.alertes = 0
})

test.afterAll(() => {
  if (secretInitial === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = secretInitial
})

const traitementsAppeles = () => appels.reporting + appels.opportunites + appels.alertes

for (const route of routes) {
  test.describe(`/api/cron/${route.nom}`, () => {
    const appeler = (headers: Record<string, string> = {}) => route.GET(new NextRequest(route.url, { headers }))

    test('sans en-tête → 401, aucun envoi', async () => {
      const res = await appeler()
      expect(res.status).toBe(401)
      expect(traitementsAppeles()).toBe(0)
    })

    test('x-vercel-cron: 1 seul → 401, aucun envoi', async () => {
      const res = await appeler({ 'x-vercel-cron': '1' })
      expect(res.status).toBe(401)
      expect(traitementsAppeles()).toBe(0)
    })

    test('mauvais Bearer + x-vercel-cron: 1 → 401, aucun envoi', async () => {
      const res = await appeler({ authorization: 'Bearer autre-secret', 'x-vercel-cron': '1' })
      expect(res.status).toBe(401)
      expect(traitementsAppeles()).toBe(0)
    })

    test('bon Bearer → 200 et traitement exécuté', async () => {
      const res = await appeler({ authorization: `Bearer ${SECRET}` })
      expect(res.status).toBe(200)
      expect(traitementsAppeles()).toBeGreaterThan(0)
    })

    test('CRON_SECRET vide → 500, même avec x-vercel-cron: 1', async () => {
      process.env.CRON_SECRET = ''
      const res = await appeler({ 'x-vercel-cron': '1', authorization: 'Bearer ' })
      expect(res.status).toBe(500)
      expect(traitementsAppeles()).toBe(0)
    })
  })
}
