import { test, expect } from '@playwright/test'
import type { Cookie } from '@playwright/test'

/**
 * Tests E2E — Phase 4 : Opportunités
 *
 * T4-A : La page /opportunites est accessible et affiche le titre
 * T4-B : Créer une opportunité avec les champs requis → toast + présence dans la liste
 * T4-C : La liste affiche les colonnes attendues du tableau
 * T4-D : Changer le statut d'une opportunité via le formulaire d'édition
 * T4-E : Modifier l'objet d'une opportunité existante
 * T4-F : Supprimer une opportunité avec confirmation AlertDialog
 * T4-G : Filtrer les opportunités par statut via URL
 *
 * Données de test : préfixe [E2E] — créées par T4-B, supprimées par T4-F.
 * Note : T4-C/D/E/F : pas de pipeline kanban dans l'UI — tableau simple.
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@erp-marches.local'
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!'

const OPP_OBJET = '[E2E] Fourniture de véhicules Phase 4'
const OPP_OBJET_UPDATED = '[E2E] Fourniture de véhicules Phase 4 — Modifié'
const OPP_AC = 'Ministère Test E2E Phase 4'

let adminCookies: Cookie[] = []
let testOpportuniteId = ''

// ─── Login unique ─────────────────────────────────────────────────────────────

test.describe.serial('Phase 4 — Opportunités', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(90000)
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

    // Nettoyage préventif : supprimer toute opportunité [E2E] résiduelle
    await cleanupE2EOpportunites(page)

    await context.close()
  })

  // ─── T4-A : Page accessible ──────────────────────────────────────────────────

  test('T4-A — Page /opportunites accessible', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto('/opportunites')
      await page.waitForLoadState('networkidle')

      // Titre "Opportunités" visible (scopé à main pour éviter doublon topbar)
      await expect(page.locator('main').getByRole('heading', { name: 'Opportunités' })).toBeVisible({ timeout: 10000 })

      // Bouton "Nouvelle opportunité" accessible
      await expect(page.getByRole('link', { name: /Nouvelle opportunité/i })).toBeVisible()
    } finally {
      await context.close()
    }
  })

  // ─── T4-B : Créer une opportunité ────────────────────────────────────────────

  test('T4-B — Créer une opportunité avec les champs requis', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto('/opportunites/nouvelle')
      await page.waitForLoadState('networkidle')

      // Remplir les champs obligatoires
      await page.fill('input[placeholder*="véhicules utilitaires"]', OPP_OBJET)
      await page.fill('input[placeholder*="Ministère des Transports"]', OPP_AC)

      // Le statut "Identifiée" est déjà sélectionné par défaut — vérifier
      await expect(page.locator('[role="combobox"]').first()).toContainText(/Identifiée/, { timeout: 5000 })

      // Soumettre le formulaire
      await page.click('button[type="submit"]')

      // Toast de succès
      await expect(page.getByText('Opportunité créée')).toBeVisible({ timeout: 15000 })

      // Redirection vers /opportunites
      await page.waitForURL(/\/opportunites$/, { timeout: 15000 })
      await page.waitForLoadState('networkidle')

      // L'opportunité apparaît dans la liste
      const newRow = page.getByRole('row').filter({ hasText: OPP_OBJET })
      await expect(newRow).toBeVisible({ timeout: 10000 })

      // Récupérer l'ID depuis le lien d'édition dans la ligne
      const editLink = newRow.locator('a[href*="/edit"]')
      const editHref = await editLink.getAttribute('href', { timeout: 5000 })
      testOpportuniteId = editHref?.split('/opportunites/')[1]?.replace('/edit', '') ?? ''
      expect(testOpportuniteId).toBeTruthy()
    } finally {
      await context.close()
    }
  })

  // ─── T4-C : Colonnes du tableau ──────────────────────────────────────────────

  test('T4-C — La liste affiche les colonnes attendues du tableau', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto('/opportunites')
      await page.waitForLoadState('networkidle')

      // Colonnes attendues dans le tableau
      const headers = page.locator('th')
      await expect(headers.filter({ hasText: 'Objet' })).toBeVisible({ timeout: 10000 })
      await expect(headers.filter({ hasText: 'Autorité contractante' })).toBeVisible()
      await expect(headers.filter({ hasText: 'Statut' })).toBeVisible()
      await expect(headers.filter({ hasText: 'Date limite' })).toBeVisible()
      await expect(headers.filter({ hasText: 'Montant estimé' })).toBeVisible()
      await expect(headers.filter({ hasText: 'Probabilité' })).toBeVisible()
    } finally {
      await context.close()
    }
  })

  // ─── T4-D : Changer le statut ────────────────────────────────────────────────

  test('T4-D — Changer le statut d\'une opportunité via le formulaire', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      expect(testOpportuniteId).toBeTruthy()
      await page.goto(`/opportunites/${testOpportuniteId}/edit`)
      await page.waitForLoadState('networkidle')

      // Changer le statut vers "En analyse"
      const statutSelect = page.locator('[role="combobox"]').first()
      await statutSelect.click()
      await page.getByRole('option', { name: 'En analyse', exact: true }).click()

      // Soumettre
      await page.click('button[type="submit"]')
      await expect(page.getByText('Opportunité mise à jour')).toBeVisible({ timeout: 15000 })

      // Retour sur la liste — le badge "En analyse" est visible dans la ligne
      await page.waitForURL(/\/opportunites$/, { timeout: 15000 })
      await page.waitForLoadState('networkidle')

      const updatedRow = page.getByRole('row').filter({ hasText: OPP_OBJET })
      await expect(updatedRow.getByText('En analyse')).toBeVisible({ timeout: 10000 })
    } finally {
      await context.close()
    }
  })

  // ─── T4-E : Modifier une opportunité ─────────────────────────────────────────

  test('T4-E — Modifier l\'objet d\'une opportunité existante', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      expect(testOpportuniteId).toBeTruthy()
      await page.goto(`/opportunites/${testOpportuniteId}/edit`)
      await page.waitForLoadState('networkidle')

      // Modifier l'objet
      const objetInput = page.getByPlaceholder(/véhicules utilitaires/i)
      await objetInput.clear()
      await objetInput.fill(OPP_OBJET_UPDATED)

      // Soumettre
      await page.click('button[type="submit"]')
      await expect(page.getByText('Opportunité mise à jour')).toBeVisible({ timeout: 15000 })

      // Retour sur la liste — le nouvel objet est visible
      await page.waitForURL(/\/opportunites$/, { timeout: 15000 })
      await page.waitForLoadState('networkidle')

      await expect(
        page.getByRole('row').filter({ hasText: OPP_OBJET_UPDATED })
      ).toBeVisible({ timeout: 10000 })
    } finally {
      await context.close()
    }
  })

  // ─── T4-F : Supprimer une opportunité ────────────────────────────────────────

  test('T4-F — Supprimer une opportunité avec confirmation AlertDialog', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto('/opportunites')
      await page.waitForLoadState('networkidle')

      // Trouver la ligne de l'opportunité [E2E]
      const row = page.getByRole('row').filter({ hasText: OPP_OBJET_UPDATED })
      await expect(row).toBeVisible({ timeout: 10000 })

      // Cliquer sur le bouton de suppression (icône Trash2)
      await row.locator('button:has(svg.lucide-trash-2), button[class*="destructive"]').click()

      // AlertDialog s'ouvre
      await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Supprimer l\'opportunité')).toBeVisible()

      // Confirmer la suppression
      await page.getByRole('button', { name: 'Supprimer' }).click()

      // Toast de succès
      await expect(page.getByText('Opportunité supprimée')).toBeVisible({ timeout: 15000 })

      // La ligne disparaît de la liste
      await expect(row).not.toBeVisible({ timeout: 10000 })
    } finally {
      await context.close()
    }
  })

  // ─── T4-G : Filtre par statut ─────────────────────────────────────────────────

  test('T4-G — Filtrer les opportunités par statut via URL', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      // Naviguer avec le filtre statut=IDENTIFIEE
      await page.goto('/opportunites?statut=IDENTIFIEE')
      await page.waitForLoadState('networkidle')

      // La page est accessible (scopé à main pour éviter doublon topbar)
      await expect(page.locator('main').getByRole('heading', { name: 'Opportunités' })).toBeVisible({ timeout: 10000 })

      // Si des résultats sont visibles, ils ont tous le statut "Identifiée"
      const rows = page.getByRole('row').filter({ hasText: /Identifiée|En analyse|GO|No Go|Soumise|Gagnée|Perdue/ })
      const count = await rows.count()

      if (count > 0) {
        // Vérifier que tous les badges visibles montrent "Identifiée"
        const nonIdentifiee = page.getByRole('cell').filter({ hasText: /^(En analyse|GO|No Go|Soumise|Gagnée|Perdue)$/ })
        await expect(nonIdentifiee).toHaveCount(0)
      }
      // Si 0 résultats, le filtre fonctionne (aucun "Identifiée" en prod) → OK
    } finally {
      await context.close()
    }
  })
})

// ─── Helper nettoyage ────────────────────────────────────────────────────────

async function cleanupE2EOpportunites(page: import('@playwright/test').Page) {
  await page.goto('/opportunites')
  await page.waitForLoadState('networkidle')

  // Chercher toutes les lignes avec le préfixe [E2E]
  const e2eRows = page.getByRole('row').filter({ hasText: '[E2E]' })
  let count = await e2eRows.count()

  while (count > 0) {
    const row = e2eRows.first()
    // Cliquer sur le bouton supprimer
    const deleteBtn = row.locator('button').filter({ has: page.locator('svg') }).last()
    await deleteBtn.click({ force: true })

    // Confirmer l'AlertDialog si ouvert
    const dialog = page.getByRole('alertdialog')
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByRole('button', { name: 'Supprimer' }).click()
      await page.waitForTimeout(1000)
    }

    count = await e2eRows.count()
  }
}
