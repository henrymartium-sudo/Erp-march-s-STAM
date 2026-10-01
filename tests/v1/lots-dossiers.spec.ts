import { test, expect as expectBase } from '@playwright/test'
import type { Browser, Cookie, Locator, Page } from '@playwright/test'
import { Client } from 'pg'
import { TEST_USERS } from '../helpers/auth'

/**
 * Tests E2E — Cycle opportunité → lots → dossiers → résultat
 *
 * T12-1 : création d'une opportunité, ajout de 2 lots, passage GO puis « Dossier en préparation »
 *         → un dossier par lot (#lot-N) et les pièces communes créées
 * T12-2 : la progression affichée dans la liste tient compte d'une pièce commune passée à « Complet »
 * T12-3 : « Offre soumise » verrouille les pièces (plus de combobox, statuts en texte simple)
 * T12-4 : résultats par lot : un lot « Gagné » suffit pour que l'opportunité soit « Gagnée »
 * T12-5 : un unique lot « Infructueux » → l'opportunité est « Perdue »
 * T12-6 : anciennes routes /dossiers-offre redirigées vers la fiche opportunité
 *
 * Données de test : préfixe [E2E-LOTS], supprimées en beforeAll et afterAll (les lots, dossiers
 * et pièces suivent par cascade). Les requêtes SQL sont limitées à la base Docker locale.
 */

// Machine de test à court de mémoire + serveur de dev : les rendus et les actions serveur peuvent
// se figer plusieurs dizaines de secondes, d'où des délais d'attente larges plutôt que ceux de la config
const expect = expectBase.configure({ timeout: 15000 })
test.use({ actionTimeout: 30000 })

const OBJET_A = '[E2E-LOTS] Cycle complet'
const OBJET_B = '[E2E-LOTS] Lot infructueux'
const AC = 'Ministère Test E2E Lots'

let adminCookies: Cookie[] = []
let oppAId = ''
let oppBId = ''

// ─── Accès SQL restreint à la base locale ─────────────────────────────────────

/**
 * Exécute une requête sur la base de test Docker locale (127.0.0.1:5433), et nulle part ailleurs :
 * l'hôte et le port sont vérifiés avant toute connexion. Usage réservé au repérage d'ids, au
 * nettoyage [E2E-LOTS] et à l'arrangement d'un statut (test 5).
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
  await requeteLocale("delete from opportunites where objet like '[E2E-LOTS]%'")
  // Marché créé depuis l'opportunité au test 4b (son objet reprend celui de l'opportunité)
  await requeteLocale("delete from marches where objet like '[E2E-LOTS]%'")
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

/** Lit le « dossier P % » affiché sous l'objet de l'opportunité dans la liste. */
async function lirePourcentageDossierListe(page: Page, objet: string): Promise<number> {
  await allerA(page, `/opportunites?phase=toutes&search=${encodeURIComponent(objet)}`)
  const ligne = page.getByRole('row').filter({ hasText: objet })
  await expect(ligne).toHaveCount(1, { timeout: 15000 })
  const texte = (await ligne.getByText(/dossier \d+ %/).textContent()) ?? ''
  const pourcentage = /dossier (\d+) %/.exec(texte)?.[1]
  expect(pourcentage, `pourcentage de dossier introuvable dans « ${texte} »`).toBeDefined()
  return Number(pourcentage)
}

// ─── Scénarios ────────────────────────────────────────────────────────────────

test.describe.serial('Lots et dossiers — cycle opportunité → résultat', () => {
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

    // Nettoyage préventif : toute opportunité [E2E-LOTS] résiduelle
    await supprimerDonneesE2E()
  })

  test.afterAll(async () => {
    await supprimerDonneesE2E()
    const restant = await requeteLocale<{ n: number }>(
      "select count(*)::int as n from opportunites where objet like '[E2E-LOTS]%'",
    )
    expect(restant[0]?.n).toBe(0)
    const marchesRestants = await requeteLocale<{ n: number }>(
      "select count(*)::int as n from marches where objet like '[E2E-LOTS]%'",
    )
    expect(marchesRestants[0]?.n).toBe(0)
  })

  // ─── 1 : création, lots, GO, dossier en préparation ─────────────────────────

  test('[E2E-LOTS] 1 — Un dossier par lot et les pièces communes sont créés au passage en « Dossier en préparation »', async ({ browser }) => {
    test.setTimeout(180000)
    await avecPage(browser, async (page) => {
      await creerOpportunite(page, OBJET_A)
      oppAId = await idOpportunite(OBJET_A)

      await ajouterLot(page, oppAId, 1, 'Lot un', 1500000)
      await ajouterLot(page, oppAId, 2, 'Lot deux', 2500000)

      await changerStatut(page, oppAId, 'GO')
      await changerStatut(page, oppAId, 'Dossier en préparation')

      // Onglet « Lots & dossiers » (déjà affiché : le rechargement conserve l'onglet) : une section de dossier par lot
      await expect(page).toHaveURL(/\?onglet=lots$/)
      await expect(page.getByRole('tab', { name: /Lots & dossiers \(2\)/ })).toBeVisible()
      await expect(page.locator('#lot-1')).toBeVisible({ timeout: 15000 })
      await expect(page.locator('#lot-1').getByRole('heading', { name: 'Dossier — Lot 1 : Lot un' })).toBeVisible()
      await expect(page.locator('#lot-2')).toBeVisible()
      await expect(page.locator('#lot-2').getByRole('heading', { name: 'Dossier — Lot 2 : Lot deux' })).toBeVisible()

      // Onglet « Pièces communes » : carte remplie, message vide absent
      await allerA(page, `/opportunites/${oppAId}?onglet=pieces`)
      const panneau = page.getByRole('tabpanel')
      await expect(panneau.getByText('Pièces communes', { exact: true })).toBeVisible({ timeout: 15000 })
      await expect(panneau.getByText(/Les pièces communes seront créées/)).toHaveCount(0)
      // Compteur « 0/N » avec N ≥ 1 : au moins une pièce, aucune complète, une liste déroulante par pièce
      const compteur = panneau.getByText(/^0\/[1-9]\d*$/)
      await expect(compteur).toBeVisible()
      const nbPieces = Number(/^0\/(\d+)$/.exec((await compteur.textContent()) ?? '')?.[1])
      expect(nbPieces).toBeGreaterThan(0)
      await expect(panneau.getByRole('combobox')).toHaveCount(nbPieces)
    })
  })

  // ─── 2 : la progression de la liste suit les pièces communes ────────────────

  test('[E2E-LOTS] 2 — Une pièce commune « Complet » fait progresser le dossier affiché dans la liste', async ({ browser }) => {
    test.setTimeout(180000)
    await avecPage(browser, async (page) => {
      expect(oppAId).toBeTruthy()
      const avant = await lirePourcentageDossierListe(page, OBJET_A)
      expect(avant).toBe(0)

      await allerA(page, `/opportunites/${oppAId}?onglet=pieces`)
      const premierStatut = page.getByRole('tabpanel').getByRole('combobox').first()
      await cliquerApresHydratation(premierStatut)
      await page.getByRole('option', { name: 'Complet', exact: true }).click()
      await expect(premierStatut).toHaveText('Complet', { timeout: 15000 })

      const apres = await lirePourcentageDossierListe(page, OBJET_A)
      expect(apres).toBeGreaterThan(avant)
    })
  })

  // ─── 3 : « Offre soumise » verrouille les pièces ────────────────────────────

  test('[E2E-LOTS] 3 — « Offre soumise » verrouille les pièces : statuts en texte simple', async ({ browser }) => {
    test.setTimeout(180000)
    await avecPage(browser, async (page) => {
      expect(oppAId).toBeTruthy()
      await changerStatut(page, oppAId, 'Offre soumise', { recharger: false })

      // Onglet « Lots & dossiers » : plus de liste déroulante, statuts des pièces en texte, lots figés
      await allerA(page, `/opportunites/${oppAId}?onglet=lots`)
      const panneauLots = page.getByRole('tabpanel')
      await expect(panneauLots).toBeVisible({ timeout: 15000 })
      await expect(panneauLots.locator('#lot-1')).toBeVisible()
      await expect(panneauLots.getByText('Absent', { exact: true }).first()).toBeVisible()
      await expect(panneauLots.getByRole('combobox')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Ajouter un lot' })).toHaveCount(0)

      // Onglet « Pièces communes » : la pièce passée à « Complet » au test 2 est rendue en texte simple
      await allerA(page, `/opportunites/${oppAId}?onglet=pieces`)
      const panneauPieces = page.getByRole('tabpanel')
      await expect(panneauPieces.getByText('Pièces communes', { exact: true })).toBeVisible({ timeout: 15000 })
      await expect(panneauPieces.getByText('Complet', { exact: true })).toHaveCount(1)
      await expect(panneauPieces.getByRole('combobox')).toHaveCount(0)
    })
  })

  // ─── 4 : résultats par lot ──────────────────────────────────────────────────

  test('[E2E-LOTS] 4 — Un lot « Gagné » rend l\'opportunité « Gagnée » ; le 2ᵉ lot reste saisissable', async ({ browser }) => {
    test.setTimeout(180000)
    await avecPage(browser, async (page) => {
      expect(oppAId).toBeTruthy()
      await changerStatut(page, oppAId, 'En attente d\'attribution', { recharger: false })

      // Dès la première saisie « Gagné », l'opportunité est « Gagnée »
      await saisirResultat(page, oppAId, 1, 'Gagné', 'Résultat enregistré — opportunité : Gagnée')
      // Le lot 2 est encore saisissable (statut Gagnée) : perdu, motif obligatoire
      await saisirResultat(page, oppAId, 2, 'Perdu', 'Résultat enregistré — opportunité : Gagnée', 'Prix trop élevé')

      // Fiche, onglet Informations : badge « Gagnée »
      await allerA(page, `/opportunites/${oppAId}`)
      await expect(page.locator('main').getByText('Gagnée', { exact: true })).toBeVisible({ timeout: 15000 })

      // Onglet « Lots & dossiers » : résultat de chaque lot
      await allerA(page, `/opportunites/${oppAId}?onglet=lots`)
      const ligneLot1 = page.getByRole('row').filter({ hasText: 'Lot un' })
      const ligneLot2 = page.getByRole('row').filter({ hasText: 'Lot deux' })
      await expect(ligneLot1.getByText('Gagné', { exact: true }).filter({ visible: true })).toBeVisible({ timeout: 15000 })
      await expect(ligneLot2.getByText('Perdu', { exact: true }).filter({ visible: true })).toBeVisible()
    })
  })

  // ─── 4b : marché créé, résultats figés ──────────────────────────────────────

  test('[E2E-LOTS] 4b — Une fois le marché créé, le résultat d\'un lot ne peut plus être modifié', async ({ browser }) => {
    test.setTimeout(180000)
    await avecPage(browser, async (page) => {
      expect(oppAId).toBeTruthy()
      await allerA(page, `/opportunites/${oppAId}`)
      await cliquerApresHydratation(page.getByRole('button', { name: 'Créer le marché' }))
      await expect
        .poll(async () => (await requeteLocale<{ marcheId: string | null }>('select "marcheId" from opportunites where id = $1', [oppAId]))[0]?.marcheId ?? null, { timeout: 60000 })
        .not.toBeNull()

      // Le lot 1 est « Gagné » : le repasser en « Perdu » laisserait un marché actif sur une opportunité perdue
      await allerA(page, `/opportunites/${oppAId}?onglet=lots`)
      await cliquerApresHydratation(page.getByRole('button', { name: 'Saisir le résultat du lot 1' }))
      const dialogue = page.getByRole('dialog')
      await dialogue.getByRole('combobox').click()
      await page.getByRole('option', { name: 'Perdu', exact: true }).click()
      await dialogue.getByLabel('Motif de la perte *').fill('Essai après création du marché')
      await dialogue.getByRole('button', { name: 'Enregistrer' }).click()
      await expect(page.getByText('Un marché est déjà créé pour cette opportunité').first()).toBeVisible({ timeout: 60000 })

      // Rien n'a bougé en base
      const lot = await requeteLocale<{ resultat: string }>('select resultat from lots where "opportuniteId" = $1 and numero = 1', [oppAId])
      const opp = await requeteLocale<{ statut: string }>('select statut from opportunites where id = $1', [oppAId])
      expect(lot[0]?.resultat).toBe('GAGNE')
      expect(opp[0]?.statut).toBe('GAGNEE')
    })
  })

  // ─── 5 : lot infructueux ────────────────────────────────────────────────────

  test('[E2E-LOTS] 5 — Un unique lot « Infructueux » rend l\'opportunité « Perdue »', async ({ browser }) => {
    test.setTimeout(180000)
    await avecPage(browser, async (page) => {
      await creerOpportunite(page, OBJET_B)
      oppBId = await idOpportunite(OBJET_B)
      await ajouterLot(page, oppBId, 1, 'Lot unique', 900000)

      // Arrangement : la chaîne complète des statuts est déjà couverte par les tests 1 à 4
      await requeteLocale("update opportunites set statut = 'EN_ATTENTE_ATTRIBUTION' where id = $1", [oppBId])

      await saisirResultat(page, oppBId, 1, 'Infructueux', 'Résultat enregistré — opportunité : Perdue')

      // Fiche, onglet Informations : badge « Perdue »
      await allerA(page, `/opportunites/${oppBId}`)
      await expect(page.locator('main').getByText('Perdue', { exact: true })).toBeVisible({ timeout: 15000 })

      // Liste (toutes phases) : la ligne de l'opportunité affiche « Perdue »
      await allerA(page, `/opportunites?phase=toutes&search=${encodeURIComponent(OBJET_B)}`)
      const ligne = page.getByRole('row').filter({ hasText: OBJET_B })
      await expect(ligne.getByText('Perdue', { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 })
    })
  })

  // ─── 6 : anciennes routes ───────────────────────────────────────────────────

  test('[E2E-LOTS] 6 — Les anciennes routes /dossiers-offre redirigent vers la fiche opportunité', async ({ browser }) => {
    test.setTimeout(180000)
    await avecPage(browser, async (page) => {
      expect(oppAId).toBeTruthy()
      const dossiers = await requeteLocale<{ id: string }>(
        'select d.id from dossiers_offre d join lots l on l.id = d."lotId" where d."opportuniteId" = $1 and l.numero = 1',
        [oppAId],
      )
      const dossierId = dossiers[0]?.id
      expect(dossierId, 'dossier du lot 1 introuvable').toBeTruthy()

      // Fiche du dossier → onglet « Lots & dossiers » de l'opportunité, ancre du lot 1.
      // Le serveur de développement compile la route à froid (plus de 40 s observés) avant de rediriger.
      await page.goto(`/dossiers-offre/${dossierId}`, { timeout: 150000 })
      await expect(page).toHaveURL(new RegExp(`/opportunites/${oppAId}\\?onglet=lots(#lot-1)?$`), { timeout: 15000 })
      await expect(page.locator('#lot-1')).toBeVisible({ timeout: 15000 })

      // Liste des dossiers → liste des opportunités
      await page.goto('/dossiers-offre', { timeout: 150000 })
      await expect(page).toHaveURL(/\/opportunites$/, { timeout: 15000 })
    })
  })
})
