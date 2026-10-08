import { test, expect as expectBase } from '@playwright/test'
import type { Page } from '@playwright/test'
import { randomUUID } from 'crypto'
import { login, TEST_USERS } from '../helpers/auth'
import { requeteLocale } from '../helpers/base-locale'

/**
 * Tests E2E — Veille concurrentielle
 *
 * 1 : accès réservé à ADMIN et AVANCE (menu et adresse directe)
 * 2 : un concurrent écrit de trois façons forme une seule ligne, avec écart moyen au-delà de 3 lots
 * 3 : les pertes sans concurrent ou sans montant sont listées avec ce qui manque ; les noms proches sont signalés
 * 4 : la période est conservée entre /pilotage et /veille, dans les deux sens
 * 5 : période sans perte → message explicite
 * 6 : pas de défilement horizontal à 375, 768 et 1920 px
 * 7 : détail d'une ligne atteignable et repliable au clavier
 *
 * Données de test : préfixe [E2E-VEILLE], supprimées en beforeAll et afterAll (lots et véhicules par cascade).
 * Les assertions portent sur les lignes de ces données : la base de test peut contenir d'autres lots.
 */

const expect = expectBase.configure({ timeout: 15000 })
test.use({ actionTimeout: 30000 })

const PREFIXE = '[E2E-VEILLE]'
const AUTORITE = 'Autorité Veille E2E'

async function supprimerDonnees() {
  await requeteLocale(`delete from opportunites where objet like '${PREFIXE}%'`)
}

async function inserer() {
  const [utilisateur] = await requeteLocale<{ id: string }>('select id from users where email = $1', [TEST_USERS.admin.email])
  if (!utilisateur) throw new Error('Utilisateur de test introuvable en base locale.')

  const opportunite = async (objet: string): Promise<string> => {
    const id = randomUUID()
    await requeteLocale(
      `insert into opportunites (id, objet, "autoriteContractante", "dateLimite", statut, "userId", "updatedAt")
       values ($1, $2, $3, now() - interval '10 days', 'PERDUE', $4, now())`,
      [id, `${PREFIXE} ${objet}`, AUTORITE, utilisateur.id],
    )
    return id
  }
  const lot = async (oppId: string, numero: number, propose: number | null, concurrent: string | null, montant: number | null, motif: string | null) => {
    const id = randomUUID()
    await requeteLocale(
      `insert into lots (id, "opportuniteId", numero, intitule, "montantPropose", resultat, "motifPerte", "concurrentGagnant", "montantOffreConcurrent", "updatedAt")
       values ($1, $2, $3, $4, $5, 'PERDU', $6, $7, $8, now())`,
      [id, oppId, numero, `Lot ${numero}`, propose, motif, concurrent, montant],
    )
    return id
  }
  const vehicule = async (lotId: string, marque: string, modele: string, ordre: number) => {
    await requeteLocale(
      `insert into vehicules_proposes (id, "lotId", marque, modele, quantite, "prixUnitaire", ordre, "updatedAt")
       values ($1, $2, $3, $4, 1, 1000000, $5, now())`,
      [randomUUID(), lotId, marque, modele, ordre],
    )
  }

  // Un même concurrent écrit de trois façons : 3 lots, écarts 25 %, 25 % et 0 %
  const a = await opportunite('Concurrent trois orthographes')
  const l1 = await lot(a, 1, 1_000_000, 'E2E Auto Plus SARL', 800_000, 'Prix trop élevé')
  const l2 = await lot(a, 2, 2_000_000, 'e2e auto plus', 1_600_000, null)
  const l3 = await lot(a, 3, 1_500_000, 'E2E Auto Plus', 1_500_000, 'Prix')
  await vehicule(l1, 'Toyota', 'Hilux', 0)
  await vehicule(l2, 'Toyota', 'Hilux', 0)
  await vehicule(l2, 'Isuzu', 'D-Max', 1)
  await vehicule(l3, 'Toyota', 'Hilux', 0)
  // Perte non documentée : ni concurrent ni montant du concurrent
  await lot(a, 4, 900_000, null, null, null)
  // Nom proche (une lettre de plus) : doublon possible
  const b = await opportunite('Concurrent nom proche')
  await lot(b, 1, 700_000, 'E2E Auto Pluss', 650_000, 'Conformité')
}

async function sansDefilementHorizontal(page: Page, largeur: number) {
  await page.setViewportSize({ width: largeur, height: 900 })
  await page.goto('/veille')
  await expect(page.getByRole('heading', { name: 'Veille concurrentielle' })).toBeVisible()
  await expect(page.getByRole('status', { name: 'Chargement de la veille' })).toHaveCount(0)
  const debordement = await page.evaluate(() => {
    const racine = document.documentElement
    return { scroll: racine.scrollWidth, client: racine.clientWidth }
  })
  expect(debordement.scroll, `scrollWidth ${debordement.scroll} > clientWidth ${debordement.client} à ${largeur}px`).toBeLessThanOrEqual(debordement.client)
}

test.describe('Veille concurrentielle', () => {
  test.beforeAll(async () => {
    await supprimerDonnees()
    await inserer()
  })
  test.afterAll(async () => {
    await supprimerDonnees()
    const [reste] = await requeteLocale<{ n: number }>(`select count(*)::int as n from opportunites where objet like '${PREFIXE}%'`)
    expect(reste?.n).toBe(0)
  })

  test('1 — accès réservé à ADMIN et AVANCE', async ({ page, browser }) => {
    await login(page, TEST_USERS.avance)
    await expect(page.getByRole('link', { name: 'Veille', exact: true })).toBeVisible()
    await page.goto('/veille')
    await expect(page.getByRole('heading', { name: 'Veille concurrentielle' })).toBeVisible()

    for (const utilisateur of [TEST_USERS.exploitation, TEST_USERS.visiteur]) {
      const contexte = await browser.newContext()
      const autre = await contexte.newPage()
      await login(autre, utilisateur)
      await autre.goto('/veille')
      await expect(autre.getByRole('heading', { name: 'Veille concurrentielle' })).toHaveCount(0)
      await expect(autre.getByRole('link', { name: 'Veille', exact: true })).toHaveCount(0)
      await contexte.close()
    }
  })

  test('2 — un concurrent écrit de trois façons forme une seule ligne, avec son écart moyen', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/veille')
    await expect(page.getByText(/\d+ lot\(s\) sur \d+ documenté\(s\)/)).toBeVisible()
    const ligne = page.getByRole('listitem').filter({ hasText: 'E2E Auto Plus SARL' }).filter({ hasText: '3 lot(s) perdu(s)' })
    await expect(ligne).toHaveCount(1)
    // moyenne de 25 %, 25 % et 0 % = 16,67 %, affichée arrondie
    await expect(ligne).toContainText('(+17 %)')
    await expect(ligne.getByText('Autorités concernées')).toBeVisible()
    await expect(ligne).toContainText(AUTORITE)
  })

  test('3 — les pertes non documentées indiquent ce qui manque, les noms proches sont signalés', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/veille')
    const nonDocumentees = page.getByRole('region', { name: 'Non documentées' })
    await expect(nonDocumentees).toContainText('Il manque : concurrent, montant du concurrent, motif')
    const doublons = page.getByRole('region', { name: 'Doublons possibles' })
    await expect(doublons).toContainText('E2E Auto Plus SARL')
    await expect(doublons).toContainText('E2E Auto Pluss')
  })

  test('4 — la période est conservée entre /pilotage et /veille', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/veille?debut=2026-01-01&fin=2026-06-30')
    await expect(page.getByText(/période du 01\/01\/2026 au 30\/06\/2026/)).toBeVisible()
    const retour = page.getByRole('link', { name: 'Retour au pilotage' })
    await expect(retour).toHaveAttribute('href', '/pilotage?debut=2026-01-01&fin=2026-06-30')
    await retour.click()
    await expect(page).toHaveURL(/\/pilotage\?debut=2026-01-01&fin=2026-06-30/)
    await expect(page.getByText(/période du 01\/01\/2026 au 30\/06\/2026/)).toBeVisible()
    const aller = page.getByRole('link', { name: 'Voir la veille concurrentielle' })
    await expect(aller).toHaveAttribute('href', '/veille?debut=2026-01-01&fin=2026-06-30')
  })

  test('5 — une période sans perte affiche un message explicite', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/veille?debut=2000-01-01&fin=2000-12-31')
    await expect(page.getByText('Aucune perte sur cette période.')).toBeVisible()
    await expect(page.getByText('0 lot(s) sur 0 documenté(s)')).toBeVisible()
  })

  test('6 — pas de défilement horizontal à 375, 768 et 1920 px', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    for (const largeur of [375, 768, 1920]) {
      await sansDefilementHorizontal(page, largeur)
    }
  })

  test('7 — le détail d’une ligne s’ouvre et se referme au clavier', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/veille')
    const ligne = page.getByRole('listitem').filter({ hasText: 'E2E Auto Plus SARL' }).filter({ hasText: '3 lot(s) perdu(s)' })
    const bouton = ligne.getByRole('button', { name: 'Voir les pertes' })
    await expect(bouton).toHaveAttribute('aria-expanded', 'false')
    await bouton.focus()
    await page.keyboard.press('Enter')
    await expect(bouton).toHaveAttribute('aria-expanded', 'true')
    await expect(ligne.getByRole('link')).toHaveCount(3)
    await page.keyboard.press('Enter')
    await expect(bouton).toHaveAttribute('aria-expanded', 'false')
  })
})
