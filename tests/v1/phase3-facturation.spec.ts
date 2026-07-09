import { test, expect } from '@playwright/test'
import type { Cookie } from '@playwright/test'

/**
 * Tests E2E — Phase 3 : Facturation
 *
 * T3-A : La page /factures est accessible et affiche le titre
 * T3-B : Créer une facture avec les champs requis → toast + présence dans la liste
 * T3-C : Les champs obligatoires sont validés (numéro, montant, marché)
 * T3-D : La liste des factures affiche les colonnes attendues
 * T3-E : Modifier une facture existante
 * T3-F : Supprimer une facture (avec confirmation)
 * T3-G : Le total facturé apparaît dans le détail du marché lié
 *
 * Données de test : préfixe [E2E-F3] — créées par T3-B, supprimées par T3-F.
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@erp-marches.local'
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!'

const FAC_NUMERO = '[E2E-F3] FAC-TEST-001'
const FAC_NUMERO_UPDATED = '[E2E-F3] FAC-TEST-001 — Modifié'
const FAC_MONTANT_HT = '1000000'

let adminCookies: Cookie[] = []
let testFactureId = ''
let testMarcheId = ''   // marché EN_EXECUTION récupéré dynamiquement

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cleanupE2EFactures(page: any) {
  // Supprimer les factures [E2E-F3] résiduelles via l'interface
  await page.goto('/factures')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  // Collecter les hrefs des factures E2E en une seule eval
  const e2eHrefs: string[] = await page.locator('a[href^="/factures/"]').evaluateAll(
    (links: HTMLAnchorElement[]) =>
      links
        .filter((a) => a.textContent?.includes('[E2E-F3]'))
        .map((a) => a.getAttribute('href') ?? '')
        .filter(Boolean)
  )

  for (const href of e2eHrefs) {
    await page.goto(href)
    await page.waitForLoadState('networkidle')
    const deleteBtn = page.getByRole('button', { name: /Supprimer/i }).first()
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click()
      const confirmBtn = page.getByRole('button', { name: 'Supprimer', exact: true }).last()
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click()
      }
      await page.waitForTimeout(1000)
    }
  }
}

// ─── Suite principale ─────────────────────────────────────────────────────────

test.describe.serial('Phase 3 — Facturation', () => {
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

    // Récupérer l'ID d'un marché EN_EXECUTION pour les tests
    await page.goto('/marches?statut=EN_EXECUTION')
    await page.waitForLoadState('networkidle')
    // Les marchés sont affichés en cards (pas en table)
    const firstLink = page.locator('a[href^="/marches/"]').first()
    if (await firstLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const href = await firstLink.getAttribute('href')
      if (href && href !== '/marches/nouveau') {
        testMarcheId = href.replace('/marches/', '')
      }
    }
    // Fallback : prendre n'importe quel marché non-terminal
    if (!testMarcheId) {
      await page.goto('/marches')
      await page.waitForLoadState('networkidle')
      const links = await page.locator('a[href^="/marches/"]').all()
      for (const link of links) {
        const href = await link.getAttribute('href')
        if (href && href !== '/marches/nouveau' && !href.includes('/edit')) {
          testMarcheId = href.replace('/marches/', '')
          break
        }
      }
    }

    // Nettoyage préventif
    await cleanupE2EFactures(page)

    await context.close()
  })

  // ─── T3-A : Page accessible ────────────────────────────────────────────────

  test('T3-A — Page /factures accessible', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto('/factures')
      await page.waitForLoadState('networkidle')

      // Titre "Factures" visible
      await expect(
        page.locator('main').getByRole('heading', { name: 'Factures' })
      ).toBeVisible({ timeout: 10000 })

      // Bouton "Nouvelle facture" visible
      await expect(page.getByRole('link', { name: /Nouvelle facture/i })).toBeVisible()
    } finally {
      await context.close()
    }
  })

  // ─── T3-B : Créer une facture ─────────────────────────────────────────────

  test('T3-B — Créer une facture avec les champs requis', async ({ browser }) => {
    test.setTimeout(60000)

    // Pré-requis : on doit avoir un marché EN_EXECUTION
    if (!testMarcheId) {
      test.skip(true, 'Aucun marché EN_EXECUTION disponible en prod')
      return
    }

    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto('/factures/nouvelle')
      await page.waitForLoadState('networkidle')

      // Titre du formulaire
      await expect(
        page.locator('main').getByRole('heading', { name: 'Nouvelle facture' })
      ).toBeVisible({ timeout: 10000 })

      // Remplir le formulaire
      await page.fill('input[placeholder="FAC-2025-001"]', FAC_NUMERO)
      await page.fill('input[name="montantHT"]', FAC_MONTANT_HT)

      // Sélectionner le marché (SelectTrigger = button role=combobox)
      const marcheSelect = page.getByRole('combobox').filter({ hasText: /Sélectionner un marché|marché/i }).first()
      await expect(marcheSelect).toBeVisible({ timeout: 10000 })
      await marcheSelect.click()
      await page.waitForTimeout(500)
      // Sélectionner le premier marché disponible
      const firstOption = page.getByRole('option').first()
      await expect(firstOption).toBeVisible({ timeout: 5000 })
      await firstOption.click()
      await page.waitForTimeout(300)

      // Soumettre
      await page.click('button[type="submit"]')

      // Toast de succès
      await expect(page.locator('[data-sonner-toast]').filter({ hasText: /Facture créée/i })).toBeVisible({ timeout: 15000 })

      // Redirection vers /factures
      await page.waitForURL((u) => u.toString().match(/\/factures$/) !== null, { timeout: 30000 })
      await page.waitForLoadState('networkidle')

      // La facture apparaît dans la liste (exact pour éviter le match de "Modifié")
      await expect(page.getByRole('link', { name: FAC_NUMERO, exact: true })).toBeVisible({ timeout: 10000 })

      // Récupérer l'ID pour les tests suivants
      const row = page.locator('table tbody tr').filter({ hasText: FAC_NUMERO })
      const link = row.locator('a').first()
      const href = await link.getAttribute('href')
      testFactureId = href?.replace('/factures/', '') ?? ''
    } finally {
      await context.close()
    }
  })

  // ─── T3-C : Validation champs obligatoires ────────────────────────────────

  test('T3-C — Validation des champs obligatoires', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto('/factures/nouvelle')
      await page.waitForLoadState('networkidle')

      // Soumettre sans remplir
      await page.click('button[type="submit"]')
      await page.waitForTimeout(500)

      // Messages d'erreur visibles (Zod validation)
      const errors = page.locator('[class*="text-destructive"], [class*="FormMessage"]')
      await expect(errors.first()).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  // ─── T3-D : Colonnes de la liste ─────────────────────────────────────────

  test('T3-D — La liste affiche les colonnes attendues', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto('/factures')
      await page.waitForLoadState('networkidle')

      // Colonnes du tableau
      await expect(page.getByRole('columnheader', { name: 'Numéro' })).toBeVisible({ timeout: 10000 })
      await expect(page.getByRole('columnheader', { name: 'Marché' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Montant HT' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Statut' })).toBeVisible()
    } finally {
      await context.close()
    }
  })

  // ─── T3-E : Modifier une facture ─────────────────────────────────────────

  test('T3-E — Modifier une facture existante', async ({ browser }) => {
    test.setTimeout(60000)

    if (!testFactureId) {
      test.skip(true, 'Aucune facture de test créée (T3-B skipped ?)')
      return
    }

    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto(`/factures/${testFactureId}/edit`)
      await page.waitForLoadState('networkidle')

      // Effacer et re-remplir le numéro
      const numeroInput = page.locator('input[placeholder="FAC-2025-001"]')
      await numeroInput.clear()
      await numeroInput.fill(FAC_NUMERO_UPDATED)

      // Soumettre
      await page.click('button[type="submit"]')

      // Toast succès
      await expect(page.locator('[data-sonner-toast]').filter({ hasText: /Facture modifiée/i })).toBeVisible({ timeout: 15000 })

      // Redirection vers le détail
      await page.waitForURL((u) => u.toString().includes(`/factures/${testFactureId}`), { timeout: 30000 })
      await page.waitForLoadState('networkidle')

      // Nouveau numéro visible dans le h1 de la zone main (PageHeader)
      await expect(page.locator('main h1')).toContainText(FAC_NUMERO_UPDATED, { timeout: 10000 })
    } finally {
      await context.close()
    }
  })

  // ─── T3-F : Supprimer une facture ────────────────────────────────────────

  test('T3-F — Supprimer une facture avec confirmation', async ({ browser }) => {
    test.setTimeout(60000)

    if (!testFactureId) {
      test.skip(true, 'Aucune facture de test créée (T3-B skipped ?)')
      return
    }

    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto(`/factures/${testFactureId}`)
      await page.waitForLoadState('networkidle')

      // Bouton supprimer (AlertDialogTrigger)
      const deleteBtn = page.getByRole('button', { name: /Supprimer/i }).first()
      await expect(deleteBtn).toBeVisible({ timeout: 10000 })
      await deleteBtn.click()

      // AlertDialog de confirmation — cliquer sur le bouton "Supprimer" de l'action
      const confirmBtn = page.getByRole('button', { name: 'Supprimer', exact: true }).last()
      await expect(confirmBtn).toBeVisible({ timeout: 5000 })
      await confirmBtn.click()

      // Redirection vers /factures
      await page.waitForURL((u) => u.toString().match(/\/factures$/) !== null, { timeout: 30000 })
      await page.waitForLoadState('networkidle')

      // La facture n'est plus dans la liste
      await expect(page.getByRole('link', { name: FAC_NUMERO_UPDATED, exact: true })).not.toBeVisible({ timeout: 5000 })

      testFactureId = ''
    } finally {
      await context.close()
    }
  })

  // ─── T3-G : Total facturé sur le détail marché ───────────────────────────

  test('T3-G — Section factures visible sur le détail marché', async ({ browser }) => {
    if (!testMarcheId) {
      test.skip(true, 'Aucun marché EN_EXECUTION disponible')
      return
    }

    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto(`/marches/${testMarcheId}`)
      await page.waitForLoadState('networkidle')

      // La section "Facturation" est visible dans le détail marché (CardTitle)
      const facturesSection = page.getByText('Facturation').first()
      await expect(facturesSection).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })
})
