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
    const referenceYear = new Date().getFullYear() - 1
    await expect(page.getByText(new RegExp(`mêmes dates.*${referenceYear}`))).toBeVisible()
    await expect(page.getByText(/^Évolution/)).toHaveCount(3)
  })

  test('chaque indicateur ouvre son détail au clavier', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/pilotage')

    for (const titre of [
      'Conversion attribué → facturé',
      'Issue des offres',
      'Écart de prix face au gagnant',
    ]) {
      const card = page.locator('div.rounded-lg.border.bg-card').filter({
        has: page.getByText(titre, { exact: true }),
      })
      const bouton = card.getByRole('button', { name: 'Voir le détail' })
      const panneau = card.getByRole('region', { name: `Détail : ${titre}` })

      await expect(bouton).toBeVisible()
      await expect(bouton).toHaveAttribute('aria-expanded', 'false')
      await bouton.focus()
      await page.keyboard.press('Enter')
      await expect(bouton).toHaveAttribute('aria-expanded', 'true')
      await expect(panneau).toBeVisible()
      await page.keyboard.press('Enter')
      await expect(bouton).toHaveAttribute('aria-expanded', 'false')
      await expect(panneau).toBeHidden()
    }
  })

  test('une erreur de chargement permet de réessayer', async ({ page }) => {
    await login(page, TEST_USERS.avance)

    let autoriserCalcul = false
    await page.route('**/pilotage', async (route) => {
      if (route.request().method() === 'POST' && !autoriserCalcul) {
        await route.abort()
        return
      }
      await route.continue()
    })

    await page.goto('/pilotage')
    await expect(page.getByText('Impossible de calculer les indicateurs. Réessayez ou élargissez la période.', { exact: true })).toBeVisible()
    await expect(page.getByRole('status', { name: 'Chargement des indicateurs' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
    await expect(page.getByText('Conversion attribué → facturé')).toHaveCount(0)

    autoriserCalcul = true
    await page.getByRole('button', { name: 'Réessayer' }).click()
    await expect(page.getByText('Conversion attribué → facturé')).toBeVisible()
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
      if (taille.width < 1024) {
        const presets = page.getByRole('button', { name: '30 jours', exact: true })
        await expect(presets).toHaveCount(2)
        for (const preset of await presets.all()) {
          await expect(preset).toHaveCSS('min-height', '44px')
        }
      }
      const deborde = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(deborde).toBe(false)
    })
  }
})
