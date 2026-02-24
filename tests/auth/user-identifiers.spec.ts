import { test, expect } from '@playwright/test';
import type { Cookie } from '@playwright/test';
import { TEST_USERS } from '../helpers/auth';

/**
 * Tests E2E — UserIdentifier : gestion des emails secondaires
 *
 * Vérifie les fonctionnalités ajoutées en session 10 :
 * - Page /admin/utilisateurs accessible ADMIN uniquement
 * - Liste des utilisateurs affichée avec accordéon
 * - Expand d'un user → sections "Emails secondaires" + "Ajouter" visibles
 * - Validation email invalide → message d'erreur inline
 * - Ajout d'un email secondaire valide → apparaît dans la liste
 * - Suppression d'un email secondaire → disparaît de la liste
 * - Login avec email secondaire → session ouverte (test bout-en-bout T12)
 */

const SECONDARY_EMAIL = 'e2e.secondary.test@test.local';

let sessionCookies: Cookie[] = [];

test.setTimeout(120000);

test.describe('UserIdentifier — Admin Page & Login Secondaire', () => {

  // ── Auth partagée ──────────────────────────────────────────────────────────

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

  // ── Nettoyage : supprime l'email de test s'il existe encore ───────────────

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);
    await page.context().addCookies(sessionCookies);

    try {
      await page.goto('/admin/utilisateurs');
      await page.waitForLoadState('networkidle');

      // Cherche la carte admin
      const adminCard = page.locator('.bg-white.rounded-xl').filter({
        hasText: TEST_USERS.admin.email,
      }).first();

      if (await adminCard.isVisible({ timeout: 5000 })) {
        await adminCard.locator('button[aria-label]').click();
        await page.waitForTimeout(1000);

        // Cherche la ligne du SECONDARY_EMAIL
        const emailRow = page.locator('div').filter({ hasText: SECONDARY_EMAIL }).first();
        if (await emailRow.isVisible({ timeout: 3000 })) {
          const deleteBtn = emailRow.locator('button[title="Supprimer cet email secondaire"]');
          if (await deleteBtn.isVisible({ timeout: 2000 })) {
            await deleteBtn.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    } catch {
      // Nettoyage best-effort, ne pas échouer
    } finally {
      await context.close();
    }
  });

  // ─── T1 : Page accessible ADMIN ──────────────────────────────────────────

  test('T1 — page /admin/utilisateurs accessible et titre visible', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    // Titre H1 "Utilisateurs" — exact:true pour éviter l'ambiguïté avec le topbar "Gestion des utilisateurs"
    await expect(page.getByRole('heading', { name: 'Utilisateurs', exact: true })).toBeVisible({ timeout: 15000 });

    // Description présente
    await expect(page.getByText('Gestion des comptes et des identités email secondaires')).toBeVisible();
  });

  // ─── T2 : Liste utilisateurs affichée ────────────────────────────────────

  test('T2 — liste des utilisateurs affichée (au moins une carte)', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    // Au moins la carte admin visible
    const adminCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.admin.email,
    }).first();

    await expect(adminCard).toBeVisible({ timeout: 15000 });

    // L'email de l'admin est affiché
    await expect(adminCard.getByText(TEST_USERS.admin.email)).toBeVisible();
  });

  // ─── T3 : Expand → sections visibles ─────────────────────────────────────

  test('T3 — expand carte admin → sections "Emails secondaires" + "Ajouter" visibles', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    const adminCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.admin.email,
    }).first();

    await expect(adminCard).toBeVisible({ timeout: 15000 });

    // Clic chevron pour déplier
    await adminCard.locator('button[aria-label]').click();
    await page.waitForTimeout(500);

    // Section "Emails secondaires" OU "Aucun email secondaire"
    const hasEmails = await page.getByText(/Emails secondaires \(\d+\)/).isVisible({ timeout: 3000 }).catch(() => false);
    const noEmails = await page.getByText('Aucun email secondaire configuré.').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasEmails || noEmails).toBeTruthy();

    // Section "Ajouter un email secondaire" toujours visible
    await expect(page.getByText('Ajouter un email secondaire')).toBeVisible();

    // Input email et bouton Ajouter
    await expect(page.locator('input[placeholder="alias@exemple.com"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter', exact: true })).toBeVisible();
  });

  // ─── T4 : Email invalide → erreur inline ─────────────────────────────────

  test('T4 — email invalide → message d\'erreur inline', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    const adminCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.admin.email,
    }).first();
    await expect(adminCard).toBeVisible({ timeout: 15000 });

    await adminCard.locator('button[aria-label]').click();
    await page.waitForTimeout(500);

    // Saisir un email invalide
    const emailInput = page.locator('input[placeholder="alias@exemple.com"]');
    await emailInput.fill('pas-un-email');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();

    // Message d'erreur visible
    await expect(page.locator('p.text-xs.text-destructive')).toBeVisible({ timeout: 5000 });
  });

  // ─── T5 : Ajout email secondaire valide ──────────────────────────────────

  test('T5 — ajout email secondaire valide → apparaît dans la liste', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    const adminCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.admin.email,
    }).first();
    await expect(adminCard).toBeVisible({ timeout: 15000 });

    await adminCard.locator('button[aria-label]').click();
    await page.waitForTimeout(500);

    // Ajouter l'email de test
    const emailInput = page.locator('input[placeholder="alias@exemple.com"]');
    await emailInput.fill(SECONDARY_EMAIL);
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();

    // Attendre le rechargement et vérifier que l'email apparaît
    await page.waitForTimeout(3000);
    await expect(page.getByText(SECONDARY_EMAIL)).toBeVisible({ timeout: 15000 });
  });

  // ─── T6 : Suppression email secondaire ───────────────────────────────────

  test('T6 — suppression email secondaire → disparaît de la liste', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    const adminCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.admin.email,
    }).first();
    await expect(adminCard).toBeVisible({ timeout: 15000 });

    await adminCard.locator('button[aria-label]').click();
    await page.waitForTimeout(1000);

    // Trouver la ligne de l'email de test
    const emailRow = page.locator('div.flex.items-center.justify-between.rounded-lg').filter({
      hasText: SECONDARY_EMAIL,
    }).first();
    await expect(emailRow).toBeVisible({ timeout: 10000 });

    // Cliquer sur le bouton supprimer
    await emailRow.locator('button[title="Supprimer cet email secondaire"]').click();

    // Vérifier que l'email a disparu
    await page.waitForTimeout(3000);
    await expect(page.getByText(SECONDARY_EMAIL)).not.toBeVisible({ timeout: 10000 });
  });

  // ─── T7 : Login avec email secondaire ────────────────────────────────────

  test('T7 — login avec email secondaire → session ouverte (bout-en-bout)', async ({ page, browser }) => {
    // 1. Ajouter l'email secondaire via l'UI admin
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    const adminCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.admin.email,
    }).first();
    await expect(adminCard).toBeVisible({ timeout: 15000 });

    await adminCard.locator('button[aria-label]').click();
    await page.waitForTimeout(500);

    const emailInput = page.locator('input[placeholder="alias@exemple.com"]');
    await emailInput.fill(SECONDARY_EMAIL);
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.waitForTimeout(3000);

    // Vérifier que l'email est bien ajouté
    await expect(page.getByText(SECONDARY_EMAIL)).toBeVisible({ timeout: 15000 });

    // 2. Ouvrir un contexte frais (sans session) et tenter le login avec l'email secondaire
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    freshPage.setDefaultNavigationTimeout(60000);

    try {
      await freshPage.goto('/login');
      await freshPage.waitForLoadState('domcontentloaded');
      await freshPage.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30000 });

      await freshPage.fill('input[name="email"]', SECONDARY_EMAIL);
      await freshPage.fill('input[name="password"]', TEST_USERS.admin.password);
      await freshPage.click('button[type="submit"]');

      // Doit être redirigé vers le dashboard (pas rester sur /login)
      await freshPage.waitForURL((url) => !url.toString().includes('/login'), { timeout: 60000 });

      // Vérifier que le dashboard est chargé
      await freshPage.waitForLoadState('networkidle');
      expect(freshPage.url()).not.toContain('/login');
    } finally {
      await freshContext.close();
    }

    // 3. Nettoyer : supprimer l'email secondaire
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    const adminCardClean = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.admin.email,
    }).first();
    await adminCardClean.locator('button[aria-label]').click();
    await page.waitForTimeout(1000);

    const emailRowClean = page.locator('div.flex.items-center.justify-between.rounded-lg').filter({
      hasText: SECONDARY_EMAIL,
    }).first();

    if (await emailRowClean.isVisible({ timeout: 5000 })) {
      await emailRowClean.locator('button[title="Supprimer cet email secondaire"]').click();
      await page.waitForTimeout(2000);
    }
  });

});
