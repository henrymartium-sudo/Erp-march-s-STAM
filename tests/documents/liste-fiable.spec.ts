import { test, expect as expectBase } from '@playwright/test'
import { login, TEST_USERS } from '../helpers/auth'
import { requeteLocale } from '../helpers/base-locale'

/**
 * Page Documents — fiabilité de la liste (B1, I2)
 *
 * B1 : la liste suit les paramètres d'URL (recherche, page) et une suppression retire la ligne.
 * I2 : les filtres ne créent pas d'entrées d'historique parasites (router.replace, sans navigation inutile).
 *
 * Données de test : 12 documents « [E2E-DOCS] », insérés puis supprimés dans la base Docker locale
 * (127.0.0.1:5433, vérifié par requeteLocale). Aucun fichier de stockage n'est créé.
 */

// Machine de test à court de mémoire : un rendu serveur peut se figer ~30 s par intermittence (réponse déjà reçue, URL mise à jour tard)
const expect = expectBase.configure({ timeout: 45000 })
test.use({ actionTimeout: 30000 })
test.describe.configure({ mode: 'serial', timeout: 120000 })

const PREFIXE = '[E2E-DOCS]'
const NB_DOCS = 12 // 10 par page → 10 sur la page 1, 2 sur la page 2

async function nettoyer() {
  await requeteLocale(`DELETE FROM documents WHERE nom LIKE $1`, [`${PREFIXE}%`])
}

test.describe('Documents — liste fiable', () => {
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
         VALUES ($1, $2, $3, 'AUTRE', 1024, 'application/pdf', $4, $5, now() - ($6 || ' minutes')::interval, now())`,
        [`e2e-docs-${n}`, `${PREFIXE} Pièce ${n}`, `piece-${n}.pdf`, `e2e-docs/piece-${n}.pdf`, admin.id, String(i)]
      )
    }
  })

  test.afterAll(async () => {
    await nettoyer()
  })

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.admin)
  })

  const lignes = (page: import('@playwright/test').Page) => page.locator('tbody tr')

  test('une recherche sans résultat vide la liste (B1)', async ({ page }) => {
    await page.goto('/documents')
    await expect(lignes(page).first()).toBeVisible()

    await page.getByPlaceholder('Rechercher un document...').fill('zzz-introuvable-e2e')
    await expect(page).toHaveURL(/search=zzz-introuvable-e2e/)

    await expect(page.getByText('Aucun document trouvé')).toBeVisible()
    await expect(lignes(page)).toHaveCount(0)
  })

  test('une recherche filtre les lignes puis le changement de page change les lignes (B1)', async ({ page }) => {
    await page.goto(`/documents?search=${encodeURIComponent(PREFIXE)}`)
    await expect(lignes(page)).toHaveCount(10)
    await expect(page.getByText(`${PREFIXE} Pièce 01`)).toBeVisible()

    await page.goto(`/documents?search=${encodeURIComponent(PREFIXE)}&page=2`)
    await expect(lignes(page)).toHaveCount(2)
    await expect(page.getByText(`${PREFIXE} Pièce 01`)).toHaveCount(0)

    // Navigation côté client (pas de rechargement) : le lien « Suivant » / « 1 » de la pagination
    await page.goto(`/documents?search=${encodeURIComponent(PREFIXE)}`)
    await expect(lignes(page)).toHaveCount(10)
    await page.getByRole('navigation', { name: 'pagination' }).getByText('2', { exact: true }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(lignes(page)).toHaveCount(2)
  })

  test('la recherche ne crée pas d’entrée d’historique (I2)', async ({ page }) => {
    await page.goto('/documents')
    await expect(lignes(page).first()).toBeVisible()
    await page.waitForTimeout(1000) // laisse passer l'effet de montage éventuel
    const avant = await page.evaluate(() => history.length)

    const champ = page.getByPlaceholder('Rechercher un document...')
    await champ.fill(PREFIXE)
    await expect(page).toHaveURL(/search=/)
    await champ.fill(`${PREFIXE} Pièce 03`)
    await expect(page).toHaveURL(/Pi%C3%A8ce\+03|Pi%C3%A8ce%2003|Pièce(\+|%20| )03/)
    await expect(lignes(page)).toHaveCount(1)
    await page.waitForTimeout(1000)

    const apres = await page.evaluate(() => history.length)
    expect(apres).toBe(avant)
  })

  test('le bouton Retour quitte la page sans rejouer les filtres (I2)', async ({ page }) => {
    await page.goto('/')
    await page.goto('/documents')
    await expect(lignes(page).first()).toBeVisible()
    await page.waitForTimeout(1000)

    await page.getByPlaceholder('Rechercher un document...').fill(PREFIXE)
    await expect(page).toHaveURL(/search=/)
    await expect(lignes(page)).toHaveCount(10)

    await page.goBack()
    await expect(page).not.toHaveURL(/\/documents/)
  })

  test('une suppression retire la ligne de la liste (B1)', async ({ page }) => {
    await page.goto(`/documents?search=${encodeURIComponent(PREFIXE + ' Pièce 03')}`)
    await expect(lignes(page)).toHaveCount(1)

    await lignes(page).first().getByRole('button', { name: 'Actions' }).click()
    await page.getByRole('menuitem', { name: 'Supprimer' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click()

    await expect(page.getByText('Aucun document trouvé')).toBeVisible()
    await expect(lignes(page)).toHaveCount(0)
  })
})
