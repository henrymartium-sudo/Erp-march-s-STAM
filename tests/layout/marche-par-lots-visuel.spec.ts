import { test, expect } from '@playwright/test'
import type { Cookie, Page } from '@playwright/test'
import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import { TEST_USERS } from '../helpers/auth'

/**
 * Mise en page « un marché par groupe de lots » : dialogue de création, « Marchés liés » (fiche opportunité),
 * « Lots couverts » et dialogue de retrait (fiche marché), à 1920, 768 et 375 px.
 * Contrôle : aucun débordement horizontal de la page ; captures déposées dans CAPTURES_DIR (défaut : test-results/visuel).
 * Données de test : préfixe [E2E-VISUEL], supprimées avant et après. SQL limité à la base locale 127.0.0.1:5433.
 */

const PREFIXE = '[E2E-VISUEL]'
const OBJET = `${PREFIXE} Marché par lots`
const DOSSIER_CAPTURES = process.env.CAPTURES_DIR ?? path.join('test-results', 'visuel')

const TAILLES = [
  { nom: '1920', width: 1920, height: 1080 },
  { nom: '768', width: 768, height: 1024 },
  { nom: '375', width: 375, height: 667 },
]

async function sql<T = Record<string, unknown>>(requete: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL absente : la base de test locale est introuvable.')
  const u = new URL(url)
  if (u.hostname !== '127.0.0.1' || u.port !== '5433') {
    throw new Error(`Connexion refusée : la base de test doit être 127.0.0.1:5433 (lu : ${u.hostname}:${u.port}).`)
  }
  const client = new Client({ connectionString: url })
  await client.connect()
  try {
    return (await client.query(requete, params)).rows as T[]
  } finally {
    await client.end()
  }
}

async function nettoyer() {
  await sql(`delete from marches where objet like '${PREFIXE}%'`)
  await sql(`delete from opportunites where objet like '${PREFIXE}%'`)
}

/** Débordement horizontal : la largeur défilable dépasse la largeur visible ; liste les éléments fautifs. */
async function debordement(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const visible = document.documentElement.clientWidth
    const fautifs: string[] = []
    if (document.documentElement.scrollWidth > visible) {
      fautifs.push(`page : scrollWidth ${document.documentElement.scrollWidth} > ${visible}`)
      for (const el of Array.from(document.body.querySelectorAll('*'))) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.right > visible + 1) {
          fautifs.push(`${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).slice(0, 60)} right=${Math.round(r.right)}`)
          if (fautifs.length > 8) break
        }
      }
    }
    return fautifs
  })
}

async function verifier(page: Page, nom: string) {
  fs.mkdirSync(DOSSIER_CAPTURES, { recursive: true })
  await page.screenshot({ path: path.join(DOSSIER_CAPTURES, `${nom}.png`) })
  expect(await debordement(page), `débordement horizontal : ${nom}`).toEqual([])
}

let cookies: Cookie[] = []
let oppId = ''
let marcheId = ''

test.describe.serial('Marché par groupe de lots — mise en page', () => {
  test.beforeAll(async ({ browser }) => {
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
    cookies = await context.cookies()
    await context.close()

    await nettoyer()
    const admin = await sql<{ id: string }>('select id from users where email = $1', [TEST_USERS.admin.email])
    const userId = admin[0]?.id
    if (!userId) throw new Error('Compte administrateur de test introuvable en base.')
    const opp = await sql<{ id: string }>(
      `insert into opportunites (id, objet, "autoriteContractante", statut, "userId", "updatedAt")
       values (gen_random_uuid()::text, $1, $2, 'GAGNEE', $3, now()) returning id`,
      [OBJET, `${PREFIXE} Ministère de test avec un nom d'autorité volontairement long pour éprouver les retours à la ligne`, userId],
    )
    oppId = opp[0]!.id
    const intitules = ['Fourniture de véhicules utilitaires de type pick-up double cabine', 'Lot deux', 'Lot trois']
    for (const [i, intitule] of intitules.entries()) {
      await sql(
        `insert into lots (id, "opportuniteId", numero, intitule, "montantPropose", resultat, "updatedAt")
         values (gen_random_uuid()::text, $1, $2, $3, $4, 'GAGNE', now())`,
        [oppId, i + 1, intitule, (i + 1) * 25000000],
      )
    }
  })

  test.afterAll(async () => {
    await nettoyer()
  })

  for (const taille of TAILLES) {
    test(`dialogue de création du marché à ${taille.nom} px`, async ({ browser }) => {
      test.setTimeout(120000)
      const context = await browser.newContext({ viewport: { width: taille.width, height: taille.height } })
      await context.addCookies(cookies)
      const page = await context.newPage()
      try {
        await page.goto(`/opportunites/${oppId}`)
        await page.waitForLoadState('networkidle')
        await page.getByRole('button', { name: 'Créer le marché' }).click()
        const dialogue = page.getByRole('dialog')
        await expect(dialogue.getByRole('checkbox')).toHaveCount(3)
        await verifier(page, `creation-${taille.nom}`)
        const boite = await dialogue.boundingBox()
        expect(boite!.x).toBeGreaterThanOrEqual(0)
        expect(boite!.x + boite!.width).toBeLessThanOrEqual(taille.width)
      } finally {
        await context.close()
      }
    })
  }

  test('arrangement : un marché pour les lots 1 et 2', async () => {
    const opp = await sql<{ userId: string }>('select "userId" from opportunites where id = $1', [oppId])
    const marche = await sql<{ id: string }>(
      `insert into marches (id, numero, objet, type, montant, "dateNotification", "delaiExecution", statut, "autoriteContractanteNom", "userId", "opportuniteId", "updatedAt")
       values (gen_random_uuid()::text, 'E2E-VISUEL-001', $1, 'FOURNITURES', 75000000, now(), 0, 'ATTRIBUE_DEFINITIVEMENT', $2, $3, $4, now()) returning id`,
      [`${OBJET} — Lots 1, 2`, `${PREFIXE} Autorité`, opp[0]!.userId, oppId],
    )
    marcheId = marche[0]!.id
    await sql('update lots set "marcheId" = $1 where "opportuniteId" = $2 and numero in (1, 2)', [marcheId, oppId])
    await sql('update opportunites set "marcheId" = $1 where id = $2', [marcheId, oppId])
  })

  for (const taille of TAILLES) {
    test(`fiche opportunité (marchés liés) et fiche marché (lots couverts, retrait) à ${taille.nom} px`, async ({ browser }) => {
      test.setTimeout(150000)
      const context = await browser.newContext({ viewport: { width: taille.width, height: taille.height } })
      await context.addCookies(cookies)
      const page = await context.newPage()
      try {
        await page.goto(`/opportunites/${oppId}`)
        await page.waitForLoadState('networkidle')
        await expect(page.getByText('Marchés liés').first()).toBeVisible({ timeout: 30000 })
        await verifier(page, `opportunite-marches-lies-${taille.nom}`)

        await page.goto(`/marches/${marcheId}`)
        await page.waitForLoadState('networkidle')
        await expect(page.getByText('Lots couverts (2)')).toBeVisible({ timeout: 30000 })
        await verifier(page, `marche-lots-couverts-${taille.nom}`)

        const retirer = page.getByRole('button', { name: 'Retirer ce lot du marché' }).first()
        await expect
          .poll(() => retirer.evaluate((el) => Object.keys(el).some((k) => k.startsWith('__reactProps'))), { timeout: 30000 })
          .toBe(true)
        await retirer.click()
        const dialogue = page.getByRole('dialog')
        await expect(dialogue.getByLabel('Montant du marché après retrait')).toBeVisible({ timeout: 30000 })
        await verifier(page, `retrait-${taille.nom}`)
        const boite = await dialogue.boundingBox()
        expect(boite!.x).toBeGreaterThanOrEqual(0)
        expect(boite!.x + boite!.width).toBeLessThanOrEqual(taille.width)
      } finally {
        await context.close()
      }
    })
  }
})
