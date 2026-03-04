import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Phase 6 — Changement de statut', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@stam.tg')
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'Admin123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 })
  })

  test('bouton Statut visible pour ADMIN', async ({ page }) => {
    await page.goto(`${BASE_URL}/marches`)
    await page.waitForLoadState('networkidle')
    const firstLink = page.locator('table tbody tr a').first()
    await firstLink.click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /Statut/i })).toBeVisible({ timeout: 10000 })
  })

  test('Sheet s\'ouvre avec stepper workflow', async ({ page }) => {
    await page.goto(`${BASE_URL}/marches`)
    await page.waitForLoadState('networkidle')
    const firstLink = page.locator('table tbody tr a').first()
    await firstLink.click()
    await page.waitForLoadState('networkidle')

    const btn = page.getByRole('button', { name: /Statut/i })
    if (!(await btn.isEnabled())) {
      test.skip()
      return
    }

    await btn.click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Changer le statut')).toBeVisible()
    await expect(page.getByText('Workflow')).toBeVisible()
    await expect(page.getByText('Statut actuel')).toBeVisible()
  })

  test('fermeture Sheet avec Annuler', async ({ page }) => {
    await page.goto(`${BASE_URL}/marches`)
    await page.waitForLoadState('networkidle')
    const firstLink = page.locator('table tbody tr a').first()
    await firstLink.click()
    await page.waitForLoadState('networkidle')

    const btn = page.getByRole('button', { name: /Statut/i })
    if (!(await btn.isEnabled())) { test.skip(); return }

    await btn.click()
    await page.waitForSelector('[role="dialog"]')
    await page.getByRole('button', { name: 'Annuler' }).click()
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 })
  })

  test('commentaire s\'affiche quand on sélectionne un statut critique', async ({ page }) => {
    // Cherche un marché non-terminal pour trouver ANNULE dans les transitions
    await page.goto(`${BASE_URL}/marches`)
    await page.waitForLoadState('networkidle')

    // Naviguer sur un marché EN_EXECUTION ou OFFRE_DEPOSEE qui a ANNULE disponible
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    let found = false

    for (let i = 0; i < Math.min(count, 10); i++) {
      const link = rows.nth(i).locator('a').first()
      await link.click()
      await page.waitForLoadState('networkidle')

      const btn = page.getByRole('button', { name: /Statut/i })
      if (!(await btn.isEnabled())) {
        await page.goBack()
        await page.waitForLoadState('networkidle')
        continue
      }

      await btn.click()
      await page.waitForSelector('[role="dialog"]')

      // Chercher l'option Annulé dans le select
      await page.locator('#new-statut').click()
      const annuleOption = page.getByRole('option', { name: 'Annulé', exact: true })
      if (await annuleOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await annuleOption.click()
        // Le champ commentaire doit être obligatoire
        await expect(page.getByText('Commentaire *')).toBeVisible({ timeout: 3000 })
        found = true
        break
      }

      // Fermer et passer au suivant
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Annuler' }).click().catch(() => {})
      await page.goBack()
      await page.waitForLoadState('networkidle')
    }

    if (!found) test.skip()
  })
})
