import { test, expect, type Page } from '@playwright/test'
import { login, TEST_USERS } from '../helpers/auth'

/**
 * Régression audit — Bloquant #007 (fonctionnel F16), intégrité des données
 *
 * Le formulaire de facture calculait le TTC à chaque changement de HT ou de TVA
 * et écrasait silencieusement la valeur saisie par l'utilisateur — y compris un
 * arrondi contractuel négocié. Perte de donnée financière sans aucun feedback.
 *
 * Règle vérifiée ici : dès que l'utilisateur saisit lui-même le TTC, sa valeur
 * devient la source de vérité et n'est plus jamais écrasée par le calcul
 * automatique ; l'écart avec le calcul HT + TVA lui est signalé explicitement.
 *
 * Mode série avec une seule authentification : chaque login traverse le
 * dashboard (une vingtaine de requêtes Prisma), coût inutile ici puisque tous
 * les cas portent sur le même formulaire.
 */

const HT_INITIAL = '1000000'
const TTC_AUTO = '1180000' // 1 000 000 × 1,18
const TTC_NEGOCIE = '1180500' // arrondi contractuel imposé par l'utilisateur
const HT_CORRIGE = '1200000' // le recalcul automatique donnerait 1 416 000

test.describe.configure({ mode: 'serial' })

test.describe('Factures — intégrité du montant TTC saisi manuellement', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page, TEST_USERS.admin)
  })

  test.afterAll(async () => {
    await page.close()
  })

  test.beforeEach(async () => {
    // La page charge la liste complète des marchés et, en mode dev, un bundle
    // JS non optimisé : le budget de navigation global (15 s) est trop court.
    test.slow()
    await page.goto('/factures/nouvelle', { timeout: 60_000 })
    await expect(page.locator('input[name="montantHT"]')).toBeVisible({ timeout: 30_000 })
  })

  test('le TTC saisi manuellement survit à une modification du HT puis de la TVA', async () => {
    const ht = page.locator('input[name="montantHT"]')
    const tva = page.locator('input[name="tva"]')
    const ttc = page.locator('input[name="montantTTC"]')
    const indicateur = page.getByTestId('ttc-saisie-manuelle')

    // 1. Tant que l'utilisateur n'a rien saisi, le TTC est calculé
    await ht.fill(HT_INITIAL)
    await expect(ttc).toHaveValue(TTC_AUTO)
    await expect(indicateur).toBeHidden()

    // 2. L'utilisateur impose un TTC négocié
    await ttc.fill(TTC_NEGOCIE)
    await expect(indicateur).toBeVisible()

    // 3. Il corrige ensuite le HT : le TTC manuel doit être conservé.
    //    L'écart affiché (1 180 500 − 1 416 000 = −235 500) prouve à la fois
    //    que le composant a bien re-rendu et que le TTC n'a pas été écrasé.
    await ht.fill(HT_CORRIGE)
    await expect(indicateur).toContainText('235')
    await expect(ttc).toHaveValue(TTC_NEGOCIE)

    // 4. Idem après un changement de taux de TVA
    //    (1 180 500 − 1 200 000 × 1,19 = −247 500)
    await tva.fill('19')
    await expect(indicateur).toContainText('247')
    await expect(ttc).toHaveValue(TTC_NEGOCIE)
  })

  test("l'écart avec le calcul HT + TVA est signalé explicitement", async () => {
    const ht = page.locator('input[name="montantHT"]')
    const ttc = page.locator('input[name="montantTTC"]')
    const indicateur = page.getByTestId('ttc-saisie-manuelle')

    await ht.fill(HT_INITIAL)
    await ttc.fill(TTC_NEGOCIE)

    await expect(indicateur).toContainText('Saisie manuelle')
    await expect(indicateur).toContainText('Écart de')
    await expect(indicateur).toContainText('500')
  })

  test("le calcul automatique reste actif tant que le TTC n'a pas été saisi", async () => {
    const ht = page.locator('input[name="montantHT"]')
    const tva = page.locator('input[name="tva"]')
    const ttc = page.locator('input[name="montantTTC"]')

    await ht.fill('2000000')
    await expect(ttc).toHaveValue('2360000')

    await tva.fill('10')
    await expect(ttc).toHaveValue('2200000')

    await expect(page.getByTestId('ttc-saisie-manuelle')).toBeHidden()
  })

  test('« Rétablir le calcul automatique » réaligne le TTC sur le calcul', async () => {
    const ht = page.locator('input[name="montantHT"]')
    const ttc = page.locator('input[name="montantTTC"]')
    const indicateur = page.getByTestId('ttc-saisie-manuelle')

    await ht.fill(HT_INITIAL)
    await ttc.fill(TTC_NEGOCIE)
    await expect(indicateur).toBeVisible()

    await indicateur.getByRole('button', { name: 'Rétablir le calcul automatique' }).click()

    await expect(ttc).toHaveValue(TTC_AUTO)
    await expect(indicateur).toBeHidden()
  })

  test('vider le champ TTC redonne la main au calcul automatique', async () => {
    const ht = page.locator('input[name="montantHT"]')
    const ttc = page.locator('input[name="montantTTC"]')
    const indicateur = page.getByTestId('ttc-saisie-manuelle')

    await ht.fill(HT_INITIAL)
    await ttc.fill(TTC_NEGOCIE)
    await expect(indicateur).toBeVisible()

    await ttc.fill('')

    await expect(ttc).toHaveValue(TTC_AUTO)
    await expect(indicateur).toBeHidden()
  })
})
