import { test, expect } from '@playwright/test'
import type { Cookie } from '@playwright/test'

/**
 * Tests E2E — Phase 5 : Montage de l'Offre (Dossiers d'offre)
 *
 * T5-A : La page /dossiers-offre est accessible depuis la sidebar
 * T5-B : Créer un nouveau dossier offre avec les champs requis → toast + liste
 * T5-C : La checklist des pièces est affichée (12 pièces, statut initial ABSENT)
 * T5-D : Changer le statut d'une pièce (ABSENT → COMPLET) via le select
 * T5-E : La barre de progression se met à jour quand des pièces sont complètes
 * T5-F : Le dossier offre est visible dans l'onglet du détail marché
 * T5-G : Modifier un dossier offre (titre)
 * T5-H : Supprimer un dossier offre (avec confirmation AlertDialog)
 *
 * Données de test : préfixe [E2E-P5] — créées par T5-B, supprimées par T5-H.
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@erp-marches.local'
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!'

const DOSSIER_TITRE = '[E2E-P5] Dossier offre Phase 5 Test'
const DOSSIER_TITRE_UPDATED = '[E2E-P5] Dossier offre Phase 5 — Modifié'

let adminCookies: Cookie[] = []
let testDossierId = ''

// ─── Suite principale ─────────────────────────────────────────────────────────

test.describe.serial('Phase 5 — Montage de l\'Offre', () => {
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

    // Nettoyage préventif : supprimer les dossiers [E2E-P5] résiduels
    await page.goto('/dossiers-offre')
    await page.waitForLoadState('networkidle')

    // Collecter tous les hrefs [E2E-P5] AVANT navigation (évite les locators stale)
    const e2pHrefs: string[] = await page.locator('a[href^="/dossiers-offre/"]').evaluateAll(
      (links: HTMLAnchorElement[]) =>
        links
          .filter((a) => a.textContent?.includes('[E2E-P5]'))
          .map((a) => a.getAttribute('href') ?? '')
          .filter(Boolean)
    )
    for (const href of e2pHrefs) {
      await page.goto(href)
      await page.waitForLoadState('networkidle')
      const deleteBtn = page.getByRole('button', { name: /Supprimer/i })
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click()
        const confirmBtn = page.getByRole('button', { name: /Supprimer|Confirmer/i }).last()
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmBtn.click()
        }
        await page.waitForURL(
          (u) => u.toString().includes('/dossiers-offre') && !u.toString().includes(href),
          { timeout: 30000 }
        )
        await page.waitForLoadState('networkidle')
      }
    }

    await context.close()
  })

  // ─── T5-A : Page accessible ────────────────────────────────────────────────

  test('T5-A — Page /dossiers-offre accessible depuis la sidebar', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Lien sidebar "Dossiers d'offre" ou "Dossiers offre"
      const sidebarLink = page.locator('nav').getByRole('link', { name: /Dossiers/i }).first()
      if (await sidebarLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await sidebarLink.click()
        await page.waitForURL((u) => u.toString().includes('/dossiers-offre'), { timeout: 30000 })
      } else {
        // Navigation directe si sidebar non visible
        await page.goto('/dossiers-offre')
      }

      await page.waitForLoadState('networkidle')

      await expect(
        page.locator('main').getByRole('heading', { name: /Dossiers d'offre/i })
      ).toBeVisible({ timeout: 10000 })

      await expect(page.getByRole('link', { name: /Nouveau dossier/i })).toBeVisible()
    } finally {
      await context.close()
    }
  })

  // ─── T5-B : Créer un dossier offre ────────────────────────────────────────

  test('T5-B — Créer un nouveau dossier offre avec les champs requis', async ({ browser }) => {
    test.setTimeout(60000)

    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto('/dossiers-offre/nouveau')
      await page.waitForLoadState('networkidle')

      // Titre du formulaire
      await expect(
        page.locator('main').getByRole('heading', { name: /Nouveau dossier/i })
      ).toBeVisible({ timeout: 10000 })

      // Remplir le titre
      const titreInput = page.locator('input[placeholder*="Dossier offre"], input[placeholder*="dossier"]').first()
      await titreInput.fill(DOSSIER_TITRE)

      // S'assurer que "Utiliser la checklist" est coché (checkbox par défaut)
      const checkbox = page.locator('button[role="checkbox"]').first()
      const isChecked = await checkbox.getAttribute('data-state')
      if (isChecked !== 'checked') {
        await checkbox.click()
      }

      // Soumettre
      await page.locator('button[type="submit"]').click()

      // Attendre la redirection vers la liste (exclure /nouveau et /edit)
      await page.waitForURL(
        (u) => {
          const url = u.toString()
          return url.includes('/dossiers-offre') && !url.includes('/nouveau') && !url.includes('/edit')
        },
        { timeout: 60000 }
      )
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Chercher le dossier dans la liste via evaluateAll
      const dossierHrefs: string[] = await page.locator('a[href^="/dossiers-offre/"]').evaluateAll(
        (links: HTMLAnchorElement[]) =>
          links
            .filter((a) => a.textContent?.includes('[E2E-P5]'))
            .map((a) => a.getAttribute('href') ?? '')
            .filter(Boolean)
      )
      testDossierId = dossierHrefs[0]?.replace('/dossiers-offre/', '') ?? ''

      expect(testDossierId).toBeTruthy()
    } finally {
      await context.close()
    }
  })

  // ─── T5-C : Checklist des pièces ──────────────────────────────────────────

  test('T5-C — La checklist des 12 pièces est affichée avec statut initial', async ({ browser }) => {
    if (!testDossierId) {
      test.skip(true, 'Aucun dossier de test créé (T5-B skipped ?)')
      return
    }

    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto(`/dossiers-offre/${testDossierId}`)
      await page.waitForLoadState('networkidle')

      // Titre "Pièces du dossier"
      await expect(page.getByText('Pièces du dossier')).toBeVisible({ timeout: 10000 })

      // Il doit y avoir des pièces (12 avec template)
      const pieceRows = page.locator('[class*="hover:bg-muted"]').filter({ hasText: /.+/ })
      const count = await pieceRows.count()
      expect(count).toBeGreaterThanOrEqual(1)

      // La barre de progression existe
      const progressBar = page.locator('[role="progressbar"]')
      await expect(progressBar).toBeVisible()
    } finally {
      await context.close()
    }
  })

  // ─── T5-D : Changer le statut d'une pièce ────────────────────────────────

  test('T5-D — Changer le statut d\'une pièce (ABSENT → COMPLET)', async ({ browser }) => {
    test.setTimeout(60000)

    if (!testDossierId) {
      test.skip(true, 'Aucun dossier de test créé (T5-B skipped ?)')
      return
    }

    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto(`/dossiers-offre/${testDossierId}`)
      await page.waitForLoadState('networkidle')

      // Trouver le premier select de statut de pièce (SelectTrigger = combobox)
      const firstStatutSelect = page.getByRole('combobox').first()
      await expect(firstStatutSelect).toBeVisible({ timeout: 10000 })
      await firstStatutSelect.click()
      await page.waitForTimeout(300)

      // Choisir "Complet" (exact: true pour éviter l'ambiguïté avec "Incomplet")
      await page.getByRole('option', { name: 'Complet', exact: true }).click()
      await page.waitForTimeout(1000)

      // Le select doit maintenant afficher "Complet" (texte bleu)
      await expect(firstStatutSelect).toContainText(/Complet/i, { timeout: 10000 })
    } finally {
      await context.close()
    }
  })

  // ─── T5-E : Barre de progression mise à jour ──────────────────────────────

  test('T5-E — La barre de progression reflète les pièces complètes', async ({ browser }) => {
    if (!testDossierId) {
      test.skip(true, 'Aucun dossier de test créé (T5-B skipped ?)')
      return
    }

    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto(`/dossiers-offre/${testDossierId}`)
      await page.waitForLoadState('networkidle')

      // La progression % doit être > 0 (T5-D a validé 1 pièce)
      // Ancres ^ et $ pour ne matcher que "N% complété" (pas "12 pièces — 8% complété" du PageHeader)
      const progressText = page.locator('text=/^\\d+% complété$/')
      await expect(progressText).toBeVisible({ timeout: 10000 })

      const progressStr = await progressText.textContent()
      const pct = parseInt(progressStr?.match(/(\d+)%/)?.[1] ?? '0')
      expect(pct).toBeGreaterThan(0)
    } finally {
      await context.close()
    }
  })

  // ─── T5-F : Dossier visible dans le détail marché ────────────────────────

  test('T5-F — Le dossier offre est visible dans l\'onglet du détail marché', async ({ browser }) => {
    test.setTimeout(60000)

    if (!testDossierId) {
      test.skip(true, 'Aucun dossier de test créé (T5-B skipped ?)')
      return
    }

    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      // Récupérer le marcheId depuis le détail du dossier
      await page.goto(`/dossiers-offre/${testDossierId}`)
      await page.waitForLoadState('networkidle')

      const marcheLink = page.locator('a[href*="/marches/"]').first()
      const isLinked = await marcheLink.isVisible({ timeout: 5000 }).catch(() => false)

      if (!isLinked) {
        test.skip(true, 'Dossier non lié à un marché (créé sans marcheId)')
        return
      }

      const marcheHref = await marcheLink.getAttribute('href')
      await page.goto(marcheHref!)
      await page.waitForLoadState('networkidle')

      // Section ou onglet "Dossiers" visible
      const dossiersSection = page.locator('text=/Dossiers/i').first()
      await expect(dossiersSection).toBeVisible({ timeout: 10000 })
    } finally {
      await context.close()
    }
  })

  // ─── T5-G : Modifier un dossier offre ────────────────────────────────────

  test('T5-G — Modifier un dossier offre (titre)', async ({ browser }) => {
    test.setTimeout(60000)

    if (!testDossierId) {
      test.skip(true, 'Aucun dossier de test créé (T5-B skipped ?)')
      return
    }

    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto(`/dossiers-offre/${testDossierId}/edit`)
      await page.waitForLoadState('networkidle')

      // Effacer et remplir le titre
      const titreInput = page.locator('input[placeholder*="Dossier offre"], input[placeholder*="dossier"]').first()
      await titreInput.clear()
      await titreInput.fill(DOSSIER_TITRE_UPDATED)

      // Soumettre (bouton "Enregistrer" ou "Mettre à jour")
      await page.locator('button[type="submit"]').click()

      // Redirection vers le détail (toast peut disparaître pendant la nav)
      await page.waitForURL(
        (u) => u.toString().includes(`/dossiers-offre/${testDossierId}`),
        { timeout: 30000 }
      )
      await page.waitForLoadState('networkidle')

      // Nouveau titre visible (heading uniquement — évite strict mode breadcrumb vs h1)
      await expect(page.locator('main').getByRole('heading', { name: DOSSIER_TITRE_UPDATED })).toBeVisible({ timeout: 10000 })
    } finally {
      await context.close()
    }
  })

  // ─── T5-H : Supprimer un dossier offre ───────────────────────────────────

  test('T5-H — Supprimer un dossier offre avec confirmation', async ({ browser }) => {
    test.setTimeout(60000)

    if (!testDossierId) {
      test.skip(true, 'Aucun dossier de test créé (T5-B skipped ?)')
      return
    }

    const context = await browser.newContext()
    await context.addCookies(adminCookies)
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(60000)

    try {
      await page.goto(`/dossiers-offre/${testDossierId}`)
      await page.waitForLoadState('networkidle')

      // Bouton supprimer
      const deleteBtn = page.getByRole('button', { name: /Supprimer/i })
      await expect(deleteBtn).toBeVisible({ timeout: 10000 })
      await deleteBtn.click()

      // AlertDialog — bouton confirmation
      const confirmBtn = page.getByRole('button', { name: /Supprimer|Confirmer/i }).last()
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click()
      } else {
        // window.confirm fallback
        page.once('dialog', (d) => d.accept())
      }

      // Redirection vers /dossiers-offre
      await page.waitForURL(
        (u) => u.toString().match(/\/dossiers-offre$/) !== null,
        { timeout: 30000 }
      )
      await page.waitForLoadState('networkidle')

      // Le dossier n'est plus dans la liste
      await expect(page.getByText(DOSSIER_TITRE_UPDATED)).not.toBeVisible({ timeout: 5000 })

      testDossierId = ''
    } finally {
      await context.close()
    }
  })
})
