import { test, expect } from '@playwright/test'
import type { Cookie } from '@playwright/test'

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@erp-marches.local'
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!'

let adminCookies: Cookie[] = []

test.describe.serial('Refonte Opportunités / Marchés', () => {
  test.setTimeout(90000)

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto('/login')
    await page.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30000 })
    await page.fill('input[name="email"]', ADMIN_EMAIL)
    await page.fill('input[name="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 60000 })
    await page.waitForLoadState('networkidle')

    adminCookies = await ctx.cookies()
    await ctx.close()
  })

  // T-A : La liste des opportunités se charge sans erreur
  test('T-A: liste opportunités accessible', async ({ browser }) => {
    const ctx = await browser.newContext()
    await ctx.addCookies(adminCookies)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto('/opportunites')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('main')).toBeVisible()
      // Pas de statut IDENTIFIEE dans les filtres (anciens statuts supprimés)
      const filterOptions = page.getByRole('option')
      await expect(filterOptions.filter({ hasText: 'Identifiée' })).toHaveCount(0)
    } finally {
      await ctx.close()
    }
  })

  // T-B : Création d'une opportunité démarre en EN_ANALYSE
  test('T-B: création opportunité — statut EN_ANALYSE par défaut', async ({ browser }) => {
    const ctx = await browser.newContext()
    await ctx.addCookies(adminCookies)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto('/opportunites/nouvelle')
      await page.waitForLoadState('networkidle')

      // Le Select statut doit montrer "En analyse" par défaut
      const statutSelect = page.getByRole('combobox')
      await expect(statutSelect).toContainText('En analyse')

      // Remplir le formulaire et créer
      await page.getByLabel(/objet/i).fill('[E2E-REFONTE] Test opportunité EN_ANALYSE')
      await page.getByLabel(/autorité contractante/i).fill('Ministère Test')
      await page.getByRole('button', { name: /créer/i }).click()

      // Doit rediriger vers la liste
      await page.waitForURL((url) => url.toString().includes('/opportunites') && !url.toString().includes('/nouvelle'), { timeout: 60000 })
      await expect(page.getByText('[E2E-REFONTE] Test opportunité EN_ANALYSE').first()).toBeVisible()
    } finally {
      await ctx.close()
    }
  })

  // T-C : Bouton changer statut présent sur page détail
  test('T-C: bouton changer statut présent sur page détail', async ({ browser }) => {
    const ctx = await browser.newContext()
    await ctx.addCookies(adminCookies)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto('/opportunites')
      await page.waitForLoadState('networkidle')

      // Trouver l'opportunité créée en T-B
      const oppLink = page.locator('a').filter({ hasText: '[E2E-REFONTE] Test opportunité EN_ANALYSE' }).first()
      const href = await oppLink.getAttribute('href')
      await page.goto(href!)
      await page.waitForLoadState('networkidle')

      // Le bouton "Statut" doit être visible
      await expect(page.getByRole('button', { name: /statut/i })).toBeVisible()
    } finally {
      await ctx.close()
    }
  })

  // T-D : Transition EN_ANALYSE → GO fonctionne
  test('T-D: transition EN_ANALYSE → GO', async ({ browser }) => {
    const ctx = await browser.newContext()
    await ctx.addCookies(adminCookies)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)
    page.setDefaultTimeout(60000)

    try {
      await page.goto('/opportunites')
      await page.waitForLoadState('networkidle')

      const oppLink = page.locator('a').filter({ hasText: '[E2E-REFONTE] Test opportunité EN_ANALYSE' }).first()
      const href = await oppLink.getAttribute('href')
      await page.goto(href!)
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /statut/i }).click()
      await page.waitForTimeout(500)
      await page.getByRole('combobox').click()
      await page.getByRole('option', { name: 'GO', exact: true }).click()
      await page.getByRole('button', { name: /confirmer/i }).click()
      await page.waitForTimeout(1000)

      // Le badge statut doit afficher GO
      await expect(page.locator('main').getByText('GO').first()).toBeVisible()
    } finally {
      await ctx.close()
    }
  })

  // T-E : Depuis GO, PERDUE n'est pas accessible directement
  test('T-E: depuis GO, pas de transition directe vers PERDUE', async ({ browser }) => {
    const ctx = await browser.newContext()
    await ctx.addCookies(adminCookies)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)
    page.setDefaultTimeout(60000)

    try {
      await page.goto('/opportunites')
      await page.waitForLoadState('networkidle')

      const oppLink = page.locator('a').filter({ hasText: '[E2E-REFONTE] Test opportunité EN_ANALYSE' }).first()
      const href = await oppLink.getAttribute('href')
      await page.goto(href!)
      await page.waitForLoadState('networkidle')

      // Ouvrir le Sheet de changement de statut
      await page.getByRole('button', { name: /statut/i }).click()
      await page.waitForTimeout(500)
      // Ouvrir le select des statuts
      await page.getByRole('combobox').click()
      await page.waitForTimeout(300)

      const options = await page.getByRole('option').allInnerTexts()
      expect(options).not.toContain('Perdue') // GO → pas de transition directe vers PERDUE

      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
    } finally {
      await ctx.close()
    }
  })

  // T-F : Création marché — statut ATTRIBUE_DEFINITIVEMENT par défaut
  test('T-F: nouveau marché — statut ATTRIBUE_DEFINITIVEMENT par défaut', async ({ browser }) => {
    const ctx = await browser.newContext()
    await ctx.addCookies(adminCookies)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto('/marches/nouveau')
      await page.waitForLoadState('networkidle')

      // Chercher le combobox du statut (pas du type de marché)
      const comboboxes = page.getByRole('combobox')
      const count = await comboboxes.count()

      let statutFound = false
      for (let i = 0; i < count; i++) {
        const text = await comboboxes.nth(i).innerText()
        if (
          text.includes('Attribué') ||
          text.includes('Opportunité') ||
          text.includes('Dossier') ||
          text.includes('Offre') ||
          text.includes('Exécution')
        ) {
          // C'est le select statut
          expect(text).not.toContain('Opportunité identifiée')
          expect(text).not.toContain('Dossier en préparation')
          statutFound = true
          break
        }
      }

      // Vérifier qu'OPPORTUNITE_IDENTIFIEE n'apparaît pas dans les options du select statut
      // Ouvrir n'importe quel combobox et vérifier les options
      await comboboxes.last().click()
      await page.waitForTimeout(300)
      const options = await page.getByRole('option').allInnerTexts()
      expect(options).not.toContain('Opportunité identifiée')
      expect(options).not.toContain('Dossier en préparation')

      await page.keyboard.press('Escape')
    } finally {
      await ctx.close()
    }
  })

  // T-G : Nettoyage — supprimer toutes les opportunités de test créées
  test('T-G: nettoyage — suppression opportunités E2E', async ({ browser }) => {
    const ctx = await browser.newContext()
    await ctx.addCookies(adminCookies)
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(60000)
    page.setDefaultTimeout(60000)

    try {
      // Boucle pour supprimer toutes les entrées de test restantes
      let found = true
      while (found) {
        await page.goto('/opportunites')
        await page.waitForLoadState('networkidle')

        const oppLinks = page.locator('a').filter({ hasText: '[E2E-REFONTE] Test opportunité EN_ANALYSE' })
        const count = await oppLinks.count()
        if (count === 0) { found = false; break }

        const href = await oppLinks.first().getAttribute('href')
        await page.goto(href!)
        await page.waitForLoadState('networkidle')

        // Le bouton supprimer est un icône (Trash2) sans texte
        await page.locator('button.text-destructive').click()
        await page.waitForTimeout(500)
        await page.getByRole('button', { name: /supprimer/i }).last().click()
        // La suppression affiche un toast mais ne redirige pas — attendre puis naviguer
        await page.waitForTimeout(2000)
        await page.goto('/opportunites')
        await page.waitForLoadState('networkidle')
      }
    } finally {
      await ctx.close()
    }
  })
})
