import { test, expect } from '@playwright/test'
import { randomUUID } from 'crypto'
import { login, TEST_USERS } from '../helpers/auth'
import { requeteLocale } from '../helpers/base-locale'

test.describe('Pilotage', () => {
  test('AVANCE accède à la page et voit les 3 indicateurs (conversion, issue des offres, marchés historiques) et la qualité des données', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/pilotage')
    await expect(page.getByRole('heading', { name: 'Pilotage' })).toBeVisible()
    await expect(page.getByText('Conversion attribué → facturé')).toBeVisible()
    await expect(page.getByText('Issue des offres', { exact: true })).toBeVisible()
    await expect(page.getByText('Marchés historiques', { exact: true })).toBeVisible()
    await expect(page.getByText('Qualité des données (toutes périodes)')).toBeVisible()
    await expect(page.getByText(/Évolution/)).toHaveCount(0)
    await expect(page.getByText(/mêmes dates/)).toHaveCount(0)
  })

  test('le bloc des marchés historiques n’affiche aucun taux', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/pilotage')
    const card = page.locator('div.rounded-lg.border.bg-card').filter({
      has: page.getByText('Marchés historiques', { exact: true }),
    })
    await expect(card).toBeVisible()
    await expect(card.getByText('sans taux')).toBeVisible()
    await expect(card.getByText('%')).toHaveCount(0)
  })

  test('un seul sélecteur de période pilote toute la page, sur les trois onglets', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/pilotage')
    await expect(page.getByText('Conversion attribué → facturé')).toBeVisible()
    for (const [onglet, libelle] of [['indicateurs', 'Indicateurs'], ['veille', 'Veille'], ['analyses', 'Analyses']]) {
      await page.goto(`/pilotage?onglet=${onglet}`)
      await expect(page.getByRole('tab', { name: libelle })).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByText('Période :')).toHaveCount(1)
      await expect(page.getByRole('button', { name: '30 jours', exact: true })).toHaveCount(1)
      await expect(page.getByText(/Tous les chiffres de la page portent sur la période du \d{2}\/\d{2}\/\d{4} au \d{2}\/\d{2}\/\d{4}/)).toBeVisible()
    }
  })

  test('chaque indicateur ouvre son détail au clavier', async ({ page }) => {
    await login(page, TEST_USERS.avance)
    await page.goto('/pilotage')

    for (const titre of [
      'Conversion attribué → facturé',
      'Issue des offres',
      'Marchés historiques',
    ]) {
      const card = page.locator('div.rounded-lg.border.bg-card').filter({
        has: page.getByText(titre, { exact: true }),
      })
      const bouton = card.getByRole('button', { name: 'Voir le détail' })
      const panneau = card.getByRole('region', { name: `Détail : ${titre}` })

      await expect(bouton).toBeVisible()
      await expect(bouton).toHaveAttribute('aria-expanded', 'false')
      await bouton.focus()
      await page.keyboard.press('Enter')
      await expect(bouton).toHaveAttribute('aria-expanded', 'true')
      await expect(panneau).toBeVisible()
      await page.keyboard.press('Enter')
      await expect(bouton).toHaveAttribute('aria-expanded', 'false')
      await expect(panneau).toBeHidden()
    }
  })

  test('une erreur de chargement permet de réessayer', async ({ page }) => {
    await login(page, TEST_USERS.avance)

    let autoriserCalcul = false
    await page.route('**/pilotage', async (route) => {
      if (route.request().method() === 'POST' && !autoriserCalcul) {
        await route.abort()
        return
      }
      await route.continue()
    })

    await page.goto('/pilotage')
    await expect(page.getByText('Impossible de calculer les indicateurs. Réessayez ou élargissez la période.', { exact: true })).toBeVisible()
    await expect(page.getByRole('status', { name: 'Chargement des indicateurs' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
    await expect(page.getByText('Conversion attribué → facturé')).toHaveCount(0)

    autoriserCalcul = true
    await page.getByRole('button', { name: 'Réessayer' }).click()
    await expect(page.getByText('Conversion attribué → facturé')).toBeVisible()
  })

  test('VISITEUR est redirigé', async ({ page }) => {
    await login(page, TEST_USERS.visiteur)
    await page.goto('/pilotage')
    await expect(page).not.toHaveURL(/\/pilotage/)
  })

  test("l'onglet Analyses a quitté Reporting", async ({ page }) => {
    await login(page, TEST_USERS.admin)
    await page.goto('/admin/reporting')
    await expect(page.getByRole('tab', { name: 'Analyses' })).toHaveCount(0)
  })

  test.describe('Analyses : une notion par endroit', () => {
    const PREFIXE = '[E2E-ANALYSES]'
    const nettoyer = async () => {
      await requeteLocale(`delete from marches where numero like '${PREFIXE}%'`)
      await requeteLocale(`delete from opportunites where objet like '${PREFIXE}%'`)
    }

    test.beforeAll(async () => {
      await nettoyer()
      const [admin] = await requeteLocale<{ id: string }>('select id from users where email = $1', [TEST_USERS.admin.email])
      if (!admin) throw new Error('Utilisateur de test introuvable en base locale.')
      await requeteLocale(
        `insert into marches (id, numero, objet, type, montant, "dateNotification", "delaiExecution", statut, "autoriteContractanteNom", "concurrentGagnant", "userId", "updatedAt")
         values ($1, $2, $3, 'FOURNITURES', 5000000, now() - interval '5 days', 30, 'EN_EXECUTION', 'Autorité Analyses E2E', 'Concurrent Analyses E2E', $4, now())`,
        [randomUUID(), `${PREFIXE} M1`, `${PREFIXE} marché`, admin.id],
      )
      await requeteLocale(
        `insert into opportunites (id, objet, "autoriteContractante", "dateLimite", statut, "montantPropose", "userId", "updatedAt")
         values ($1, $2, 'Autorité Analyses E2E', now() + interval '10 days', 'PERDUE', 700000, $3, now())`,
        [randomUUID(), `${PREFIXE} opportunité`, admin.id],
      )
    })
    test.afterAll(nettoyer)

    test("les Analyses n'affichent chaque notion qu'une fois", async ({ page }) => {
      await login(page, TEST_USERS.avance)
      await page.goto('/pilotage?onglet=analyses')
      await expect(page.getByRole('list', { name: 'Marchés par statut' })).toBeVisible({ timeout: 30000 })
      await expect(page.locator('.recharts-pie')).toHaveCount(0)
      expect(await page.getByText('Top 10 Autorités Contractantes').count()).toBeLessThanOrEqual(1)
      for (const retire of ['CA contractualisé', 'Montant total', 'Saisonnalité', 'Top concurrents identifiés', 'Factures par statut', 'Interventions par statut', 'Concurrent Analyses E2E']) {
        await expect(page.getByText(retire)).toHaveCount(0)
      }
      await page.goto('/pilotage?onglet=indicateurs')
      await expect(page.getByText('Conversion attribué → facturé')).toBeVisible()
      await expect(page.getByText('Écart de prix face au gagnant')).toHaveCount(0)
    })

    for (const [liste, ligne, titreDetail] of [
      ['Marchés par statut', 'En exécution', 'Marchés — En exécution'],
      ['Opportunités par statut', 'Perdue', 'Opportunités — Perdue'],
    ] as const) {
      test(`une ligne de « ${liste} » ouvre son détail au clavier`, async ({ page }) => {
        await login(page, TEST_USERS.avance)
        await page.goto('/pilotage?onglet=analyses')
        const bouton = page.getByRole('list', { name: liste }).getByRole('button', { name: new RegExp(ligne) })
        await expect(bouton).toBeVisible({ timeout: 30000 })
        await expect(bouton).toHaveCSS('min-height', '44px')
        await bouton.focus()
        await page.keyboard.press('Enter')
        await expect(page.getByRole('dialog').getByText(titreDetail)).toBeVisible()
        await expect(page.getByRole('dialog').getByText(`${PREFIXE}`).first()).toBeVisible()
      })
    }
  })

  test.describe('Analyses : le chiffre annoncé est le nombre de lignes du détail', () => {
    const PREFIXE = '[E2E-LISTES]'
    const AC = 'Autorité Listes E2E'
    const nettoyer = async () => {
      await requeteLocale(`delete from marches where numero like '${PREFIXE}%'`)
      await requeteLocale(`delete from opportunites where objet like '${PREFIXE}%'`)
    }

    test.beforeAll(async () => {
      await nettoyer()
      const [admin] = await requeteLocale<{ id: string }>('select id from users where email = $1', [TEST_USERS.admin.email])
      if (!admin) throw new Error('Utilisateur de test introuvable en base locale.')
      // Un marché récent et un très ancien, tous deux en exécution : la situation actuelle compte les deux.
      for (const [suffixe, jours] of [['récent', 5], ['ancien', 800]] as const) {
        await requeteLocale(
          `insert into marches (id, numero, objet, type, montant, "dateNotification", "delaiExecution", statut, "autoriteContractanteNom", "userId", "updatedAt")
           values ($1, $2, $3, 'FOURNITURES', 1000000, now() - ($4 || ' days')::interval, 30, 'EN_EXECUTION', $5, $6, now())`,
          [randomUUID(), `${PREFIXE} ${suffixe}`, `${PREFIXE} marché ${suffixe}`, String(jours), AC, admin.id],
        )
      }
      // Quatre opportunités récentes et deux très anciennes, même statut, même autorité (donc dans le Top 10).
      for (const jours of [1, 2, 3, 4, 800, 801]) {
        await requeteLocale(
          `insert into opportunites (id, objet, "autoriteContractante", "dateLimite", statut, "montantPropose", "userId", "createdAt", "updatedAt")
           values ($1, $2, $3, now() + interval '10 days', 'PERDUE', 100000, $4, now() - ($5 || ' days')::interval, now())`,
          [randomUUID(), `${PREFIXE} opportunité ${jours}`, AC, admin.id, String(jours)],
        )
      }
    })
    test.afterAll(nettoyer)

    for (const liste of ['Marchés par statut', 'Opportunités par statut', 'Top 10 Autorités Contractantes']) {
      test(`chaque ligne de « ${liste} » annonce le nombre de lignes de son détail`, async ({ page }) => {
        await login(page, TEST_USERS.avance)
        await page.goto('/pilotage?onglet=analyses')
        const boutons = page.getByRole('list', { name: liste }).getByRole('button')
        await expect(boutons.first()).toBeVisible({ timeout: 30000 })
        const total = await boutons.count()
        expect(total).toBeGreaterThan(0)
        for (let i = 0; i < total; i++) {
          const bouton = boutons.nth(i)
          const libelle = ((await bouton.textContent()) ?? '').trim()
          const valeur = (await bouton.locator('span.tabular-nums').textContent()) ?? ''
          const annonce = Number(valeur.match(/^\s*(\d+)/)?.[1])
          expect(Number.isNaN(annonce), `chiffre illisible dans « ${libelle} »`).toBe(false)
          await bouton.click()
          const dialogue = page.getByRole('dialog')
          await expect(dialogue.getByText(/\d+ résultats?/)).toBeVisible({ timeout: 30000 })
          const affiche = Number((await dialogue.getByText(/\d+ résultats?/).textContent())!.match(/(\d+)/)![1])
          expect(affiche, `« ${libelle} » annonce ${annonce}, le détail en liste ${affiche}`).toBe(annonce)
          await page.keyboard.press('Escape')
          await expect(dialogue).toBeHidden()
        }
      })
    }

    test('« Marchés par statut » compte et liste un marché ancien encore en exécution', async ({ page }) => {
      await login(page, TEST_USERS.avance)
      await page.goto('/pilotage?onglet=analyses')
      const bouton = page.getByRole('list', { name: 'Marchés par statut' }).getByRole('button', { name: /En exécution/ })
      await expect(bouton).toBeVisible({ timeout: 30000 })
      await bouton.click()
      const dialogue = page.getByRole('dialog')
      await expect(dialogue.getByText(`${PREFIXE} ancien`)).toBeVisible({ timeout: 30000 })
      await expect(dialogue.getByText(`${PREFIXE} récent`)).toBeVisible()
    })

    test('les trois listes et le bandeau disent « situation actuelle »', async ({ page }) => {
      await login(page, TEST_USERS.avance)
      await page.goto('/pilotage?onglet=analyses')
      for (const liste of ['Marchés par statut', 'Opportunités par statut', 'Top 10 Autorités Contractantes']) {
        const carte = page.locator('div.rounded-lg.border.bg-card').filter({ has: page.getByRole('list', { name: liste }) })
        await expect(carte.getByText('Situation actuelle, toutes dates')).toBeVisible({ timeout: 30000 })
      }
      await expect(page.getByText(/les listes de statuts montrent la situation actuelle, toutes dates/)).toBeVisible()
      await page.goto('/pilotage?onglet=indicateurs')
      await expect(page.getByText('Conversion attribué → facturé')).toBeVisible()
      await expect(page.getByText(/situation actuelle/)).toHaveCount(0)
    })

    test('« Opportunités par statut » et le Top 10 comptent les opportunités anciennes', async ({ page }) => {
      await login(page, TEST_USERS.avance)
      await page.goto('/pilotage?onglet=analyses')
      const perdue = page.getByRole('list', { name: 'Opportunités par statut' }).getByRole('button', { name: /Perdue/ })
      await expect(perdue).toBeVisible({ timeout: 30000 })
      await perdue.click()
      const dialogue = page.getByRole('dialog')
      await expect(dialogue.getByText(`${PREFIXE} opportunité 800`)).toBeVisible({ timeout: 30000 })
      await expect(dialogue.getByText(`${PREFIXE} opportunité 801`)).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(dialogue).toBeHidden()

      const ligneAC = page.getByRole('list', { name: 'Top 10 Autorités Contractantes' }).getByRole('button', { name: new RegExp(AC) })
      await expect(ligneAC).toBeVisible()
      expect(await ligneAC.locator('span.tabular-nums').textContent()).toMatch(/^\s*6\b/)
    })
  })

  for (const [nom, taille] of [['desktop', { width: 1920, height: 1080 }], ['tablette', { width: 768, height: 1024 }], ['mobile', { width: 375, height: 667 }]] as const) {
    test(`aucun débordement horizontal en ${nom}`, async ({ page }) => {
      await page.setViewportSize(taille)
      await login(page, TEST_USERS.admin)
      await page.goto('/pilotage')
      await expect(page.getByText('Conversion attribué → facturé')).toBeVisible()
      if (taille.width < 1024) {
        const presets = page.getByRole('button', { name: '30 jours', exact: true })
        await expect(presets).toHaveCount(1)
        for (const preset of await presets.all()) {
          await expect(preset).toHaveCSS('min-height', '44px')
        }
      }
      const deborde = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(deborde).toBe(false)
    })
  }
})
