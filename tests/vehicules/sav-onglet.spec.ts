import { test, expect, type Page } from '@playwright/test'
import { login, TEST_USERS } from '../helpers/auth'

/**
 * Livraison 2 de la simplification — la vue SAV est l'onglet « SAV » de /vehicules.
 *  - /vehicules/sav redirige vers /vehicules?onglet=sav ;
 *  - un seul <h1> « Véhicules », onglet actif marqué par aria-current ;
 *  - les filtres du Parc ne fuient pas dans le lien de l'onglet SAV ;
 *  - un VISITEUR voit la vue SAV sans export ni « Nouveau véhicule » ;
 *  - l'entrée « SAV » a quitté le menu ;
 *  - pas de débordement horizontal à 375 px.
 *
 * Une seule connexion par rôle (le login traverse le rendu complet du dashboard,
 * lent en E2E) : mode serial et page partagée, comme tests/layout/a11y-shell.spec.ts.
 */

const NAV = 'nav[aria-label="Navigation principale"]'
const ONGLETS = 'nav[aria-label="Sections de la page Véhicules"]'

test.describe.configure({ mode: 'serial' })

async function ouvrir(page: Page, chemin: string) {
  await page.goto(chemin)
  await page.waitForLoadState('networkidle')
}

test.describe('Véhicules — onglet SAV (ADMIN)', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page, TEST_USERS.admin)
    await page.waitForLoadState('networkidle')
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('/vehicules/sav redirige vers l’onglet SAV', async () => {
    await ouvrir(page, '/vehicules/sav')

    await expect(page).toHaveURL(/\/vehicules\?onglet=sav$/)
    await expect(page.locator(ONGLETS).getByRole('link', { name: 'SAV' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByText('Total interventions')).toBeVisible()
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText('Véhicules')
    await expect(page.getByRole('link', { name: /nouveau véhicule/i })).toHaveCount(0)
  })

  test('/vehicules affiche le Parc', async () => {
    await ouvrir(page, '/vehicules')

    await expect(page.locator(ONGLETS).getByRole('link', { name: 'Parc' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByText('Total interventions')).toHaveCount(0)
    await expect(page.getByRole('link', { name: /nouveau véhicule/i })).toBeVisible()
  })

  test('un onglet inconnu affiche le Parc', async () => {
    await ouvrir(page, '/vehicules?onglet=inconnu')

    await expect(page.locator(ONGLETS).getByRole('link', { name: 'Parc' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByText('Total interventions')).toHaveCount(0)
  })

  test('les liens d’onglet ne reprennent pas les filtres du Parc', async () => {
    await ouvrir(page, '/vehicules?statut=LIVRE&page=2')

    const onglets = page.locator(ONGLETS)
    await expect(onglets.getByRole('link', { name: 'SAV' })).toHaveAttribute('href', '/vehicules?onglet=sav')
    await expect(onglets.getByRole('link', { name: 'Parc' })).toHaveAttribute('href', '/vehicules')
  })

  test('le menu n’a plus d’entrée SAV', async () => {
    await ouvrir(page, '/vehicules')

    await expect(page.locator(`${NAV} a[href="/vehicules/sav"]`)).toHaveCount(0)
  })

  test('l’onglet SAV ne déborde pas à 375 px', async () => {
    await page.setViewportSize({ width: 375, height: 667 })
    await ouvrir(page, '/vehicules?onglet=sav')

    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(
      scrollWidth,
      `Débordement horizontal sur l'onglet SAV à 375 px : scrollWidth=${scrollWidth} > innerWidth=${innerWidth}`
    ).toBeLessThanOrEqual(innerWidth)
  })
})

test.describe('Véhicules — onglet SAV (VISITEUR)', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page, TEST_USERS.visiteur)
    await page.waitForLoadState('networkidle')
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('voit la vue SAV, sans export ni création de véhicule', async () => {
    await ouvrir(page, '/vehicules?onglet=sav')

    await expect(page.getByText('Total interventions')).toBeVisible()
    await expect(page.getByRole('link', { name: /nouveau véhicule/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /exporter/i })).toHaveCount(0)
  })
})
