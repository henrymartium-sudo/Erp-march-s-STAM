import { test, expect } from '@playwright/test'
import type { Cookie } from '@playwright/test'

/**
 * Tests E2E — Phase 2 : Filtres Avancés
 *
 * T2-A : Le bouton "Avancé" est visible et ouvre le popover avec les champs
 * T2-B : Filtrer par statut retourne uniquement les marchés avec ce statut
 * T2-C : Filtrer par type retourne uniquement les marchés avec ce type
 * T2-D : Sauvegarder un filtre — persisté après rechargement de la page
 * T2-E : Supprimer un filtre sauvegardé
 * T2-F : Réinitialiser les filtres remet la liste à son état initial
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@erp-marches.local'
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!'
const SAVED_FILTER_NAME = '[E2E] Filtre Phase 2'

let adminCookies: Cookie[] = []

// ─── Login unique ─────────────────────────────────────────────────────────────

test.describe.serial('Phase 2 — Filtres Avancés', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(90000) // login prod peut prendre du temps
    const context = await browser.newContext()
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    await page.goto('/login')
    await page.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30000 })
    await page.fill('input[name="email"]', ADMIN_EMAIL)
    await page.fill('input[name="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 60000 })
    await page.waitForLoadState('networkidle')

    adminCookies = await context.cookies()
    await context.close()
  })

  // ─── T2-A : Bouton Avancé + popover ────────────────────────────────────────

  test('T2-A — Bouton "Avancé" visible et popover accessible', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()

    try {
      await page.goto('/marches')
      await page.waitForLoadState('networkidle')

      // Bouton Avancé visible
      const btnAvance = page.getByRole('button', { name: /Avancé/i })
      await expect(btnAvance).toBeVisible({ timeout: 10000 })

      // Cliquer ouvre le popover
      await btnAvance.click()
      await expect(page.getByText('Filtres avancés')).toBeVisible({ timeout: 5000 })

      // Champs montant présents
      await expect(page.getByPlaceholder('Min')).toBeVisible()
      await expect(page.getByPlaceholder('Max')).toBeVisible()

      // Champs date présents
      await expect(page.locator('input[type="date"]').first()).toBeVisible()
    } finally {
      await context.close()
    }
  })

  // ─── T2-B : Filtre par statut ───────────────────────────────────────────────

  test('T2-B — Filtrer par statut "En exécution"', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()

    try {
      await page.goto('/marches')
      await page.waitForLoadState('networkidle')

      // Ouvrir le Select statut (premier combobox de la barre de filtres)
      const statutTrigger = page.locator('[role="combobox"]').first()
      await statutTrigger.click()
      await page.getByRole('option', { name: 'En exécution', exact: true }).click()
      await page.waitForLoadState('networkidle')

      // URL contient le paramètre statut
      await expect(page).toHaveURL(/statut=EN_EXECUTION/, { timeout: 10000 })

      // Chip de filtre actif visible
      await expect(page.getByText(/Statut\s*:\s*En exécution/)).toBeVisible({ timeout: 10000 })

      // Compteur scoped dans la barre de filtres affiche "résultats"
      const counter = page.locator('p').filter({ hasText: /résultat/ }).first()
      await expect(counter).toBeVisible({ timeout: 10000 })

      // Au moins une carte montre "En exécution"
      await expect(page.getByText('En exécution').first()).toBeVisible()
    } finally {
      await context.close()
    }
  })

  // ─── T2-C : Filtre par type ─────────────────────────────────────────────────

  test('T2-C — Filtrer par type "Fournitures"', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()

    try {
      await page.goto('/marches')
      await page.waitForLoadState('networkidle')

      // Ouvrir le Select type (second combobox de la barre de filtres)
      const typeTrigger = page.locator('[role="combobox"]').nth(1)
      await typeTrigger.click()
      await page.getByRole('option', { name: 'Fournitures', exact: true }).click()
      await page.waitForLoadState('networkidle')

      // URL contient le paramètre type
      await expect(page).toHaveURL(/type=FOURNITURES/, { timeout: 10000 })

      // Chip de filtre actif visible
      await expect(page.getByText(/Type\s*:\s*Fournitures/)).toBeVisible({ timeout: 10000 })

      // Au moins un résultat retourné
      const counter = page.locator('p.text-xs.text-muted-foreground').last()
      const counterText = await counter.textContent()
      expect(counterText).toBeTruthy()
      expect(counterText).not.toContain('Aucun marché')
    } finally {
      await context.close()
    }
  })

  // ─── T2-D : Sauvegarder un filtre ──────────────────────────────────────────

  test('T2-D — Sauvegarder un filtre et le retrouver après rechargement', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()

    try {
      await page.goto('/marches')
      await page.waitForLoadState('networkidle')

      // Activer le filtre statut EN_EXECUTION
      const statutTrigger = page.locator('[role="combobox"]').first()
      await statutTrigger.click()
      await page.getByRole('option', { name: 'En exécution', exact: true }).click()
      await page.waitForLoadState('networkidle')

      // Ouvrir le popover avancé → bouton Sauvegarder
      await page.getByRole('button', { name: /Avancé/i }).click()
      await expect(page.getByText('Filtres avancés')).toBeVisible({ timeout: 5000 })
      await page.getByRole('button', { name: 'Sauvegarder' }).click()

      // Dialog de sauvegarde s'ouvre
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Sauvegarder ce filtre')).toBeVisible()

      // Saisir le nom du filtre
      await page.locator('input#filter-name').fill(SAVED_FILTER_NAME)
      await page.getByRole('dialog').getByRole('button', { name: 'Sauvegarder' }).click()

      // Toast de succès
      await expect(page.getByText(new RegExp(SAVED_FILTER_NAME.replace(/[[\]]/g, '\\$&'), 'i'))).toBeVisible({ timeout: 10000 })

      // Recharger la page — le filtre est persisté en base
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Le bouton "Sauvegardés" apparaît
      const btnSauvegardes = page.getByRole('button', { name: /Sauvegardés/i })
      await expect(btnSauvegardes).toBeVisible({ timeout: 10000 })

      // Ouvrir le popover — le filtre nommé est dans la liste
      await btnSauvegardes.click()
      await expect(page.getByText(SAVED_FILTER_NAME)).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  // ─── T2-E : Supprimer un filtre sauvegardé ─────────────────────────────────

  test('T2-E — Supprimer un filtre sauvegardé', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()

    try {
      await page.goto('/marches')
      await page.waitForLoadState('networkidle')

      // Le bouton Sauvegardés doit être visible (filtre créé en T2-D)
      const btnSauvegardes = page.getByRole('button', { name: /Sauvegardés/i })
      await expect(btnSauvegardes).toBeVisible({ timeout: 10000 })
      await btnSauvegardes.click()

      // Le filtre E2E est présent dans la liste
      const filterItem = page.getByText(SAVED_FILTER_NAME, { exact: true })
      await expect(filterItem).toBeVisible({ timeout: 5000 })

      // Hover sur la ligne pour révéler le bouton de suppression
      const filterRow = page.locator('div').filter({ hasText: SAVED_FILTER_NAME }).last()
      await filterRow.hover()

      // Cliquer sur le bouton de suppression (dernier bouton dans la ligne)
      await filterRow.locator('button').last().click({ force: true })

      // Toast de succès "supprimé"
      await expect(page.getByText(/supprimé/i)).toBeVisible({ timeout: 10000 })

      // Après rechargement : filtre absent de la liste
      await page.reload()
      await page.waitForLoadState('networkidle')

      const btnAfter = page.getByRole('button', { name: /Sauvegardés/i })
      const stillVisible = await btnAfter.isVisible()

      if (stillVisible) {
        await btnAfter.click()
        await expect(page.getByText(SAVED_FILTER_NAME)).not.toBeVisible()
      }
      // Si le bouton n'apparaît plus, c'était le seul filtre → suppression confirmée
    } finally {
      await context.close()
    }
  })

  // ─── T2-F : Réinitialiser les filtres ──────────────────────────────────────

  test('T2-F — Réinitialiser les filtres remet la liste à son état initial', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()

    try {
      // Naviguer avec filtres actifs via URL directe
      await page.goto('/marches?statut=EN_EXECUTION&type=FOURNITURES')
      await page.waitForLoadState('networkidle')

      // Chips de filtres visibles
      await expect(page.getByText(/Statut\s*:\s*En exécution/)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/Type\s*:\s*Fournitures/)).toBeVisible({ timeout: 5000 })

      // Cliquer "Effacer" (bouton de reset global)
      await page.getByRole('button', { name: /Effacer/i }).click()
      await page.waitForLoadState('networkidle')

      // URL revenue à /marches sans paramètres de filtre
      await expect(page).toHaveURL(/\/marches$/, { timeout: 10000 })

      // Plus de chips de filtres actifs
      await expect(page.getByText(/Statut\s*:/)).not.toBeVisible()
      await expect(page.getByText(/Type\s*:/)).not.toBeVisible()

      // Compteur affiche le total sans restriction
      const counter = page.locator('p').filter({ hasText: /marchés au total/ }).first()
      await expect(counter).toBeVisible({ timeout: 10000 })
    } finally {
      await context.close()
    }
  })
})
