import { test, expect } from '@playwright/test';
import type { Cookie } from '@playwright/test';
import { TEST_USERS } from '../helpers/auth';

/**
 * Tests E2E — Désactivation / Réactivation de compte utilisateur (ADMIN)
 *
 * T1 : garde anti-auto-désactivation — bouton "Désactiver" absent sur la
 *      propre carte de l'ADMIN connecté
 * T2 : carte de l'utilisateur cible visible avec bouton "Désactiver"
 * T3 : clic "Désactiver" → badge "Désactivé" + bouton "Réactiver"
 * T4 : login Credentials refusé pour un compte désactivé
 * T5 : clic "Réactiver" → retour à l'état actif
 * T6 : login Credentials à nouveau accepté après réactivation
 *
 * Cible : TEST_USERS.deactivationTarget — compte dédié (cf. tests/helpers/auth.ts).
 */

let sessionCookies: Cookie[] = [];

test.setTimeout(120000);

test.describe('Désactivation de compte — Admin Utilisateurs', () => {

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000);

    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30000 });

    await page.fill('input[name="email"]', TEST_USERS.admin.email);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 60000 });
    await page.waitForLoadState('networkidle');

    sessionCookies = await context.cookies();
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(60000);
    if (sessionCookies.length > 0) {
      await page.context().addCookies(sessionCookies);
    }
  });

  // Nettoyage best-effort : si un test précédent a échoué en laissant le
  // compte cible désactivé, on tente de le réactiver via l'UI.
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);
    await page.context().addCookies(sessionCookies);

    try {
      await page.goto('/admin/utilisateurs');
      await page.waitForLoadState('networkidle');

      const targetCard = page.locator('.bg-white.rounded-xl').filter({
        hasText: TEST_USERS.deactivationTarget.email,
      }).first();

      const reactivateBtn = targetCard.getByRole('button', { name: 'Réactiver', exact: true });
      if (await reactivateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await reactivateBtn.click();
        await page.waitForTimeout(2000);
      }
    } catch {
      // Nettoyage best-effort, ne pas échouer
    } finally {
      await context.close();
    }
  });

  test('T1 — ADMIN connecté : bouton "Désactiver" absent sur sa propre carte', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    const ownCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.admin.email,
    }).first();
    await expect(ownCard).toBeVisible({ timeout: 15000 });

    await expect(ownCard.getByRole('button', { name: 'Désactiver', exact: true })).not.toBeVisible();
  });

  test('T2 — carte du compte cible visible avec bouton "Désactiver"', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    const targetCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.deactivationTarget.email,
    }).first();
    await expect(targetCard).toBeVisible({ timeout: 15000 });

    await expect(targetCard.getByRole('button', { name: 'Désactiver', exact: true })).toBeVisible();
  });

  test('T3 — clic "Désactiver" → badge "Désactivé" + bouton "Réactiver"', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    const targetCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.deactivationTarget.email,
    }).first();
    await expect(targetCard).toBeVisible({ timeout: 15000 });

    await targetCard.getByRole('button', { name: 'Désactiver', exact: true }).click();
    await page.waitForTimeout(3000);

    const refreshedCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.deactivationTarget.email,
    }).first();
    await expect(refreshedCard.getByText('Désactivé', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(refreshedCard.getByRole('button', { name: 'Réactiver', exact: true })).toBeVisible();
  });

  test('T4 — login Credentials refusé pour le compte désactivé', async ({ browser }) => {
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    freshPage.setDefaultNavigationTimeout(60000);

    try {
      await freshPage.goto('/login');
      await freshPage.waitForLoadState('domcontentloaded');
      await freshPage.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30000 });

      await freshPage.fill('input[name="email"]', TEST_USERS.deactivationTarget.email);
      await freshPage.fill('input[name="password"]', TEST_USERS.deactivationTarget.password);
      await freshPage.click('button[type="submit"]');

      await expect(freshPage.getByText('Email ou mot de passe incorrect')).toBeVisible({ timeout: 10000 });
      expect(freshPage.url()).toContain('/login');
    } finally {
      await freshContext.close();
    }
  });

  test('T5 — clic "Réactiver" → retour à l\'état actif', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    const targetCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.deactivationTarget.email,
    }).first();
    await expect(targetCard).toBeVisible({ timeout: 15000 });

    await targetCard.getByRole('button', { name: 'Réactiver', exact: true }).click();
    await page.waitForTimeout(3000);

    const refreshedCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.deactivationTarget.email,
    }).first();
    await expect(refreshedCard.getByText('Désactivé', { exact: true })).not.toBeVisible({ timeout: 10000 });
    await expect(refreshedCard.getByRole('button', { name: 'Désactiver', exact: true })).toBeVisible();
  });

  test('T6 — login Credentials à nouveau accepté après réactivation', async ({ browser }) => {
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    freshPage.setDefaultNavigationTimeout(60000);

    try {
      await freshPage.goto('/login');
      await freshPage.waitForLoadState('domcontentloaded');
      await freshPage.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30000 });

      await freshPage.fill('input[name="email"]', TEST_USERS.deactivationTarget.email);
      await freshPage.fill('input[name="password"]', TEST_USERS.deactivationTarget.password);
      await freshPage.click('button[type="submit"]');

      await freshPage.waitForURL((url) => !url.toString().includes('/login'), { timeout: 60000 });
      expect(freshPage.url()).not.toContain('/login');
    } finally {
      await freshContext.close();
    }
  });

});
