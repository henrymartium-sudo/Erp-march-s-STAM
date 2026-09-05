import { test, expect } from '@playwright/test'
import { login, TEST_USERS } from '../helpers/auth'

/**
 * Régression audit UI/UX 2026-09 — Lot 0, entrée #003 (Bloquant, origine V02)
 *
 * `PageHeader` (components/shared/page-header.tsx) disposait titre et actions
 * sur une seule ligne (`flex items-start justify-between`) sans repli. La page
 * détail d'une Opportunité aligne jusqu'à 4 actions (Modifier, Statut,
 * Créer le marché, Supprimer) et débordait donc horizontalement à 375px.
 *
 * Correctif : `flex-col sm:flex-row` sur le conteneur + `flex-wrap` sur le
 * slot d'actions.
 *
 * Critère : document.body.scrollWidth <= document.body.clientWidth à 375x667.
 */

const MOBILE = { width: 375, height: 667 }

/** Liens vers un détail d'opportunité (exclut les routes de création/édition). */
const DETAIL_LINK =
  'a[href^="/opportunites/"]:not([href$="/edit"]):not([href$="/nouvelle"])'

test.describe('PageHeader — pas de débordement horizontal à 375px', () => {
  test("le détail d'une opportunité ne déborde pas à 375px", async ({ page }) => {
    await login(page, TEST_USERS.admin)

    // Récupérer l'URL d'un détail d'opportunité depuis la liste
    await page.goto('/opportunites')
    await page.waitForLoadState('networkidle')

    const detailLinks = page.locator(DETAIL_LINK)
    const count = await detailLinks.count()
    test.skip(count === 0, 'Aucune opportunité en base — test non applicable')

    const href = await detailLinks.first().getAttribute('href')
    expect(href, "Lien de détail d'opportunité introuvable").toBeTruthy()

    await page.setViewportSize(MOBILE)
    await page.goto(href as string)
    await page.waitForLoadState('networkidle')

    // Le PageHeader doit bien être rendu avant la mesure
    await page.locator('h1').first().waitFor({ state: 'visible' })

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
    }))

    expect(
      scrollWidth,
      `Débordement horizontal sur ${href} à 375px : ` +
        `body.scrollWidth=${scrollWidth} > body.clientWidth=${clientWidth}`
    ).toBeLessThanOrEqual(clientWidth)
  })
})
