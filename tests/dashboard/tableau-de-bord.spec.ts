import { test, expect as expectBase, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { login, TEST_USERS, type TestUser } from '../helpers/auth'
import { requeteLocale } from '../helpers/base-locale'
import { waitForDashboardLoaded } from '../helpers/dashboard'

/**
 * Page d'accueil « Tableau de bord » (livraison 7) — E2E par rôle.
 *
 * Données de test « [E2E-TDB] », insérées puis supprimées dans la base Docker locale
 * (127.0.0.1:5433, vérifié par requeteLocale). Dates relatives à l'instant du test, au jour UTC.
 */

// Machine de test à court de mémoire : un rendu serveur peut se figer ~30 s par intermittence.
const expect = expectBase.configure({ timeout: 45000 })
test.use({ actionTimeout: 30000 })

const PREFIXE = '[E2E-TDB]'
const FACTURE = `${PREFIXE} F-ECHUE`
const MARCHE_FACTURE = `${PREFIXE} M-FACT`
const MARCHE_RECEPTION = `${PREFIXE} M-RECEP`
const MARCHE_SANS_FIN = `${PREFIXE} M-SANSFIN`
const OPP_DEPOT = `${PREFIXE} AO-DEPOT`
const OPP_MOIS = `${PREFIXE} AO-MOIS`
const OPP_IDENTIFIEE = `${PREFIXE} AO-IDENT`

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

async function nettoyer() {
  await requeteLocale(`DELETE FROM factures WHERE numero LIKE $1`, [`${PREFIXE}%`])
  await requeteLocale(`DELETE FROM marches WHERE numero LIKE $1`, [`${PREFIXE}%`])
  await requeteLocale(`DELETE FROM opportunites WHERE reference LIKE $1`, [`${PREFIXE}%`])
}

/** Jour UTC courant décalé du nombre de jours donné en $1 (négatif = passé, null = pas de date), à 09 h UTC. */
const JOUR_SQL = `CASE WHEN $1::int IS NULL THEN NULL
  ELSE date_trunc('day', now() at time zone 'utc') + interval '9 hours' + $1::int * interval '1 day' END`

async function amorcer() {
  await nettoyer()
  const [admin] = await requeteLocale<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [TEST_USERS.admin.email])
  if (!admin) throw new Error('Compte admin de test introuvable dans la base locale')

  const marche = (id: string, numero: string, statut: string, jourFin: number | null) =>
    requeteLocale(
      `INSERT INTO marches (id, numero, objet, type, montant, "dateNotification", "delaiExecution", "dateFinPrevue", statut,
                            "autoriteContractanteNom", "userId", "updatedAt")
       VALUES ($2, $3, $3, 'FOURNITURES', 5000000, now(), 30, ${JOUR_SQL}, $4::"StatutMarche",
               'Autorité E2E', $5, now())`,
      [jourFin, id, numero, statut, admin.id],
    )
  await marche('e2e-tdb-m-fact', MARCHE_FACTURE, 'CLOTURE', null)
  await marche('e2e-tdb-m-recep', MARCHE_RECEPTION, 'EN_EXECUTION', -3)
  await marche('e2e-tdb-m-sansfin', MARCHE_SANS_FIN, 'EN_EXECUTION', null)

  await requeteLocale(
    `INSERT INTO factures (id, numero, "marcheId", "montantHT", tva, "montantTTC", statut, "dateEmission", "dateEcheance", "updatedAt")
     VALUES ('e2e-tdb-f1', $1, 'e2e-tdb-m-fact', 1000000, 18, 1180000, 'EMISE', now() - interval '60 days',
             (date_trunc('day', now() at time zone 'utc') + interval '9 hours') - interval '12 days', now())`,
    [FACTURE],
  )

  const opportunite = (id: string, reference: string, statut: string, jourLimite: number | null) =>
    requeteLocale(
      `INSERT INTO opportunites (id, reference, objet, "autoriteContractante", statut, "montantEstime", "dateLimite", "userId", "updatedAt")
       VALUES ($2, $3, $3, 'Autorité E2E', $4::"StatutOpportunite", 2000000, ${JOUR_SQL}, $5, now())`,
      [jourLimite, id, reference, statut, admin.id],
    )
  await opportunite('e2e-tdb-o-depot', OPP_DEPOT, 'EN_ANALYSE', 3)
  await opportunite('e2e-tdb-o-mois', OPP_MOIS, 'GO', 20)
  await opportunite('e2e-tdb-o-ident', OPP_IDENTIFIEE, 'IDENTIFIEE', null)
}

/** Ouvre une session connectée (un seul login par rôle). */
async function ouvrirSession(browser: Browser, user: TestUser): Promise<BrowserContext> {
  const context = await browser.newContext({ baseURL: BASE_URL })
  const page = await context.newPage()
  await login(page, user)
  await page.close()
  return context
}

async function ouvrirAccueil(context: BrowserContext, query = ''): Promise<Page> {
  const page = await context.newPage()
  await page.goto(`/${query}`)
  await waitForDashboardLoaded(page)
  return page
}

test.beforeAll(async () => {
  await amorcer()
})

test.afterAll(async () => {
  await nettoyer()
})

test.describe('Tableau de bord — hors connexion', () => {
  test('redirige vers /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Tableau de bord — ADMIN', () => {
  test.describe.configure({ mode: 'serial', timeout: 180000 })
  let context: BrowserContext

  test.beforeAll(async ({ browser }) => {
    context = await ouvrirSession(browser, TEST_USERS.admin)
  })
  test.afterAll(async () => {
    await context.close()
  })

  test('À traiter : facture échue, réception définitive, dépôt sans rattrapage, données manquantes', async () => {
    const page = await ouvrirAccueil(context)
    const aTraiter = page.getByRole('region', { name: 'À traiter' })

    const facture = aTraiter.getByRole('link', { name: new RegExp(FACTURE.replace(/[[\]]/g, '\\$&')) })
    await expect(facture).toContainText('Facture à encaisser')
    await expect(facture).toContainText('Échue depuis 12 j')
    await expect(facture).toContainText('FCFA')
    await expect(facture).toContainText('Relancer')

    const reception = aTraiter.getByRole('link', { name: new RegExp(MARCHE_RECEPTION.replace(/[[\]]/g, '\\$&')) })
    await expect(reception).toContainText('Réception définitive à obtenir')
    await expect(reception).toContainText("Relancer l'autorité")

    const depot = aTraiter.getByRole('link', { name: new RegExp(OPP_DEPOT.replace(/[[\]]/g, '\\$&')) })
    await expect(depot).toContainText("Dépôt de l'offre")
    await expect(depot).toContainText('Sans rattrapage')

    const manquants = page.getByRole('region', { name: 'Données manquantes' })
    await expect(manquants.getByRole('link', { name: MARCHE_SANS_FIN })).toBeVisible()
    await expect(manquants.getByRole('link', { name: OPP_IDENTIFIEE })).toBeVisible()
    await page.close()
  })

  test('les cinq voyants, avec leur état en texte, et les boutons de création', async () => {
    const page = await ouvrirAccueil(context)
    const voyants = page.getByRole('region', { name: 'Est-ce que ça va ?' })
    for (const titre of [
      'Encaissements en retard', 'Reste à facturer après réception', 'Cautions encore nécessaires',
      'Taux de succès des offres', 'Dépôts sous 14 j non prêts',
    ]) {
      await expect(voyants.getByText(titre)).toBeVisible()
    }
    await expect(voyants.getByText(/Correct|À surveiller|Urgent|Pas assez de données/).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Nouvelle opportunité' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Créer/ })).toBeVisible()
    await expect(page.locator('h1')).toHaveCount(1)
    await page.close()
  })

  test('« Ce mois-ci » est replié puis s’ouvre au clavier', async () => {
    const page = await ouvrirAccueil(context)
    const repli = page.locator('details', { hasText: 'Ce mois-ci' })
    await expect(repli).toBeVisible()
    await expect(repli).not.toHaveAttribute('open', '')
    await repli.locator('summary').focus()
    await page.keyboard.press('Enter')
    await expect(repli).toHaveAttribute('open', '')
    await expect(repli.getByRole('link', { name: new RegExp(OPP_MOIS.replace(/[[\]]/g, '\\$&')) })).toBeVisible()
    await page.close()
  })

  test('le filtre vit dans l’adresse : passation masque la facture, exécution masque le pipeline', async () => {
    const passation = await ouvrirAccueil(context, '?vue=passation')
    await expect(passation.getByRole('link', { name: 'Passation' })).toHaveAttribute('aria-current', 'page')
    await expect(passation.getByRole('link', { name: new RegExp(FACTURE.replace(/[[\]]/g, '\\$&')) })).toHaveCount(0)
    await expect(passation.getByRole('region', { name: 'Pipeline des offres' })).toBeVisible()
    await passation.close()

    const exec = await ouvrirAccueil(context, '?vue=execution')
    await expect(exec.getByRole('link', { name: 'Exécution et finances' })).toHaveAttribute('aria-current', 'page')
    await expect(exec.getByRole('link', { name: new RegExp(FACTURE.replace(/[[\]]/g, '\\$&')) })).toBeVisible()
    await expect(exec.getByRole('region', { name: 'Pipeline des offres' })).toHaveCount(0)
    await exec.close()
  })

  test('pipeline : le nombre de « En analyse » est le nombre de lignes de la liste ouverte au clic', async () => {
    const page = await ouvrirAccueil(context)
    const phase = page.getByRole('region', { name: 'Pipeline des offres' }).getByRole('link', { name: /^En analyse/ })
    const nombre = Number((await phase.locator(':scope > span').nth(2).innerText()).trim())
    expect(nombre).toBeGreaterThanOrEqual(2) // AO-DEPOT (EN_ANALYSE) et AO-IDENT (IDENTIFIEE)
    expect(nombre).toBeLessThanOrEqual(10) // une page de liste

    await phase.click()
    await expect(page).toHaveURL(/\/opportunites\?statut=EN_ANALYSE(,|%2C)IDENTIFIEE/)
    await expect(page.locator('tbody tr').first()).toBeVisible()
    await expect(page.locator('tbody tr')).toHaveCount(nombre)
    await expect(page.locator('tbody').getByRole('link', { name: OPP_IDENTIFIEE, exact: true })).toBeVisible()
    await page.close()
  })
})

test.describe('Tableau de bord — VISITEUR', () => {
  test.describe.configure({ mode: 'serial', timeout: 180000 })
  let context: BrowserContext

  test.beforeAll(async ({ browser }) => {
    context = await ouvrirSession(browser, TEST_USERS.visiteur)
  })
  test.afterAll(async () => {
    await context.close()
  })

  test('aucun montant, voyants financiers absents, aucun lien /pilotage ni bouton de création', async () => {
    const page = await ouvrirAccueil(context)
    const main = page.locator('main')
    await expect(main.getByRole('region', { name: 'À traiter' })).toBeVisible()
    expect(await main.innerText()).not.toMatch(/FCFA|XOF/)
    // Page entière (flux RSC `self.__next_f` compris) : ni devise ni montant semé.
    const contenu = await page.content()
    expect(contenu).not.toMatch(/FCFA|XOF/)
    expect(contenu.replace(/[\s  ]/g, '')).not.toMatch(/5000000|2000000/)
    await expect(main.getByText('Encaissements en retard')).toHaveCount(0)
    await expect(main.getByText('Reste à facturer après réception')).toHaveCount(0)
    await expect(main.getByText('Taux de succès des offres')).toBeVisible()
    await expect(main.locator('a[href="/pilotage"]')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Nouvelle opportunité' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Créer/ })).toHaveCount(0)
    await page.close()
  })
})

test.describe('Tableau de bord — EXPLOITATION', () => {
  test.describe.configure({ mode: 'serial', timeout: 180000 })
  let context: BrowserContext

  test.beforeAll(async ({ browser }) => {
    context = await ouvrirSession(browser, TEST_USERS.exploitation)
  })
  test.afterAll(async () => {
    await context.close()
  })

  test('?vue=passation affiche quand même l’exécution, sans filtre, pipeline, passation ni montant', async () => {
    const page = await ouvrirAccueil(context, '?vue=passation')
    const main = page.locator('main')
    await expect(main.getByRole('link', { name: new RegExp(MARCHE_RECEPTION.replace(/[[\]]/g, '\\$&')) })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Filtrer la page' })).toHaveCount(0)
    await expect(main.getByRole('region', { name: 'Pipeline des offres' })).toHaveCount(0)
    await expect(main.getByText(`${PREFIXE} AO-`)).toHaveCount(0)
    await expect(main.getByText('Taux de succès des offres')).toHaveCount(0)
    await expect(main.getByText('Dépôts sous 14 j non prêts')).toHaveCount(0)
    const contenu = await page.content()
    expect(contenu).not.toMatch(/FCFA|XOF/)
    expect(contenu.replace(/[\s  ]/g, '')).not.toMatch(/5000000|2000000/)
    await expect(page.locator('h1')).toHaveCount(1)
    await page.close()
  })
})
