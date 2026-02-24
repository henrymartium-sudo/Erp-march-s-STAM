import { test, expect, Browser, BrowserContext } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/**
 * Tests E2E — Permissions & Rôles : Module Véhicules + Exports
 *
 * T12 : Guards pages véhicules (redirect, boutons absents)
 * T13 : ExportMenu conditionnel par rôle
 *
 * Prérequis : users test seedés en prod
 *   - exploitation@erp-marches.local / Exploitation123!
 *   - visiteur@erp-marches.local    / Visiteur123!
 *   - avance@erp-marches.local      / Avance123!
 *   - admin@erp-marches.local       / Admin123!
 */

// ─── T12 : Permissions véhicules ──────────────────────────────────────────────

test.describe('T12 — Permissions Véhicules (EXPLOITATION)', () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    await login(page, TEST_USERS.exploitation);
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('T12-A : /vehicules/nouveau redirige vers /vehicules', async () => {
    const page = await context.newPage();
    await page.goto('/vehicules/nouveau');
    await page.waitForURL((url) => url.toString().includes('/vehicules'), { timeout: 15000 });
    // Doit atterrir sur /vehicules, pas /vehicules/nouveau
    expect(page.url()).not.toContain('/vehicules/nouveau');
    expect(page.url()).toMatch(/\/vehicules$/);
    await page.close();
  });

  test('T12-B : /vehicules/[id]/edit redirige vers /vehicules/[id]', async () => {
    const page = await context.newPage();

    // Naviguer vers la liste pour trouver un ID réel
    await page.goto('/vehicules');
    await page.waitForLoadState('networkidle');

    // Cliquer sur le premier véhicule pour obtenir un ID
    const firstCard = page.locator('a[href^="/vehicules/"]').first();
    const href = await firstCard.getAttribute('href');
    expect(href).toBeTruthy();
    const vehiculeId = href!.split('/vehicules/')[1];

    // Tenter d'aller sur /edit
    await page.goto(`/vehicules/${vehiculeId}/edit`);
    await page.waitForURL(
      (url) => url.toString().includes(`/vehicules/${vehiculeId}`) && !url.toString().includes('/edit'),
      { timeout: 15000 }
    );
    expect(page.url()).not.toContain('/edit');
    await page.close();
  });

  test('T12-C : bouton "+ Ajouter un véhicule" absent de la liste', async () => {
    const page = await context.newPage();
    await page.goto('/vehicules');
    await page.waitForLoadState('networkidle');

    // Aucun bouton "Nouveau véhicule" ni "Ajouter un véhicule"
    await expect(page.getByRole('link', { name: /nouveau véhicule/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /ajouter un véhicule/i })).not.toBeVisible();
    await page.close();
  });

  test('T12-D : boutons "Modifier" et "Supprimer" absents du détail', async () => {
    const page = await context.newPage();
    await page.goto('/vehicules');
    await page.waitForLoadState('networkidle');

    // Naviguer vers le détail du premier véhicule
    const firstCard = page.locator('a[href^="/vehicules/"]').first();
    await firstCard.click();
    await page.waitForLoadState('networkidle');

    // Boutons d'action absents
    await expect(page.getByRole('link', { name: /modifier/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /supprimer/i })).not.toBeVisible();
    await page.close();
  });

  test('T12-E : bouton "Signaler une intervention" présent (EXPLOITATION peut intervenir)', async () => {
    const page = await context.newPage();
    await page.goto('/vehicules');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('a[href^="/vehicules/"]').first();
    await firstCard.click();
    await page.waitForLoadState('networkidle');

    // EXPLOITATION peut signaler une intervention
    await expect(
      page.getByRole('button', { name: /signaler/i }).or(page.getByText(/signaler/i))
    ).toBeVisible({ timeout: 10000 });
    await page.close();
  });
});

test.describe('T12 — Permissions Véhicules (VISITEUR)', () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    await login(page, TEST_USERS.visiteur);
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('T12-F : VISITEUR — /vehicules/nouveau redirige vers /vehicules', async () => {
    const page = await context.newPage();
    await page.goto('/vehicules/nouveau');
    await page.waitForURL((url) => url.toString().includes('/vehicules'), { timeout: 15000 });
    expect(page.url()).not.toContain('/vehicules/nouveau');
    await page.close();
  });

  test('T12-G : VISITEUR — aucun bouton action dans le détail', async () => {
    const page = await context.newPage();
    await page.goto('/vehicules');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('a[href^="/vehicules/"]').first();
    await firstCard.click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: /modifier/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /supprimer/i })).not.toBeVisible();
    // VISITEUR ne peut pas signaler non plus
    await expect(page.getByRole('button', { name: /signaler/i })).not.toBeVisible();
    await page.close();
  });
});

// ─── T13 : ExportMenu conditionnel ────────────────────────────────────────────

test.describe('T13 — ExportMenu conditionnel par rôle', () => {
  async function hasExportMenu(browser: Browser, user: typeof TEST_USERS[keyof typeof TEST_USERS], path: string): Promise<boolean> {
    const context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    await login(page, user);
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const exportBtn = page.getByRole('button', { name: /export/i })
      .or(page.locator('[data-testid="export-menu"]'))
      .or(page.getByText(/\.pdf|\.xlsx/i).first());
    const visible = await exportBtn.isVisible().catch(() => false);
    await context.close();
    return visible;
  }

  test('T13-A : EXPLOITATION — ExportMenu absent sur /vehicules', async ({ browser }) => {
    const visible = await hasExportMenu(browser, TEST_USERS.exploitation, '/vehicules');
    expect(visible).toBe(false);
  });

  test('T13-B : VISITEUR — ExportMenu absent sur /vehicules', async ({ browser }) => {
    const visible = await hasExportMenu(browser, TEST_USERS.visiteur, '/vehicules');
    expect(visible).toBe(false);
  });

  test('T13-C : AVANCE — ExportMenu présent sur /vehicules', async ({ browser }) => {
    const visible = await hasExportMenu(browser, TEST_USERS.avance, '/vehicules');
    expect(visible).toBe(true);
  });

  test('T13-D : ADMIN — ExportMenu présent sur /vehicules', async ({ browser }) => {
    const visible = await hasExportMenu(browser, TEST_USERS.admin, '/vehicules');
    expect(visible).toBe(true);
  });

  test('T13-E : EXPLOITATION — ExportMenu absent sur /cautions', async ({ browser }) => {
    const visible = await hasExportMenu(browser, TEST_USERS.exploitation, '/cautions');
    expect(visible).toBe(false);
  });

  test('T13-F : EXPLOITATION — ExportMenu absent sur /marches', async ({ browser }) => {
    const visible = await hasExportMenu(browser, TEST_USERS.exploitation, '/marches');
    expect(visible).toBe(false);
  });

  test('T13-G : ADMIN — ExportMenu présent sur /marches', async ({ browser }) => {
    const visible = await hasExportMenu(browser, TEST_USERS.admin, '/marches');
    expect(visible).toBe(true);
  });

  test('T13-H : ADMIN — ExportMenu présent sur /cautions', async ({ browser }) => {
    const visible = await hasExportMenu(browser, TEST_USERS.admin, '/cautions');
    expect(visible).toBe(true);
  });
});
