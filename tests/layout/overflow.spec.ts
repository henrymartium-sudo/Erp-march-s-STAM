import { test, expect } from '@playwright/test'
import { login, TEST_USERS } from '../helpers/auth'

/**
 * Régression audit UI/UX 2026-07 — correctif #1 (CRITIQUE)
 * Le conteneur principal de dashboard-shell.tsx doit porter min-w-0,
 * sinon le header et les tableaux larges provoquent un débordement
 * horizontal sous ~1280px (header tronqué à 768/1024, bouton
 * "Nouvelle opportunité" coupé à 1280).
 *
 * Critère : document.documentElement.scrollWidth <= window.innerWidth
 * sur /marches, /opportunites, /vehicules à 768, 1024 et 1280px.
 */

const PAGES = ['/marches', '/opportunites', '/vehicules']
const WIDTHS = [768, 1024, 1280]

test.describe('Layout — aucun débordement horizontal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.admin)
  })

  for (const width of WIDTHS) {
    for (const path of PAGES) {
      test(`${path} à ${width}px ne déborde pas`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path)
        await page.waitForLoadState('networkidle')

        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }))

        expect(
          scrollWidth,
          `Débordement horizontal sur ${path} à ${width}px : scrollWidth=${scrollWidth} > innerWidth=${innerWidth}`
        ).toBeLessThanOrEqual(innerWidth)
      })
    }
  }
})
