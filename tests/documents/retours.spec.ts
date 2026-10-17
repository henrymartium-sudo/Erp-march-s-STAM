import { test, expect as expectBase, type Page } from '@playwright/test'
import { login, TEST_USERS } from '../helpers/auth'
import { requeteLocale } from '../helpers/base-locale'

/**
 * Page Documents — retours utilisateur (I8, cosmétiques 3 et 5)
 *
 * I8 : le bouton de téléchargement affiche un état de chargement et ne reste pas bloqué après un échec.
 * Cosm. 3 : un seul état vide (icône, « Effacer les filtres », « Nouveau document ») en liste comme en grille.
 *
 * Données de test : 2 documents « [E2E-RETOURS] » dans la base Docker locale (127.0.0.1:5433,
 * vérifié par requeteLocale), supprimés ensuite. Aucun fichier de stockage : le téléchargement
 * échoue côté serveur, ce qui sert justement à vérifier le retour d'erreur.
 */

const expect = expectBase.configure({ timeout: 45000 })
test.use({ actionTimeout: 30000, navigationTimeout: 120000 })
test.describe.configure({ mode: 'serial', timeout: 120000 })

const PREFIXE = '[E2E-RETOURS]'

const TAILLES = [
  { nom: 'desktop 1920', width: 1920, height: 1080 },
  { nom: 'tablette 768', width: 768, height: 1024 },
  { nom: 'mobile 375', width: 375, height: 667 },
]

async function nettoyer() {
  await requeteLocale(`DELETE FROM documents WHERE nom LIKE $1`, [`${PREFIXE}%`])
}

async function debordement(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
}

test.describe('Documents — retours utilisateur', () => {
  test.beforeAll(async () => {
    await nettoyer()
    const [admin] = await requeteLocale<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [
      TEST_USERS.admin.email,
    ])
    if (!admin) throw new Error('Compte admin de test introuvable dans la base locale')
    for (let i = 1; i <= 2; i++) {
      await requeteLocale(
        `INSERT INTO documents (id, nom, "nomOriginal", type, taille, "mimeType", "storagePath", "userId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'AUTRE', 1024, 'application/pdf', $4, $5, now() - ($6 || ' minutes')::interval, now())`,
        [`e2e-retours-${i}`, `${PREFIXE} Pièce ${i}`, `piece-${i}.pdf`, `e2e-retours/piece-${i}.pdf`, admin.id, String(i)]
      )
    }
  })

  test.afterAll(async () => {
    await nettoyer()
  })

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.admin)
  })

  for (const vue of ['list', 'grid'] as const) {
    test(`état vide unique avec icône et actions (vue ${vue})`, async ({ page }) => {
      await page.addInitScript((v) => localStorage.setItem('documents-mode-de-vue', v), vue)
      await page.goto('/documents?search=zzz-introuvable-e2e')

      const vide = page.getByTestId('documents-etat-vide')
      await expect(vide).toHaveCount(1)
      await expect(vide.getByRole('heading', { level: 2, name: 'Aucun document trouvé' })).toBeVisible()
      await expect(vide.locator('svg').first()).toBeVisible()
      await expect(vide.getByRole('link', { name: 'Nouveau document' })).toBeVisible()
      await expect(page.getByText('Aucun document trouvé')).toHaveCount(1)

      await vide.getByRole('link', { name: 'Effacer les filtres' }).click()
      await expect(page).toHaveURL(/\/documents$/)
      // Table et cartes coexistent dans le DOM (l'une est masquée par CSS) : ne cibler que l'élément visible
      await expect(page.getByText(`${PREFIXE} Pièce 1`).locator('visible=true').first()).toBeVisible()
    })
  }

  test("sans filtre, l'état vide n'offre pas « Effacer les filtres »", async ({ page }) => {
    // Une page hors plage ne renvoie aucune ligne sans qu'aucun filtre ne soit actif
    await page.goto('/documents?page=999')
    const vide = page.getByTestId('documents-etat-vide')
    if (await vide.count()) {
      await expect(vide.getByRole('link', { name: 'Effacer les filtres' })).toHaveCount(0)
    }
  })

  test('téléchargement : état de chargement puis retour sans blocage (I8)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('documents-mode-de-vue', 'grid'))
    // Ralentit l'appel serveur (Server Action) pour rendre l'état de chargement observable
    await page.route('**/documents**', async (route) => {
      if (route.request().method() === 'POST' && route.request().headers()['next-action']) {
        await new Promise((r) => setTimeout(r, 2000))
      }
      await route.continue()
    })
    await page.goto('/documents')

    const carte = page.locator('div', { hasText: `${PREFIXE} Pièce 1` }).filter({
      has: page.getByRole('button', { name: /Télécharger/ }),
    }).last()
    const bouton = carte.getByRole('button', { name: /Télécharger|Téléchargement/ })
    await bouton.click()

    await expect(carte.getByRole('button', { name: /Téléchargement…/ })).toBeDisabled()

    // Pas de fichier réel : le serveur répond par une erreur, jamais « Téléchargement lancé »
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
    await expect(page.getByText('Téléchargement lancé')).toHaveCount(0)
    await expect(carte.getByRole('button', { name: 'Télécharger', exact: true })).toBeEnabled()
  })

  for (const t of TAILLES) {
    test(`aucun débordement de l'état vide à ${t.nom}`, async ({ page }) => {
      await page.setViewportSize({ width: t.width, height: t.height })
      await page.goto('/documents?search=zzz-introuvable-e2e')
      await expect(page.getByTestId('documents-etat-vide')).toBeVisible()
      expect(await debordement(page)).toBeLessThanOrEqual(0)
    })
  }
})
