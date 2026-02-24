import { test, expect, Browser, BrowserContext } from '@playwright/test'
import { login, TEST_USERS } from '../helpers/auth'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

// ─── T1–T7 : Accès ADMIN (1 seul login pour tout le describe) ────────────────

test.describe('Journal des Logs — Accès ADMIN', () => {
  let context: BrowserContext

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    context = await browser.newContext({ baseURL: BASE_URL })
    const page = await context.newPage()
    await login(page, TEST_USERS.admin)
    await page.close()
  })

  test.afterAll(async () => {
    await context.close()
  })

  test('T1 — lien sidebar visible pour ADMIN', async () => {
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('link', { name: 'Journal des logs' })).toBeVisible({ timeout: 15000 })
    await page.close()
  })

  test('T2 — page /admin/audit-logs accessible et titre affiché', async () => {
    const page = await context.newPage()
    await page.goto('/admin/audit-logs')
    await expect(page.getByRole('heading', { name: 'Journal des logs', exact: true })).toBeVisible({ timeout: 10000 })
    await page.close()
  })

  test('T3 — tableau affiché avec au moins une ligne', async () => {
    const page = await context.newPage()
    await page.goto('/admin/audit-logs')
    await page.waitForLoadState('networkidle')
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })
    await page.close()
  })

  test('T4 — filtres action et module fonctionnels', async () => {
    const page = await context.newPage()
    await page.goto('/admin/audit-logs')
    await page.waitForLoadState('networkidle')
    // Sélectionner filtre action = LOGIN
    await page.locator('[role="combobox"]').first().click()
    await page.getByRole('option', { name: 'Connexion' }).click()
    await page.getByRole('button', { name: 'Filtrer' }).click()
    await page.waitForURL(/action=LOGIN/, { timeout: 10000 })
    await expect(page).toHaveURL(/action=LOGIN/)
    await page.close()
  })

  test('T5 — clic sur une ligne ouvre le drawer', async () => {
    const page = await context.newPage()
    await page.goto('/admin/audit-logs')
    await page.waitForLoadState('networkidle')
    await page.locator('tbody tr').first().click()
    await expect(page.getByRole('heading', { name: 'Détail du log' })).toBeVisible({ timeout: 8000 })
    await page.close()
  })

  test('T6 — bouton réinitialiser efface les filtres', async () => {
    const page = await context.newPage()
    await page.goto('/admin/audit-logs?action=LOGIN')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Réinitialiser' }).click()
    await expect(page).toHaveURL(/\/admin\/audit-logs$/, { timeout: 8000 })
    await page.close()
  })

  test('T7 — export CSV déclenche un téléchargement', async () => {
    const page = await context.newPage()
    await page.goto('/admin/audit-logs')
    await page.waitForLoadState('networkidle')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'CSV' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/audit-logs.*\.csv/)
    await page.close()
  })
})

// ─── T8 : VISITEUR (1 login) ──────────────────────────────────────────────────

test.describe('Journal des Logs — VISITEUR', () => {
  let context: BrowserContext

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    context = await browser.newContext({ baseURL: BASE_URL })
    const page = await context.newPage()
    await login(page, TEST_USERS.visiteur)
    await page.close()
  })

  test.afterAll(async () => {
    await context.close()
  })

  test('T8 — VISITEUR ne voit pas le lien sidebar', async () => {
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Journal des logs' })).not.toBeVisible()
    await page.close()
  })
})

// ─── T9 : EXPLOITATION (1 login) ─────────────────────────────────────────────

test.describe('Journal des Logs — EXPLOITATION', () => {
  let context: BrowserContext

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    context = await browser.newContext({ baseURL: BASE_URL })
    const page = await context.newPage()
    await login(page, TEST_USERS.exploitation)
    await page.close()
  })

  test.afterAll(async () => {
    await context.close()
  })

  test('T9 — EXPLOITATION ne peut pas voir les données audit-logs', async () => {
    const page = await context.newPage()
    await page.goto('/admin/audit-logs')
    await page.waitForLoadState('networkidle')
    // requireAdmin() throws côté serveur → error boundary, aucune ligne de log affichée
    // Le tableau audit ne doit pas avoir de lignes de données
    const dataRows = page.locator('tbody tr:not(:has(td[colspan]))')
    await expect(dataRows).toHaveCount(0, { timeout: 8000 })
    await page.close()
  })
})
