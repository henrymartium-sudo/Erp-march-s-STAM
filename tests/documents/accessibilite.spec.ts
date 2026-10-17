import { test, expect as expectBase, type Page } from '@playwright/test'
import { login, TEST_USERS } from '../helpers/auth'
import { requeteLocale } from '../helpers/base-locale'

/**
 * Page Documents — phase 2 : tri global, noms accessibles, bascule, pagination mobile
 *
 * Données de test : 25 documents « [E2E-A11Y] » dans la base locale (127.0.0.1:5433, vérifié par
 * requeteLocale), supprimés ensuite. Le document n°i pèse i × 1000 octets et a été créé il y a i minutes :
 * l'ordre par défaut (date décroissante) est donc l'inverse de l'ordre par taille décroissante, ce qui
 * distingue un tri global d'un tri limité à la page affichée.
 */

const expect = expectBase.configure({ timeout: 45000 })
test.use({ actionTimeout: 30000, navigationTimeout: 120000 })
test.describe.configure({ mode: 'serial', timeout: 120000 })

const PREFIXE = '[E2E-A11Y]'
const NB_DOCS = 25 // 10 par page → 3 pages

async function nettoyer() {
  await requeteLocale(`DELETE FROM documents WHERE nom LIKE $1`, [`${PREFIXE}%`])
}

const url = (extra = '') => `/documents?search=${encodeURIComponent(PREFIXE)}${extra}`
const lignes = (page: Page) => page.locator('[data-testid="document-ligne"]:visible')

test.describe('Documents — phase 2', () => {
  test.beforeAll(async () => {
    await nettoyer()
    const [admin] = await requeteLocale<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [
      TEST_USERS.admin.email,
    ])
    if (!admin) throw new Error('Compte admin de test introuvable dans la base locale')
    for (let i = 1; i <= NB_DOCS; i++) {
      const n = String(i).padStart(2, '0')
      await requeteLocale(
        `INSERT INTO documents (id, nom, "nomOriginal", type, taille, "mimeType", "storagePath", "userId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'AUTRE', $4, 'application/pdf', $5, $6, now() - ($7 || ' minutes')::interval, now())`,
        [`e2e-a11y-${n}`, `${PREFIXE} Pièce ${n}`, `piece-${n}.pdf`, i * 1000, `e2e-a11y/piece-${n}.pdf`, admin.id, String(i)]
      )
    }
  })

  test.afterAll(async () => {
    await nettoyer()
  })

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await login(page, TEST_USERS.admin)
  })

  test('le tri par taille décroissante est global : la plus grosse pièce est en tête de la page 1', async ({ page }) => {
    await page.goto(url('&tri=taille&sens=desc'))
    await expect(lignes(page)).toHaveCount(10)
    await expect(lignes(page).first()).toContainText(`${PREFIXE} Pièce 25`)
    await expect(lignes(page).last()).toContainText(`${PREFIXE} Pièce 16`)

    await page.goto(url('&tri=taille&sens=desc&page=3'))
    await expect(lignes(page)).toHaveCount(5)
    await expect(lignes(page).last()).toContainText(`${PREFIXE} Pièce 01`)
  })

  test("un clic sur l'en-tête trie via l'URL et annonce le sens (aria-sort)", async ({ page }) => {
    await page.goto(url())
    const entete = page.getByRole('columnheader', { name: /Nom/ })
    await expect(page.getByRole('columnheader', { name: /Date/ })).toHaveAttribute('aria-sort', 'descending')
    await expect(entete).not.toHaveAttribute('aria-sort', /ascending|descending/)

    await entete.getByRole('button').click()
    await expect(page).toHaveURL(/tri=nom/)
    await expect(page).toHaveURL(/sens=asc/)
    await expect(entete).toHaveAttribute('aria-sort', 'ascending')
    await expect(lignes(page).first()).toContainText(`${PREFIXE} Pièce 01`)

    await entete.getByRole('button').click()
    await expect(entete).toHaveAttribute('aria-sort', 'descending')
    await expect(lignes(page).first()).toContainText(`${PREFIXE} Pièce 25`)
  })

  test('une colonne de tri inconnue ou sensible retombe sur le défaut sans erreur', async ({ page }) => {
    for (const tri of ['storagePath', 'userId', 'nom%3BDROP']) {
      const reponse = await page.goto(url(`&tri=${tri}&sens=asc`))
      expect(reponse?.status()).toBe(200)
      await expect(lignes(page)).toHaveCount(10)
      await expect(page.getByRole('columnheader', { name: /Date/ })).toHaveAttribute('aria-sort', /ascending|descending/)
    }
  })

  test('les contrôles de filtre ont un nom accessible', async ({ page }) => {
    await page.goto(url())
    await expect(page.getByRole('textbox', { name: 'Rechercher un document' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Filtrer par type' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Filtrer par phase' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Effacer la recherche' })).toBeVisible()
  })

  test("la bascule Liste/Grille expose son état, mesure 44 px et mémorise le choix", async ({ page }) => {
    await page.goto(url())
    const liste = page.getByRole('button', { name: 'Vue liste' })
    const grille = page.getByRole('button', { name: 'Vue grille' })
    await expect(liste).toHaveAttribute('aria-pressed', 'true')
    await expect(grille).toHaveAttribute('aria-pressed', 'false')
    const box = await grille.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)

    await grille.click()
    await expect(grille).toHaveAttribute('aria-pressed', 'true')

    await page.reload()
    await expect(page.getByRole('button', { name: 'Vue grille' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Vue liste' }).click() // remet l'état par défaut
  })

  test('menu des cartes visible sans survol, cible 44 px', async ({ page }) => {
    await page.goto(url())
    await page.getByRole('button', { name: 'Vue grille' }).click()
    const menu = page.getByRole('button', { name: /Actions pour/ }).first()
    await expect(menu).toBeVisible()
    expect(await menu.evaluate((e) => getComputedStyle(e).opacity)).toBe('1')
    const box = await menu.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
    await page.getByRole('button', { name: 'Vue liste' }).click()
  })

  test('le tableau est une région nommée, atteignable au clavier, avec légende', async ({ page }) => {
    await page.goto(url())
    const region = page.getByRole('region', { name: 'Liste des documents' })
    await expect(region).toHaveAttribute('tabindex', '0')
    await expect(page.locator('table caption')).toHaveText('Liste des documents')
  })

  test('libellés français de la pagination', async ({ page }) => {
    await page.goto(url())
    await expect(page.getByText('Précédent')).toBeVisible()
    await expect(page.getByText('Suivant')).toBeVisible()
    await expect(page.getByText('Previous')).toHaveCount(0)
    await expect(page.getByText('Next', { exact: true })).toHaveCount(0)
  })

  test('375 px : aucune largeur excédentaire avec une pagination à 3 pages', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(url())
    await expect(lignes(page)).toHaveCount(10)
    const l = await page.evaluate(() => ({
      inner: window.innerWidth,
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    expect(l.inner).toBe(l.client)
    expect(l.scroll).toBeLessThanOrEqual(l.client)
    await expect(page.getByText('Page 1 sur 3')).toBeVisible()
    await expect(page.getByText('Suivant')).toBeVisible()
  })
})
