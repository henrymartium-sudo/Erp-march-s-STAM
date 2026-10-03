import { test, expect } from '@playwright/test'
import { login, TEST_USERS } from '../helpers/auth'

test.describe('Pilotage', () => {
  test('AVANCE accède à la page et voit les 3 indicateurs et la qualité des données', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/pilotage')
    await expect(page.getByRole('heading', { name: 'Pilotage' })).toBeVisible()
    await expect(page.getByText('Conversion attribué → facturé')).toBeVisible()
    await expect(page.getByText('Issue des offres', { exact: true })).toBeVisible()
    await expect(page.getByText('Écart de prix face au gagnant')).toBeVisible()
    await expect(page.getByText('Qualité des données')).toBeVisible()
  })

  test('VISITEUR est redirigé', async ({ page }) => {
    await login(page, TEST_USERS.visiteur)
    await page.goto('/pilotage')
    await expect(page).not.toHaveURL(/\/pilotage/)
  })

  test("l'onglet Analyses a quitté Reporting", async ({ page }) => {
    await login(page, TEST_USERS.admin)
    await page.goto('/admin/reporting')
    await expect(page.getByRole('tab', { name: 'Analyses' })).toHaveCount(0)
  })

  for (const [nom, taille] of [['desktop', { width: 1920, height: 1080 }], ['tablette', { width: 768, height: 1024 }], ['mobile', { width: 375, height: 667 }]] as const) {
    test(`aucun débordement horizontal en ${nom}`, async ({ page }) => {
      await page.setViewportSize(taille)
      await login(page, TEST_USERS.admin)
      await page.goto('/pilotage')
      await expect(page.getByText('Conversion attribué → facturé')).toBeVisible()
      const deborde = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(deborde).toBe(false)
    })
  }
})
