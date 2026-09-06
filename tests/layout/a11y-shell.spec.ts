import { test, expect, type Page } from '@playwright/test'
import { login, TEST_USERS } from '../helpers/auth'

/**
 * Régression audit UI/UX 2026-09 — Lot 5 (accessibilité transversale du shell).
 *
 * Couvre :
 *  - F02 + son jumeau (`components/layout/dashboard-shell.tsx`) : `getPageTitle`
 *    et `isActive` itéraient les routes dans l'ordre de déclaration avec un
 *    `startsWith` simple. Sur /vehicules/sav, `/vehicules` matchait en premier :
 *    la topbar affichait « Véhicules » au lieu de « SAV — Vue globale », et les
 *    deux items de nav « Véhicules » et « SAV » ressortaient actifs.
 *    Correctif : le préfixe le plus long l'emporte.
 *  - #008 : la topbar rendait un second `<h1>` (text-lg), placé avant celui de
 *    la page (text-2xl) dans le DOM — structure de titres cassée pour les
 *    lecteurs d'écran. Correctif : titre topbar en `<p data-testid=topbar-title>`.
 *  - #056 : le `<nav>` de la sidebar est nommé « Navigation principale ».
 *
 * Mode `serial` avec une page partagée : en dev, `login()` traverse le rendu
 * complet du dashboard (~10-20 s sur base distante). Un login par test sortait
 * du timeout ; la suite n'en fait donc qu'un seul et enchaîne les navigations.
 */

const SAV_PATH = '/vehicules/sav'
const SAV_TITLE = 'SAV — Vue globale'

/** Classe posée sur l'item de nav actif (cf. app/globals.css §SIDEBAR). */
const ACTIVE_NAV_ITEM = 'nav[aria-label="Navigation principale"] a.sidebar-active-border'

test.describe.configure({ mode: 'serial' })

test.describe('Shell — titres et item de nav actif sur les sous-routes', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page, TEST_USERS.admin)
    // login() rend la main dès que l'URL quitte /login, mais le router.refresh()
    // du formulaire est encore en vol : naviguer tout de suite l'annule
    // (net::ERR_ABORTED). On attend que la page d'atterrissage soit stable.
    await page.waitForLoadState('networkidle')
  })

  test.afterAll(async () => {
    await page.close()
  })

  const goto = async (path: string) => {
    if (new URL(page.url()).pathname !== path) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
    }
  }

  test('la topbar affiche le titre de la sous-route, pas celui du parent (F02)', async () => {
    await goto(SAV_PATH)

    const topbarTitle = page.getByTestId('topbar-title')
    await expect(topbarTitle).toBeVisible()
    await expect(
      topbarTitle,
      'Le titre de la topbar doit être celui de /vehicules/sav, pas celui de /vehicules'
    ).toHaveText(SAV_TITLE)
  })

  test('la page ne comporte qu’un seul <h1> (#008)', async () => {
    await goto(SAV_PATH)

    const headings = page.locator('h1')
    await expect(headings).toHaveCount(1)
    await expect(headings.first()).toHaveText(SAV_TITLE)
  })

  test('un seul item de navigation est marqué actif (jumeau de F02)', async () => {
    await goto(SAV_PATH)

    const activeItems = page.locator(ACTIVE_NAV_ITEM)
    await expect(
      activeItems,
      '« Véhicules » et « SAV » ne doivent pas être actifs simultanément'
    ).toHaveCount(1)
    await expect(activeItems.first()).toHaveAttribute('href', SAV_PATH)
  })

  test('le parent /vehicules reste titré et actif sur sa propre route', async () => {
    await goto('/vehicules')

    await expect(page.getByTestId('topbar-title')).toHaveText('Véhicules')

    const activeItems = page.locator(ACTIVE_NAV_ITEM)
    await expect(activeItems).toHaveCount(1)
    await expect(activeItems.first()).toHaveAttribute('href', '/vehicules')
  })
})
