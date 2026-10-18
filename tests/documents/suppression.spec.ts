import { test, expect as expectBase, type Page } from '@playwright/test'
import { login, TEST_USERS } from '../helpers/auth'
import { requeteLocale } from '../helpers/base-locale'

/**
 * Page Documents — suppression DÉFINITIVE (I9)
 *
 * Données de test : documents « [E2E-SUPPR] » dans la base locale (127.0.0.1:5433, vérifiée par
 * requeteLocale) avec des chemins de stockage FICTIFS. Le stockage Supabase de la base de test est
 * vide de configuration : l'effacement échoue donc toujours. C'est ce que ce test exploite pour
 * prouver qu'un échec du stockage laisse la ligne intacte. Le succès de l'effacement réel n'est
 * couvert que par les tests unitaires (stockage simulé) : AUCUNE suppression réelle ici.
 */

const expect = expectBase.configure({ timeout: 45000 })
test.use({ actionTimeout: 30000, navigationTimeout: 120000 })
test.describe.configure({ mode: 'serial', timeout: 120000 })

const PREFIXE = '[E2E-SUPPR]'

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

test.describe('Documents — suppression définitive', () => {
  test.beforeAll(async () => {
    await nettoyer()
    const [admin] = await requeteLocale<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [
      TEST_USERS.admin.email,
    ])
    if (!admin) throw new Error('Compte admin de test introuvable dans la base locale')
    const ins = (id: string, nom: string, parent: string | null) =>
      requeteLocale(
        `INSERT INTO documents (id, nom, "nomOriginal", type, taille, "mimeType", "storagePath", "documentParentId", version, "userId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'AUTRE', 1024, 'application/pdf', $4, $5, $6, $7, now(), now())`,
        [id, nom, `${id}.pdf`, `e2e-suppr-fictif/${id}.pdf`, parent, parent ? 2 : 1, admin.id]
      )
    await ins('e2e-suppr-racine', `${PREFIXE} Racine`, null)
    await ins('e2e-suppr-v2', `${PREFIXE} Racine`, 'e2e-suppr-racine')
    await ins('e2e-suppr-seul', `${PREFIXE} Seul`, null)
  })

  test.afterAll(async () => {
    await nettoyer()
  })

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.admin)
  })

  for (const t of TAILLES) {
    test(`confirmation « définitif » avec nombre de versions, échec du stockage = rien supprimé (${t.nom})`, async ({ page }) => {
      await page.setViewportSize({ width: t.width, height: t.height })
      await page.goto('/documents/e2e-suppr-racine')

      await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
      const dialogue = page.getByRole('alertdialog')
      await expect(dialogue.getByRole('heading', { name: 'Supprimer définitivement ce document ?' })).toBeVisible()
      await expect(dialogue).toContainText('Cette action est définitive')
      await expect(dialogue).toContainText('aucune sauvegarde')
      await expect(dialogue).toContainText('Sa version associée sera également supprimée définitivement')
      expect(await debordement(page)).toBeLessThanOrEqual(0)

      // Le focus initial est sur « Annuler » (action sûre)
      await expect(dialogue.getByRole('button', { name: 'Annuler' })).toBeFocused()

      await dialogue.getByRole('button', { name: 'Supprimer définitivement' }).click()
      await expect(dialogue.getByRole('alert')).toContainText(/rien n.a été supprimé|Erreur serveur/)

      // Les lignes sont intactes en base
      const lignes = await requeteLocale<{ id: string; deleted: boolean }>(
        `SELECT id, deleted FROM documents WHERE id IN ('e2e-suppr-racine','e2e-suppr-v2')`
      )
      expect(lignes).toHaveLength(2)
      expect(lignes.every((l) => l.deleted === false)).toBe(true)

      // Echap ferme le dialogue
      await page.keyboard.press('Escape')
      await expect(dialogue).toHaveCount(0)
    })
  }

  test('depuis la liste : la confirmation s’ouvre au clavier pour un document sans version', async ({ page }) => {
    await page.goto(`/documents?search=${encodeURIComponent(PREFIXE + ' Seul')}`)
    await page.addInitScript(() => localStorage.setItem('documents-mode-de-vue', 'list'))
    await page.reload()
    await page.getByRole('button', { name: /actions|menu/i }).first().click()
    await page.getByRole('menuitem', { name: /supprimer/i }).click()
    const dialogue = page.getByRole('alertdialog')
    await expect(dialogue).toContainText('Cette action est définitive')
    await expect(dialogue).not.toContainText('version')
    await page.keyboard.press('Escape')
    await expect(dialogue).toHaveCount(0)
  })
})
