import { test, expect as expectBase } from '@playwright/test'
import type { Browser, Cookie, Locator, Page } from '@playwright/test'
import { Client } from 'pg'
import { TEST_USERS } from '../helpers/auth'

/**
 * Tests E2E — Véhicules proposés par lot
 *
 * V1 : pas de bouton « Véhicules proposés » avant « Dossier en préparation »
 * V2 : saisie de 2 véhicules → liste affichée, montant du lot calculé (75 000 000), champ du lot en lecture seule
 * V3 : les suggestions de marques sont proposées et le prix est pré-rempli à la saisie d'un modèle connu
 * V4 : la saisie reste possible après le dépôt (« Offre soumise »)
 * V5 : la saisie est figée une fois le marché créé depuis les lots (la liste reste lisible)
 *
 * Données de test : préfixe [E2E-VEH], supprimées en beforeAll et afterAll (les lots et leurs véhicules
 * suivent par cascade). Les requêtes SQL sont limitées à la base Docker locale.
 */

// Machine de test à court de mémoire + serveur de dev : les rendus et les actions serveur peuvent
// se figer plusieurs dizaines de secondes, d'où des délais d'attente larges plutôt que ceux de la config
const expect = expectBase.configure({ timeout: 15000 })
test.use({ actionTimeout: 30000 })

const OBJET_A = '[E2E-VEH] Véhicules par lot'
const AC = 'Ministère Test E2E Véhicules'

let adminCookies: Cookie[] = []
let oppId = ''

// ─── Accès SQL restreint à la base locale ─────────────────────────────────────

/**
 * Exécute une requête sur la base de test Docker locale (127.0.0.1:5433), et nulle part ailleurs :
 * l'hôte et le port sont vérifiés avant toute connexion. Usage réservé au repérage d'ids, au
 * nettoyage [E2E-VEH] et à la lecture de l'état du marché (test V5).
 */
async function requeteLocale<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL absente : la base de test locale est introuvable.')

  let hote = ''
  let port = ''
  try {
    const u = new URL(url)
    hote = u.hostname
    port = u.port
  } catch {
    throw new Error('DATABASE_URL illisible : connexion refusée.')
  }
  if (hote !== '127.0.0.1' || port !== '5433') {
    throw new Error(`Connexion refusée : la base de test doit être 127.0.0.1:5433 (hôte lu : ${hote}, port lu : ${port}).`)
  }

  const client = new Client({ connectionString: url })
  await client.connect()
  try {
    const res = await client.query(sql, params)
    return res.rows as T[]
  } finally {
    await client.end()
  }
}

async function supprimerDonneesE2E() {
  await requeteLocale("delete from opportunites where objet like '[E2E-VEH]%'")
  // Marché créé depuis l'opportunité au test V5 (son objet reprend celui de l'opportunité)
  await requeteLocale("delete from marches where objet like '[E2E-VEH]%'")
}

async function idOpportunite(objet: string): Promise<string> {
  const rows = await requeteLocale<{ id: string }>('select id from opportunites where objet = $1', [objet])
  const id = rows[0]?.id
  if (!id) throw new Error(`Opportunité introuvable en base : ${objet}`)
  return id
}

// ─── Aides UI ─────────────────────────────────────────────────────────────────

async function avecPage(browser: Browser, corps: (page: Page) => Promise<void>) {
  const context = await browser.newContext()
  await context.addCookies(adminCookies)
  const page = await context.newPage()
  page.setDefaultNavigationTimeout(120000)
  try {
    await corps(page)
  } finally {
    await context.close()
  }
}

async function allerA(page: Page, url: string) {
  await page.goto(url)
  await page.waitForLoadState('networkidle')
}

/**
 * Clique un élément rendu par le serveur une fois qu'il est hydraté : `networkidle` ne le garantit pas avec le
 * serveur de dev, et un clic sur un bouton pas encore hydraté est perdu sans erreur (React pose `__reactProps`
 * sur les nœuds hydratés).
 */
async function cliquerApresHydratation(element: Locator) {
  await expect
    .poll(() => element.evaluate((el) => Object.keys(el).some((k) => k.startsWith('__reactProps'))), { timeout: 30000 })
    .toBe(true)
  await element.click()
}

/**
 * Valide un formulaire et attend son toast de succès. Sous charge, le serveur de dev peut échouer une action
 * avec une erreur transitoire (Prisma P2028 : transaction non démarrée à temps) : le formulaire reste alors
 * ouvert avec un toast « Erreur… », et l'on revalide au plus deux fois. Une erreur durable échoue toujours.
 * (Le toast peut aussi apparaître dans une région ARIA : .first() évite la violation du mode strict.)
 */
async function validerEtAttendreToast(page: Page, bouton: Locator, toastSucces: string) {
  const erreur = page.getByText(/Erreur/).first()
  for (let essai = 1; ; essai++) {
    await bouton.click()
    await expect(page.getByText(toastSucces).first().or(erreur)).toBeVisible({ timeout: 60000 })
    if (await page.getByText(toastSucces).first().isVisible()) return
    if (essai === 3) throw new Error(`Action en erreur après ${essai} essais : ${await erreur.textContent()}`)
  }
}

async function creerOpportunite(page: Page, objet: string) {
  await allerA(page, '/opportunites/nouvelle')
  await page.fill('input[placeholder*="véhicules utilitaires"]', objet)
  await page.fill('input[placeholder*="Ministère des Transports"]', AC)
  await expect(page.locator('[role="combobox"]').first()).toContainText(/En analyse/, { timeout: 5000 })
  await validerEtAttendreToast(page, page.locator('button[type="submit"]'), 'Opportunité créée')
  // La liste recompile à froid en ≈ 20 s sur la machine de test (pages inactives libérées par Next dev)
  await page.waitForURL(/\/opportunites$/, { timeout: 60000 })
}

async function ajouterLot(page: Page, oppId: string, numero: number, intitule: string, montantPropose: number) {
  // Sans navigation quand l'onglet des lots est déjà affiché (chaque rendu du serveur de dev coûte plusieurs
  // secondes) : le numéro pré-rempli doit alors venir de la fiche rafraîchie après le lot précédent
  if (!page.url().includes(`/opportunites/${oppId}?onglet=lots`)) {
    await allerA(page, `/opportunites/${oppId}?onglet=lots`)
  }
  await cliquerApresHydratation(page.getByRole('button', { name: 'Ajouter un lot' }))
  const dialogue = page.getByRole('dialog')
  await expect(dialogue.getByRole('heading', { name: 'Nouveau lot' })).toBeVisible()
  await expect(dialogue.getByLabel('Numéro *')).toHaveValue(String(numero))
  await dialogue.getByLabel('Intitulé *').fill(intitule)
  await dialogue.getByLabel('Montant proposé (XOF)').fill(String(montantPropose))
  await validerEtAttendreToast(page, dialogue.getByRole('button', { name: 'Créer' }), 'Lot créé')
  await expect(dialogue).toBeHidden()
  await expect(page.getByRole('row').filter({ hasText: intitule })).toBeVisible({ timeout: 15000 })
}

async function changerStatut(page: Page, oppId: string, libelle: string, { recharger = true } = {}) {
  // Le bouton « Statut » est dans l'en-tête de la fiche, quel que soit l'onglet : pas de navigation si on y est déjà
  if (!page.url().includes(`/opportunites/${oppId}`)) {
    await allerA(page, `/opportunites/${oppId}`)
  }
  await cliquerApresHydratation(page.getByRole('button', { name: 'Statut', exact: true }))
  await expect(page.getByRole('heading', { name: 'Changer le statut' })).toBeVisible()
  await page.locator('#new-statut').click()
  await page.getByRole('option', { name: libelle, exact: true }).click()
  await validerEtAttendreToast(page, page.getByRole('button', { name: 'Confirmer' }), `Statut changé : ${libelle}`)
  // Rechargement avant de relire la page ; inutile quand l'étape suivante commence par une navigation
  if (recharger) {
    await page.reload()
    await page.waitForLoadState('networkidle')
  }
}

async function saisirResultat(
  page: Page,
  oppId: string,
  numeroLot: number,
  resultat: string,
  toastAttendu: string,
  motifPerte?: string,
) {
  await allerA(page, `/opportunites/${oppId}?onglet=lots`)
  await cliquerApresHydratation(page.getByRole('button', { name: `Saisir le résultat du lot ${numeroLot}` }))
  const dialogue = page.getByRole('dialog')
  await expect(dialogue.getByRole('heading', { name: `Résultat — Lot ${numeroLot}` })).toBeVisible()
  await dialogue.getByRole('combobox').click()
  await page.getByRole('option', { name: resultat, exact: true }).click()
  if (motifPerte) {
    await dialogue.getByLabel('Motif de la perte *').fill(motifPerte)
  }
  await validerEtAttendreToast(page, dialogue.getByRole('button', { name: 'Enregistrer' }), toastAttendu)
  await expect(dialogue).toBeHidden()
}

// ─── Scénarios ────────────────────────────────────────────────────────────────

test.describe.serial('Véhicules proposés par lot', () => {
  test.beforeAll(async ({ browser }) => {
    // Marge large : à froid, le serveur de dev compile /login et la route d'authentification (40 s chacune observées)
    test.setTimeout(180000)
    const context = await browser.newContext()
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(120000)

    await page.goto('/login')
    await page.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30000 })
    await page.fill('input[name="email"]', TEST_USERS.admin.email)
    await page.fill('input[name="password"]', TEST_USERS.admin.password)
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 120000 })
    await page.waitForLoadState('networkidle')

    adminCookies = await context.cookies()
    await context.close()

    // Nettoyage préventif : toute opportunité [E2E-VEH] résiduelle
    await supprimerDonneesE2E()
  })

  test.afterAll(async () => {
    await supprimerDonneesE2E()
    const restant = await requeteLocale<{ n: number }>(
      "select count(*)::int as n from opportunites where objet like '[E2E-VEH]%'",
    )
    expect(restant[0]?.n).toBe(0)
    const marchesRestants = await requeteLocale<{ n: number }>(
      "select count(*)::int as n from marches where objet like '[E2E-VEH]%'",
    )
    expect(marchesRestants[0]?.n).toBe(0)
  })

  test('V1 : pas de bouton véhicules avant « Dossier en préparation »', async ({ browser }) => {
    test.setTimeout(180000)
    await avecPage(browser, async (page) => {
      await creerOpportunite(page, OBJET_A)
      oppId = await idOpportunite(OBJET_A)
      await ajouterLot(page, oppId, 1, 'Lot bus', 0)
      await expect(page.getByRole('button', { name: 'Véhicules proposés du lot 1' })).toHaveCount(0)
    })
  })

  test('V2 : saisie de 2 véhicules → montant du lot calculé et champ du lot en lecture seule', async ({ browser }) => {
    test.setTimeout(180000)
    await avecPage(browser, async (page) => {
      expect(oppId).toBeTruthy()
      await changerStatut(page, oppId, 'GO')
      await changerStatut(page, oppId, 'Dossier en préparation')
      await allerA(page, `/opportunites/${oppId}?onglet=lots`)
      await cliquerApresHydratation(page.getByRole('button', { name: 'Véhicules proposés du lot 1' }))
      const d = page.getByRole('dialog')
      await d.getByLabel('Marque *').first().fill('Toyota')
      await d.getByLabel('Modèle *').first().fill('Coaster')
      await d.getByLabel('Qté *').first().fill('2')
      await d.getByLabel('Prix unitaire (XOF) *').first().fill('30000000')
      await d.getByRole('button', { name: 'Ajouter un véhicule' }).click()
      await d.getByLabel('Marque *').nth(1).fill('Renault')
      await d.getByLabel('Modèle *').nth(1).fill('Master')
      await d.getByLabel('Qté *').nth(1).fill('1')
      await d.getByLabel('Prix unitaire (XOF) *').nth(1).fill('15000000')
      // 2 × 30 000 000 + 1 × 15 000 000 : le séparateur de milliers peut être une espace insécable (le \s la couvre)
      await expect(d.getByText(/75\s?000\s?000/)).toBeVisible()
      await validerEtAttendreToast(page, d.getByRole('button', { name: 'Enregistrer' }), 'Véhicules proposés enregistrés')
      await expect(d).toBeHidden()
      await expect(page.getByText('2 × Toyota Coaster')).toBeVisible({ timeout: 15000 })
      const ligne = page.getByRole('row').filter({ hasText: 'Lot bus' })
      await expect(ligne).toContainText(/75\s?000\s?000/)
      await cliquerApresHydratation(page.getByRole('button', { name: 'Modifier le lot 1' }))
      await expect(page.getByRole('dialog').getByLabel('Montant proposé (XOF)')).toBeDisabled()
    })
  })

  test('V3 : suggestions et pré-remplissage du prix à la 2e saisie', async ({ browser }) => {
    test.setTimeout(180000)
    await avecPage(browser, async (page) => {
      await ajouterLot(page, oppId, 2, 'Lot pick-up', 0)
      await cliquerApresHydratation(page.getByRole('button', { name: 'Véhicules proposés du lot 2' }))
      const d = page.getByRole('dialog')
      // Les suggestions se chargent en arrière-plan à l'ouverture : attendre qu'elles existent avant de saisir
      // (les <option> d'une datalist sont dans le DOM), sinon le pré-remplissage du prix n'a rien à trouver
      await expect(page.locator('#vehicules-marques option[value="Toyota"]')).toHaveCount(1, { timeout: 30000 })
      await d.getByLabel('Marque *').first().fill('Toyota')
      await d.getByLabel('Modèle *').first().fill('Coaster')
      await expect(d.getByLabel('Prix unitaire (XOF) *').first()).toHaveValue('30000000')
    })
  })

  test('V4 : saisie encore possible après le dépôt', async ({ browser }) => {
    test.setTimeout(180000)
    await avecPage(browser, async (page) => {
      await changerStatut(page, oppId, 'Offre soumise')
      await allerA(page, `/opportunites/${oppId}?onglet=lots`)
      await expect(page.getByRole('button', { name: 'Véhicules proposés du lot 1' })).toBeVisible()
    })
  })

  test('V5 : figé une fois le marché créé depuis les lots', async ({ browser }) => {
    test.setTimeout(180000)
    await avecPage(browser, async (page) => {
      await changerStatut(page, oppId, 'En attente d\'attribution', { recharger: false })
      await saisirResultat(page, oppId, 1, 'Gagné', 'Résultat enregistré — opportunité : Gagnée')

      // Avant la création du marché : saisie encore possible (renégociation)
      await allerA(page, `/opportunites/${oppId}?onglet=lots`)
      await expect(page.getByRole('button', { name: 'Véhicules proposés du lot 1' })).toBeVisible({ timeout: 15000 })

      // Création du marché depuis les lots (même geste qu'au test 4b de lots-dossiers.spec.ts)
      await allerA(page, `/opportunites/${oppId}`)
      await cliquerApresHydratation(page.getByRole('button', { name: 'Créer le marché' }))
      await expect
        .poll(async () => (await requeteLocale<{ marcheId: string | null }>('select "marcheId" from opportunites where id = $1', [oppId]))[0]?.marcheId ?? null, { timeout: 60000 })
        .not.toBeNull()

      // Le marché reprend le montant du lot gagné calculé depuis ses véhicules : 2 × 30 000 000 + 1 × 15 000 000
      const marches = await requeteLocale<{ montant: string }>('select montant from marches where "opportuniteId" = $1', [oppId])
      expect(marches).toHaveLength(1)
      expect(Number(marches[0].montant)).toBe(75000000)

      // Après : plus de bouton, la liste reste lisible
      await allerA(page, `/opportunites/${oppId}?onglet=lots`)
      await expect(page.getByText('2 × Toyota Coaster')).toBeVisible({ timeout: 15000 })
      await expect(page.getByRole('button', { name: 'Véhicules proposés du lot 1' })).toHaveCount(0)
    })
  })
})
