import { test, expect as expectBase, type Page } from '@playwright/test'
import { login, TEST_USERS } from '../helpers/auth'
import { requeteLocale } from '../helpers/base-locale'

/**
 * Page Documents — responsive (B2, I1)
 *
 * B2 : à 375 px, aucun débordement horizontal ; barre d'outils empilée ; vue cartes sous 768 px.
 * I1 : à 768 px, aucune colonne ni action coupée.
 *
 * Données de test : 3 documents « [E2E-RESP] » (noms longs, version 2) dans la base Docker locale
 * (127.0.0.1:5433, vérifié par requeteLocale), supprimés ensuite. Aucun fichier de stockage.
 */

const expect = expectBase.configure({ timeout: 45000 })
test.use({ actionTimeout: 30000, navigationTimeout: 120000 })
test.describe.configure({ mode: 'serial', timeout: 120000 })

const PREFIXE = '[E2E-RESP]'

const TAILLES = [
  { nom: 'desktop 1920', width: 1920, height: 1080 },
  { nom: 'tablette 768', width: 768, height: 1024 },
  { nom: 'mobile 375', width: 375, height: 667 },
]

async function nettoyer() {
  await requeteLocale(`DELETE FROM documents WHERE nom LIKE $1`, [`${PREFIXE}%`])
}

/** Aucun débordement : la fenêtre et le contenu ont la même largeur */
async function largeurs(page: Page) {
  return page.evaluate(() => ({
    inner: window.innerWidth,
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }))
}

test.describe('Documents — responsive', () => {
  test.beforeAll(async () => {
    await nettoyer()
    const [admin] = await requeteLocale<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [
      TEST_USERS.admin.email,
    ])
    if (!admin) throw new Error('Compte admin de test introuvable dans la base locale')
    for (let i = 1; i <= 3; i++) {
      await requeteLocale(
        `INSERT INTO documents (id, nom, "nomOriginal", description, type, version, taille, "mimeType", "storagePath", "userId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'AUTRE', 2, 2048, 'application/pdf', $5, $6, now() - ($7 || ' minutes')::interval, now())`,
        [
          `e2e-resp-${i}`,
          `${PREFIXE} Dossier de soumission avec un intitulé volontairement très long numéro ${i}`,
          `piece-${i}.pdf`,
          'Description volontairement longue pour vérifier qu\'elle ne fait jamais déborder la ligne ni la carte',
          `e2e-resp/piece-${i}.pdf`,
          admin.id,
          String(i),
        ]
      )
    }
  })

  test.afterAll(async () => {
    await nettoyer()
  })

  for (const t of TAILLES) {
    test(`${t.nom} : aucun débordement, actions et bascule dans l'écran, cible 44 px`, async ({ page }) => {
      await page.setViewportSize({ width: t.width, height: t.height })
      await login(page, TEST_USERS.admin)
      await page.goto(`/documents?search=${encodeURIComponent(PREFIXE)}`)

      const lignes = page.locator('[data-testid="document-ligne"]:visible')
      await expect(lignes).toHaveCount(3)

      const l = await largeurs(page)
      expect(l.inner).toBe(l.client)
      expect(l.scroll).toBeLessThanOrEqual(l.client)

      // Bascule Liste/Grille entièrement visible
      for (const nom of ['Vue liste', 'Vue grille']) {
        const box = await page.getByRole('button', { name: nom }).boundingBox()
        expect(box).not.toBeNull()
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(t.width)
      }

      // Chaque ligne : taille et type lisibles, bouton Actions dans l'écran et ≥ 44 px
      const premiere = lignes.first()
      await expect(premiere).toContainText('2 KB')
      await expect(premiere).toContainText('v2')
      const actions = premiere.getByRole('button', { name: /Actions/ })
      const box = await actions.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(t.width)

      // Navigation clavier : focus sur Actions puis Entrée ouvre le menu
      await actions.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('menuitem', { name: 'Télécharger' })).toBeVisible()
      await page.keyboard.press('Escape')
    })
  }

  test('375 : vue cartes automatique en vue liste (pas de tableau)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await login(page, TEST_USERS.admin)
    await page.goto(`/documents?search=${encodeURIComponent(PREFIXE)}`)
    await expect(page.locator('[data-testid="document-ligne"]:visible')).toHaveCount(3)
    await expect(page.locator('table')).toBeHidden()
  })

  test('1920 : tableau complet avec les colonnes Type, Taille, Date', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await login(page, TEST_USERS.admin)
    await page.goto(`/documents?search=${encodeURIComponent(PREFIXE)}`)
    await expect(page.locator('[data-testid="document-ligne"]:visible')).toHaveCount(3)
    for (const col of ['Type', 'Taille', 'Date']) {
      await expect(page.getByRole('columnheader', { name: new RegExp(col) })).toBeVisible()
    }
  })
})
