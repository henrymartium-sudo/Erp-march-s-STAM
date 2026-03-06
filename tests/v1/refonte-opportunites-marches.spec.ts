import { test, expect, BrowserContext, Browser } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const ADMIN_EMAIL = 'admin@erp-marches.local'
const ADMIN_PASSWORD = 'Admin123!'

let adminCookies: { name: string; value: string; domain: string; path: string }[] = []

test.describe.serial('Refonte Opportunités / Marchés', () => {
  test.setTimeout(90000)

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/login`)
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL)
    await page.getByLabel(/mot de passe/i).fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: /connexion/i }).click()
    await page.waitForURL(`${BASE_URL}/`)

    adminCookies = (await ctx.cookies()).map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
    }))
    await ctx.close()
  })

  async function newCtx(browser: Browser): Promise<BrowserContext> {
    const ctx = await browser.newContext()
    await ctx.addCookies(adminCookies.map((c) => ({ ...c, domain: new URL(BASE_URL).hostname })))
    return ctx
  }

  // T-A : La liste des opportunités se charge sans erreur
  test('T-A: liste opportunités accessible', async ({ browser }) => {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/opportunites`)
    await expect(page.locator('main')).toBeVisible()
    // Pas de statut IDENTIFIEE dans les filtres (anciens statuts supprimés du formulaire)
    const filterOptions = page.getByRole('option')
    await expect(filterOptions.filter({ hasText: 'Identifiée' })).toHaveCount(0)

    await ctx.close()
  })

  // T-B : Création d'une opportunité démarre en EN_ANALYSE
  test('T-B: création opportunité — statut EN_ANALYSE par défaut', async ({ browser }) => {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/opportunites/nouvelle`)
    // Le Select statut doit montrer "En analyse" par défaut
    const statutSelect = page.getByRole('combobox')
    await expect(statutSelect).toContainText('En analyse')

    // Remplir le formulaire et créer
    await page.getByLabel(/objet/i).fill('[E2E-REFONTE] Test opportunité EN_ANALYSE')
    await page.getByLabel(/autorité contractante/i).fill('Ministère Test')
    await page.getByRole('button', { name: /créer/i }).click()

    // Doit rediriger vers la liste
    await page.waitForURL(`${BASE_URL}/opportunites`)
    await expect(page.getByText('[E2E-REFONTE] Test opportunité EN_ANALYSE')).toBeVisible()

    await ctx.close()
  })

  // T-C : Bouton changer statut présent sur page détail
  test('T-C: bouton changer statut présent sur page détail', async ({ browser }) => {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/opportunites`)

    // Trouver l'opportunité créée en T-B
    const oppLink = page.locator('a').filter({ hasText: '[E2E-REFONTE] Test opportunité EN_ANALYSE' }).first()
    const href = await oppLink.getAttribute('href')
    await page.goto(`${BASE_URL}${href}`)

    // Le bouton "Statut" doit être visible
    await expect(page.getByRole('button', { name: /statut/i })).toBeVisible()

    await ctx.close()
  })

  // T-D : Transition EN_ANALYSE → GO fonctionne
  test('T-D: transition EN_ANALYSE → GO', async ({ browser }) => {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/opportunites`)
    const oppLink = page.locator('a').filter({ hasText: '[E2E-REFONTE] Test opportunité EN_ANALYSE' }).first()
    const href = await oppLink.getAttribute('href')
    await page.goto(`${BASE_URL}${href}`)

    await page.getByRole('button', { name: /statut/i }).click()
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'GO', exact: true }).click()
    await page.getByRole('button', { name: /confirmer/i }).click()

    // Le badge statut doit afficher GO
    await expect(page.locator('main').getByText('GO').first()).toBeVisible()

    await ctx.close()
  })

  // T-E : Depuis GO, PERDUE n'est pas accessible directement
  test('T-E: depuis GO, pas de transition directe vers PERDUE', async ({ browser }) => {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/opportunites`)
    const oppLink = page.locator('a').filter({ hasText: '[E2E-REFONTE] Test opportunité EN_ANALYSE' }).first()
    const href = await oppLink.getAttribute('href')
    await page.goto(`${BASE_URL}${href}`)

    // L'opportunité est en GO, PERDUE ne devrait pas être dans les options
    await page.getByRole('button', { name: /statut/i }).click()
    // Ouvrir le select des statuts
    await page.getByRole('combobox').click()
    const options = await page.getByRole('option').allInnerTexts()
    expect(options).not.toContain('Perdue') // GO → pas de transition directe vers PERDUE

    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await ctx.close()
  })

  // T-F : Création marché — statut ATTRIBUE_DEFINITIVEMENT par défaut
  test('T-F: nouveau marché — statut ATTRIBUE_DEFINITIVEMENT par défaut', async ({ browser }) => {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/marches/nouveau`)
    // Le premier combobox est le type de marché, le second est le statut
    const comboboxes = page.getByRole('combobox')
    // Trouver le select statut — celui qui ne contient pas les types
    const statutTrigger = comboboxes.filter({ hasNotText: /fournitures|travaux|services/i }).first()
    const statutText = await statutTrigger.innerText()
    expect(statutText).not.toContain('Opportunité identifiée')
    expect(statutText).not.toContain('Dossier en préparation')
    // Doit contenir Attribué définitivement
    expect(statutText).toContain('Attribué définitivement')

    await ctx.close()
  })

  // T-G : Nettoyage — supprimer l'opportunité créée en T-B
  test('T-G: nettoyage — suppression opportunité E2E', async ({ browser }) => {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto(`${BASE_URL}/opportunites`)
    const oppLink = page.locator('a').filter({ hasText: '[E2E-REFONTE] Test opportunité EN_ANALYSE' }).first()
    const href = await oppLink.getAttribute('href')
    await page.goto(`${BASE_URL}${href}`)

    // Cliquer sur Supprimer
    await page.getByRole('button', { name: /supprimer/i }).click()
    await page.getByRole('button', { name: /confirmer/i }).click()
    await page.waitForURL(`${BASE_URL}/opportunites`)

    await ctx.close()
  })
})
